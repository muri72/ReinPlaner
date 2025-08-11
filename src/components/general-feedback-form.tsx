"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { createGeneralFeedback, generateSignedUploadUrls } from "@/app/dashboard/feedback/actions";
import Image from "next/image";
import { v4 as uuidv4 } from 'uuid';

const generalFeedbackSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  email: z.string().email("Ungültige E-Mail-Adresse").optional().or(z.literal('')),
  subject: z.string().max(200, "Betreff ist zu lang").optional(),
  message: z.string().min(1, "Nachricht ist erforderlich").max(2000, "Nachricht ist zu lang"),
});

type GeneralFeedbackFormValues = z.infer<typeof generalFeedbackSchema>;

export function GeneralFeedbackForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<GeneralFeedbackFormValues>({
    resolver: zodResolver(generalFeedbackSchema),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (files.length + newFiles.length > 5) {
        toast.error("Sie können maximal 5 Bilder hochladen.");
        return;
      }
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
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
        name: data.name,
        email: data.email || null,
        subject: data.subject || null,
        message: data.message,
        imageUrls: uploadedImageUrls,
      });

      if (result.success) {
        toast.success(result.message);
        form.reset();
        setFiles([]);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || "Ein unerwarteter Fehler ist aufgetreten.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Ihr Name</Label>
          <Input id="name" {...form.register("name")} placeholder="Max Mustermann" />
          {form.formState.errors.name && <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="email">Ihre E-Mail (optional)</Label>
          <Input id="email" type="email" {...form.register("email")} placeholder="max@example.com" />
        </div>
      </div>
      <div>
        <Label htmlFor="subject">Betreff (optional)</Label>
        <Input id="subject" {...form.register("subject")} placeholder="Frage zu..." />
      </div>
      <div>
        <Label htmlFor="message">Ihre Nachricht</Label>
        <Textarea id="message" {...form.register("message")} placeholder="Was können wir für Sie tun?" rows={5} />
        {form.formState.errors.message && <p className="text-red-500 text-sm mt-1">{form.formState.errors.message.message}</p>}
      </div>
      <div>
        <Label htmlFor="images">Bilder hinzufügen (optional, max. 5)</Label>
        <Input id="images" type="file" multiple accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>Bilder auswählen</Button>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {files.map((file, index) => (
            <div key={index} className="relative">
              <Image src={URL.createObjectURL(file)} alt={`Vorschau ${index}`} width={100} height={100} className="rounded-md object-cover w-full h-24" />
              <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => handleRemoveFile(index)}><X className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Wird gesendet..." : "Feedback senden"}</Button>
    </form>
  );
}