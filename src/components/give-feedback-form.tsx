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
import { Star, X, User, ShoppingCart, MessageSquare, ImageIcon } from "lucide-react";
import { createOrderFeedback, generateSignedUploadUrls } from "@/app/dashboard/feedback/actions";
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

const feedbackSchema = z.object({
  customerId: z.string().uuid("Bitte wählen Sie einen Kunden aus."),
  orderId: z.string().uuid("Bitte wählen Sie einen Auftrag aus."),
  rating: z.number().min(1, "Bewertung ist erforderlich").max(5),
  comment: z.string().max(1000, "Kommentar ist zu lang").optional(),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

interface Customer {
  id: string;
  name: string;
}

interface Order {
  id: string;
  title: string;
}

interface GiveFeedbackFormProps {
  onSuccess?: () => void;
  isInDialog?: boolean;
}

export function GiveFeedbackForm({ onSuccess, isInDialog = false }: GiveFeedbackFormProps) {
  const supabase = createClient();
  const router = useRouter();
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      rating: 0,
    },
  });

  const rating = form.watch("rating");

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserRole(profile.role);
          if (profile.role === 'customer') {
            const { data: customerData } = await supabase
              .from('customers')
              .select('id')
              .eq('user_id', user.id)
              .single();
            
            if (customerData) {
              setSelectedCustomerId(customerData.id);
              form.setValue("customerId", customerData.id, { shouldValidate: true });
            }
          } else {
            const { data: customersData, error } = await supabase.from('customers').select('id, name').order('name');
            if (customersData) setCustomers(customersData);
            if (error) toast.error("Kunden konnten nicht geladen werden.");
          }
        }
      }
    };
    fetchUserData();
  }, [supabase, form]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!selectedCustomerId) {
        setOrders([]);
        form.setValue("orderId", "");
        return;
      }
      const { data, error } = await supabase.from('orders').select('id, title').eq('customer_id', selectedCustomerId).order('created_at', { ascending: false });
      if (data) setOrders(data);
      if (error) toast.error("Aufträge für diesen Kunden konnten nicht geladen werden.");
    };
    fetchOrders();
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

  const onSubmit = async (data: FeedbackFormValues) => {
    setIsSubmitting(true);
    try {
      let uploadedImageUrls: string[] = [];

      if (files.length > 0) {
        toast.info(`Lade ${files.length} Bilder hoch...`);
        const fileDetails = files.map(f => ({ name: f.name, type: f.type }));
        const signedUrlResult = await generateSignedUploadUrls('order', data.orderId, fileDetails);

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
      const result = await createOrderFeedback({
        orderId: data.orderId,
        rating: data.rating,
        comment: data.comment || null,
        imageUrls: uploadedImageUrls,
      });

      handleActionResponse(result);

      if (result.success) {
        form.reset();
        setFiles([]);
        if (userRole !== 'customer') {
          setSelectedCustomerId(null);
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

  const handleCancel = () => {
    if (form.formState.isDirty && !isSubmitting) {
      setShowUnsavedDialog(true);
    } else {
      onSuccess?.();
    }
  };

  if (isInDialog) {
    return (
      <>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormSection
            title="Auswahl"
            description="Wählen Sie Kunde und Auftrag aus"
            icon={<User className="h-5 w-5 text-primary" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userRole !== 'customer' && (
                <div>
                  <Label htmlFor="customerId">Kunde auswählen</Label>
                  <Select
                    onValueChange={(value) => {
                      setSelectedCustomerId(value);
                      form.setValue("customerId", value, { shouldValidate: true });
                    }}
                    value={selectedCustomerId || ""}
                  >
                    <SelectTrigger><SelectValue placeholder="Kunde..." /></SelectTrigger>
                    <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {form.formState.errors.customerId && <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerId.message}</p>}
                </div>
              )}
              <div>
                <Label htmlFor="orderId">Auftrag auswählen</Label>
                <Select
                  {...form.register("orderId")}
                  onValueChange={(value) => form.setValue("orderId", value, { shouldValidate: true })}
                  disabled={!selectedCustomerId || orders.length === 0}
                >
                  <SelectTrigger><SelectValue placeholder="Auftrag..." /></SelectTrigger>
                  <SelectContent>{orders.map(o => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}</SelectContent>
                </Select>
                {form.formState.errors.orderId && <p className="text-red-500 text-sm mt-1">{form.formState.errors.orderId.message}</p>}
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Bewertung"
            description="Bewerten Sie die Dienstleistung"
            icon={<Star className="h-5 w-5 text-primary" />}
          >
            <div>
              <Label>Bewertung</Label>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-8 w-8 cursor-pointer transition-colors ${
                      (hoverRating || rating) >= star ? "text-warning fill-warning" : "text-muted-foreground"
                    }`}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => form.setValue("rating", star, { shouldValidate: true })}
                  />
                ))}
              </div>
              {form.formState.errors.rating && <p className="text-red-500 text-sm mt-1">{form.formState.errors.rating.message}</p>}
            </div>
          </FormSection>

          <FormSection
            title="Kommentar"
            description="Teilen Sie Ihre Erfahrung mit (optional)"
            icon={<MessageSquare className="h-5 w-5 text-primary" />}
          >
            <div>
              <Label htmlFor="comment">Kommentar (optional)</Label>
              <Textarea id="comment" {...form.register("comment")} placeholder="Wie war die Erfahrung mit unserer Dienstleistung?" rows={3} />
            </div>
          </FormSection>

          <FormSection
            title="Bilder"
            description="Bilder hinzufügen (optional, max. 10)"
            icon={<ImageIcon className="h-5 w-5 text-primary" />}
          >
            <div>
              <Input id="images" type="file" multiple accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <ImageIcon className="mr-2 h-4 w-4" />
                Bilder auswählen
              </Button>
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
    <UnsavedChangesProtection formId="give-feedback-form">
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Feedback geben
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormSection
              title="Auswahl"
              description="Wählen Sie Kunde und Auftrag aus"
              icon={<User className="h-5 w-5 text-primary" />}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userRole !== 'customer' && (
                  <div>
                    <Label htmlFor="customerId">Kunde auswählen</Label>
                    <Select
                      onValueChange={(value) => {
                        setSelectedCustomerId(value);
                        form.setValue("customerId", value, { shouldValidate: true });
                      }}
                      value={selectedCustomerId || ""}
                    >
                      <SelectTrigger><SelectValue placeholder="Kunde..." /></SelectTrigger>
                      <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                    {form.formState.errors.customerId && <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerId.message}</p>}
                  </div>
                )}
                <div>
                  <Label htmlFor="orderId">Auftrag auswählen</Label>
                  <Select
                    {...form.register("orderId")}
                    onValueChange={(value) => form.setValue("orderId", value, { shouldValidate: true })}
                    disabled={!selectedCustomerId || orders.length === 0}
                  >
                    <SelectTrigger><SelectValue placeholder="Auftrag..." /></SelectTrigger>
                    <SelectContent>{orders.map(o => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}</SelectContent>
                  </Select>
                  {form.formState.errors.orderId && <p className="text-red-500 text-sm mt-1">{form.formState.errors.orderId.message}</p>}
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Bewertung"
              description="Bewerten Sie die Dienstleistung"
              icon={<Star className="h-5 w-5 text-primary" />}
            >
              <div>
                <Label>Bewertung</Label>
                <div className="flex items-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-8 w-8 cursor-pointer transition-colors ${
                        (hoverRating || rating) >= star ? "text-warning fill-warning" : "text-muted-foreground"
                      }`}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => form.setValue("rating", star, { shouldValidate: true })}
                    />
                  ))}
                </div>
                {form.formState.errors.rating && <p className="text-red-500 text-sm mt-1">{form.formState.errors.rating.message}</p>}
              </div>
            </FormSection>

            <FormSection
              title="Kommentar"
              description="Teilen Sie Ihre Erfahrung mit (optional)"
              icon={<MessageSquare className="h-5 w-5 text-primary" />}
            >
              <div>
                <Label htmlFor="comment">Kommentar (optional)</Label>
                <Textarea id="comment" {...form.register("comment")} placeholder="Wie war die Erfahrung mit unserer Dienstleistung?" rows={3} />
              </div>
            </FormSection>

            <FormSection
              title="Bilder"
              description="Bilder hinzufügen (optional, max. 10)"
              icon={<ImageIcon className="h-5 w-5 text-primary" />}
            >
              <div>
                <Input id="images" type="file" multiple accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Bilder auswählen
                </Button>
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