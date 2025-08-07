"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";

export const employeeSchema = z.object({
  firstName: z.string().min(1, "Vorname ist erforderlich").max(100, "Vorname ist zu lang"),
  lastName: z.string().min(1, "Nachname ist erforderlich").max(100, "Nachname ist zu lang"),
  email: z.string().email("Ungültiges E-Mail-Format").max(100, "E-Mail ist zu lang").optional().nullable(),
  phone: z.string().max(50, "Telefonnummer ist zu lang").optional().nullable(),
  hireDate: z.date().optional().nullable(),
  status: z.enum(["active", "inactive", "on_leave"]).default("active"),
  // Neue Felder
  contractType: z.enum(["minijob", "part_time", "full_time", "fixed_term"]).default("full_time"),
  hourlyRate: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.nullable(z.number().min(0, "Stundenlohn muss positiv sein").max(9999.99, "Stundenlohn ist zu hoch")).optional()
  ),
  startDate: z.date().optional().nullable(),
});

export type EmployeeFormInput = z.input<typeof employeeSchema>;
export type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  initialData?: Partial<EmployeeFormInput>;
  onSubmit: (data: EmployeeFormValues) => Promise<{ success: boolean; message: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
}

export function EmployeeForm({ initialData, onSubmit, submitButtonText, onSuccess }: EmployeeFormProps) {
  const resolvedDefaultValues: EmployeeFormValues = {
    firstName: initialData?.firstName ?? "",
    lastName: initialData?.lastName ?? "",
    email: initialData?.email ?? null,
    phone: initialData?.phone ?? null,
    hireDate: initialData?.hireDate ? new Date(initialData.hireDate) : null,
    status: initialData?.status ?? "active",
    // Neue Initialwerte
    contractType: initialData?.contractType ?? "full_time",
    hourlyRate: typeof initialData?.hourlyRate === 'number' ? initialData.hourlyRate : null, // Korrektur hier
    startDate: initialData?.startDate ? new Date(initialData.startDate) : null,
  };

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema as z.ZodSchema<EmployeeFormValues>),
    defaultValues: resolvedDefaultValues,
  });

  const [displayHireDate, setDisplayHireDate] = useState<string | undefined>(undefined);
  const [displayStartDate, setDisplayStartDate] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (form.watch("hireDate")) {
      setDisplayHireDate(format(form.watch("hireDate")!, "PPP"));
    } else {
      setDisplayHireDate(undefined);
    }
  }, [form.watch("hireDate")]);

  useEffect(() => {
    if (form.watch("startDate")) {
      setDisplayStartDate(format(form.watch("startDate")!, "PPP"));
    } else {
      setDisplayStartDate(undefined);
    }
  }, [form.watch("startDate")]);

  const handleFormSubmit: SubmitHandler<EmployeeFormValues> = async (data) => {
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
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full max-w-md" suppressHydrationWarning>
      <div>
        <Label htmlFor="firstName">Vorname</Label>
        <Input
          id="firstName"
          {...form.register("firstName")}
          placeholder="Z.B. Max"
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
          placeholder="Z.B. Mustermann"
        />
        {form.formState.errors.lastName && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.lastName.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="email">E-Mail (optional)</Label>
        <Input
          id="email"
          type="email"
          {...form.register("email")}
          placeholder="Z.B. max.mustermann@example.com"
        />
        {form.formState.errors.email && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="phone">Telefon (optional)</Label>
        <Input
          id="phone"
          type="tel"
          {...form.register("phone")}
          placeholder="Z.B. +49 123 456789"
        />
        {form.formState.errors.phone && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.phone.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="hireDate">Einstellungsdatum (optional)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !form.watch("hireDate") && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {displayHireDate ? displayHireDate : <span>Datum auswählen</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={form.watch("hireDate") || undefined}
              onSelect={(date) => form.setValue("hireDate", date || null)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {form.formState.errors.hireDate && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.hireDate.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <Select onValueChange={(value) => form.setValue("status", value as "active" | "inactive" | "on_leave")} value={form.watch("status")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Status auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Aktiv</SelectItem>
            <SelectItem value="inactive">Inaktiv</SelectItem>
            <SelectItem value="on_leave">Im Urlaub</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.status && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.status.message}</p>
        )}
      </div>

      {/* Neue Felder */}
      <div>
        <Label htmlFor="contractType">Vertragsart</Label>
        <Select onValueChange={(value) => form.setValue("contractType", value as "minijob" | "part_time" | "full_time" | "fixed_term")} value={form.watch("contractType")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Vertragsart auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minijob">Minijob</SelectItem>
            <SelectItem value="part_time">Teilzeit</SelectItem>
            <SelectItem value="full_time">Vollzeit</SelectItem>
            <SelectItem value="fixed_term">Befristet</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.contractType && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.contractType.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="hourlyRate">Stundenlohn (optional)</Label>
        <Input
          id="hourlyRate"
          type="number"
          step="0.01"
          {...form.register("hourlyRate", { valueAsNumber: true })}
          placeholder="Z.B. 12.50"
        />
        {form.formState.errors.hourlyRate && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.hourlyRate.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="startDate">Vertragsstart (optional)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !form.watch("startDate") && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {displayStartDate ? displayStartDate : <span>Datum auswählen</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={form.watch("startDate") || undefined}
              onSelect={(date) => form.setValue("startDate", date || null)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {form.formState.errors.startDate && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.startDate.message}</p>
        )}
      </div>

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}