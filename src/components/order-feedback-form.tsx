"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Star, X } from "lucide-react";
import { createOrderFeedback } from "@/app/dashboard/orders/actions";
import Image from "next/image";

const feedbackSchema = z.object({
  rating: z.number().min(1, "Bewertung ist erforderlich").max(5),
  comment: z.string().max(1000, "Kommentar ist zu lang").optional(),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

interface OrderFeedbackFormProps {
  orderId: string;
  onSuccess?: () => void;
}

export function OrderFeedbackForm({ orderId, onSuccess }: OrderFeedbackFormProps) {
  const supabase = createClient();
  const [hoverRating, setHoverRating] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      rating: 0,
      comment: "",
    },
  });

  const rating = form.watch("rating");

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

  const onSubmit = async (data: FeedbackFormValues) => {
    setIsUploading(true);
    let uploadedImageUrls: string[] = [];

    try {
      // Upload images to Supabase Storage
      for (const file of files) {
        const filePath = `${orderId}/${Date.now()}-${file.name}`; // FIX: Removed "public/" prefix
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("feedback-images")
          .upload(filePath, file);

        if (uploadError) {
          throw new Error(`Fehler beim Hochladen des Bildes: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("feedback-images")
          .getPublicUrl(uploadData.path);
        
        if (urlData) {
          uploadedImageUrls.push(urlData.publicUrl);
        }
      }

      // Submit the form data with image URLs
      const formData = new FormData();
      formData.append("orderId", orderId);
      formData.append("rating", String(data.rating));
      if (data.comment) {
        formData.append("comment", data.comment);
      }
      uploadedImageUrls.forEach(url => formData.append("imageUrls[]", url));

      const result = await createOrderFeedback(formData);

      if (result.success) {
        toast.success(result.message);
        form.reset();
        setFiles([]);
        onSuccess?.();
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>Bewertung</Label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-8 w-8 cursor-pointer transition-colors ${
                (hoverRating || rating) >= star
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-gray-300"
              }`}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => form.setValue("rating", star, { shouldValidate: true })}
            />
          ))}
        </div>
        {form.formState.errors.rating && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.rating.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="comment">Kommentar (optional)</Label>
        <Textarea
          id="comment"
          {...form.register("comment")}
          placeholder="Wie war Ihre Erfahrung mit unserer Dienstleistung?"
          rows={4}
        />
      </div>

      <div>
        <Label htmlFor="images">Bilder hinzufügen (optional, max. 5)</Label>
        <Input
          id="images"
          type="file"
          multiple
          accept="image/png, image/jpeg, image/webp"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden"
        />
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
          Bilder auswählen
        </Button>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {files.map((file, index) => (
            <div key={index} className="relative">
              <Image
                src={URL.createObjectURL(file)}
                alt={`Vorschau ${index}`}
                width={100}
                height={100}
                className="rounded-md object-cover w-full h-24"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={() => handleRemoveFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={isUploading || form.formState.isSubmitting}>
        {isUploading ? "Wird gesendet..." : "Feedback senden"}
      </Button>
    </form>
  );
}