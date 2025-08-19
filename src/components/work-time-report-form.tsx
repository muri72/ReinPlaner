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
import { getWorkTimeReport, WorkTimeReportData, getEmployeeWorkTimeReport, EmployeeWorkTimeReportData } from "@/app/dashboard/reports/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDuration } from "@/lib/utils";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const reportSchema = z.object({
  reportType: z.enum(['object', 'employee']),
  objectId: z.string().uuid("Bitte wählen Sie ein gültiges Objekt aus.").optional(),
  employeeId: z.string().uuid("Bitte wählen Sie einen gültigen Mitarbeiter aus.").optional(),
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
  const [objects, setObjects] = useState<{ id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [objectReportData, setObjectReportData] = useState<WorkTimeReportData | null>(null);
  const [employeeReportData, setEmployeeReportData] = useState<EmployeeWorkTimeReportData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const reportTableRef = useRef<HTMLDivElement>(null);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportType: 'object',
      month: String(new Date().getMonth() + 1),
      year: String(new Date().getFullYear()),
    },
  });

  useEffect(() => {
    const fetchDropdownData = async () => {
      const { data: objectsData } = await supabase.from('objects').select('id, name').order('name', { ascending: true });
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
      const logoPath = '/home.png'; // Pfad zum Logo im public-Ordner

      const canvas = await html2canvas(reportTableRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Logo-Details
      const logoWidth = 30; // Breite des Logos in mm
      const logoHeight = 30; // Höhe des Logos in mm
      const margin = 10; // Rand von oben und rechts in mm
      const logoX = imgWidth - logoWidth - margin;
      const logoY = margin;

      // Erste Seite hinzufügen
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      pdf.addImage(logoPath, 'PNG', logoX, logoY, logoWidth, logoHeight); // Logo hinzufügen

      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        pdf.addImage(logoPath, 'PNG', logoX, logoY, logoWidth, logoHeight); // Logo zu weiteren Seiten hinzufügen
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
            <Select onValueChange={(value) => form.setValue("objectId", value)} value={form.watch("objectId")}>
              <SelectTrigger><SelectValue placeholder="Objekt auswählen" /></SelectTrigger>
              <SelectContent>{objects.map(obj => <SelectItem key={obj.id} value={obj.id}>{obj.name}</SelectItem>)}</SelectContent>
            </Select>
          </TabsContent>
          <TabsContent value="employee" className="pt-4">
            <Label htmlFor="employeeId">Mitarbeiter</Label>
            <Select onValueChange={(value) => form.setValue("employeeId", value)} value={form.watch("employeeId")}>
              <SelectTrigger><SelectValue placeholder="Mitarbeiter auswählen" /></SelectTrigger>
              <SelectContent>{employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>)}</SelectContent>
            </Select>
          </TabsContent>
        </Tabs>
        
        <div className="grid grid-cols-2 gap-4 pt-4">
          <div>
            <Label htmlFor="month">Monat</Label>
            <Select onValueChange={(value) => form.setValue("month", value)} value={form.watch("month")}>
              <SelectTrigger><SelectValue placeholder="Monat auswählen" /></SelectTrigger>
              <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="year">Jahr</Label>
            <Select onValueChange={(value) => form.setValue("year", value)} value={form.watch("year")}>
              <SelectTrigger><SelectValue placeholder="Jahr auswählen" /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        {form.formState.errors.objectId && <p className="text-red-500 text-sm mt-1">{form.formState.errors.objectId.message}</p>}
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
                    <TableRow><TableHead>Datum</TableHead><TableHead>Mitarbeiter</TableHead><TableHead>Start</TableHead><TableHead>Ende</TableHead><TableHead>Pause</TableHead><TableHead>Arbeitsstunden</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {objectReportData.entries.map(entry => (
                      <TableRow key={entry.id}><TableCell>{entry.date}</TableCell><TableCell>{entry.employeeName}</TableCell><TableCell>{entry.startTime}</TableCell><TableCell>{entry.endTime}</TableCell><TableCell>{formatDuration(entry.breakMinutes)}</TableCell><TableCell>{formatDuration(entry.duration - entry.breakMinutes)}</TableCell></TableRow>
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
                    <TableRow><TableHead>Datum</TableHead><TableHead>Objekt</TableHead><TableHead>Kunde</TableHead><TableHead>Start</TableHead><TableHead>Ende</TableHead><TableHead>Pause</TableHead><TableHead>Arbeitsstunden</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeReportData.entries.map(entry => (
                      <TableRow key={entry.id}><TableCell>{entry.date}</TableCell><TableCell>{entry.objectName}</TableCell><TableCell>{entry.customerName}</TableCell><TableCell>{entry.startTime}</TableCell><TableCell>{entry.endTime}</TableCell><TableCell>{formatDuration(entry.breakMinutes)}</TableCell><TableCell>{formatDuration(entry.duration - entry.breakMinutes)}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="text-right font-bold text-lg mt-4">Gesamtstunden: {employeeReportData.totalHours}</div>
              </>
            )}
          </div>
          <Button onClick={handleExportPdf} disabled={loadingReport} className="mt-4"><Download className="mr-2 h-4 w-4" />{loadingReport ? "Exportiere..." : "Als PDF exportieren"}</Button>
        </div>
      )}
    </div>
  );
}