"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateProfile } from "@/app/dashboard/actions"; // Importiere die Server-Aktion

const profileSchema = z.object({
  firstName: z.string().max(50, "Vorname ist zu lang").optional(),
  lastName: z.string().max(50, "Nachname ist zu lang").optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileUpdateFormProps {
  initialData: {
    firstName: string | null;
    lastName: string | null;
  };
}

export function ProfileUpdateForm({ initialData }: ProfileUpdateFormProps) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: initialData.firstName || "",
      lastName: initialData.lastName || "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: ProfileFormValues) => {
    const formData = new FormData();
    formData.append('firstName', data.firstName || '');
    formData.append('lastName', data.lastName || '');

    const result = await updateProfile(formData);

    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full max-w-md">
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