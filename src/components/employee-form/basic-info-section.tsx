"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/date-picker";
import { EmployeeFormValues } from "../employee-form";

interface EmployeeBasicInfoSectionProps {
  form: ReturnType<typeof useForm<EmployeeFormValues>>;
}

function LabelWithRequired({ htmlFor, children, required, className }: { htmlFor: string; children: React.ReactNode; required?: boolean; className?: string }) {
  return (
    <Label
      htmlFor={htmlFor}
      className={cn(
        "text-sm font-medium",
        required && "after:content-['*'] after:ml-0.5 after:text-destructive",
        className
      )}
    >
      {children}
    </Label>
  );
}

export function EmployeeBasicInfoSection({ form }: EmployeeBasicInfoSectionProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <LabelWithRequired htmlFor="first_name" required>Vorname</LabelWithRequired>
          <Input id="first_name" {...form.register("first_name")} />
          {form.formState.errors.first_name && <p className="text-red-500 text-sm mt-1">{form.formState.errors.first_name.message}</p>}
        </div>
        <div>
          <LabelWithRequired htmlFor="last_name" required>Nachname</LabelWithRequired>
          <Input id="last_name" {...form.register("last_name")} />
          {form.formState.errors.last_name && <p className="text-red-500 text-sm mt-1">{form.formState.errors.last_name.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="job_title">Berufsbezeichnung</Label>
          <Input id="job_title" {...form.register("job_title")} />
        </div>
        <div>
          <Label htmlFor="department">Abteilung</Label>
          <Input id="department" {...form.register("department")} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">E-Mail</Label>
          <Input id="email" type="email" {...form.register("email")} />
          {form.formState.errors.email && <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" {...form.register("phone")} />
        </div>
      </div>

      <div>
        <Label htmlFor="address">Adresse</Label>
        <Textarea id="address" {...form.register("address")} />
      </div>

      <div>
        <Label htmlFor="notes">Notizen</Label>
        <Textarea id="notes" {...form.register("notes")} />
      </div>
    </>
  );
}