"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateProfile } from "@/app/dashboard/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useRef } from "react";

const MAX_AVATAR_SIZE = 10 * 1024 * 1024; // 10 MB

const profileSchema = z.object({
  firstName: z.string().max(50, "Vorname ist zu lang").optional(),
  lastName: z.string().max(50, "Nachname ist zu lang").optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileUpdateFormProps {
  initialData: {
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
}

export function ProfileUpdateForm({ initialData }: ProfileUpdateFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: initialData.firstName || "",
      lastName: initialData.lastName || "",
    },
    mode: "onChange",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > MAX_AVATAR_SIZE) {
        toast.error(`Das Bild ist zu groß. Die maximale Größe beträgt 10 MB.`);
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    const formData = new FormData();
    if (data.firstName) formData.append('firstName', data.firstName);
    if (data.lastName) formData.append('lastName', data.lastName);
    if (file) formData.append('avatar', file);

    if (!data.firstName && !data.lastName && !file) {
        toast.info("Keine Änderungen zum Speichern.");
        return;
    }

    const result = await updateProfile(formData);

    if (result.success) {
      toast.success(result.message);
      setFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } else {
      toast.error(result.message);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 w-full max-w-md">
      <div className="space-y-2 text-center">
        <Avatar className="w-24 h-24 mx-auto">
          <AvatarImage src={preview || initialData.avatarUrl || undefined} alt="User avatar" />
          <AvatarFallback>{initialData.firstName?.[0]}{initialData.lastName?.[0]}</AvatarFallback>
        </Avatar>
        <Input
          id="avatar"
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="w-full"
        />
      </div>
      <div>
        <Label htmlFor="firstName">Vorname</Label>
        <Input
          id="firstName"
          {...form.register("firstName")}
          placeholder="Ihr Vorname"
        />
        {form.formState.errors.firstName && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.firstName.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="lastName">Nachname</Label>
        <Input
          id="lastName"
          {...form.register("lastName")}
          placeholder="Ihr Nachname"
        />
        {form.formState.errors.lastName && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.lastName.message}</p>
        )}
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Speichern..." : "Profil speichern"}
      </Button>
    </form>
  );
}