"use client";

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getWorkTimeReport, ReportEntry, WorkTimeReportData } from "@/app/dashboard/reports/actions"; // Korrigierter Import
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDuration } from "@/lib/utils"; // Assuming this utility exists

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
  const [reportData, setReportData] = useState<WorkTimeReportData | null>(null); // Typ aktualisiert
  const [loadingReport, setLoadingReport] = useState(false);

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
            </>
          ) : (
            <p className="text-muted-foreground">Keine Zeiteinträge für die ausgewählten Kriterien gefunden.</p>
          )}
          {/* Der PDF-Export-Button wird im nächsten Schritt hinzugefügt */}
        </div>
      )}
    </div>
  );
}