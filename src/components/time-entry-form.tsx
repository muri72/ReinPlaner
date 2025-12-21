"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useCallback } from "react";
import { DatePicker } from "@/components/date-picker";
import { calculateHours } from "@/lib/utils";
import { handleActionResponse } from "@/lib/toast-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSection } from "@/components/ui/form-section";
import { FormActions } from "@/components/ui/form-actions";
import { useFormUnsavedChanges } from "@/components/ui/unsaved-changes-context";
import { UnsavedChangesProtection } from "@/components/ui/unsaved-changes-dialog";
import { UnsavedChangesAlert } from "@/components/ui/unsaved-changes-alert";
import { useRouter } from "next/navigation";
import { Clock, Settings, User, Building, FileText, Calendar } from "lucide-react";
import { timeEntrySchema, TimeEntryFormInput, TimeEntryFormValues } from "@/lib/utils/form-utils";
import { useTimeEntryFormData } from "@/hooks/use-time-entry-form-data";

// Re-export types for backward compatibility
export type { TimeEntryFormInput, TimeEntryFormValues } from "@/lib/utils/form-utils";
export { timeEntrySchema } from "@/lib/utils/form-utils";

interface TimeEntryFormProps {
  initialData?: Partial<TimeEntryFormInput>;
  onSubmit: (data: TimeEntryFormValues) => Promise<{ success: boolean; message: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
  currentUserId: string;
  isAdmin: boolean;
  isInDialog?: boolean;
}

export function TimeEntryForm({ initialData, onSubmit, submitButtonText, onSuccess, currentUserId, isAdmin, isInDialog = false }: TimeEntryFormProps) {
  const router = useRouter();
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const resolvedDefaultValues: TimeEntryFormValues = {
    employeeId: initialData?.employeeId ?? null,
    customerId: initialData?.customerId ?? null,
    objectId: initialData?.objectId ?? null,
    orderId: initialData?.orderId ?? null,
    startDate: initialData?.startDate ?? new Date(),
    startTime: initialData?.startTime ?? new Date().toTimeString().slice(0, 5),
    endDate: initialData?.endDate ?? null,
    endTime: initialData?.endTime ?? null,
    durationMinutes: typeof initialData?.durationMinutes === 'number' ? initialData.durationMinutes : null,
    breakMinutes: typeof initialData?.breakMinutes === 'number' ? initialData.breakMinutes : null,
    type: initialData?.type ?? "manual",
    notes: initialData?.notes ?? null,
  };

  const form = useForm<TimeEntryFormInput>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: resolvedDefaultValues,
  });

  // Register with unsaved changes context
  useFormUnsavedChanges("time-entry-form", form.formState.isDirty);

  const selectedCustomerId = form.watch("customerId");
  const selectedObjectId = form.watch("objectId");
  const selectedStartDate = form.watch("startDate");
  const selectedType = form.watch("type");

  // Handle auto-set employee for non-admin users
  const handleEmployeeAutoSet = useCallback((employeeId: string) => {
    form.setValue("employeeId", employeeId);
  }, [form]);

  // Use extracted hook for data fetching
  const {
    employees,
    customers,
    loading: loadingDropdowns,
    getFilteredObjects,
    getFilteredOrders,
    getObjectSchedule,
  } = useTimeEntryFormData({
    currentUserId,
    isAdmin,
    initialEmployeeId: initialData?.employeeId,
    onEmployeeAutoSet: handleEmployeeAutoSet,
  });

  // Filter objects and orders based on selected customer/object
  const filteredObjects = getFilteredObjects(selectedCustomerId || null);
  const filteredOrders = getFilteredOrders(selectedCustomerId || null, selectedObjectId || null);

  // Reset object/order if customer/object changes
  useEffect(() => {
    if (selectedCustomerId && !filteredObjects.some(obj => obj.id === form.getValues("objectId"))) {
      form.setValue("objectId", null);
    }
    if (selectedObjectId && !filteredOrders.some(order => order.id === form.getValues("orderId"))) {
      form.setValue("orderId", null);
    }
  }, [selectedCustomerId, selectedObjectId, filteredObjects, filteredOrders, form]);

  // Intelligent pre-filling based on selected object and date
  useEffect(() => {
    if (selectedObjectId && selectedStartDate) {
      const dayOfWeek = selectedStartDate.getDay();
      const { startTime, endTime } = getObjectSchedule(selectedObjectId, dayOfWeek);

      if (startTime && endTime) {
        form.setValue("startTime", startTime);
        form.setValue("endTime", endTime);
        form.setValue("endDate", selectedStartDate);
        const duration = calculateHours(startTime, endTime);
        if (duration !== null) {
          form.setValue("durationMinutes", Math.round(duration * 60));
        }
      } else {
        // Clear times if no schedule found for the day
        form.setValue("startTime", new Date().toTimeString().slice(0, 5));
        form.setValue("endTime", null);
        form.setValue("endDate", null);
        form.setValue("durationMinutes", null);
      }
    } else if (!initialData) {
      // Reset to current time if object or date is cleared and not in edit mode
      form.setValue("startTime", new Date().toTimeString().slice(0, 5));
      form.setValue("endTime", null);
      form.setValue("endDate", null);
      form.setValue("durationMinutes", null);
    }
  }, [selectedObjectId, selectedStartDate, getObjectSchedule, form, initialData]);


  const handleFormSubmit: SubmitHandler<TimeEntryFormInput> = async (data) => {
    const result = await onSubmit(data as TimeEntryFormValues);

    handleActionResponse(result);

    if (result.success) {
      if (!initialData) {
        form.reset({
          startDate: new Date(),
          startTime: new Date().toTimeString().slice(0, 5),
          endDate: null,
          endTime: null,
          durationMinutes: null,
          breakMinutes: null,
          employeeId: isAdmin ? null : form.getValues("employeeId"),
          customerId: null,
          objectId: null,
          orderId: null,
          notes: null,
          type: "manual",
        });
      }
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

  if (isInDialog) {
    return (
      <>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          <FormSection
            title="Eintragstyp"
            description="Wählen Sie den Typ des Zeiteintrags"
            icon={<Settings className="h-5 w-5 text-primary" />}
          >
            <div>
              <Label htmlFor="type">Eintragstyp</Label>
              <Select onValueChange={(value) => form.setValue("type", value as TimeEntryFormValues["type"])} value={selectedType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Typ auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manuell</SelectItem>
                  <SelectItem value="clock_in_out">Kommt/Geht</SelectItem>
                  <SelectItem value="stopwatch">Stoppuhr</SelectItem>
                  <SelectItem value="automatic_scheduled_order">Automatischer geplanter Auftrag</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.type && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.type.message}</p>
              )}
            </div>
          </FormSection>

          <FormSection
            title="Zuordnung"
            description="Mitarbeiter, Kunde, Objekt und Auftrag"
            icon={<User className="h-5 w-5 text-primary" />}
          >
            <div>
              <Label htmlFor="employeeId">Mitarbeiter (optional)</Label>
              <Select
                onValueChange={(value) => form.setValue("employeeId", value === "unassigned" ? null : value)}
                value={form.watch("employeeId") || "unassigned"}
                disabled={!isAdmin && employees.length > 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Mitarbeiter auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Kein Mitarbeiter zugewiesen</SelectItem>
                  {employees.map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.employeeId && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.employeeId.message}</p>
              )}
              {!isAdmin && employees.length === 0 && (
                <p className="text-muted-foreground text-sm mt-1">Kein aktiver Mitarbeiter für Ihr Konto gefunden.</p>
              )}
            </div>
            <div>
              <Label htmlFor="customerId">Kunde (optional)</Label>
              <Select onValueChange={(value) => {
                form.setValue("customerId", value);
                form.setValue("objectId", null);
                form.setValue("orderId", null);
              }} value={selectedCustomerId || "unassigned"}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Kunde auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Kein Kunde zugewiesen</SelectItem>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.customerId && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerId.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="objectId">Objekt (optional)</Label>
              <Select onValueChange={(value) => {
                form.setValue("objectId", value);
                form.setValue("orderId", null);
              }} value={selectedObjectId || "unassigned"} disabled={!selectedCustomerId || filteredObjects.length === 0}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Objekt auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Kein Objekt zugewiesen</SelectItem>
                  {filteredObjects.map(obj => (
                    <SelectItem key={obj.id} value={obj.id}>{obj.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.objectId && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.objectId.message}</p>
              )}
              {selectedCustomerId && filteredObjects.length === 0 && (
                <p className="text-muted-foreground text-sm mt-1">Keine Objekte für diesen Kunden gefunden.</p>
              )}
            </div>
            <div>
              <Label htmlFor="orderId">Auftrag (optional)</Label>
              <Select onValueChange={(value) => form.setValue("orderId", value === "unassigned" ? null : value)} value={form.watch("orderId") || "unassigned"} disabled={(!selectedCustomerId && !selectedObjectId) || filteredOrders.length === 0}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Auftrag auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Kein Auftrag zugewiesen</SelectItem>
                  {filteredOrders.map(order => (
                    <SelectItem key={order.id} value={order.id}>{order.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.orderId && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.orderId.message}</p>
              )}
              {((selectedCustomerId || selectedObjectId) && filteredOrders.length === 0) && (
                <p className="text-muted-foreground text-sm mt-1">Keine Aufträge für diese Auswahl gefunden.</p>
              )}
            </div>
          </FormSection>

          <FormSection
            title="Zeitangaben"
            description="Start- und Endzeit des Eintrags"
            icon={<Clock className="h-5 w-5 text-primary" />}
          >
            <div className="grid grid-cols-2 gap-4">
              <DatePicker
                label="Startdatum"
                value={form.watch("startDate")}
                onChange={(date) => form.setValue("startDate", date || new Date())}
                error={form.formState.errors.startDate?.message}
              />
              <div>
                <Label htmlFor="startTime">Startzeit</Label>
                <Input
                  id="startTime"
                  type="time"
                  {...form.register("startTime")}
                />
                {form.formState.errors.startTime && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.startTime.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <DatePicker
                label="Enddatum (optional)"
                value={form.watch("endDate")}
                onChange={(date) => form.setValue("endDate", date)}
                error={form.formState.errors.endDate?.message}
              />
              <div>
                <Label htmlFor="endTime">Endzeit (optional)</Label>
                <Input
                  id="endTime"
                  type="time"
                  {...form.register("endTime")}
                />
                {form.formState.errors.endTime && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.endTime.message}</p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="durationMinutes">Dauer in Minuten (optional)</Label>
              <Input
                id="durationMinutes"
                type="number"
                step="1"
                {...form.register("durationMinutes", { valueAsNumber: true })}
                placeholder="Z.B. 120 für 2 Stunden"
              />
              {form.formState.errors.durationMinutes && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.durationMinutes.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="breakMinutes">Pausenminuten (optional)</Label>
              <Input
                id="breakMinutes"
                type="number"
                step="1"
                {...form.register("breakMinutes", { valueAsNumber: true })}
                placeholder="Z.B. 30 für 30 Minuten"
              />
              {form.formState.errors.breakMinutes && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.breakMinutes.message}</p>
              )}
            </div>
          </FormSection>

          <FormSection
            title="Notizen"
            description="Zusätzliche Informationen zum Zeiteintrag"
            icon={<FileText className="h-5 w-5 text-primary" />}
          >
            <div>
              <Label htmlFor="notes">Notizen (optional)</Label>
              <Textarea
                id="notes"
                {...form.register("notes")}
                placeholder="Zusätzliche Notizen zum Zeiteintrag..."
                rows={3}
              />
              {form.formState.errors.notes && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.notes.message}</p>
              )}
            </div>
          </FormSection>

          <FormActions
            isSubmitting={form.formState.isSubmitting}
            onCancel={handleCancel}
            submitLabel={submitButtonText}
            cancelLabel="Abbrechen"
            showCancel={true}
            submitVariant="default"
            loadingText={`${submitButtonText}...`}
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
          description="Wenn Sie das Zeiteintrags-Formular jetzt verlassen, gehen Ihre Eingaben verloren."
        />
      </>
    );
  }

  return (
    <UnsavedChangesProtection formId="time-entry-form">
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Zeiteintrag {initialData ? "bearbeiten" : "erstellen"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            <FormSection
              title="Eintragstyp"
              description="Wählen Sie den Typ des Zeiteintrags"
              icon={<Settings className="h-5 w-5 text-primary" />}
            >
              <div>
                <Label htmlFor="type">Eintragstyp</Label>
                <Select onValueChange={(value) => form.setValue("type", value as TimeEntryFormValues["type"])} value={selectedType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Typ auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manuell</SelectItem>
                    <SelectItem value="clock_in_out">Kommt/Geht</SelectItem>
                    <SelectItem value="stopwatch">Stoppuhr</SelectItem>
                    <SelectItem value="automatic_scheduled_order">Automatischer geplanter Auftrag</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.type && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.type.message}</p>
                )}
              </div>
            </FormSection>

            <FormSection
              title="Zuordnung"
              description="Mitarbeiter, Kunde, Objekt und Auftrag"
              icon={<User className="h-5 w-5 text-primary" />}
            >
              <div>
                <Label htmlFor="employeeId">Mitarbeiter (optional)</Label>
                <Select
                  onValueChange={(value) => form.setValue("employeeId", value === "unassigned" ? null : value)}
                  value={form.watch("employeeId") || "unassigned"}
                  disabled={!isAdmin && employees.length > 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Mitarbeiter auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Kein Mitarbeiter zugewiesen</SelectItem>
                    {employees.map(employee => (
                      <SelectItem key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.employeeId && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.employeeId.message}</p>
                )}
                {!isAdmin && employees.length === 0 && (
                  <p className="text-muted-foreground text-sm mt-1">Kein aktiver Mitarbeiter für Ihr Konto gefunden.</p>
                )}
              </div>
              <div>
                <Label htmlFor="customerId">Kunde (optional)</Label>
                <Select onValueChange={(value) => {
                  form.setValue("customerId", value);
                  form.setValue("objectId", null);
                  form.setValue("orderId", null);
                }} value={selectedCustomerId || "unassigned"}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Kunde auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Kein Kunde zugewiesen</SelectItem>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.customerId && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerId.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="objectId">Objekt (optional)</Label>
                <Select onValueChange={(value) => {
                  form.setValue("objectId", value);
                  form.setValue("orderId", null);
                }} value={selectedObjectId || "unassigned"} disabled={!selectedCustomerId || filteredObjects.length === 0}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Objekt auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Kein Objekt zugewiesen</SelectItem>
                    {filteredObjects.map(obj => (
                      <SelectItem key={obj.id} value={obj.id}>{obj.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.objectId && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.objectId.message}</p>
                )}
                {selectedCustomerId && filteredObjects.length === 0 && (
                  <p className="text-muted-foreground text-sm mt-1">Keine Objekte für diesen Kunden gefunden.</p>
                )}
              </div>
              <div>
                <Label htmlFor="orderId">Auftrag (optional)</Label>
                <Select onValueChange={(value) => form.setValue("orderId", value === "unassigned" ? null : value)} value={form.watch("orderId") || "unassigned"} disabled={(!selectedCustomerId && !selectedObjectId) || filteredOrders.length === 0}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Auftrag auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Kein Auftrag zugewiesen</SelectItem>
                    {filteredOrders.map(order => (
                      <SelectItem key={order.id} value={order.id}>{order.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.orderId && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.orderId.message}</p>
                )}
                {((selectedCustomerId || selectedObjectId) && filteredOrders.length === 0) && (
                  <p className="text-muted-foreground text-sm mt-1">Keine Aufträge für diese Auswahl gefunden.</p>
                )}
              </div>
            </FormSection>

            <FormSection
              title="Zeitangaben"
              description="Start- und Endzeit des Eintrags"
              icon={<Clock className="h-5 w-5 text-primary" />}
            >
              <div className="grid grid-cols-2 gap-4">
                <DatePicker
                  label="Startdatum"
                  value={form.watch("startDate")}
                  onChange={(date) => form.setValue("startDate", date || new Date())}
                  error={form.formState.errors.startDate?.message}
                />
                <div>
                  <Label htmlFor="startTime">Startzeit</Label>
                  <Input
                    id="startTime"
                    type="time"
                    {...form.register("startTime")}
                  />
                  {form.formState.errors.startTime && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.startTime.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <DatePicker
                  label="Enddatum (optional)"
                  value={form.watch("endDate")}
                  onChange={(date) => form.setValue("endDate", date)}
                  error={form.formState.errors.endDate?.message}
                />
                <div>
                  <Label htmlFor="endTime">Endzeit (optional)</Label>
                  <Input
                    id="endTime"
                    type="time"
                    {...form.register("endTime")}
                  />
                  {form.formState.errors.endTime && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.endTime.message}</p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="durationMinutes">Dauer in Minuten (optional)</Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  step="1"
                  {...form.register("durationMinutes", { valueAsNumber: true })}
                  placeholder="Z.B. 120 für 2 Stunden"
                />
                {form.formState.errors.durationMinutes && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.durationMinutes.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="breakMinutes">Pausenminuten (optional)</Label>
                <Input
                  id="breakMinutes"
                  type="number"
                  step="1"
                  {...form.register("breakMinutes", { valueAsNumber: true })}
                  placeholder="Z.B. 30 für 30 Minuten"
                />
                {form.formState.errors.breakMinutes && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.breakMinutes.message}</p>
                )}
              </div>
            </FormSection>

            <FormSection
              title="Notizen"
              description="Zusätzliche Informationen zum Zeiteintrag"
              icon={<FileText className="h-5 w-5 text-primary" />}
            >
              <div>
                <Label htmlFor="notes">Notizen (optional)</Label>
                <Textarea
                  id="notes"
                  {...form.register("notes")}
                  placeholder="Zusätzliche Notizen zum Zeiteintrag..."
                  rows={3}
                />
                {form.formState.errors.notes && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.notes.message}</p>
                )}
              </div>
            </FormSection>

            <FormActions
              isSubmitting={form.formState.isSubmitting}
              onCancel={handleCancel}
              submitLabel={submitButtonText}
              cancelLabel="Abbrechen"
              showCancel={true}
              submitVariant="default"
              loadingText={`${submitButtonText}...`}
              align="right"
            />
          </form>
        </CardContent>
      </Card>
    </UnsavedChangesProtection>
  );
}