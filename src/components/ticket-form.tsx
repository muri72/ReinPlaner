"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { handleActionResponse } from "@/lib/toast-utils";
import { X, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { v4 as uuidv4 } from 'uuid';
import { createTicket, generateSignedUploadUrlsForTickets } from "@/app/dashboard/tickets/actions";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_TOTAL_FILES = 5;

export const ticketSchema = z.object({
  customerId: z.string().uuid("Ungültige Kunden-ID").optional().nullable(),
  objectId: z.string().uuid("Ungültiges Objekt-ID").optional().nullable(),
  title: z.string().min(1, "Titel ist erforderlich").max(100, "Titel ist zu lang"),
  description: z.string().max(1000, "Beschreibung ist zu lang").optional().nullable(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).default("open"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  assignedToUserId: z.string().uuid("Ungültige Benutzer-ID").optional().nullable(),
  imageUrls: z.array(z.string().url("Ungültige Bild-URL")).optional(),
});

export type TicketFormInput = z.input<typeof ticketSchema>;
export type TicketFormValues = z.infer<typeof ticketSchema>;

interface TicketFormProps {
  initialData?: Partial<TicketFormInput>;
  onSubmit: (data: TicketFormValues) => Promise<{ success: boolean; message: string; newTicketId?: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
  isEditMode?: boolean;
  ticketId?: string; // Added ticketId prop for edit mode
}

export function TicketForm({ initialData, onSubmit, submitButtonText, onSuccess, isEditMode = false, ticketId }: TicketFormProps) {
  const supabase = createClient();
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [objects, setObjects] = useState<{ id: string; name: string; customer_id: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; first_name: string | null; last_name: string | null; role: string }[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolvedDefaultValues: TicketFormValues = {
    customerId: initialData?.customerId ?? null,
    objectId: initialData?.objectId ?? null,
    title: initialData?.title ?? "",
    description: initialData?.description ?? null,
    status: initialData?.status ?? "open",
    priority: initialData?.priority ?? "medium",
    assignedToUserId: initialData?.assignedToUserId ?? null,
    imageUrls: initialData?.imageUrls ?? [],
  };

  const form = useForm<TicketFormInput>({
    resolver: zodResolver(ticketSchema),
    defaultValues: resolvedDefaultValues,
  });

  const selectedCustomerId = form.watch("customerId");
  const selectedObjectId = form.watch("objectId");

  useEffect(() => {
    const fetchDropdownData = async () => {
      const { data: customersData, error: customersError } = await supabase.from('customers').select('id, name').order('name', { ascending: true });
      if (customersData) setCustomers(customersData);
      if (customersError) console.error("Fehler beim Laden der Kunden:", customersError);

      const { data: usersData, error: usersError } = await supabase.from('profiles').select('id, first_name, last_name, role').in('role', ['admin', 'manager', 'employee']).order('last_name', { ascending: true });
      if (usersData) setUsers(usersData);
      if (usersError) console.error("Fehler beim Laden der Benutzer:", usersError);
    };
    fetchDropdownData();
  }, [supabase]);

  useEffect(() => {
    if (selectedCustomerId) {
      const fetchObjects = async () => {
        const { data: objectsData, error: objectsError } = await supabase.from('objects').select('id, name, customer_id').eq('customer_id', selectedCustomerId).order('name', { ascending: true });
        if (objectsData) setObjects(objectsData);
        if (objectsError) console.error("Fehler beim Laden der Objekte:", objectsError);
      };
      fetchObjects();
    } else {
      setObjects([]);
      form.setValue("objectId", null);
    }
  }, [selectedCustomerId, supabase, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles: File[] = [];
      
      for (const file of newFiles) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`Datei "${file.name}" ist zu groß (max. 10 MB).`);
        } else {
          validFiles.push(file);
        }
      }

      if (files.length + validFiles.length > MAX_TOTAL_FILES) {
        toast.error(`Sie können maximal ${MAX_TOTAL_FILES} Bilder hochladen.`);
        return;
      }
      setFiles((prevFiles) => [...prevFiles, ...validFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleFormSubmit: SubmitHandler<TicketFormInput> = async (data) => {
    setIsSubmitting(true);
    try {
      let uploadedImageUrls: string[] = [];

      if (files.length > 0) {
        toast.info(`Lade ${files.length} Bilder hoch...`);
        const fileDetails = files.map(f => ({ name: f.name, type: f.type }));
        const referenceId = ticketId || uuidv4(); // Use existing ID or generate new
        const signedUrlResult = await generateSignedUploadUrlsForTickets(referenceId, fileDetails);

        if (!signedUrlResult.success || !signedUrlResult.uploads) {
          throw new Error(signedUrlResult.message);
        }

        const uploadPromises = signedUrlResult.uploads.map((uploadInfo, index) => {
          return fetch(uploadInfo.signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': files[index].type },
            body: files[index],
          }).then(response => {
            if (!response.ok) {
              throw new Error(`Fehler beim Hochladen von Bild: ${files[index].name}`);
            }
            return uploadInfo.publicUrl;
          });
        });

        uploadedImageUrls = await Promise.all(uploadPromises);
        toast.success("Alle Bilder erfolgreich hochgeladen!");
      }

      const finalImageUrls = [...(initialData?.imageUrls || []), ...uploadedImageUrls];

      const result = await onSubmit({ ...(data as TicketFormValues), imageUrls: finalImageUrls });
      handleActionResponse(result);

      if (result.success) {
        if (!isEditMode) {
          form.reset();
          setFiles([]);
        }
        onSuccess?.();
      }
    } catch (error: any) {
      toast.error(error.message || "Ein unerwarteter Fehler ist aufgetreten.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full max-w-md mx-auto">
      <div>
        <Label htmlFor="customerId">Kunde (optional)</Label>
        <Select onValueChange={(value) => {
          form.setValue("customerId", value === "unassigned" ? null : value);
          form.setValue("objectId", null); // Reset object when customer changes
        }} value={selectedCustomerId || "unassigned"}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Kunde auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Kein Kunde zugewiesen</SelectItem>
            {customers.map(customer => (
              <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.customerId && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerId.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="objectId">Objekt (optional)</Label>
        <Select onValueChange={(value) => form.setValue("objectId", value === "unassigned" ? null : value)} value={selectedObjectId || "unassigned"} disabled={!selectedCustomerId || objects.length === 0}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Objekt auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Kein Objekt zugewiesen</SelectItem>
            {objects.map(obj => (
              <SelectItem key={obj.id} value={obj.id}>{obj.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.objectId && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.objectId.message}</p>
        )}
        {selectedCustomerId && objects.length === 0 && (
          <p className="text-muted-foreground text-sm mt-1">Keine Objekte für diesen Kunden gefunden.</p>
        )}
      </div>

      <div>
        <Label htmlFor="title">Titel *</Label>
        <Input
          id="title"
          {...form.register("title")}
          placeholder="Kurze Zusammenfassung des Anliegens"
        />
        {form.formState.errors.title && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Beschreibung (optional)</Label>
        <Textarea
          id="description"
          {...form.register("description")}
          placeholder="Detaillierte Beschreibung des Problems oder Anliegens"
          rows={5}
        />
        {form.formState.errors.description && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message}</p>
        )}
      </div>

      {isEditMode && (
        <>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select onValueChange={(value) => form.setValue("status", value as TicketFormValues["status"])} value={form.watch("status")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Offen</SelectItem>
                <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                <SelectItem value="resolved">Gelöst</SelectItem>
                <SelectItem value="closed">Geschlossen</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.status && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.status.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="priority">Priorität</Label>
            <Select onValueChange={(value) => form.setValue("priority", value as TicketFormValues["priority"])} value={form.watch("priority")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Priorität auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Niedrig</SelectItem>
                <SelectItem value="medium">Mittel</SelectItem>
                <SelectItem value="high">Hoch</SelectItem>
                <SelectItem value="urgent">Dringend</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.priority && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.priority.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="assignedToUserId">Zugewiesen an (optional)</Label>
            <Select onValueChange={(value) => form.setValue("assignedToUserId", value === "unassigned" ? null : value)} value={form.watch("assignedToUserId") || "unassigned"}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Benutzer auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Nicht zugewiesen</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.first_name} {user.last_name} ({user.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.assignedToUserId && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.assignedToUserId.message}</p>
            )}
          </div>
        </>
      )}

      <div>
        <Label htmlFor="images">Bilder hinzufügen (optional, max. 5)</Label>
        <Input id="images" type="file" multiple accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>Bilder auswählen</Button>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {initialData?.imageUrls?.map((url, index) => (
            <div key={`initial-${index}`} className="relative">
              <Image src={url} alt={`Vorschau ${index}`} width={100} height={100} className="rounded-md object-cover w-full h-24" />
              {/* Option to remove existing images could be added here */}
            </div>
          ))}
          {files.map((file, index) => (
            <div key={`new-${index}`} className="relative">
              <Image src={URL.createObjectURL(file)} alt={`Vorschau ${index}`} width={100} height={100} className="rounded-md object-cover w-full h-24" />
              <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => handleRemoveFile(index)}><X className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? `${submitButtonText}...` : submitButtonText}</Button>
    </form>
  );
}