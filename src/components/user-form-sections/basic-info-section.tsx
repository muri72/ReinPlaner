"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface BasicInfoSectionProps {
  form: any;
  areFieldsDisabled: boolean;
}

function LabelWithRequired({ htmlFor, children, required, className }: { htmlFor: string; children: React.ReactNode; required?: boolean; className?: string }) {
  return (
    <Label
      htmlFor={htmlFor}
      className={cn(
        required && "after:content-['*'] after:ml-0.5 after:text-destructive",
        className
      )}
    >
      {children}
    </Label>
  );
}

export function BasicInfoSection({ form, areFieldsDisabled }: BasicInfoSectionProps) {
  return (
    <>
      <div>
        <LabelWithRequired htmlFor="firstName" required>Vorname</LabelWithRequired>
        <Input
          id="firstName"
          {...form.register("firstName")}
          placeholder="Vorname"
          disabled={areFieldsDisabled}
        />
        {form.formState.errors.firstName && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.firstName.message}</p>
        )}
      </div>

      <div>
        <LabelWithRequired htmlFor="lastName" required>Nachname</LabelWithRequired>
        <Input
          id="lastName"
          {...form.register("lastName")}
          placeholder="Nachname"
          disabled={areFieldsDisabled}
        />
        {form.formState.errors.lastName && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.lastName.message}</p>
        )}
      </div>

      <div>
        <LabelWithRequired htmlFor="email" required>E-Mail</LabelWithRequired>
        <Input
          id="email"
          type="email"
          {...form.register("email")}
          placeholder="E-Mail-Adresse"
          disabled={areFieldsDisabled}
        />
        {form.formState.errors.email && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
        )}
      </div>
    </>
  );
}
