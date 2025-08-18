"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface RecordDetailsDialogProps {
  record: Record<string, any>;
  title: string;
  triggerButtonTitle?: string;
}

export function RecordDetailsDialog({ record, title, triggerButtonTitle = "Details anzeigen" }: RecordDetailsDialogProps) {
  const [open, setOpen] = useState(false);

  // Helper to format values for display
  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === 'boolean') return value ? "Ja" : "Nein";
    if (typeof value === 'object' && value instanceof Date) return value.toLocaleString('de-DE');
    if (typeof value === 'string' && (key.includes('date') || key.includes('time')) && !isNaN(new Date(value).getTime())) {
      try {
        const date = new Date(value);
        if (key.includes('time') && !key.includes('date')) {
          return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString('de-DE');
      } catch (e) {
        return String(value);
      }
    }
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Helper to translate keys (optional, can be expanded)
  const translateKey = (key: string): string => {
    const translations: Record<string, string> = {
      id: "ID",
      user_id: "Benutzer-ID",
      first_name: "Vorname",
      last_name: "Nachname",
      email: "E-Mail",
      phone: "Telefon",
      hire_date: "Einstellungsdatum",
      status: "Status",
      contract_type: "Vertragsart",
      contract_end_date: "Vertragsenddatum",
      hourly_rate: "Stundenlohn",
      start_date: "Vertragsstart",
      job_title: "Berufsbezeichnung",
      department: "Abteilung",
      notes: "Notizen",
      address: "Adresse",
      date_of_birth: "Geburtsdatum",
      social_security_number: "SV-Nummer",
      tax_id_number: "Steuer-ID",
      health_insurance_provider: "Krankenkasse",
      name: "Name",
      contact_email: "Kontakt-E-Mail",
      contact_phone: "Kontakt-Telefon",
      customer_type: "Kundentyp",
      customer_id: "Kunden-ID",
      customer_name: "Kundenname",
      object_id: "Objekt-ID",
      object_name: "Objektname",
      description: "Beschreibung",
      priority: "Priorität",
      time_of_day: "Tageszeit",
      access_method: "Zugangsmethode",
      pin: "PIN",
      is_alarm_secured: "Alarmgesichert",
      alarm_password: "Alarmkennwort",
      security_code_word: "Codewort",
      monday_start_time: "Mo Start",
      monday_end_time: "Mo Ende",
      tuesday_start_time: "Di Start",
      tuesday_end_time: "Di Ende",
      wednesday_start_time: "Mi Start",
      wednesday_end_time: "Mi Ende",
      thursday_start_time: "Do Start",
      thursday_end_time: "Do Ende",
      friday_start_time: "Fr Start",
      friday_end_time: "Fr Ende",
      saturday_start_time: "Sa Start",
      saturday_end_time: "Sa Ende",
      sunday_start_time: "So Start",
      sunday_end_time: "So Ende",
      monday_hours: "Mo Std.",
      tuesday_hours: "Di Std.",
      wednesday_hours: "Mi Std.",
      thursday_hours: "Do Std.",
      friday_hours: "Fr Std.",
      saturday_hours: "Sa Std.",
      sunday_hours: "So Std.",
      title: "Titel",
      due_date: "Fälligkeitsdatum",
      created_at: "Erstellt am",
      employee_id: "Mitarbeiter-ID",
      employee_first_name: "Mitarbeiter Vorname",
      employee_last_name: "Mitarbeiter Nachname",
      customer_contact_id: "Kundenkontakt-ID",
      customer_contact_first_name: "Kundenkontakt Vorname",
      customer_contact_last_name: "Kundenkontakt Nachname",
      order_type: "Auftragstyp",
      recurring_start_date: "Wiederkehrend Start",
      recurring_end_date: "Wiederkehrend Ende",
      estimated_hours: "Geschätzte Stunden",
      request_status: "Anfragestatus",
      service_type: "Dienstleistungstyp",
      start_time: "Startzeit",
      end_time: "Endzeit",
      duration_minutes: "Dauer (Minuten)",
      break_minutes: "Pausen (Minuten)",
      type: "Typ",
      admin_notes: "Admin-Notizen",
      role: "Rolle",
      assigned_employee_name: "Zugewiesener Mitarbeiter",
      assigned_customer_name: "Zugewiesener Kunde",
      // Add more translations as needed
    };
    return translations[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700" title={triggerButtonTitle}>
                <Eye className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{triggerButtonTitle}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto glassmorphism-card">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            <VisuallyHidden>Detaillierte Ansicht des Datensatzes.</VisuallyHidden>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-4">
          {Object.entries(record).map(([key, value]) => {
            // Skip complex objects or arrays that are better handled by specific components
            if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
              return null; // Skip nested objects for this generic view
            }
            // Skip specific keys that are already displayed or not relevant for generic view
            if (['user_id', 'customer_id', 'object_id', 'employee_id', 'customer_contact_id', 'order_id', 'order_feedback', 'customers', 'employees', 'objects', 'customer_contacts', 'profiles'].includes(key)) {
              return null;
            }

            return (
              <div key={key} className="grid grid-cols-3 items-center gap-4">
                <div className="text-sm font-medium text-muted-foreground">{translateKey(key)}:</div>
                <div className="col-span-2 text-sm text-foreground break-words">{formatValue(key, value)}</div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}