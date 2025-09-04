"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { format } from "date-fns"; // Added import
import { de } from "date-fns/locale"; // Added import

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
    if (typeof value === 'object' && value instanceof Date) return format(value, 'dd.MM.yyyy HH:mm', { locale: de }); // Use format
    if (typeof value === 'string' && (key.includes('date') || key.includes('time')) && !isNaN(new Date(value).getTime())) {
      try {
        const date = new Date(value);
        if (key.includes('time') && !key.includes('date')) {
          return format(date, 'HH:mm', { locale: de }); // Use format
        }
        return format(date, 'dd.MM.yyyy', { locale: de }); // Use format
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
      latitude: "Breitengrad", // New
      longitude: "Längengrad", // New
      radius_meters: "Radius (Meter)", // New
      clock_in_latitude: "Ein-Stempel Breitengrad", // New
      clock_in_longitude: "Ein-Stempel Längengrad", // New
      clock_out_latitude: "Aus-Stempel Breitengrad", // New
      clock_out_longitude: "Aus-Stempel Längengrad", // New
      location_deviation_warning: "Standortabweichung Warnung", // New
      assigned_to_user_id: "Zugewiesen an Benutzer-ID", // New
      assigned_to_first_name: "Zugewiesen an Vorname", // New
      assigned_to_last_name: "Zugewiesen an Nachname", // New
      creator_first_name: "Ersteller Vorname", // New
      creator_last_name: "Ersteller Nachname", // New
      image_urls: "Bild-URLs", // New
      comments: "Kommentare", // New
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
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto glassmorphism-card">
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
            if (['user_id', 'customer_id', 'object_id', 'employee_id', 'customer_contact_id', 'order_id', 'order_feedback', 'customers', 'employees', 'objects', 'customer_contacts', 'profiles', 'assignedEmployees'].includes(key)) {
              return null;
            }
            // Special handling for comments array
            if (key === 'comments' && Array.isArray(value)) {
              return (
                <div key={key} className="grid grid-cols-3 items-start gap-4">
                  <div className="text-sm font-medium text-muted-foreground">{translateKey(key)}:</div>
                  <div className="col-span-2 text-sm text-foreground break-words space-y-2">
                    {value.length > 0 ? value.map((comment, idx) => (
                      <div key={idx} className="border-l-2 pl-2">
                        <p className="font-semibold">{comment.user_first_name || comment.user_last_name ? `${comment.user_first_name || ''} ${comment.user_last_name || ''}`.trim() : 'Unbekannt'}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(comment.timestamp), 'dd.MM.yyyy HH:mm', { locale: de })}</p>
                        <p>{comment.text}</p>
                      </div>
                    )) : 'N/A'}
                  </div>
                </div>
              );
            }
            // Special handling for image_urls array
            if (key === 'image_urls' && Array.isArray(value)) {
              return (
                <div key={key} className="grid grid-cols-3 items-start gap-4">
                  <div className="text-sm font-medium text-muted-foreground">{translateKey(key)}:</div>
                  <div className="col-span-2 text-sm text-foreground break-words space-y-2">
                    {value.length > 0 ? value.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline truncate">
                        {url.split('/').pop()}
                      </a>
                    )) : 'N/A'}
                  </div>
                </div>
              );
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