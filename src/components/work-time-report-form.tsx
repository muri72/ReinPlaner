"use client";

import { useState, useEffect, useRef } from "react"; // useRef für den PDF-Export
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getWorkTimeReport, ReportEntry, WorkTimeReportData } from "@/app/dashboard/reports/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDuration } from "@/lib/utils";
import jsPDF from 'jspdf'; // Import jspdf
import html2canvas from 'html2canvas'; // Import html2canvas
import { Download } from "lucide-react"; // Icon für den Download

const reportSchema = z.object({
  objectId: z.string().uuid("Bitte wählen Sie ein gültiges Objekt aus."),
  month: z.string().min(1, "Bitte wählen Sie einen Monat aus."),
  year: z.string().min(1, "Bitte wählen Sie ein Jahr aus."),
});

type ReportFormValues = z.infer<typeof reportSchema>;

interface WorkTimeReportFormProps {
  // No props needed for now, as it fetches its own data
}

export function WorkTimeReportForm({}: WorkTimeReportFormProps) {
  const supabase = createClient();
  const [objects, setObjects] = useState<{ id: string; name: string }[]>([]);
  const [reportData, setReportData] = useState<WorkTimeReportData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const reportTableRef = useRef<HTMLDivElement>(null); // Ref für den zu exportierenden Bereich

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      objectId: "",
      month: String(new Date().getMonth() + 1), // Current month (1-indexed)
      year: String(new Date().getFullYear()), // Current year
    },
  });

  // Fetch objects for dropdown
  useEffect(() => {
    const fetchObjects = async () => {
      const { data, error } = await supabase.from('objects').select('id, name').order('name', { ascending: true });
      if (data) setObjects(data);
      if (error) console.error("Fehler beim Laden der Objekte:", error);
    };
    fetchObjects();
  }, [supabase]);

  const onSubmit: SubmitHandler<ReportFormValues> = async (data) => {
    setLoadingReport(true);
    setReportData(null); // Clear previous report
    const result = await getWorkTimeReport(data.objectId, parseInt(data.month), parseInt(data.year));

    if (result.success && result.data) {
      setReportData(result.data);
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setLoadingReport(false);
  };

  const handleExportPdf = async () => {
    if (!reportTableRef.current || !reportData) {
      toast.error("Keine Berichtsdaten zum Exportieren gefunden.");
      return;
    }

    setLoadingReport(true); // Set loading state for export
    try {
      const input = reportTableRef.current;
      const canvas = await html2canvas(input, { scale: 2 }); // Höhere Skalierung für bessere Qualität
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4'); // Portrait, Millimeter, A4
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
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

      const selectedObject = objects.find(obj => obj.id === form.getValues("objectId"));
      const monthLabel = months.find(m => m.value === form.getValues("month"))?.label;
      const fileName = `Arbeitszeitnachweis_${selectedObject?.name || 'Objekt'}_${monthLabel}_${form.getValues("year")}.pdf`;
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
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i)); // Last 5 years
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(0, i).toLocaleString('de-DE', { month: 'long' }),
  }));

  return (
    <div className="space-y-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-md bg-card">
        <h2 className="text-xl font-semibold">Berichtsfilter</h2>
        <div>
          <Label htmlFor="objectId">Objekt</Label>
          <Select onValueChange={(value) => form.setValue("objectId", value)} value={form.watch("objectId")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Objekt auswählen" />
            </SelectTrigger>
            <SelectContent>
              {objects.map(obj => (
                <SelectItem key={obj.id} value={obj.id}>{obj.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.objectId && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.objectId.message}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="month">Monat</Label>
            <Select onValueChange={(value) => form.setValue("month", value)} value={form.watch("month")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Monat auswählen" />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.month && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.month.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="year">Jahr</Label>
            <Select onValueChange={(value) => form.setValue("year", value)} value={form.watch("year")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Jahr auswählen" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.year && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.year.message}</p>
            )}
          </div>
        </div>
        <Button type="submit" disabled={loadingReport}>
          {loadingReport ? "Bericht wird geladen..." : "Bericht generieren"}
        </Button>
      </form>

      {reportData && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Arbeitszeitnachweis</h2>
          {reportData.entries.length > 0 ? (
            <>
              <div ref={reportTableRef} className="p-4 bg-white dark:bg-gray-900 rounded-md shadow-sm"> {/* Der zu exportierende Bereich */}
                <h3 className="text-lg font-bold mb-4">
                  Bericht für {objects.find(obj => obj.id === form.getValues("objectId"))?.name || 'Ausgewähltes Objekt'} - {months.find(m => m.value === form.getValues("month"))?.label} {form.getValues("year")}
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Mitarbeiter</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>Ende</TableHead>
                      <TableHead>Dauer</TableHead>
                      <TableHead>Notizen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.entries.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.date}</TableCell>
                        <TableCell>{entry.employeeName}</TableCell>
                        <TableCell>{entry.startTime}</TableCell>
                        <TableCell>{entry.endTime}</TableCell>
                        <TableCell>{formatDuration(entry.duration)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{entry.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="text-right font-bold text-lg mt-4">
                  Gesamtstunden: {reportData.totalHours}
                </div>
              </div>
              <Button onClick={handleExportPdf} disabled={loadingReport} className="mt-4">
                <Download className="mr-2 h-4 w-4" />
                {loadingReport ? "Exportiere..." : "Als PDF exportieren"}
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">Keine Zeiteinträge für die ausgewählten Kriterien gefunden.</p>
          )}
        </div>
      )}
    </div>
  );
}