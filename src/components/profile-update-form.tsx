"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateProfile } from "@/app/dashboard/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { handleActionResponse } from "@/lib/toast-utils";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSection } from "@/components/ui/form-section";
import { FormActions } from "@/components/ui/form-actions";
import { UnsavedChangesProtection } from "@/components/ui/unsaved-changes-dialog";
import { UnsavedChangesAlert } from "@/components/ui/unsaved-changes-alert";
import { User, Camera, Mail, UserCheck } from "lucide-react";

const MAX_AVATAR_SIZE = 10 * 1024 * 1024; // 10 MB

const profileSchema = z.object({
  firstName: z.string().max(50, "Vorname ist zu lang").optional(),
  lastName: z.string().max(50, "Nachname ist zu lang").optional(),
  emailNotificationsEnabled: z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileUpdateFormProps {
  initialData: {
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    emailNotificationsEnabled: boolean;
  };
  isInDialog?: boolean;
}

export function ProfileUpdateForm({ initialData, isInDialog = false }: ProfileUpdateFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: initialData.firstName || "",
      lastName: initialData.lastName || "",
      emailNotificationsEnabled: initialData.emailNotificationsEnabled,
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
    formData.append('emailNotificationsEnabled', String(data.emailNotificationsEnabled));

    if (!data.firstName && !data.lastName && !file && data.emailNotificationsEnabled === initialData.emailNotificationsEnabled) {
        toast.info("Keine Änderungen zum Speichern.");
        return;
    }

    const result = await updateProfile(formData);

    handleActionResponse(result);

    if (result.success) {
      setFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      router.refresh();
    }
  };

  const handleCancel = () => {
    if (form.formState.isDirty && !form.formState.isSubmitting) {
      setShowUnsavedDialog(true);
    } else {
      router.push('/dashboard');
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
            title="Profilbild"
            description="Laden Sie ein neues Profilbild hoch"
            icon={<Camera className="h-5 w-5 text-primary" />}
          >
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
          </FormSection>

          <FormSection
            title="Persönliche Daten"
            description="Ihre grundlegenden Informationen"
            icon={<User className="h-5 w-5 text-primary" />}
          >
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
          </FormSection>

          <FormSection
            title="Benachrichtigungen"
            description="E-Mail-Einstellungen verwalten"
            icon={<Mail className="h-5 w-5 text-primary" />}
          >
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="emailNotificationsEnabled">E-Mail-Benachrichtigungen</Label>
                <p className="text-sm text-muted-foreground">
                  Erhalten Sie E-Mails für wichtige Ereignisse.
                </p>
              </div>
              <Controller
                control={form.control}
                name="emailNotificationsEnabled"
                render={({ field }) => (
                  <Switch
                    id="emailNotificationsEnabled"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          </FormSection>

          <FormActions
            isSubmitting={form.formState.isSubmitting}
            onCancel={handleCancel}
            onSubmit={handleSubmitClick}
            submitLabel="Profil speichern"
            cancelLabel="Abbrechen"
            showCancel={true}
            submitVariant="default"
            loadingText="Wird gespeichert..."
            align="right"
          />
        </form>

        <UnsavedChangesAlert
          open={showUnsavedDialog}
          onConfirm={() => {
            setShowUnsavedDialog(false);
            router.push('/dashboard');
          }}
          onCancel={() => setShowUnsavedDialog(false)}
          title="Ungespeicherte Änderungen verwerfen?"
          description="Wenn Sie das Profil-Formular jetzt verlassen, gehen Ihre Eingaben verloren."
        />
      </>
    );
  }

  return (
    <UnsavedChangesProtection formId="profile-update-form">
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Profil bearbeiten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormSection
              title="Profilbild"
              description="Laden Sie ein neues Profilbild hoch"
              icon={<Camera className="h-5 w-5 text-primary" />}
            >
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
            </FormSection>

            <FormSection
              title="Persönliche Daten"
              description="Ihre grundlegenden Informationen"
              icon={<User className="h-5 w-5 text-primary" />}
            >
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
            </FormSection>

            <FormSection
              title="Benachrichtigungen"
              description="E-Mail-Einstellungen verwalten"
              icon={<Mail className="h-5 w-5 text-primary" />}
            >
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="emailNotificationsEnabled">E-Mail-Benachrichtigungen</Label>
                  <p className="text-sm text-muted-foreground">
                    Erhalten Sie E-Mails für wichtige Ereignisse.
                  </p>
                </div>
                <Controller
                  control={form.control}
                  name="emailNotificationsEnabled"
                  render={({ field }) => (
                    <Switch
                      id="emailNotificationsEnabled"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </FormSection>

            <FormActions
              isSubmitting={form.formState.isSubmitting}
              onCancel={handleCancel}
              onSubmit={handleSubmitClick}
              submitLabel="Profil speichern"
              cancelLabel="Abbrechen"
              showCancel={true}
              submitVariant="default"
              loadingText="Wird gespeichert..."
              align="right"
            />
          </form>
        </CardContent>
      </Card>
    </UnsavedChangesProtection>
  );
}