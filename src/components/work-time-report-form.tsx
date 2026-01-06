"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useFormUnsavedChanges } from "@/components/ui/unsaved-changes-context";
import { createClient } from "@/lib/supabase/client";
import { getWorkTimeReport, WorkTimeReportData, getEmployeeWorkTimeReport, EmployeeWorkTimeReportData, sendWorkTimeReportToCustomer } from "@/app/dashboard/reports/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDuration, formatDateWithWeekday } from "@/lib/utils";
import { generateProfessionalPDF } from "@/components/pdf-generator";
import { Download, Send, Calendar, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { handleActionResponse } from "@/lib/toast-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSection } from "@/components/ui/form-section";
import { FormActions } from "@/components/ui/form-actions";

const reportSchema = z.object({
  reportType: z.enum(['object', 'employee']),
  objectId: z.string().uuid("Bitte wählen Sie ein gültiges Objekt aus.").optional().nullable(),
  employeeId: z.string().uuid("Bitte wählen Sie einen gültigen Mitarbeiter aus.").optional().nullable(),
  month: z.string().min(1, "Bitte wählen Sie einen Monat aus."),
  year: z.string().min(1, "Bitte wählen Sie ein Jahr aus."),
}).refine(data => {
  if (data.reportType === 'object') return !!data.objectId;
  if (data.reportType === 'employee') return !!data.employeeId;
  return false;
}, {
  message: "Bitte wählen Sie ein Objekt oder einen Mitarbeiter aus.",
  path: ["objectId"], // You can point to one, it will show up as a general error
});

type ReportFormValues = z.infer<typeof reportSchema>;

export function WorkTimeReportForm() {
  const supabase = createClient();
  const [objects, setObjects] = useState<{ id: string; name: string; customer_id: string | null; }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [objectReportData, setObjectReportData] = useState<WorkTimeReportData | null>(null);
  const [employeeReportData, setEmployeeReportData] = useState<EmployeeWorkTimeReportData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const reportTableRef = useRef<HTMLDivElement>(null);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportType: 'object',
      objectId: null,
      employeeId: null,
      month: String(new Date().getMonth() + 1),
      year: String(new Date().getFullYear()),
    },
  });

  // Register with unsaved changes context
  useFormUnsavedChanges("work-time-report-form", form.formState.isDirty);

  const selectedReportType = form.watch("reportType");
  const selectedObjectId = form.watch("objectId");
  const selectedEmployeeId = form.watch("employeeId");
  const [bundeslandCode, setBundeslandCode] = useState<string>('HH'); // Standard: Hamburg
  const [workTypes, setWorkTypes] = useState<{ [key: string]: { type: 'normal' | 'holiday' | 'weekend'; label: string; color: string; holidayName?: string } }>({});

  useEffect(() => {
    const fetchDropdownData = async () => {
      const { data: objectsData } = await supabase.from('objects').select('id, name, customer_id').order('name', { ascending: true });
      if (objectsData) setObjects(objectsData);
      const { data: employeesData } = await supabase.from('employees').select('id, first_name, last_name').order('last_name', { ascending: true });
      if (employeesData) setEmployees(employeesData);

      // Load bundesland from settings (default to HH if not found)
      const { settingsService } = await import('@/lib/services/settings-service');
      const code = await settingsService.getSetting('default_bundesland') || 'HH';
      setBundeslandCode(code);
    };
    fetchDropdownData();
  }, [supabase]);

  // Wrapper function to call onSubmit with current form values
  const handleSubmitClick = async () => {
    const data = form.getValues();
    await onSubmit(data);
  };

  const onSubmit: SubmitHandler<ReportFormValues> = async (data) => {
    setLoadingReport(true);
    setObjectReportData(null);
    setEmployeeReportData(null);
    setWorkTypes({});

    if (data.reportType === 'object' && data.objectId) {
      const result = await getWorkTimeReport(data.objectId, parseInt(data.month), parseInt(data.year));
      if (result.success && result.data) {
        setObjectReportData(result.data);

        // BATCH PROCESSING: Get all unique dates and check holidays in ONE query
        const uniqueDates = [...new Set(result.data.entries.map(e => {
          const [day, month, year] = e.date.split('.');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }))];

        console.log(`[REPORTS] Batch processing ${result.data.entries.length} entries with ${uniqueDates.length} unique dates`);
        console.log(`[REPORTS] Unique dates:`, uniqueDates);

        // Get all holidays for these dates in ONE database call
        const { settingsService } = await import('@/lib/services/settings-service');
        const holidayResults = await settingsService.checkMultipleHolidays(uniqueDates, bundeslandCode);

        // Build work types map
        const workTypesMap: { [key: string]: { type: 'normal' | 'holiday' | 'weekend'; label: string; color: string; holidayName?: string } } = {};
        let holidayCount = 0;
        let weekendCount = 0;

        result.data.entries.forEach(entry => {
          const [day, month, year] = entry.date.split('.');
          const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

          // Check if it's a holiday
          const holiday = holidayResults[isoDate];

          if (holiday) {
            workTypesMap[entry.id] = {
              type: 'holiday',
              label: 'Feiertag',
              color: '#dc2626',
              holidayName: holiday.name,
            };
            holidayCount++;
            console.log(`[REPORTS] ✓ Holiday detected: ${entry.date} (${entry.employeeName}) - ${holiday.name}`);
          } else {
            // Check if it's a weekend
            const date = new Date(isoDate);
            const dayOfWeek = date.getDay();

            if (dayOfWeek === 0 || dayOfWeek === 6) {
              workTypesMap[entry.id] = {
                type: 'weekend',
                label: 'Wochenende',
                color: '#7c3aed',
              };
              weekendCount++;
              console.log(`[REPORTS] Weekend detected: ${entry.date} (${entry.employeeName})`);
            } else {
              workTypesMap[entry.id] = {
                type: 'normal',
                label: 'Normal',
                color: '#16a34a',
              };
            }
          }
        });

        console.log(`[REPORTS] Summary: ${holidayCount} holidays, ${weekendCount} weekends detected out of ${result.data.entries.length} entries`);
        setWorkTypes(workTypesMap);

        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } else if (data.reportType === 'employee' && data.employeeId) {
      const result = await getEmployeeWorkTimeReport(data.employeeId, parseInt(data.month), parseInt(data.year));
      if (result.success && result.data) {
        setEmployeeReportData(result.data);

        // BATCH PROCESSING: Get all unique dates and check holidays in ONE query
        const uniqueDates = [...new Set(result.data.entries.map(e => {
          const [day, month, year] = e.date.split('.');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }))];

        console.log(`[REPORTS] Batch processing ${result.data.entries.length} entries with ${uniqueDates.length} unique dates`);

        // Get all holidays for these dates in ONE database call
        const { settingsService } = await import('@/lib/services/settings-service');
        const holidayResults = await settingsService.checkMultipleHolidays(uniqueDates, bundeslandCode);

        // Build work types map
        const workTypesMap: { [key: string]: { type: 'normal' | 'holiday' | 'weekend'; label: string; color: string; holidayName?: string } } = {};
        let holidayCount = 0;
        let weekendCount = 0;

        result.data.entries.forEach(entry => {
          const [day, month, year] = entry.date.split('.');
          const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

          // Check if it's a holiday
          const holiday = holidayResults[isoDate];

          if (holiday) {
            workTypesMap[entry.id] = {
              type: 'holiday',
              label: 'Feiertag',
              color: '#dc2626',
              holidayName: holiday.name,
            };
            holidayCount++;
            console.log(`[REPORTS] ✓ Holiday detected: ${entry.date} (${entry.objectName}) - ${holiday.name}`);
          } else {
            // Check if it's a weekend
            const date = new Date(isoDate);
            const dayOfWeek = date.getDay();

            if (dayOfWeek === 0 || dayOfWeek === 6) {
              workTypesMap[entry.id] = {
                type: 'weekend',
                label: 'Wochenende',
                color: '#7c3aed',
              };
              weekendCount++;
              console.log(`[REPORTS] Weekend detected: ${entry.date} (${entry.objectName})`);
            } else {
              workTypesMap[entry.id] = {
                type: 'normal',
                label: 'Normal',
                color: '#16a34a',
              };
            }
          }
        });

        console.log(`[REPORTS] Summary: ${holidayCount} holidays, ${weekendCount} weekends detected out of ${result.data.entries.length} entries`);
        setWorkTypes(workTypesMap);

        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    }
    setLoadingReport(false);
  };

  const handleExportPdf = async () => {
    if (!objectReportData && !employeeReportData) {
      toast.error("Keine Berichtsdaten zum Exportieren gefunden.");
      return;
    }

    setLoadingReport(true);
    try {
      const monthLabel = months.find(m => m.value === form.getValues("month"))?.label || form.getValues("month");
      const currentYear = form.getValues("year");

      // Get bundesland setting
      const { settingsService } = await import('@/lib/services/settings-service');
      const bundeslandCode = await settingsService.getSetting('default_bundesland') || 'HH';

      if (objectReportData) {
        const selectedObject = objects.find(obj => obj.id === form.getValues("objectId"));
        await generateProfessionalPDF({
          data: objectReportData,
          reportType: 'object',
          title: `Arbeitszeitnachweis ${selectedObject?.name || ''}`,
          objectName: selectedObject?.name,
          month: form.getValues("month"), // Use numeric month value, not label
          year: currentYear,
          objects,
          objectId: form.getValues("objectId") || undefined,
          bundeslandCode,
        });
      } else if (employeeReportData) {
        await generateProfessionalPDF({
          data: employeeReportData,
          reportType: 'employee',
          title: `Arbeitszeitnachweis ${employeeReportData.employeeName}`,
          employeeName: employeeReportData.employeeName,
          month: form.getValues("month"), // Use numeric month value, not label
          year: currentYear,
          bundeslandCode,
        });
      }

      toast.success("PDF erfolgreich exportiert!");
    } catch (error) {
      console.error("Fehler beim PDF-Export:", error);
      toast.error("Fehler beim Exportieren des PDF.");
    } finally {
      setLoadingReport(false);
    }
  };

  const handleSendEmail = async (customerEmail: string) => {
    setIsSendingEmail(true);
    let customerName = "";
    let reportTitle = "";
    let targetCustomerId: string | null = null;

    if (selectedReportType === 'object' && selectedObjectId) {
      const obj = objects.find(o => o.id === selectedObjectId);
      reportTitle = obj?.name || "Objektbericht";
      targetCustomerId = obj?.customer_id || null;
    } else if (selectedReportType === 'employee' && selectedEmployeeId) {
      const emp = employees.find(e => e.id === selectedEmployeeId);
      reportTitle = `${emp?.first_name || ''} ${emp?.last_name || ''}`.trim() || "Mitarbeiterbericht";
      // For employee reports, we might need to select a customer to send to,
      // or send to the employee's own customer if they are also a customer.
      // For simplicity, we'll assume the provided customerEmail is the target.
    }

    if (!targetCustomerId && selectedReportType === 'object') {
      toast.error("Kein Kunde mit diesem Objekt verknüpft, E-Mail kann nicht gesendet werden.");
      setIsSendingEmail(false);
      return;
    }

    // Fetch customer name for the email
    if (targetCustomerId) {
      const { data: customer, error } = await supabase.from('customers').select('name').eq('id', targetCustomerId).single();
      if (error || !customer) {
        console.error("Fehler beim Abrufen des Kundennamens:", error);
        toast.error("Kundendaten konnten nicht geladen werden.");
        setIsSendingEmail(false);
        return;
      }
      customerName = customer.name;
    } else {
      customerName = "Kunde"; // Fallback if no specific customer is linked
    }

    const result = await sendWorkTimeReportToCustomer(
      selectedReportType,
      selectedReportType === 'object' ? selectedObjectId! : selectedEmployeeId!,
      parseInt(form.getValues("month")),
      parseInt(form.getValues("year")),
      customerEmail,
      customerName,
      reportTitle
    );
    handleActionResponse(result);
    setIsSendingEmail(false);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(0, i).toLocaleString('de-DE', { month: 'long' }),
  }));

  const reportType = form.watch("reportType");

  return (
    <div className="space-y-6">
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Arbeitszeitnachweis erstellen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormSection
              title="Berichtstyp"
              description="Wählen Sie, ob Sie einen Bericht nach Objekt oder Mitarbeiter erstellen möchten"
              icon={<FileText className="h-5 w-5 text-primary" />}
            >
              <Tabs value={reportType} onValueChange={(value) => form.setValue('reportType', value as 'object' | 'employee')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="object">Nach Objekt</TabsTrigger>
                  <TabsTrigger value="employee">Nach Mitarbeiter</TabsTrigger>
                </TabsList>
                <TabsContent value="object" className="pt-4">
                  <Label htmlFor="objectId">Objekt</Label>
                  <Select onValueChange={(value) => form.setValue("objectId", value)} value={form.watch("objectId") || ""}>
                    <SelectTrigger><SelectValue placeholder="Objekt auswählen" /></SelectTrigger>
                    <SelectContent>{objects.map(obj => <SelectItem key={obj.id} value={obj.id}>{obj.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {form.formState.errors.objectId && <p className="text-red-500 text-sm mt-1">{form.formState.errors.objectId.message}</p>}
                </TabsContent>
                <TabsContent value="employee" className="pt-4">
                  <Label htmlFor="employeeId">Mitarbeiter</Label>
                  <Select onValueChange={(value) => form.setValue("employeeId", value)} value={form.watch("employeeId") || ""}>
                    <SelectTrigger><SelectValue placeholder="Mitarbeiter auswählen" /></SelectTrigger>
                    <SelectContent>{employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>)}</SelectContent>
                  </Select>
                  {form.formState.errors.employeeId && <p className="text-red-500 text-sm mt-1">{form.formState.errors.employeeId.message}</p>}
                </TabsContent>
              </Tabs>
            </FormSection>

            <FormSection
              title="Zeitraum"
              description="Wählen Sie den Zeitraum für den Bericht"
              icon={<Calendar className="h-5 w-5 text-primary" />}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="month">Monat</Label>
                  <Select onValueChange={(value) => form.setValue("month", value)} value={form.watch("month")}>
                    <SelectTrigger><SelectValue placeholder="Monat auswählen" /></SelectTrigger>
                    <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {form.formState.errors.month && <p className="text-red-500 text-sm mt-1">{form.formState.errors.month.message}</p>}
                </div>
                <div>
                  <Label htmlFor="year">Jahr</Label>
                  <Select onValueChange={(value) => form.setValue("year", value)} value={form.watch("year")}>
                    <SelectTrigger><SelectValue placeholder="Jahr auswählen" /></SelectTrigger>
                    <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                  {form.formState.errors.year && <p className="text-red-500 text-sm mt-1">{form.formState.errors.year.message}</p>}
                </div>
              </div>
            </FormSection>

            <FormActions
              isSubmitting={loadingReport}
              onCancel={() => {}}
              onSubmit={handleSubmitClick}
              submitLabel="Bericht generieren"
              showCancel={false}
              submitVariant="default"
              loadingText="Bericht wird geladen..."
              align="left"
            />
          </form>
        </CardContent>
      </Card>

      {(objectReportData || employeeReportData) && (
        <div className="space-y-4">
          <div ref={reportTableRef} className="p-6 bg-card border rounded-lg shadow-sm dark:border-border">
            {objectReportData && (
              <>
                <h3 className="text-lg font-bold mb-4">Bericht für {objects.find(obj => obj.id === form.getValues("objectId"))?.name} - {months.find(m => m.value === form.getValues("month"))?.label} {form.getValues("year")}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead><TableHead>Mitarbeiter</TableHead><TableHead>Start</TableHead><TableHead>Ende</TableHead><TableHead>Pause</TableHead><TableHead>Arbeitsstunden</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {objectReportData.entries.map(entry => {
                      const workType = workTypes[entry.id];
                      const isHolidayRow = workType?.type === 'holiday';
                      const isWeekendRow = workType?.type === 'weekend';

                      return (
                        <TableRow key={entry.id} className={
                          isHolidayRow ? 'bg-red-50 dark:bg-red-950/20' :
                          isWeekendRow ? 'bg-purple-50 dark:bg-purple-950/20' : ''
                        }>
                          <TableCell>
                            <div className="font-medium">
                              {formatDateWithWeekday(entry.date)}
                              {isHolidayRow && (
                                <div className="text-xs font-semibold" style={{ color: workType.color }}>
                                  {workType.holidayName || 'Feiertag'}
                                </div>
                              )}
                              {isWeekendRow && (
                                <div className="text-xs font-semibold" style={{ color: workType.color }}>
                                  Wochenende
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{entry.employeeName}</TableCell>
                          <TableCell>{entry.startTime}</TableCell>
                          <TableCell>{entry.endTime}</TableCell>
                          <TableCell>{formatDuration(entry.breakMinutes)}</TableCell>
                          <TableCell>{formatDuration(entry.duration - entry.breakMinutes)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="mt-4 space-y-3">
                  {/* Calculate holiday and weekend hours */}
                  {(() => {
                    let holidayHours = 0;
                    let regularHours = 0;
                    let weekendHours = 0;

                    objectReportData.entries.forEach(entry => {
                      const netHours = (entry.duration - entry.breakMinutes) / 60;
                      const workType = workTypes[entry.id];

                      if (workType?.type === 'holiday') {
                        holidayHours += netHours;
                      } else if (workType?.type === 'weekend') {
                        weekendHours += netHours;
                      } else {
                        regularHours += netHours;
                      }
                    });

                    const hoursWithoutHolidays = regularHours + weekendHours;

                    return (
                      <div className="text-[#1a365d] space-y-2">
                        <div className="text-lg font-bold">Gesamtarbeitsstunden: {objectReportData.totalHours} Stunden</div>

                        {/* Conditional breakdown - only show if holidays or weekends exist */}
                        {(holidayHours > 0 || weekendHours > 0) && (
                          <div className="text-sm space-y-1">
                            <div>• Normale Arbeitszeit: {hoursWithoutHolidays.toFixed(2)} Stunden</div>
                            {holidayHours > 0 && (
                              <div className="text-red-600 font-medium">• Feiertage: {holidayHours.toFixed(2)} Stunden</div>
                            )}
                            {weekendHours > 0 && (
                              <div className="text-purple-600 font-medium">• Am Wochenende: {weekendHours.toFixed(2)} Stunden</div>
                            )}
                          </div>
                        )}

                        {/* Holiday details - REMOVED detailed list per user request */}
                        {/* Weekend details - REMOVED detailed list per user request */}

                        {/* Employee breakdown for multiple employees */}
                        {(() => {
                          const employeeHours: { [key: string]: number } = {};
                          objectReportData.entries.forEach(entry => {
                            const employeeName = entry.employeeName;
                            const netHours = (entry.duration - entry.breakMinutes) / 60;
                            if (employeeHours[employeeName]) {
                              employeeHours[employeeName] += netHours;
                            } else {
                              employeeHours[employeeName] = netHours;
                            }
                          });

                          if (Object.keys(employeeHours).length > 1) {
                            return (
                              <div className="mt-3">
                                <div className="font-semibold mb-1">Gesamtarbeitsstunden pro Mitarbeiter:</div>
                                {Object.entries(employeeHours).map(([name, hours]) => (
                                  <div key={name} className="ml-4 font-medium">{name}: {hours.toFixed(2)} Stunden</div>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
            {employeeReportData && (
              <>
                <h3 className="text-lg font-bold mb-4">Bericht für {employeeReportData.employeeName} - {months.find(m => m.value === form.getValues("month"))?.label} {form.getValues("year")}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead><TableHead>Objekt</TableHead><TableHead>Kunde</TableHead><TableHead>Start</TableHead><TableHead>Ende</TableHead><TableHead>Pause</TableHead><TableHead>Arbeitsstunden</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeReportData.entries.map(entry => {
                      const workType = workTypes[entry.id];
                      const isHolidayRow = workType?.type === 'holiday';
                      const isWeekendRow = workType?.type === 'weekend';

                      return (
                        <TableRow key={entry.id} className={
                          isHolidayRow ? 'bg-red-50 dark:bg-red-950/20' :
                          isWeekendRow ? 'bg-purple-50 dark:bg-purple-950/20' : ''
                        }>
                          <TableCell>
                            <div className="font-medium">
                              {formatDateWithWeekday(entry.date)}
                              {isHolidayRow && (
                                <div className="text-xs font-semibold" style={{ color: workType.color }}>
                                  {workType.holidayName || 'Feiertag'}
                                </div>
                              )}
                              {isWeekendRow && (
                                <div className="text-xs font-semibold" style={{ color: workType.color }}>
                                  Wochenende
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{entry.objectName}</TableCell>
                          <TableCell>{entry.customerName}</TableCell>
                          <TableCell>{entry.startTime}</TableCell>
                          <TableCell>{entry.endTime}</TableCell>
                          <TableCell>{formatDuration(entry.breakMinutes)}</TableCell>
                          <TableCell>{formatDuration(entry.duration - entry.breakMinutes)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="mt-4 space-y-3">
                  {/* Calculate holiday and weekend hours */}
                  {(() => {
                    let holidayHours = 0;
                    let regularHours = 0;
                    let weekendHours = 0;

                    employeeReportData.entries.forEach(entry => {
                      const netHours = (entry.duration - entry.breakMinutes) / 60;
                      const workType = workTypes[entry.id];

                      if (workType?.type === 'holiday') {
                        holidayHours += netHours;
                      } else if (workType?.type === 'weekend') {
                        weekendHours += netHours;
                      } else {
                        regularHours += netHours;
                      }
                    });

                    const hoursWithoutHolidays = regularHours + weekendHours;

                    return (
                      <div className="text-[#1a365d] space-y-2">
                        <div className="text-lg font-bold">Gesamtarbeitsstunden: {employeeReportData.totalHours} Stunden</div>

                        {/* Conditional breakdown - only show if holidays or weekends exist */}
                        {(holidayHours > 0 || weekendHours > 0) && (
                          <div className="text-sm space-y-1">
                            <div>• Normale Arbeitszeit: {hoursWithoutHolidays.toFixed(2)} Stunden</div>
                            {holidayHours > 0 && (
                              <div className="text-red-600 font-medium">• Feiertage: {holidayHours.toFixed(2)} Stunden</div>
                            )}
                            {weekendHours > 0 && (
                              <div className="text-purple-600 font-medium">• Am Wochenende: {weekendHours.toFixed(2)} Stunden</div>
                            )}
                          </div>
                        )}

                        {/* Holiday details - REMOVED detailed list per user request */}
                        {/* Weekend details - REMOVED detailed list per user request */}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
          <div className="flex justify-between mt-4">
            <Button onClick={handleExportPdf} disabled={loadingReport}><Download className="mr-2 h-4 w-4" />{loadingReport ? "Exportiere..." : "Als PDF exportieren"}</Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={loadingReport || isSendingEmail || (!objectReportData && !employeeReportData)}>
                  <Send className="mr-2 h-4 w-4" /> Bericht per E-Mail senden
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] glassmorphism-card">
                <DialogHeader>
                  <DialogTitle>Bericht per E-Mail senden</DialogTitle>
                  <DialogDescription>
                    Geben Sie die E-Mail-Adresse des Empfängers ein, um den Bericht zu versenden.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const email = formData.get('email') as string;
                  if (email) {
                    await handleSendEmail(email);
                  } else {
                    toast.error("Bitte geben Sie eine E-Mail-Adresse ein.");
                  }
                }} className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      E-Mail
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="kunde@example.com"
                      className="col-span-3"
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isSendingEmail}>
                      {isSendingEmail ? "Senden..." : "Senden"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}
    </div>
  );
}