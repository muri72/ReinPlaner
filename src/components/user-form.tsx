"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const userSchema = z.object({
  email: z.string().email("Ungültiges E-Mail-Format").min(1, "E-Mail ist erforderlich"),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein").optional(), // Optional for updates
  firstName: z.string().min(1, "Vorname ist erforderlich").max(100, "Vorname ist zu lang"),
  lastName: z.string().min(1, "Nachname ist erforderlich").max(100, "Nachname ist zu lang"),
  role: z.enum(["admin", "manager", "employee", "customer"]).default("employee"),
});

export type UserFormInput = z.input<typeof userSchema>;
export type UserFormValues = z.infer<typeof userSchema>;

interface UserFormProps {
  initialData?: Partial<UserFormInput>;
  onSubmit: (data: UserFormValues) => Promise<{ success: boolean; message: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
  isEditMode?: boolean;
}

export function UserForm({ initialData, onSubmit, submitButtonText, onSuccess, isEditMode = false }: UserFormProps) {
  const resolvedDefaultValues: UserFormValues = {
    email: initialData?.email ?? "",
    password: initialData?.password ?? (isEditMode ? undefined : ""), // Password optional in edit mode
    firstName: initialData?.firstName ?? "",
    lastName: initialData?.lastName ?? "",
    role: initialData?.role ?? "employee",
  };

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema as z.ZodSchema<UserFormValues>),
    defaultValues: resolvedDefaultValues,
  });

  const handleFormSubmit: SubmitHandler<UserFormValues> = async (data) => {
    const result = await onSubmit(data);

    if (result.success) {
      toast.success(result.message);
      if (!initialData) {
        form.reset();
      }
      onSuccess?.();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full max-w-md">
      <div>
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          type="email"
          {...form.register("email")}
          placeholder="E-Mail-Adresse"
          disabled={isEditMode} // Email should not be editable after creation
        />
        {form.formState.errors.email && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
        )}
      </div>
      {!isEditMode && ( // Password only required for new user creation
        <div>
          <Label htmlFor="password">Passwort</Label>
          <Input
            id="password"
            type="password"
            {...form.register("password")}
            placeholder="Passwort"
          />
          {form.formState.errors.password && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.password.message}</p>
          )}
        </div>
      )}
      <div>
        <Label htmlFor="firstName">Vorname</Label>
        <Input
          id="firstName"
          {...form.register("firstName")}
          placeholder="Vorname"
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
          placeholder="Nachname"
        />
        {form.formState.errors.lastName && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.lastName.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="role">Rolle</Label>
        <Select onValueChange={(value) => form.setValue("role", value as UserFormValues["role"])} value={form.watch("role")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Rolle auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="employee">Mitarbeiter</SelectItem>
            <SelectItem value="customer">Kunde</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.role && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.role.message}</p>
        )}
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}