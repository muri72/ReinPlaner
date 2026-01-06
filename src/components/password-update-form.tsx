"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updatePassword, sendPasswordResetEmail } from "@/app/dashboard/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { handleActionResponse } from "@/lib/toast-utils";
import { FormSection } from "@/components/ui/form-section";
import { FormActions } from "@/components/ui/form-actions";
import { UnsavedChangesProtection } from "@/components/ui/unsaved-changes-dialog";
import { UnsavedChangesAlert } from "@/components/ui/unsaved-changes-alert";
import { Shield, Key, Mail } from "lucide-react";
import { useState } from "react";

const passwordSchema = z.object({
  newPassword: z.string().min(6, "Das neue Passwort muss mindestens 6 Zeichen lang sein."),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Die Passwörter stimmen nicht überein.",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

interface PasswordUpdateFormProps {
  isInDialog?: boolean;
}

export function PasswordUpdateForm({ isInDialog = false }: PasswordUpdateFormProps) {
  const router = useRouter();
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: PasswordFormValues) => {
    const result = await updatePassword(data.newPassword);

    handleActionResponse(result); // Nutze die neue Utility

    if (result.success) {
      form.reset();
      // Leite den Benutzer nach einer kurzen Verzögerung zur Anmeldeseite weiter
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
  };

  const handleSendResetEmail = async () => {
    const result = await sendPasswordResetEmail();
    handleActionResponse(result); // Nutze die neue Utility
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
            title="Passwort-Sicherheit"
            description="Ändern Sie Ihr Passwort oder fordern Sie einen Zurücksetzungs-Link an"
            icon={<Shield className="h-5 w-5 text-primary" />}
          >
            <div>
              <Label htmlFor="newPassword">Neues Passwort</Label>
              <Input
                id="newPassword"
                type="password"
                {...form.register("newPassword")}
                placeholder="••••••••"
              />
              {form.formState.errors.newPassword && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="confirmPassword">Neues Passwort bestätigen</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...form.register("confirmPassword")}
                placeholder="••••••••"
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>
          </FormSection>

          <FormActions
            isSubmitting={form.formState.isSubmitting}
            onCancel={handleCancel}
            onSubmit={handleSubmitClick}
            submitLabel="Passwort ändern"
            cancelLabel="Abbrechen"
            showCancel={true}
            submitVariant="default"
            loadingText="Wird gespeichert..."
            align="right"
          />
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Oder
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleSendResetEmail}
          type="button"
        >
          <Mail className="mr-2 h-4 w-4" />
          Link zum Zurücksetzen des Passworts senden
        </Button>

        <UnsavedChangesAlert
          open={showUnsavedDialog}
          onConfirm={() => {
            setShowUnsavedDialog(false);
            router.push('/dashboard');
          }}
          onCancel={() => setShowUnsavedDialog(false)}
          title="Ungespeicherte Änderungen verwerfen?"
          description="Wenn Sie das Passwort-Formular jetzt verlassen, gehen Ihre Eingaben verloren."
        />
      </>
    );
  }

  return (
    <UnsavedChangesProtection formId="password-update-form">
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Passwort ändern
          </CardTitle>
          <CardDescription className="text-sm">
            Hier können Sie Ihr Passwort ändern oder einen Link zum Zurücksetzen anfordern.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormSection
              title="Passwort-Sicherheit"
              description="Ändern Sie Ihr Passwort oder fordern Sie einen Zurücksetzungs-Link an"
              icon={<Key className="h-5 w-5 text-primary" />}
            >
              <div>
                <Label htmlFor="newPassword">Neues Passwort</Label>
                <Input
                  id="newPassword"
                  type="password"
                  {...form.register("newPassword")}
                  placeholder="••••••••"
                />
                {form.formState.errors.newPassword && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.newPassword.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="confirmPassword">Neues Passwort bestätigen</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...form.register("confirmPassword")}
                  placeholder="••••••••"
                />
                {form.formState.errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.confirmPassword.message}</p>
                )}
              </div>
            </FormSection>

            <FormActions
              isSubmitting={form.formState.isSubmitting}
              onCancel={handleCancel}
              onSubmit={handleSubmitClick}
              submitLabel="Passwort ändern"
              cancelLabel="Abbrechen"
              showCancel={true}
              submitVariant="default"
              loadingText="Wird gespeichert..."
              align="right"
            />
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Oder
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleSendResetEmail}
            type="button"
          >
            <Mail className="mr-2 h-4 w-4" />
            Link zum Zurücksetzen des Passworts senden
          </Button>
        </CardContent>
      </Card>
    </UnsavedChangesProtection>
  );
}