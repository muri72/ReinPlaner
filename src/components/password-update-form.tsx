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

const passwordSchema = z.object({
  newPassword: z.string().min(6, "Das neue Passwort muss mindestens 6 Zeichen lang sein."),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Die Passwörter stimmen nicht überein.",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

export function PasswordUpdateForm() {
  const router = useRouter();
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: PasswordFormValues) => {
    const result = await updatePassword(data.newPassword);

    if (result.success) {
      toast.success(result.message);
      form.reset();
      // Leite den Benutzer nach einer kurzen Verzögerung zur Anmeldeseite weiter
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } else {
      toast.error(result.message);
    }
  };

  const handleSendResetEmail = async () => {
    const result = await sendPasswordResetEmail();
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Passwort ändern</CardTitle>
        <CardDescription className="text-sm">
          Hier können Sie Ihr Passwort ändern oder einen Link zum Zurücksetzen anfordern.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Speichern..." : "Neues Passwort speichern"}
          </Button>
        </form>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
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
          Link zum Zurücksetzen des Passworts senden
        </Button>
      </CardContent>
    </Card>
  );
}