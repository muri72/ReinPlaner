"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getWorkTimeReport, WorkTimeReportData, getEmployeeWorkTimeReport, EmployeeWorkTimeReportData, sendWorkTimeReportToCustomer } from "@/app/dashboard/reports/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDuration } from "@/lib/utils";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { handleActionResponse } from "@/lib/toast-utils";

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

  const selectedReportType = form.watch("reportType");
  const selectedObjectId = form.watch("objectId");
  const selectedEmployeeId = form.watch("employeeId");

  useEffect(() => {
    const fetchDropdownData = async () => {
      const { data: objectsData } = await supabase.from('objects').select('id, name, customer_id').order('name', { ascending: true });
      if (objectsData) setObjects(objectsData);
      const { data: employeesData } = await supabase.from('employees').select('id, first_name, last_name').order('last_name', { ascending: true });
      if (employeesData) setEmployees(employeesData);
    };
    fetchDropdownData();
  }, [supabase]);

  const onSubmit: SubmitHandler<ReportFormValues> = async (data) => {
    setLoadingReport(true);
    setObjectReportData(null);
    setEmployeeReportData(null);

    if (data.reportType === 'object' && data.objectId) {
      const result = await getWorkTimeReport(data.objectId, parseInt(data.month), parseInt(data.year));
      if (result.success && result.data) {
        setObjectReportData(result.data);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } else if (data.reportType === 'employee' && data.employeeId) {
      const result = await getEmployeeWorkTimeReport(data.employeeId, parseInt(data.month), parseInt(data.year));
      if (result.success && result.data) {
        setEmployeeReportData(result.data);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    }
    setLoadingReport(false);
  };

  const handleExportPdf = async () => {
    if (!reportTableRef.current) {
      toast.error("Keine Berichtsdaten zum Exportieren gefunden.");
      return;
    }
    setLoadingReport(true);
    try {
      const canvas = await html2canvas(reportTableRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      const monthLabel = months.find(m => m.value === form.getValues("month"))?.label;
      let fileName = "Arbeitszeitnachweis.pdf";
      if (objectReportData) {
        const selectedObject = objects.find(obj => obj.id === form.getValues("objectId"));
        fileName = `Arbeitszeitnachweis_${selectedObject?.name}_${monthLabel}_${form.getValues("year")}.pdf`;
      } else if (employeeReportData) {
        fileName = `Arbeitszeitnachweis_${employeeReportData.employeeName.replace(' ', '_')}_${monthLabel}_${form.getValues("year")}.pdf`;
      }
      pdf.save(fileName);
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-md bg-card shadow-neumorphic glassmorphism-card">
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
        
        <div className="grid grid-cols-2 gap-4 pt-4">
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
        <Button type="submit" disabled={loadingReport}>{loadingReport ? "Bericht wird geladen..." : "Bericht generieren"}</Button>
      </form>

      {(objectReportData || employeeReportData) && (
        <div className="space-y-4">
          <div ref={reportTableRef} className="p-4 bg-white dark:bg-gray-900 rounded-md shadow-neumorphic glassmorphism-card">
            {objectReportData && (
              <>
                <h3 className="text-lg font-bold mb-4">Bericht für {objects.find(obj => obj.id === form.getValues("objectId"))?.name} - {months.find(m => m.value === form.getValues("month"))?.label} {form.getValues("year")}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Mitarbeiter</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>Ende</TableHead>
                      <TableHead>Pause</TableHead> {/* Moved Pause column */}
                      <TableHead>Arbeitsstunden (Netto)</TableHead> {/* Renamed Duration to Arbeitsstunden */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {objectReportData.entries.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.date}</TableCell>
                        <TableCell>{entry.employeeName}</TableCell>
                        <TableCell>{entry.startTime}</TableCell>
                        <TableCell>{entry.endTime}</TableCell>
                        <TableCell>{formatDuration(entry.breakMinutes)}</TableCell> {/* Pause column */}
                        <TableCell>{formatDuration(entry.duration - entry.breakMinutes)}</TableCell> {/* Arbeitsstunden (Netto) */}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="text-right font-bold text-lg mt-4">Gesamtstunden: {objectReportData.totalHours}</div>
              </>
            )}
            {employeeReportData && (
              <>
                <h3 className="text-lg font-bold mb-4">Bericht für {employeeReportData.employeeName} - {months.find(m => m.value === form.getValues("month"))?.label} {form.getValues("year")}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Objekt</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>Ende</TableHead>
                      <TableHead>Pause</TableHead> {/* Moved Pause column */}
                      <TableHead>Arbeitsstunden (Netto)</TableHead> {/* Renamed Duration to Arbeitsstunden */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeReportData.entries.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.date}</TableCell>
                        <TableCell>{entry.objectName}</TableCell>
                        <TableCell>{entry.customerName}</TableCell>
                        <TableCell>{entry.startTime}</TableCell>
                        <TableCell>{entry.endTime}</TableCell>
                        <TableCell>{formatDuration(entry.breakMinutes)}</TableCell> {/* Pause column */}
                        <TableCell>{formatDuration(entry.duration - entry.breakMinutes)}</TableCell> {/* Arbeitsstunden (Netto) */}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="text-right font-bold text-lg mt-4">Gesamtstunden: {employeeReportData.totalHours}</div>
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