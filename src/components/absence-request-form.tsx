"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { DatePicker } from "@/components/date-picker";
import { handleActionResponse } from "@/lib/toast-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSection } from "@/components/ui/form-section";
import { FormActions } from "@/components/ui/form-actions";
import { useFormUnsavedChanges } from "@/components/ui/unsaved-changes-context";
import { UnsavedChangesProtection } from "@/components/ui/unsaved-changes-dialog";
import { UnsavedChangesAlert } from "@/components/ui/unsaved-changes-alert";
import { CalendarDays, FileText, Settings, User, AlertTriangle, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseLocalDate } from "@/lib/utils";
import { calculateWorkingDays, formatWorkingDays, getDefaultWorkingDays } from "@/lib/utils/date-utils";
import { getVacationBalance } from "@/app/dashboard/absence-requests/actions";
import { Checkbox } from "@/components/ui/checkbox";

// Helper component for labels with required asterisk
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

// Define the schema for absence request form values
export const absenceRequestSchema = z.object({
  employeeId: z.string().uuid("Ungültige Mitarbeiter-ID").min(1, "Mitarbeiter ist erforderlich"),
  startDate: z.date({ required_error: "Startdatum ist erforderlich" }),
  endDate: z.date({ required_error: "Enddatum ist erforderlich" }),
  type: z.enum(["vacation", "sick_leave", "training", "unpaid_leave"], { required_error: "Abwesenheitstyp ist erforderlich" }).default("vacation"),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  notes: z.string().max(500, "Notizen sind zu lang").optional().nullable(),
  adminNotes: z.string().max(500, "Admin-Notizen sind zu lang").optional().nullable(),
}).refine((data) => data.endDate >= data.startDate, {
  message: "Enddatum muss nach oder am Startdatum liegen.",
  path: ["endDate"],
});

export type AbsenceRequestFormValues = z.infer<typeof absenceRequestSchema>;
export type AbsenceRequestFormInput = z.input<typeof absenceRequestSchema>;

interface AbsenceRequestFormProps {
  initialData?: Partial<AbsenceRequestFormValues>;
  onSubmit: (data: AbsenceRequestFormValues) => Promise<{ success: boolean; message: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
  currentUserRole: 'admin' | 'manager' | 'employee';
  currentUserId: string;
  isInDialog?: boolean;
}

export function AbsenceRequestForm({ initialData, onSubmit, submitButtonText, onSuccess, currentUserRole, currentUserId, isInDialog = false }: AbsenceRequestFormProps) {
  const supabase = createClient();
  const router = useRouter();
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string; user_id: string | null; working_days_per_week: number | null }[]>([]);
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState<number>(5);
  const [vacationBalance, setVacationBalance] = useState<number>(30);
  const [daysUsed, setDaysUsed] = useState<number>(0);
  const [convertToUnpaid, setConvertToUnpaid] = useState(false);

  const resolvedDefaultValues: AbsenceRequestFormValues = {
    employeeId: initialData?.employeeId ?? "",
    startDate: initialData?.startDate
      ? (typeof initialData.startDate === 'string'
          ? parseLocalDate(initialData.startDate) || new Date(initialData.startDate)
          : new Date(initialData.startDate))
      : new Date(),
    endDate: initialData?.endDate
      ? (typeof initialData.endDate === 'string'
          ? parseLocalDate(initialData.endDate) || new Date(initialData.endDate)
          : new Date(initialData.endDate))
      : new Date(),
    type: initialData?.type ?? "vacation",
    status: initialData?.status ?? "pending",
    notes: initialData?.notes ?? null,
    adminNotes: initialData?.adminNotes ?? null,
  };

  const form = useForm<AbsenceRequestFormInput>({
    resolver: zodResolver(absenceRequestSchema),
    defaultValues: resolvedDefaultValues,
  });

  const isManagerOrAdmin = currentUserRole === 'admin' || currentUserRole === 'manager';

  // Register with unsaved changes context
  useFormUnsavedChanges("absence-request-form", form.formState.isDirty);

  useEffect(() => {
    const fetchEmployees = async () => {
      let query = supabase
        .from('employees')
        .select('id, first_name, last_name, user_id, working_days_per_week')
        .order('last_name', { ascending: true });

      // Only show active employees in dropdowns for new requests
      if (!initialData) { // Only filter for new requests, not for editing existing ones
        query = query.eq('status', 'active');
      }

      const { data, error } = await query;

      if (error) {
        console.error("Fehler beim Laden der Mitarbeiter:", error);
        toast.error("Fehler beim Laden der Mitarbeiter.");
        return;
      }

      const employeeList = data || [];
      const userEmployee = employeeList.find(emp => emp.user_id === currentUserId);

      if (isManagerOrAdmin) {
        setEmployees(employeeList);
        if (userEmployee && !initialData?.employeeId) { // Set default only if creating new and no initial employee is provided
          form.setValue("employeeId", userEmployee.id);
        }
      } else {
        if (userEmployee) {
          setEmployees([userEmployee]);
          form.setValue("employeeId", userEmployee.id);
        } else {
          setEmployees([]); // No employee linked to current user
          form.setValue("employeeId", "");
          toast.error("Ihr Benutzerkonto ist keinem aktiven Mitarbeiter zugewiesen.");
        }
      }
    };
    fetchEmployees();
  }, [supabase, isManagerOrAdmin, currentUserId, form, initialData]);

  // Fetch vacation balance when employee changes
  useEffect(() => {
    const fetchVacationBalance = async () => {
      const employeeId = form.watch("employeeId");
      if (!employeeId) {
        setVacationBalance(30);
        setDaysUsed(0);
        setWorkingDaysPerWeek(5);
        return;
      }

      const result = await getVacationBalance(employeeId);
      if (result.success && result.data) {
        setVacationBalance(result.data.remainingDays + result.data.daysUsed);
        setDaysUsed(result.data.daysUsed);
        setWorkingDaysPerWeek(result.data.workingDaysPerWeek);
      } else {
        setVacationBalance(30);
        setDaysUsed(0);
        setWorkingDaysPerWeek(5);
      }
    };

    fetchVacationBalance();
  }, [form.watch("employeeId")]);

  const handleFormSubmit: SubmitHandler<AbsenceRequestFormInput> = async (data) => {
    const selectedEmployee = employees.find(e => e.id === data.employeeId);
    const isSelfRequestByAdmin = currentUserRole === 'admin' && selectedEmployee?.user_id === currentUserId;
    if (isSelfRequestByAdmin) {
      data.status = 'approved';
    }
    const result = await onSubmit(data as AbsenceRequestFormValues);
    handleActionResponse(result);
    if (result.success) {
      if (!initialData) form.reset();
      onSuccess?.();
    }
  };

  const handleCancel = () => {
    if (form.formState.isDirty && !form.formState.isSubmitting) {
      setShowUnsavedDialog(true);
    } else {
      onSuccess?.();
    }
  };

  // Wrapper function to call handleFormSubmit with current form values
  const handleSubmitClick = async () => {
    const data = form.getValues();
    await handleFormSubmit(data);
  };

  const typeOptions = {
    vacation: "Urlaub",
    sick_leave: "Krankheit",
    training: "Weiterbildung",
    unpaid_leave: "Unbezahlter Urlaub",
  };

  const statusOptions = {
    pending: "Ausstehend",
    approved: "Genehmigt",
    rejected: "Abgelehnt",
  };

  // Calculate vacation days based on selected dates and working days
  const requestedDays = useMemo(() => {
    const startDate = form.watch("startDate");
    const endDate = form.watch("endDate");
    if (!startDate || !endDate || startDate > endDate) return 0;
    return calculateWorkingDays(startDate, endDate, workingDaysPerWeek);
  }, [form.watch("startDate"), form.watch("endDate"), workingDaysPerWeek]);

  // Calculate remaining balance
  const remainingBalance = vacationBalance - daysUsed;

  // Check if vacation request exceeds balance
  const isExceedingBalance = form.watch("type") === "vacation" && requestedDays > remainingBalance && remainingBalance >= 0;
  const excessDays = isExceedingBalance ? requestedDays - remainingBalance : 0;

  // Get working days format for display
  const workingDaysList = getDefaultWorkingDays(workingDaysPerWeek);
  const workingDaysText = formatWorkingDays(workingDaysList);

  if (isInDialog) {
    return (
      <>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6" suppressHydrationWarning>
          <FormSection
            title="Mitarbeiter"
            description="Wählen Sie den Mitarbeiter für den Abwesenheitsantrag"
            icon={<User className="h-5 w-5 text-primary" />}
          >
            <div>
              <LabelWithRequired htmlFor="employeeId" required>Mitarbeiter</LabelWithRequired>
              <Select onValueChange={(value) => form.setValue("employeeId", value)} value={form.watch("employeeId")} disabled={!isManagerOrAdmin && employees.length > 0}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Mitarbeiter auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.employeeId && <p className="text-red-500 text-sm mt-1">{form.formState.errors.employeeId.message}</p>}
              {!isManagerOrAdmin && employees.length === 0 && (
                <p className="text-muted-foreground text-sm mt-1">Kein aktiver Mitarbeiter für Ihr Konto gefunden.</p>
              )}
            </div>
          </FormSection>

          <FormSection
            title="Abwesenheitszeitraum"
            description="Start- und Enddatum der Abwesenheit"
            icon={<CalendarDays className="h-5 w-5 text-primary" />}
          >
            <div className="grid grid-cols-2 gap-4">
              <DatePicker label="Startdatum" value={form.watch("startDate")} onChange={(date) => form.setValue("startDate", date || new Date())} error={form.formState.errors.startDate?.message} />
              <DatePicker label="Enddatum" value={form.watch("endDate")} onChange={(date) => form.setValue("endDate", date || new Date())} error={form.formState.errors.endDate?.message} />
            </div>
            {form.formState.errors.endDate && <p className="text-red-500 text-sm mt-1">{form.formState.errors.endDate.message}</p>}

            {/* Vacation days calculation display */}
            {form.watch("type") === "vacation" && requestedDays > 0 && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2 text-sm">
                  <Info className="h-4 w-4 text-primary" />
                  <span className="font-medium">{requestedDays} Urlaubstag{requestedDays !== 1 ? 'e' : ''}</span>
                  <span className="text-muted-foreground">
                    (basierend auf {workingDaysPerWeek} Arbeitstag{workingDaysPerWeek !== 1 ? 'en' : ''} pro Woche: {workingDaysText})
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Verfügbar: {remainingBalance} Tage | Bereits verwendet: {daysUsed} Tage
                </div>
                {isExceedingBalance && (
                  <div className="mt-2 p-2 bg-amber-100 dark:bg-amber-900/60 rounded border border-amber-300 dark:border-amber-700">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 text-sm font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      Achtung: {excessDays} Tag{excessDays !== 1 ? 'e' : ''} überschreiten Ihr Kontingent!
                    </div>
                  </div>
                )}
              </div>
            )}
          </FormSection>

          <FormSection
            title="Abwesenheitsdetails"
            description="Art der Abwesenheit und zusätzliche Informationen"
            icon={<FileText className="h-5 w-5 text-primary" />}
          >
            <div>
              <LabelWithRequired htmlFor="type" required>Art der Abwesenheit</LabelWithRequired>
              <Select onValueChange={(value) => {
                form.setValue("type", value as AbsenceRequestFormValues["type"]);
                if (value !== "unpaid_leave") {
                  setConvertToUnpaid(false);
                }
              }} value={form.watch("type")}>
                <SelectTrigger><SelectValue placeholder="Art auswählen" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeOptions).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.formState.errors.type && <p className="text-red-500 text-sm mt-1">{form.formState.errors.type.message}</p>}
            </div>

            {/* Option to convert excess to unpaid leave */}
            {isExceedingBalance && !convertToUnpaid && (
              <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-800/60 rounded-lg border border-slate-300 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="convertToUnpaid"
                    checked={convertToUnpaid}
                    onCheckedChange={(checked) => {
                      setConvertToUnpaid(checked === true);
                      if (checked === true) {
                        form.setValue("type", "unpaid_leave");
                      } else {
                        form.setValue("type", "vacation");
                      }
                    }}
                    className="mt-0.5"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="convertToUnpaid"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {excessDays} Tag{excessDays !== 1 ? 'e' : ''} als unbezahlten Urlaub beantragen
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Die {excessDays} überschreitenden Tage werden nicht von Ihrem Urlaubskontingent abgezogen.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Show unpaid leave info when selected */}
            {form.watch("type") === "unpaid_leave" && (
              <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-800/60 rounded-lg border border-slate-300 dark:border-slate-700">
                <div className="flex items-center gap-2 text-sm">
                  <Info className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {requestedDays} Tag{requestedDays !== 1 ? 'e' : ''} unbezahlter Urlaub
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Diese Tage werden nicht von Ihrem Urlaubskontingent abgezogen.
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="notes">Notizen (optional)</Label>
              <Textarea id="notes" {...form.register("notes")} placeholder="Grund für die Abwesenheit..." rows={3} />
              {form.formState.errors.notes && <p className="text-red-500 text-sm mt-1">{form.formState.errors.notes.message}</p>}
            </div>
          </FormSection>

          {isManagerOrAdmin && (
            <FormSection
              title="Admin-Bereich"
              description="Genehmigung und interne Notizen"
              icon={<Settings className="h-5 w-5 text-primary" />}
            >
              <div>
                <Label htmlFor="status">Status</Label>
                <Select onValueChange={(value) => form.setValue("status", value as AbsenceRequestFormValues["status"])} value={form.watch("status")}>
                  <SelectTrigger><SelectValue placeholder="Status auswählen" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusOptions).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.formState.errors.status && <p className="text-red-500 text-sm mt-1">{form.formState.errors.status.message}</p>}
              </div>
              <div>
                <Label htmlFor="adminNotes">Admin-Notizen (optional)</Label>
                <Textarea id="adminNotes" {...form.register("adminNotes")} placeholder="Interne Notizen zum Antrag..." rows={3} />
                {form.formState.errors.adminNotes && <p className="text-red-500 text-sm mt-1">{form.formState.errors.adminNotes.message}</p>}
              </div>
            </FormSection>
          )}

          <FormActions
            isSubmitting={form.formState.isSubmitting}
            onCancel={handleCancel}
            onSubmit={handleSubmitClick}
            submitLabel={submitButtonText}
            cancelLabel="Abbrechen"
            showCancel={true}
            submitVariant="default"
            loadingText="Wird verarbeitet..."
            align="right"
          />
        </form>

        <UnsavedChangesAlert
          open={showUnsavedDialog}
          onConfirm={() => {
            setShowUnsavedDialog(false);
            onSuccess?.();
          }}
          onCancel={() => setShowUnsavedDialog(false)}
          title="Ungespeicherte Änderungen verwerfen?"
          description="Wenn Sie das Abwesenheits-Formular jetzt verlassen, gehen Ihre Eingaben verloren."
        />
      </>
    );
  }

  return (
    <UnsavedChangesProtection formId="absence-request-form">
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Abwesenheitsantrag
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6" suppressHydrationWarning>
            <FormSection
              title="Mitarbeiter"
              description="Wählen Sie den Mitarbeiter für den Abwesenheitsantrag"
              icon={<User className="h-5 w-5 text-primary" />}
            >
              <div>
                <LabelWithRequired htmlFor="employeeId" required>Mitarbeiter</LabelWithRequired>
                <Select onValueChange={(value) => form.setValue("employeeId", value)} value={form.watch("employeeId")} disabled={!isManagerOrAdmin && employees.length > 0}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Mitarbeiter auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.employeeId && <p className="text-red-500 text-sm mt-1">{form.formState.errors.employeeId.message}</p>}
                {!isManagerOrAdmin && employees.length === 0 && (
                  <p className="text-muted-foreground text-sm mt-1">Kein aktiver Mitarbeiter für Ihr Konto gefunden.</p>
                )}
              </div>
            </FormSection>

            <FormSection
              title="Abwesenheitszeitraum"
              description="Start- und Enddatum der Abwesenheit"
              icon={<CalendarDays className="h-5 w-5 text-primary" />}
            >
              <div className="grid grid-cols-2 gap-4">
                <DatePicker label="Startdatum" value={form.watch("startDate")} onChange={(date) => form.setValue("startDate", date || new Date())} error={form.formState.errors.startDate?.message} />
                <DatePicker label="Enddatum" value={form.watch("endDate")} onChange={(date) => form.setValue("endDate", date || new Date())} error={form.formState.errors.endDate?.message} />
              </div>
              {form.formState.errors.endDate && <p className="text-red-500 text-sm mt-1">{form.formState.errors.endDate.message}</p>}

              {/* Vacation days calculation display */}
              {form.watch("type") === "vacation" && requestedDays > 0 && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2 text-sm">
                    <Info className="h-4 w-4 text-primary" />
                    <span className="font-medium">{requestedDays} Urlaubstag{requestedDays !== 1 ? 'e' : ''}</span>
                    <span className="text-muted-foreground">
                      (basierend auf {workingDaysPerWeek} Arbeitstag{workingDaysPerWeek !== 1 ? 'en' : ''} pro Woche: {workingDaysText})
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Verfügbar: {remainingBalance} Tage | Bereits verwendet: {daysUsed} Tage
                  </div>
                  {isExceedingBalance && (
                    <div className="mt-2 p-2 bg-amber-100 dark:bg-amber-900/60 rounded border border-amber-300 dark:border-amber-700">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 text-sm font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        Achtung: {excessDays} Tag{excessDays !== 1 ? 'e' : ''} überschreiten Ihr Kontingent!
                      </div>
                    </div>
                  )}
                </div>
              )}
            </FormSection>

            <FormSection
              title="Abwesenheitsdetails"
              description="Art der Abwesenheit und zusätzliche Informationen"
              icon={<FileText className="h-5 w-5 text-primary" />}
            >
              <div>
                <LabelWithRequired htmlFor="type" required>Art der Abwesenheit</LabelWithRequired>
                <Select onValueChange={(value) => {
                  form.setValue("type", value as AbsenceRequestFormValues["type"]);
                  if (value !== "unpaid_leave") {
                    setConvertToUnpaid(false);
                  }
                }} value={form.watch("type")}>
                  <SelectTrigger><SelectValue placeholder="Art auswählen" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeOptions).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.formState.errors.type && <p className="text-red-500 text-sm mt-1">{form.formState.errors.type.message}</p>}
              </div>

              {/* Option to convert excess to unpaid leave */}
              {isExceedingBalance && !convertToUnpaid && (
                <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-800/60 rounded-lg border border-slate-300 dark:border-slate-700">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="convertToUnpaid2"
                      checked={convertToUnpaid}
                      onCheckedChange={(checked) => {
                        setConvertToUnpaid(checked === true);
                        if (checked === true) {
                          form.setValue("type", "unpaid_leave");
                        } else {
                          form.setValue("type", "vacation");
                        }
                      }}
                      className="mt-0.5"
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label
                        htmlFor="convertToUnpaid2"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {excessDays} Tag{excessDays !== 1 ? 'e' : ''} als unbezahlten Urlaub beantragen
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Die {excessDays} überschreitenden Tage werden nicht von Ihrem Urlaubskontingent abgezogen.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Show unpaid leave info when selected */}
              {form.watch("type") === "unpaid_leave" && (
                <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-800/60 rounded-lg border border-slate-300 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-sm">
                    <Info className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {requestedDays} Tag{requestedDays !== 1 ? 'e' : ''} unbezahlter Urlaub
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Diese Tage werden nicht von Ihrem Urlaubskontingent abgezogen.
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="notes">Notizen (optional)</Label>
                <Textarea id="notes" {...form.register("notes")} placeholder="Grund für die Abwesenheit..." rows={3} />
                {form.formState.errors.notes && <p className="text-red-500 text-sm mt-1">{form.formState.errors.notes.message}</p>}
              </div>
            </FormSection>

            {isManagerOrAdmin && (
              <FormSection
                title="Admin-Bereich"
                description="Genehmigung und interne Notizen"
                icon={<Settings className="h-5 w-5 text-primary" />}
              >
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select onValueChange={(value) => form.setValue("status", value as AbsenceRequestFormValues["status"])} value={form.watch("status")}>
                    <SelectTrigger><SelectValue placeholder="Status auswählen" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusOptions).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.status && <p className="text-red-500 text-sm mt-1">{form.formState.errors.status.message}</p>}
                </div>
                <div>
                  <Label htmlFor="adminNotes">Admin-Notizen (optional)</Label>
                  <Textarea id="adminNotes" {...form.register("adminNotes")} placeholder="Interne Notizen zum Antrag..." rows={3} />
                  {form.formState.errors.adminNotes && <p className="text-red-500 text-sm mt-1">{form.formState.errors.adminNotes.message}</p>}
                </div>
              </FormSection>
            )}

            <FormActions
              isSubmitting={form.formState.isSubmitting}
              onCancel={handleCancel}
              onSubmit={handleSubmitClick}
              submitLabel={submitButtonText}
              cancelLabel="Abbrechen"
              showCancel={true}
              submitVariant="default"
              loadingText="Wird verarbeitet..."
              align="right"
            />
          </form>
        </CardContent>
      </Card>
    </UnsavedChangesProtection>
  );
}