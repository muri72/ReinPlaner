/**
 * Document Template Seed Script
 *
 * This script seeds the database with default document templates
 * for the multi-tenant SaaS cleaning business platform.
 *
 * Run with: npx tsx supabase/seed-document-templates.ts
 */

import { createClient } from '@supabase/supabase-js';
// @ts-ignore - dotenv is only used in seed script
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Document template definitions with placeholders
 * These templates are based on German labor law and cleaning service contracts
 */
const DOCUMENT_TEMPLATES = [
  {
    category: 'employee' as const,
    type: 'minijob_contract',
    title: 'Minijob-Arbeitsvertrag',
    content: `ARBEITSVERTRAG

zwischen

{{#if company}}
{{company.company_name}}
{{company.company_address}}
{{company.company_phone}}
E-Mail: {{company.company_email}}
{{else}}
ARIS Management GmbH
Musterstraße 123
20095 Hamburg
Telefon: +49 40 1234567
E-Mail: office@aris-management.de
{{/if}}

- nachfolgend "Arbeitgeber" genannt -

und

{{employee.first_name}} {{employee.last_name}}
{{employee.street}} {{employee.house_number}}
{{employee.zip_code}} {{employee.city}}
Geburtsdatum: {{employee.birth_date}}
{{#if employee.tax_id}}
Steuer-ID: {{employee.tax_id}}
{{/if}}
- nachfolgend "Arbeitnehmer" genannt -

§ 1 Beginn des Arbeitsverhältnisses
Das Arbeitsverhältnis beginnt am {{employee.employment_start_date}}.

{{#if employee.probation_period}}
§ 1a Probezeit
Die ersten {{employee.probation_period}} Monate gelten als Probezeit.
{{/if}}

§ 2 Arbeitsplatz
Der Arbeitnehmer wird als {{#if employee.position}}{{employee.position}}{{else}}Mitarbeiter(in) in der Gebäudereinigung{{/if}} eingesetzt.

Arbeitsort: {{#if employee.work_location}}{{employee.work_location}}{{else}}{{customer.street}} {{customer.house_number}}, {{customer.zip_code}} {{customer.city}}{{/if}}

§ 3 Aufgaben
Der Arbeitnehmer übernimmt folgende Aufgaben:
{{#if employee.job_duties}}
{{employee.job_duties}}
{{else}}
- Reinigungsarbeiten in Büro- und Gewerberäumen
- Pflege und Reinigung von Sanitärbereichen
- Grund- und Unterhaltsreinigung
- Einhaltung der Hygienevorschriften
{{/if}}

§ 4 Arbeitszeit
Die regelmäßige wöchentliche Arbeitszeit beträgt {{#if employee.weekly_hours}}{{employee.weekly_hours}} Stunden{{else}}40 Stunden{{/if}}.
{{#if employee.schedule}}
Arbeitszeit: {{employee.schedule}}
{{else}}
Die Arbeitszeit wird nach Absprache festgelegt.
{{/if}}

{{#if employee.break_time}}
§ 5 Pausen
Für Pausen steht eine {{employee.break_time}}-minütige Mittagspause zur Verfügung.
{{/if}}

§ 6 Vergütung
Das Arbeitsentgelt beträgt {{#if employee.hourly_rate}}{{employee.hourly_rate}} EUR{{else}}14,25 EUR{{/if}} brutto je Stunde.
{{#if employee.monthly_wage}}
Dies entspricht einem monatlichen Bruttogehalt von {{employee.monthly_wage}} EUR.
{{/if}}

Die Zahlung erfolgt bargeldlos jeweils zum {{payroll_settings.payment_day || 'letzten Werktag des Monats'}}.

{{#if employee.holiday_entitlement}}
§ 7 Urlaubsanspruch
Der Arbeitnehmer hat Anspruch auf {{employee.holiday_entitlement}} Werktage Urlaub im Jahr.
{{/if}}

{{#if company.vat_number}}
§ 8 Steuerliche Behandlung
Arbeitgeber: {{company.vat_number}}
{{/if}}

§ 9 Vertragsdauer
{{#if employee.contract_duration}}
Dieser Vertrag wird für die Dauer von {{employee.contract_duration}} geschlossen.
{{else}}
Dieses Arbeitsverhältnis ist unbefristet.
{{/if}}

§ 10 Kündigung
Die Kündigungsfrist beträgt gemäß § 622 BGB:
- für Arbeitgeber: {{payroll_settings.termination_period_employer || '4 Wochen zum Monatsende'}}
- für Arbeitnehmer: {{payroll_settings.termination_period_employee || '2 Wochen'}}

§ 11 Schweigepflicht
Der Arbeitnehmer verpflichtet sich, über alle betrieblichen und geschäftlichen Angelegenheiten Stillschweigen zu bewahren.

§ 12 Nebentätigkeit
Eine entgeltliche Nebentätigkeit bedarf der vorherigen schriftlichen Genehmigung des Arbeitgebers.

§ 13 Arbeitszeugnis
Bei Beendigung des Arbeitsverhältnisses wird ein qualifiziertes Arbeitszeugnis erteilt.

§ 14 Datenschutz
Der Arbeitgeber verpflichtet sich, die Bestimmungen des Datenschutzgesetzes zu beachten.

§ 15 Schlussbestimmungen
Änderungen dieses Vertrages bedürfen der Schriftform. Sollten einzelne Bestimmungen unwirksam sein, berührt dies nicht die Wirksamkeit der übrigen Vertragsbestimmungen.

Hamburg, den {{currentDate}}

_________________________
(Arbeitgeber)

_________________________
(Arbeitnehmer)
    `,
    variables: [
      { name: 'employee.first_name', type: 'string', required: true, label: 'Vorname' },
      { name: 'employee.last_name', type: 'string', required: true, label: 'Nachname' },
      { name: 'employee.street', type: 'string', required: true, label: 'Straße' },
      { name: 'employee.house_number', type: 'string', required: true, label: 'Hausnummer' },
      { name: 'employee.zip_code', type: 'string', required: true, label: 'PLZ' },
      { name: 'employee.city', type: 'string', required: true, label: 'Stadt' },
      { name: 'employee.birth_date', type: 'date', required: true, label: 'Geburtsdatum' },
      { name: 'employee.tax_id', type: 'string', required: false, label: 'Steuer-ID' },
      { name: 'employee.employment_start_date', type: 'date', required: true, label: 'Beginn des Arbeitsverhältnisses' },
      { name: 'employee.probation_period', type: 'number', required: false, label: 'Probemonate' },
      { name: 'employee.position', type: 'string', required: false, label: 'Position' },
      { name: 'employee.work_location', type: 'string', required: false, label: 'Arbeitsort' },
      { name: 'employee.job_duties', type: 'text', required: false, label: 'Aufgaben' },
      { name: 'employee.weekly_hours', type: 'number', required: true, label: 'Wöchentliche Arbeitsstunden' },
      { name: 'employee.schedule', type: 'text', required: false, label: 'Arbeitszeit' },
      { name: 'employee.break_time', type: 'number', required: false, label: 'Pausenzeit (Minuten)' },
      { name: 'employee.hourly_rate', type: 'currency', required: false, label: 'Stundenlohn (EUR)' },
      { name: 'employee.monthly_wage', type: 'currency', required: false, label: 'Monatslohn (EUR)' },
      { name: 'employee.holiday_entitlement', type: 'number', required: false, label: 'Urlaubstage' },
      { name: 'employee.contract_duration', type: 'string', required: false, label: 'Vertragsdauer' },
      { name: 'payroll_settings.payment_day', type: 'number', required: false, label: 'Zahlungstag im Monat' },
      { name: 'payroll_settings.termination_period_employer', type: 'string', required: false, label: 'Kündigungsfrist Arbeitgeber' },
      { name: 'payroll_settings.termination_period_employee', type: 'string', required: false, label: 'Kündigungsfrist Arbeitnehmer' },
      { name: 'company.company_name', type: 'string', required: true, label: 'Firmenname' },
      { name: 'company.company_address', type: 'string', required: true, label: 'Firmenadresse' },
      { name: 'company.company_phone', type: 'string', required: false, label: 'Telefonnummer' },
      { name: 'company.company_email', type: 'string', required: false, label: 'E-Mail' },
      { name: 'company.vat_number', type: 'string', required: false, label: 'Umsatzsteuernummer' },
      { name: 'customer.street', type: 'string', required: false, label: 'Kundenstraße' },
      { name: 'customer.house_number', type: 'string', required: false, label: 'Kundennummer' },
      { name: 'customer.zip_code', type: 'string', required: false, label: 'Kunden-PLZ' },
      { name: 'customer.city', type: 'string', required: false, label: 'Kundenstadt' },
    ],
  },
  {
    category: 'employee' as const,
    type: 'cleaning_contract',
    title: 'Reinigungskraft-Arbeitsvertrag',
    content: `ARBEITSVERTRAG
für Reinigungskräfte

zwischen

{{company.company_name}}
{{company.company_address}}
{{company.company_phone}}

- nachfolgend "Arbeitgeber" genannt -

und

{{employee.first_name}} {{employee.last_name}}
Geburtsdatum: {{employee.birth_date}}

- nachfolgend "Arbeitnehmer" genannt -

§ 1 Tätigkeit
Der Arbeitnehmer wird als Reinigungskraft beschäftigt.

§ 2 Arbeitsort
{{#if multiple_locations}}
Der Arbeitnehmer ist an verschiedenen Einsatzorten tätig:
{{#each employee.work_locations}}
- {{this.address}}
{{/each}}
{{else}}
Arbeitsort: {{employee.work_location}}
{{/if}}

§ 3 Arbeitszeit und Entlohnung
{{#if employee.employment_type === 'part_time'}}
- Teilzeit: {{employee.weekly_hours}} Stunden/Woche
{{else}}
- Vollzeit: 40 Stunden/Woche
{{/if}}
- Stundenlohn: {{employee.hourly_rate}} EUR brutto

§ 4 Pflichten
- Sorgfältige und termingerechte Durchführung der Reinigungsarbeiten
- Schonende Behandlung der Räume und Inventar
- Meldung von Schäden und Mängeln

{{#if employee.equipment_provided}}
§ 5 Arbeitsmittel
Arbeitsmittel werden vom Arbeitgeber gestellt.
{{/if}}

{{#if employee.break_allowance}}
§ 6 Verpflegungszuschuss
Täglicher Verpflegungszuschuss: {{employee.break_allowance}} EUR
{{/if}}

Hamburg, den {{currentDate}}

_________________________
(Arbeitgeber)

_________________________
(Arbeitnehmer)
    `,
    variables: [
      { name: 'employee.first_name', type: 'string', required: true, label: 'Vorname' },
      { name: 'employee.last_name', type: 'string', required: true, label: 'Nachname' },
      { name: 'employee.birth_date', type: 'date', required: true, label: 'Geburtsdatum' },
      { name: 'employee.employment_type', type: 'string', required: false, label: 'Beschäftigungsart' },
      { name: 'employee.weekly_hours', type: 'number', required: false, label: 'Wöchentliche Stunden' },
      { name: 'employee.hourly_rate', type: 'currency', required: true, label: 'Stundenlohn' },
      { name: 'employee.work_location', type: 'string', required: false, label: 'Arbeitsort' },
      { name: 'employee.work_locations', type: 'array', required: false, label: 'Mehrere Arbeitsorte' },
      { name: 'multiple_locations', type: 'boolean', required: false, label: 'Mehrere Einsatzorte' },
      { name: 'employee.equipment_provided', type: 'boolean', required: false, label: 'Arbeitsmittel gestellt' },
      { name: 'employee.break_allowance', type: 'currency', required: false, label: 'Verpflegungszuschuss' },
      { name: 'company.company_name', type: 'string', required: true, label: 'Firmenname' },
      { name: 'company.company_address', type: 'string', required: true, label: 'Adresse' },
      { name: 'company.company_phone', type: 'string', required: false, label: 'Telefon' },
    ],
  },
  {
    category: 'customer' as const,
    type: 'cleaning_offer',
    title: 'Reinigungsangebot',
    content: `ANGEBOT
für Gebäudereinigung

An: {{customer.first_name}} {{customer.last_name}}
{{customer.company_name}}
{{customer.street}} {{customer.house_number}}
{{customer.zip_code}} {{customer.city}}

Hamburg, den {{currentDate}}

Sehr geehrte Damen und Herren,

wir unterbreiten Ihnen gerne unser Angebot für Reinigungsdienstleistungen:

===================================================================

ANGEBOT NR.: {{offer_number}}

Ihr Objekt:
{{#if service_location}}
{{service_location.address}}
Fläche: {{service_location.size}} m²
Stockwerke: {{service_location.floors}}
{{/if}}

Unser Leistungsumfang:

1. GRUNDREINIGUNG (bei Vertragsbeginn)
   {{#if services.basic_cleaning}}
   ✓ Büro- und Besprechungsräume
   ✓ Küchen und Pausenräume
   ✓ Sanitärbereiche
   ✓ Treppenhäuser
   ✓ {{services.additional_basic}}
   {{/if}}

2. UNTERHALTSREINIGUNG (regelmäßig)
   {{#if services.maintenance_cleaning}}
   {{#if services.daily}}✓ Tägliche Reinigung{{/if}}
   {{#if services.weekly}}✓ Wöchentliche Reinigung{{/if}}
   {{#if services.biweekly}}✓ 14-tägige Reinigung{{/if}}
   {{#if services.monthly}}✓ Monatliche Grundreinigung{{/if}}

   Unsere Leistungen:
   - Staubsaugen und Wischen aller Bodenflächen
   - Reinigung von Arbeitsplätzen und Tischen
   - Leerung von Papierkörben
   - Desinfektion von Kontaktflächen
   - Reinigung und Desinfektion von Sanitäranlagen
   - {{services.additional_maintenance}}
   {{/if}}

3. FENSTERREINIGUNG
   {{#if services.window_cleaning}}
   {{#if services.interior}}✓ Innenreinigung{{/if}}
   {{#if services.exterior}}✓ Außenreinigung{{/if}}
   Häufigkeit: {{services.window_frequency}}
   {{/if}}

4. SONDERREINIGUNG (optional)
   {{#if services.special_cleaning}}
   {{#if services.post_construction}}✓ Baustellenreinigung{{/if}}
   {{#if services.carpet_cleaning}}✓ Teppichreinigung{{/if}}
   {{#if services.disinfection}}✓ Desinfektion{{/if}}
   {{/if}}

PREISÜBERSICHT:
============

{{#if services.basic_cleaning}}
Grundreinigung (einmalig): {{prices.basic_cleaning}} EUR
{{/if}}

{{#if services.maintenance_cleaning}}
Unterhaltsreinigung:
{{#if services.daily}}Täglich: {{prices.daily}} EUR/Monat{{/if}}
{{#if services.weekly}}Wöchentlich: {{prices.weekly}} EUR/Monat{{/if}}
{{#if services.biweekly}}14-tägig: {{prices.biweekly}} EUR/Monat{{/if}}
{{/if}}

{{#if services.window_cleaning}}
Fensterreinigung: {{prices.window_cleaning}} EUR
{{/if}}

{{#if services.special_cleaning}}
Sonderreinigung: {{prices.special_cleaning}} EUR
{{/if}}

GESAMTZAHLUNG: {{prices.total}} EUR {{#if prices.vat_included}}(inkl. MwSt.){{else}}(zzgl. MwSt.){{/if}}

VERTRAGSDAUER: {{contract.duration}}
{{#if contract.trial_period}}
PROBEZEIT: {{contract.trial_period}}
{{/if}}

ZAHLUNGSBEDINGUNGEN: {{payment_terms}} Tage

Übernahme zum: {{service_start_date}}

Dieses Angebot ist gültig bis: {{offer_valid_until}}

Unsere Leistungen umfassen:
- Professionelle Reinigungsmittel (umweltfreundlich)
- Alle Reinigungsgeräte und -materialien
- Qualifiziertes und geschultes Personal
- Versicherungsschutz
- Qualitätskontrolle

Für Rückfragen stehen wir gerne zur Verfügung.

Mit freundlichen Grüßen
{{company.company_name}}

{{company.company_signature}}
    `,
    variables: [
      { name: 'customer.first_name', type: 'string', required: false, label: 'Kunden-Vorname' },
      { name: 'customer.last_name', type: 'string', required: false, label: 'Kunden-Nachname' },
      { name: 'customer.company_name', type: 'string', required: true, label: 'Kundenfirma' },
      { name: 'customer.street', type: 'string', required: true, label: 'Straße' },
      { name: 'customer.house_number', type: 'string', required: true, label: 'Hausnummer' },
      { name: 'customer.zip_code', type: 'string', required: true, label: 'PLZ' },
      { name: 'customer.city', type: 'string', required: true, label: 'Stadt' },
      { name: 'offer_number', type: 'string', required: true, label: 'Angebotsnummer' },
      { name: 'service_location.address', type: 'string', required: true, label: 'Objektadresse' },
      { name: 'service_location.size', type: 'number', required: false, label: 'Fläche (m²)' },
      { name: 'service_location.floors', type: 'number', required: false, label: 'Stockwerke' },
      { name: 'services.basic_cleaning', type: 'boolean', required: false, label: 'Grundreinigung' },
      { name: 'services.additional_basic', type: 'string', required: false, label: 'Zusatzleistung Grundreinigung' },
      { name: 'services.maintenance_cleaning', type: 'boolean', required: true, label: 'Unterhaltsreinigung' },
      { name: 'services.daily', type: 'boolean', required: false, label: 'Tägliche Reinigung' },
      { name: 'services.weekly', type: 'boolean', required: false, label: 'Wöchentliche Reinigung' },
      { name: 'services.biweekly', type: 'boolean', required: false, label: '14-tägige Reinigung' },
      { name: 'services.monthly', type: 'boolean', required: false, label: 'Monatliche Reinigung' },
      { name: 'services.additional_maintenance', type: 'string', required: false, label: 'Zusatzleistung Unterhalt' },
      { name: 'services.window_cleaning', type: 'boolean', required: false, label: 'Fensterreinigung' },
      { name: 'services.interior', type: 'boolean', required: false, label: 'Innenreinigung' },
      { name: 'services.exterior', type: 'boolean', required: false, label: 'Außenreinigung' },
      { name: 'services.window_frequency', type: 'string', required: false, label: 'Fensterreinigung Häufigkeit' },
      { name: 'services.special_cleaning', type: 'boolean', required: false, label: 'Sonderreinigung' },
      { name: 'services.post_construction', type: 'boolean', required: false, label: 'Baustellenreinigung' },
      { name: 'services.carpet_cleaning', type: 'boolean', required: false, label: 'Teppichreinigung' },
      { name: 'services.disinfection', type: 'boolean', required: false, label: 'Desinfektion' },
      { name: 'prices.basic_cleaning', type: 'currency', required: false, label: 'Preis Grundreinigung' },
      { name: 'prices.daily', type: 'currency', required: false, label: 'Preis täglich' },
      { name: 'prices.weekly', type: 'currency', required: false, label: 'Preis wöchentlich' },
      { name: 'prices.biweekly', type: 'currency', required: false, label: 'Preis 14-tägig' },
      { name: 'prices.window_cleaning', type: 'currency', required: false, label: 'Preis Fensterreinigung' },
      { name: 'prices.special_cleaning', type: 'currency', required: false, label: 'Preis Sonderreinigung' },
      { name: 'prices.total', type: 'currency', required: true, label: 'Gesamtpreis' },
      { name: 'prices.vat_included', type: 'boolean', required: false, label: 'MwSt. inklusive' },
      { name: 'contract.duration', type: 'string', required: true, label: 'Vertragsdauer' },
      { name: 'contract.trial_period', type: 'string', required: false, label: 'Probezeit' },
      { name: 'payment_terms', type: 'number', required: true, label: 'Zahlungsziel (Tage)' },
      { name: 'service_start_date', type: 'date', required: true, label: 'Übernahmedatum' },
      { name: 'offer_valid_until', type: 'date', required: true, label: 'Angebot gültig bis' },
      { name: 'company.company_name', type: 'string', required: true, label: 'Firmenname' },
      { name: 'company.company_signature', type: 'string', required: false, label: 'Unterschrift' },
    ],
  },
  {
    category: 'employee' as const,
    type: 'wage_statement',
    title: 'Lohnabrechnung',
    content: `LOHNABRECHNUNG
für den Zeitraum: {{payroll.month}} {{payroll.year}}

Mitarbeiter: {{employee.first_name}} {{employee.last_name}}
Personalnummer: {{employee.employee_number}}
Steuerklasse: {{employee.tax_class}}
Konfession: {{employee.religion}}
KV: {{employee.health_insurance}}
PV: {{employee.pension_insurance}}

=====================================================================

ARBEITSZEITÜBERSICHT
Arbeitstage: {{payroll.working_days}}
Arbeitsstunden: {{payroll.total_hours}}
davon Sonntagsstunden: {{payroll.sunday_hours}}
davon Feiertagsstunden: {{payroll.holiday_hours}}
{{#if payrol.overtime_hours}}
Überstunden: {{payroll.overtime_hours}}
{{/if}}

BEZÜGE
Grundlohn ({{payroll.regular_hours}}h): {{payroll.regular_wage}} EUR
{{#if payroll.sunday_wage}}
Sonntagszuschlag ({{payroll.sunday_hours}}h): {{payroll.sunday_wage}} EUR
{{/if}}
{{#if payroll.holiday_wage}}
Feiertagszuschlag ({{payroll.holiday_hours}}h): {{payroll.holiday_wage}} EUR
{{/if}}
{{#if payroll.overtime_wage}}
Überstundenzuschlag: {{payroll.overtime_wage}} EUR
{{/if}}
{{#if payroll.bonus}}
Zulagen/Boni: {{payroll.bonus}} EUR
{{/if}}

BRUTTOLOHN: {{payroll.gross_wage}} EUR

ABZÜGE
=========
Lohnsteuer: {{payroll.income_tax}} EUR
Kirchensteuer ({{payroll.church_tax_rate}}%): {{payroll.church_tax}} EUR
{{#if payroll.solidarity_tax}}
Solidaritätszuschlag: {{payroll.solidarity_tax}} EUR
{{/if}}
Krankenversicherung ({{payroll.health_insurance_rate}}%): {{payroll.health_insurance}} EUR
Rentenversicherung ({{payroll.pension_insurance_rate}}%): {{payroll.pension_insurance}} EUR
Arbeitslosenversicherung ({{payroll.unemployment_insurance_rate}}%): {{payroll.unemployment_insurance}} EUR
{{#if payroll.other_deductions}}
Sonstige Abzüge: {{payroll.other_deductions}} EUR
{{/if}}

GESAMTABZÜGE: {{payroll.total_deductions}} EUR

NETTOLOHN: {{payroll.net_wage}} EUR

ZAHLUNGSINFORMATIONEN
=====================
Bank: {{bank.bank_name}}
IBAN: {{bank.iban}}
BIC: {{bank.bic}}
Kontoinhaber: {{bank.account_holder}}

Beitragssätze gesetzliche Sozialversicherung (Arbeitnehmeranteil):
- Krankenversicherung: {{payroll.health_insurance_rate}}%
- Rentenversicherung: {{payroll.pension_insurance_rate}}%
- Arbeitslosenversicherung: {{payroll.unemployment_insurance_rate}}%

Urlaubsanspruch 2024: {{employee.holiday_entitlement}} Tage
Resturlaub: {{payroll.remaining_holiday}} Tage

{{#if payroll.notes}}
Notizen:
{{payroll.notes}}
{{/if}}

Hamburg, {{payroll.issue_date}}

{{company.company_name}}
gez. {{company.payroll_responsible}}
Lohnbuchhaltung

Dieses Dokument wurde automatisch generiert.
    `,
    variables: [
      { name: 'employee.first_name', type: 'string', required: true, label: 'Vorname' },
      { name: 'employee.last_name', type: 'string', required: true, label: 'Nachname' },
      { name: 'employee.employee_number', type: 'string', required: true, label: 'Personalnummer' },
      { name: 'employee.tax_class', type: 'string', required: true, label: 'Steuerklasse' },
      { name: 'employee.religion', type: 'string', required: false, label: 'Konfession' },
      { name: 'employee.health_insurance', type: 'string', required: false, label: 'Krankenkasse' },
      { name: 'employee.pension_insurance', type: 'string', required: false, label: 'Rentenversicherung' },
      { name: 'employee.holiday_entitlement', type: 'number', required: true, label: 'Urlaubsanspruch' },
      { name: 'payroll.month', type: 'string', required: true, label: 'Monat' },
      { name: 'payroll.year', type: 'number', required: true, label: 'Jahr' },
      { name: 'payroll.working_days', type: 'number', required: true, label: 'Arbeitstage' },
      { name: 'payroll.total_hours', type: 'number', required: true, label: 'Gesamtstunden' },
      { name: 'payroll.regular_hours', type: 'number', required: true, label: 'Regelarbeitsstunden' },
      { name: 'payroll.regular_wage', type: 'currency', required: true, label: 'Grundlohn' },
      { name: 'payroll.sunday_hours', type: 'number', required: false, label: 'Sonntagsstunden' },
      { name: 'payroll.sunday_wage', type: 'currency', required: false, label: 'Sonntagszuschlag' },
      { name: 'payroll.holiday_hours', type: 'number', required: false, label: 'Feiertagsstunden' },
      { name: 'payroll.holiday_wage', type: 'currency', required: false, label: 'Feiertagszuschlag' },
      { name: 'payroll.overtime_hours', type: 'number', required: false, label: 'Überstunden' },
      { name: 'payroll.overtime_wage', type: 'currency', required: false, label: 'Überstundenzuschlag' },
      { name: 'payroll.bonus', type: 'currency', required: false, label: 'Zulagen/Boni' },
      { name: 'payroll.gross_wage', type: 'currency', required: true, label: 'Bruttolohn' },
      { name: 'payroll.income_tax', type: 'currency', required: true, label: 'Lohnsteuer' },
      { name: 'payroll.church_tax_rate', type: 'number', required: false, label: 'Kirchensteuer %' },
      { name: 'payroll.church_tax', type: 'currency', required: false, label: 'Kirchensteuer' },
      { name: 'payroll.solidarity_tax', type: 'currency', required: false, label: 'Solidaritätszuschlag' },
      { name: 'payroll.health_insurance_rate', type: 'number', required: true, label: 'KV-Beitrag %' },
      { name: 'payroll.health_insurance', type: 'currency', required: true, label: 'Krankenversicherung' },
      { name: 'payroll.pension_insurance_rate', type: 'number', required: true, label: 'RV-Beitrag %' },
      { name: 'payroll.pension_insurance', type: 'currency', required: true, label: 'Rentenversicherung' },
      { name: 'payroll.unemployment_insurance_rate', type: 'number', required: true, label: 'AV-Beitrag %' },
      { name: 'payroll.unemployment_insurance', type: 'currency', required: true, label: 'Arbeitslosenversicherung' },
      { name: 'payroll.other_deductions', type: 'currency', required: false, label: 'Sonstige Abzüge' },
      { name: 'payroll.total_deductions', type: 'currency', required: true, label: 'Gesamtabzüge' },
      { name: 'payroll.net_wage', type: 'currency', required: true, label: 'Nettolohn' },
      { name: 'payroll.remaining_holiday', type: 'number', required: false, label: 'Resturlaub' },
      { name: 'payroll.issue_date', type: 'date', required: true, label: 'Abrechnungsdatum' },
      { name: 'payroll.notes', type: 'text', required: false, label: 'Notizen' },
      { name: 'bank.bank_name', type: 'string', required: true, label: 'Bankname' },
      { name: 'bank.iban', type: 'string', required: true, label: 'IBAN' },
      { name: 'bank.bic', type: 'string', required: false, label: 'BIC' },
      { name: 'bank.account_holder', type: 'string', required: true, label: 'Kontoinhaber' },
      { name: 'company.company_name', type: 'string', required: true, label: 'Firmenname' },
      { name: 'company.payroll_responsible', type: 'string', required: true, label: 'Lohnbuchhaltung' },
    ],
  },
];

interface Company {
  id: string;
  owner_id: string;
}

async function getOrCreateDefaultCompany(): Promise<Company> {
  // Try to get an existing company
  const { data: companies, error } = await supabase
    .from('companies')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching companies:', error);
    throw error;
  }

  if (companies && companies.length > 0) {
    console.log(`Using existing company: ${companies[0].id}`);
    return companies[0];
  }

  // Create a default company if none exists
  console.log('No companies found. Creating a default company...');
  throw new Error('No companies found. Please ensure there is at least one company in the database.');
}

async function insertTemplate(
  companyId: string,
  templateData: typeof DOCUMENT_TEMPLATES[0]
): Promise<void> {
  // Insert template
  const { data: template, error: templateError } = await supabase
    .from('document_templates')
    .insert({
      company_id: companyId,
      category: templateData.category,
      type: templateData.type,
      title: templateData.title,
      content: templateData.content,
      variables: templateData.variables,
      is_default: true,
      is_active: true,
    })
    .select()
    .single();

  if (templateError) {
    console.error(`Error inserting template ${templateData.title}:`, templateError);
    throw templateError;
  }

  console.log(`✓ Inserted template: ${templateData.title} (${templateData.type})`);
}

async function seedTemplates(): Promise<void> {
  console.log('Starting document template seed...\n');

  try {
    // Get or create a company
    const company = await getOrCreateDefaultCompany();

    console.log(`Seeding templates for company: ${company.id}\n`);

    // Insert each template
    for (const template of DOCUMENT_TEMPLATES) {
      await insertTemplate(company.id, template);
    }

    console.log('\n✅ Document templates seeded successfully!');
    console.log(`\nTotal templates inserted: ${DOCUMENT_TEMPLATES.length}`);
    console.log('\nTemplates:');
    DOCUMENT_TEMPLATES.forEach((t, idx) => {
      console.log(`  ${idx + 1}. ${t.title} (${t.type}) - ${t.category}`);
    });

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error seeding templates:', error.message);
    process.exit(1);
  }
}

// Run the seed function
seedTemplates();
