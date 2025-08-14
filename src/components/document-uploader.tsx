"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UploadCloud, FileText, X } from "lucide-react";
import { generateSignedUploadUrlForDocument } from "@/app/dashboard/documents/actions";
import { handleActionResponse } from "@/lib/toast-utils";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const documentUploadSchema = z.object({
  documentType: z.string().min(1, "Dokumententyp ist erforderlich"),
  description: z.string().max(500, "Beschreibung ist zu lang").optional().nullable(),
});

type DocumentUploadFormValues = z.infer<typeof documentUploadSchema>;

interface DocumentUploaderProps {
  associatedEmployeeId?: string;
  associatedCustomerId?: string;
  associatedOrderId?: string;
  onDocumentUploaded?: () => void;
  className?: string;
}

export function DocumentUploader({
  associatedEmployeeId,
  associatedCustomerId,
  associatedOrderId,
  onDocumentUploaded,
  className,
}: DocumentUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<DocumentUploadFormValues>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      documentType: "other",
      description: "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > MAX_FILE_SIZE) {
        toast.error(`Die Datei "${selectedFile.name}" ist zu groß. Maximale Größe: 20 MB.`);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (data: DocumentUploadFormValues) => {
    if (!file) {
      toast.error("Bitte wählen Sie eine Datei zum Hochladen aus.");
      return;
    }

    setIsUploading(true);
    toast.info(`Lade Dokument "${file.name}" hoch...`);

    try {
      const uploadPayload = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        documentType: data.documentType,
        associatedEmployeeId: associatedEmployeeId || null,
        associatedCustomerId: associatedCustomerId || null,
        associatedOrderId: associatedOrderId || null,
        description: data.description || null,
      };

      const signedUrlResult = await generateSignedUploadUrlForDocument(uploadPayload);

      if (!signedUrlResult.success || !signedUrlResult.uploadUrl) {
        throw new Error(signedUrlResult.message);
      }

      const uploadResponse = await fetch(signedUrlResult.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Fehler beim Hochladen der Datei: ${uploadResponse.statusText}`);
      }

      toast.success("Dokument erfolgreich hochgeladen!");
      form.reset();
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onDocumentUploaded?.();
    } catch (error: any) {
      handleActionResponse({ success: false, message: error.message || "Ein unerwarteter Fehler ist aufgetreten." });
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const documentTypeOptions = [
    { value: "employment_contract", label: "Arbeitsvertrag" },
    { value: "customer_contract", label: "Kundenvertrag" },
    { value: "invoice", label: "Rechnung" },
    { value: "report", label: "Bericht" },
    { value: "other", label: "Sonstiges" },
  ];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4", className)}>
      <div>
        <Label htmlFor="documentFile">Datei auswählen</Label>
        <Input
          id="documentFile"
          type="file"
          onChange={handleFileChange}
          ref={fileInputRef}
          disabled={isUploading}
        />
        {file && (
          <div className="flex items-center justify-between mt-2 p-2 border rounded-md bg-muted text-muted-foreground">
            <span className="text-sm truncate">{file.name}</span>
            <Button type="button" variant="ghost" size="icon" onClick={handleRemoveFile} disabled={isUploading}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="documentType">Dokumententyp</Label>
        <Select
          onValueChange={(value) => form.setValue("documentType", value)}
          value={form.watch("documentType")}
          disabled={isUploading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Typ auswählen" />
          </SelectTrigger>
          <SelectContent>
            {documentTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.documentType && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.documentType.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Beschreibung (optional)</Label>
        <Textarea
          id="description"
          {...form.register("description")}
          placeholder="Kurze Beschreibung des Dokuments..."
          rows={3}
          disabled={isUploading}
        />
        {form.formState.errors.description && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isUploading || !file}>
        <UploadCloud className="mr-2 h-4 w-4" />
        {isUploading ? "Wird hochgeladen..." : "Dokument hochladen"}
      </Button>
    </form>
  );
}