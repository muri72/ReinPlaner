"use client";

import { useForm, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ObjectBasicInfoSectionProps {
  form: any;
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

export function ObjectBasicInfoSection({ form }: ObjectBasicInfoSectionProps) {
  return (
    <>
      <div>
        <LabelWithRequired htmlFor="name" required>Objektname</LabelWithRequired>
        <Input id="name" {...form.register("name")} />
        {form.formState.errors.name && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message as string}</p>
        )}
      </div>

      <div>
        <LabelWithRequired htmlFor="address" required>Adresse</LabelWithRequired>
        <Input id="address" {...form.register("address")} />
        {form.formState.errors.address && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.address.message as string}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea id="description" {...form.register("description")} />
        {form.formState.errors.description && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message as string}</p>
        )}
      </div>

      <div>
        <Label htmlFor="notes">Notizen</Label>
        <Textarea id="notes" {...form.register("notes")} />
        {form.formState.errors.notes && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.notes.message as string}</p>
        )}
      </div>
    </>
  );
}
