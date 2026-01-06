"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { X, User, FileText, MessageSquare, ImageIcon } from "lucide-react";
import { createGeneralFeedback, generateSignedUploadUrls } from "@/app/dashboard/feedback/actions";
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { handleActionResponse } from "@/lib/toast-utils";
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSection } from "@/components/ui/form-section";
import { FormActions } from "@/components/ui/form-actions";
import { UnsavedChangesProtection } from "@/components/ui/unsaved-changes-dialog";
import { UnsavedChangesAlert } from "@/components/ui/unsaved-changes-alert";
import { useRouter } from "next/navigation";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_TOTAL_FILES = 10; // Limit auf 10 erhöht

const generalFeedbackSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  subject: z.string().max(200, "Betreff ist zu lang").optional(),
  message: z.string().min(1, "Nachricht ist erforderlich").max(2000, "Nachricht ist zu lang"),
});

type GeneralFeedbackFormValues = z.infer<typeof generalFeedbackSchema>;

interface Customer {
  id: string;
  name: string;
}

interface GeneralDashboardFeedbackFormProps {
  onSuccess?: () => void;
  isInDialog?: boolean;
}

export function GeneralDashboardFeedbackForm({ onSuccess, isInDialog = false }: GeneralDashboardFeedbackFormProps) {
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const form = useForm<GeneralFeedbackFormValues>({
    resolver: zodResolver(generalFeedbackSchema),
  });

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile) {
          setUserRole(profile.role);
          if (profile.role === 'customer') {
            const { data: customerData } = await supabase.from('customers').select('id').eq('user_id', user.id).single();
            if (customerData) form.setValue("customerId", customerData.id);
          } else {
            const { data: customersData } = await supabase.from('customers').select('id, name').order('name');
            if (customersData) setCustomers(customersData);
          }
        }
      }
    };
    fetchUserData();
  }, [supabase, form]);

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

  const onSubmit = async (data: GeneralFeedbackFormValues) => {
    setIsSubmitting(true);
    try {
      let uploadedImageUrls: string[] = [];

      if (files.length > 0) {
        toast.info(`Lade ${files.length} Bilder hoch...`);
        const fileDetails = files.map(f => ({ name: f.name, type: f.type }));
        // Use a new UUID as a reference for general feedback to group files
        const referenceId = uuidv4();
        const signedUrlResult = await generateSignedUploadUrls('general', referenceId, fileDetails);

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

      toast.info("Speichere Feedback...");
      const result = await createGeneralFeedback({
        customerId: data.customerId || null,
        subject: data.subject || null,
        message: data.message,
        imageUrls: uploadedImageUrls,
      });

      handleActionResponse(result); // Nutze die neue Utility

      if (result.success) {
        form.reset();
        setFiles([]);
        onSuccess?.(); // onSuccess aufrufen
      }
    } catch (error: any) {
      toast.error(error.message || "Ein unerwarteter Fehler ist aufgetreten.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (form.formState.isDirty && !isSubmitting) {
      setShowUnsavedDialog(true);
    } else {
      onSuccess?.();
    }
  };

  // Wrapper function to call onSubmit with current form values
  const handleSubmitClick = async () => {
    const data = form.getValues();
    await onSubmit(data);
  };

  if (isInDialog) {
    return (
      <>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormSection
            title="Kunde"
            description="Feedback im Namen von (optional)"
            icon={<User className="h-5 w-5 text-primary" />}
          >
            {userRole !== 'customer' && (
              <div>
                <Label htmlFor="customerId">Kunde auswählen</Label>
                <Select onValueChange={(value) => form.setValue("customerId", value)}>
                  <SelectTrigger><SelectValue placeholder="Kunde auswählen..." /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </FormSection>

          <FormSection
            title="Nachricht"
            description="Teilen Sie uns Ihr Feedback mit"
            icon={<MessageSquare className="h-5 w-5 text-primary" />}
          >
            <div>
              <Label htmlFor="subject">Betreff (optional)</Label>
              <Input id="subject" {...form.register("subject")} placeholder="Lob für Mitarbeiter, Problem mit..." />
            </div>
            <div>
              <Label htmlFor="message">Ihre Nachricht</Label>
              <Textarea id="message" {...form.register("message")} placeholder="Was möchten Sie uns mitteilen?" rows={5} />
              {form.formState.errors.message && <p className="text-red-500 text-sm mt-1">{form.formState.errors.message.message}</p>}
            </div>
          </FormSection>

          <FormSection
            title="Anhänge"
            description="Bilder hinzufügen (optional, max. 10)"
            icon={<ImageIcon className="h-5 w-5 text-primary" />}
          >
            <div>
              <Input id="images" type="file" multiple accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>Bilder auswählen</Button>
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
                {files.map((file, index) => (
                  <div key={index} className="relative">
                    <Image src={URL.createObjectURL(file)} alt={`Vorschau ${index}`} width={100} height={100} className="rounded-md object-cover w-full h-24" />
                    <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => handleRemoveFile(index)}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </div>
          </FormSection>

          <FormActions
            isSubmitting={isSubmitting}
            onCancel={handleCancel}
            onSubmit={handleSubmitClick}
            submitLabel="Feedback senden"
            cancelLabel="Abbrechen"
            showCancel={true}
            submitVariant="default"
            loadingText="Wird gesendet..."
            align="right"
          />
        </form>

        <UnsavedChangesAlert
          open={showUnsavedDialog}
          onConfirm={() => {
            setShowUnsavedDialog(false);
            onSuccess?.();
          }}
          onCancel={() => setShowUnsavedDialog(false)}
          title="Ungespeicherte Änderungen verwerfen?"
          description="Wenn Sie das Feedback-Formular jetzt verlassen, gehen Ihre Eingaben verloren."
        />
      </>
    );
  }

  return (
    <UnsavedChangesProtection formId="general-dashboard-feedback-form">
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Dashboard Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormSection
              title="Kunde"
              description="Feedback im Namen von (optional)"
              icon={<User className="h-5 w-5 text-primary" />}
            >
              {userRole !== 'customer' && (
                <div>
                  <Label htmlFor="customerId">Kunde auswählen</Label>
                  <Select onValueChange={(value) => form.setValue("customerId", value)}>
                    <SelectTrigger><SelectValue placeholder="Kunde auswählen..." /></SelectTrigger>
                    <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </FormSection>

            <FormSection
              title="Nachricht"
              description="Teilen Sie uns Ihr Feedback mit"
              icon={<MessageSquare className="h-5 w-5 text-primary" />}
            >
              <div>
                <Label htmlFor="subject">Betreff (optional)</Label>
                <Input id="subject" {...form.register("subject")} placeholder="Lob für Mitarbeiter, Problem mit..." />
              </div>
              <div>
                <Label htmlFor="message">Ihre Nachricht</Label>
                <Textarea id="message" {...form.register("message")} placeholder="Was möchten Sie uns mitteilen?" rows={5} />
                {form.formState.errors.message && <p className="text-red-500 text-sm mt-1">{form.formState.errors.message.message}</p>}
              </div>
            </FormSection>

            <FormSection
              title="Anhänge"
              description="Bilder hinzufügen (optional, max. 10)"
              icon={<ImageIcon className="h-5 w-5 text-primary" />}
            >
              <div>
                <Input id="images" type="file" multiple accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>Bilder auswählen</Button>
                <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {files.map((file, index) => (
                    <div key={index} className="relative">
                      <Image src={URL.createObjectURL(file)} alt={`Vorschau ${index}`} width={100} height={100} className="rounded-md object-cover w-full h-24" />
                      <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => handleRemoveFile(index)}><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            </FormSection>

            <FormActions
              isSubmitting={isSubmitting}
              onCancel={handleCancel}
              onSubmit={handleSubmitClick}
              submitLabel="Feedback senden"
              cancelLabel="Abbrechen"
              showCancel={true}
              submitVariant="default"
              loadingText="Wird gesendet..."
              align="right"
            />
          </form>
        </CardContent>
      </Card>
    </UnsavedChangesProtection>
  );
}