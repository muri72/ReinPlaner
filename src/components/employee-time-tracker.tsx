"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Play, StopCircle } from "lucide-react";
import { createTimeEntry, updateTimeEntry } from "@/app/dashboard/time-tracking/actions"; // Importiere updateTimeEntry

interface ActiveTimeEntry {
  id: string;
  start_time: string;
  order_id: string | null;
  object_id: string | null;
  orders?: { title: string }[] | null; // Geändert zu Array
  objects?: { name: string }[] | null; // Geändert zu Array
  notes?: string | null; // Hinzugefügt
}

export function EmployeeTimeTracker({ userId }: EmployeeTimeTrackerProps) {
  const supabase = createClient();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [activeEntry, setActiveEntry] = useState<ActiveTimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<{ id: string; title: string; customer_id: string; object_id: string }[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Daten beim Laden der Komponente abrufen
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      // 1. Mitarbeiter-ID für den aktuellen Benutzer abrufen
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (employeeError && employeeError.code !== 'PGRST116') { // PGRST116 = keine Zeilen gefunden
        console.error("Fehler beim Laden der Mitarbeiter-ID:", employeeError);
        toast.error("Fehler beim Laden Ihrer Mitarbeiterdaten.");
        setLoading(false);
        return;
      }

      const empId = employeeData?.id || null;
      setEmployeeId(empId);

      if (empId) {
        // 2. Aktiven Zeiteintrag prüfen
        const { data: activeEntryData, error: activeEntryError } = await supabase
          .from('time_entries')
          .select(`
            id,
            start_time,
            order_id,
            object_id,
            notes,
            orders ( title ),
            objects ( name )
          `)
          .eq('employee_id', empId)
          .is('end_time', null)
          .single();

        if (activeEntryError && activeEntryError.code !== 'PGRST116') {
          console.error("Fehler beim Laden des aktiven Zeiteintrags:", activeEntryError);
          toast.error("Fehler beim Laden des aktiven Zeiteintrags.");
        } else if (activeEntryData) {
          // Typ-Assertion, da Supabase verknüpfte Daten als Arrays zurückgibt
          setActiveEntry(activeEntryData as ActiveTimeEntry);
          setSelectedOrderId(activeEntryData.order_id); // Vorab auswählen, falls aktiv
        }

        // 3. Aufträge zur Auswahl abrufen
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, title, customer_id, object_id')
          .eq('employee_id', empId) // Nur Aufträge, die diesem Mitarbeiter zugewiesen sind
          .order('title', { ascending: true });

        if (ordersData) setOrders(ordersData);
        if (ordersError) console.error("Fehler beim Laden der Aufträge:", ordersError);
      }
      setLoading(false);
    };

    fetchInitialData();
  }, [userId, supabase]);

  const handleClockIn = async () => {
    if (!employeeId) {
      toast.error("Keine Mitarbeiter-ID gefunden. Bitte stellen Sie sicher, dass Ihr Benutzer einem Mitarbeiter zugewiesen ist.");
      return;
    }
    setLoading(true);
    const now = new Date();
    const startTime = now.toTimeString().slice(0, 5); // HH:MM

    const result = await createTimeEntry({
      employeeId: employeeId,
      startDate: now,
      startTime: startTime,
      type: 'clock_in_out',
      orderId: selectedOrderId,
      notes: `Eingestempelt um ${now.toLocaleTimeString()}`,
    });

    if (result.success) {
      toast.success("Erfolgreich eingestempelt!");
      // Aktiven Eintrag neu abrufen, um die UI zu aktualisieren
      const { data: newActiveEntry, error } = await supabase
        .from('time_entries')
        .select(`
          id,
          start_time,
          order_id,
          object_id,
          notes,
          orders ( title ),
          objects ( name )
        `)
        .eq('employee_id', employeeId)
        .is('end_time', null)
        .single();
      if (newActiveEntry) setActiveEntry(newActiveEntry as ActiveTimeEntry);
      if (error && error.code !== 'PGRST116') console.error("Fehler beim Neuladen des aktiven Eintrags:", error);
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  const handleClockOut = async () => {
    if (!activeEntry) {
      toast.error("Kein aktiver Zeiteintrag zum Ausstempeln gefunden.");
      return;
    }
    setLoading(true);
    const now = new Date();
    const endTime = now.toTimeString().slice(0, 5); // HH:MM

    // Dauer berechnen
    const startDateTime = new Date(activeEntry.start_time);
    const diffMs = now.getTime() - startDateTime.getTime();
    const durationMinutes = diffMs / (1000 * 60);

    const result = await updateTimeEntry(activeEntry.id, {
      endDate: now,
      endTime: endTime,
      durationMinutes: durationMinutes,
      notes: `${activeEntry.notes || ''} Ausgestempelt um ${now.toLocaleTimeString()}`,
    });

    if (result.success) {
      toast.success("Erfolgreich ausgestempelt!");
      setActiveEntry(null); // Aktiven Eintrag löschen
      setSelectedOrderId(null); // Auswahl zurücksetzen
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-4">Lade Zeiterfassung...</div>;
  }

  if (!employeeId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zeiterfassung nicht verfügbar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Ihr Benutzerkonto ist keinem Mitarbeiter zugewiesen. Bitte kontaktieren Sie Ihren Administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <CardHeader>
        <CardTitle>Stempeluhr</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeEntry ? (
          <div className="space-y-2">
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
              <Clock className="inline-block mr-2 h-5 w-5" />
              Sie sind eingestempelt!
            </p>
            <p className="text-sm text-muted-foreground">
              Startzeit: {new Date(activeEntry.start_time).toLocaleTimeString()}
            </p>
            {activeEntry.order_id && (
              <p className="text-sm text-muted-foreground">
                Auftrag: {activeEntry.orders?.[0]?.title || activeEntry.order_id}
              </p>
            )}
            {activeEntry.object_id && (
              <p className="text-sm text-muted-foreground">
                Objekt: {activeEntry.objects?.[0]?.name || activeEntry.object_id}
              </p>
            )}
            <Button
              onClick={handleClockOut}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <StopCircle className="mr-2 h-4 w-4" />
              Ausstempeln
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="orderId">Auftrag auswählen (optional)</Label>
              <Select onValueChange={(value) => setSelectedOrderId(value === "unassigned" ? null : value)} value={selectedOrderId || "unassigned"}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Auftrag auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Kein Auftrag zugewiesen</SelectItem>
                  {orders.map(order => (
                    <SelectItem key={order.id} value={order.id}>{order.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {orders.length === 0 && (
                <p className="text-muted-foreground text-sm mt-1">Keine Aufträge für Sie gefunden.</p>
              )}
            </div>
            <Button
              onClick={handleClockIn}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Play className="mr-2 h-4 w-4" />
              Einstempeln
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}