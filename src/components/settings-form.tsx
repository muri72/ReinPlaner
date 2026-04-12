"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { settingsService, Bundesland } from "@/lib/services/settings-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormUnsavedChanges } from "@/components/ui/unsaved-changes-context";
import { Textarea } from "@/components/ui/textarea";
import { SimpleErrorBoundary } from "@/components/error-boundary";
import { RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { lohngruppen, psaZuschlaege, raumZuschlaege, zeitZuschlaege, formatEuro } from "@/lib/lohngruppen-config";

// Import schemas and types from form-utils
import {
  companyInfoSchema,
  regionalSettingsSchema,
  payrollSettingsSchema,
  invoiceSettingsSchema,
  taxSettingsSchema,
  bankConnectionSchema,
  CompanyInfoForm,
  RegionalSettingsForm,
  PayrollSettingsForm,
  InvoiceSettingsForm,
  TaxSettingsForm,
  BankConnectionForm,
} from "@/lib/utils/form-utils";

export function SettingsForm() {
  const supabase = createClient();
  const [bundeslaender, setBundeslaender] = useState<Bundesland[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [connectionHealthy, setConnectionHealthy] = useState(true);

  const companyInfoForm = useForm<CompanyInfoForm>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: {
      company_name: "ReinPlaner Management",
      company_logo_url: "/logo.png",
    },
  });

  const regionalForm = useForm<RegionalSettingsForm>({
    resolver: zodResolver(regionalSettingsSchema),
    defaultValues: {
      default_timezone: "Europe/Berlin",
      default_bundesland: "HH",
    },
  });

  const payrollForm = useForm<PayrollSettingsForm>({
    resolver: zodResolver(payrollSettingsSchema),
    defaultValues: {
      default_employee_hourly_rate: "14.25",
      holiday_premium_pay_multiplier: "1.5",
      weekend_premium_pay_multiplier: "1.4",
      base_vacation_days: "26",
      minijob_vacation_calculation: "proportional",
    },
  });

  const invoiceForm = useForm<InvoiceSettingsForm>({
    resolver: zodResolver(invoiceSettingsSchema),
    defaultValues: {
      invoice_prefix: "RE",
      next_invoice_number: "1001",
      offer_prefix: "AN",
      next_offer_number: "5001",
      credit_note_prefix: "GS",
      next_credit_note_number: "2001",
      default_payment_term: "30",
      default_invoice_header_text: "",
      default_invoice_footer_text: "",
      default_offer_header_text: "",
      default_offer_footer_text: "",
    },
  });

  const taxForm = useForm<TaxSettingsForm>({
    resolver: zodResolver(taxSettingsSchema),
    defaultValues: {
      currency: "EUR",
      vat_number: "",
      vat_option: "withVat",
    },
  });

  const bankForm = useForm<BankConnectionForm>({
    resolver: zodResolver(bankConnectionSchema),
    defaultValues: {
      account_holder: "",
      iban: "",
      bic: "",
      bank_name: "",
    },
  });

  const loadSettings = useCallback(async (isRetry: boolean = false) => {
    if (!isRetry) {
      setLoading(true);
      setRetryCount(0);
    } else {
      setRetryCount(prev => prev + 1);
    }

    setLoadError(null);

    try {
      // Check connection health first
      const connectionCheck = await settingsService.checkConnection();
      setConnectionHealthy(connectionCheck.healthy);

      if (!connectionCheck.healthy) {
        throw new Error(connectionCheck.error || 'Verbindung zur Datenbank nicht verfügbar');
      }

      // Clear cache to ensure we get fresh values from database
      settingsService.clearCache();

      // Load Bundesländer
      const states = await settingsService.getBundeslaender();
      setBundeslaender(states);

      // Load all settings with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout beim Laden der Einstellungen')), 30000);
      });

      const settingsPromise = Promise.all([
        settingsService.getSetting('company_name'),
        settingsService.getSetting('company_logo_url'),
        settingsService.getSetting('default_timezone'),
        settingsService.getSetting('default_bundesland'),
        settingsService.getSetting('default_employee_hourly_rate'),
        settingsService.getSetting('holiday_premium_pay_multiplier'),
        settingsService.getSetting('weekend_premium_pay_multiplier'),
        settingsService.getSetting('base_vacation_days'),
        settingsService.getSetting('minijob_vacation_calculation'),
        settingsService.getInvoiceSettings(),
        settingsService.getTaxSettings(),
        settingsService.getBankConnection(),
      ]);

      const [
        companyName,
        logoUrl,
        timezone,
        bundesland,
        defaultRate,
        holidayMultiplier,
        weekendMultiplier,
        baseVacationDays,
        minijobVacationCalc,
        invoiceSettings,
        taxSettings,
        bankConnection,
      ] = await Promise.race([settingsPromise, timeoutPromise]) as any;

      if (companyName) companyInfoForm.setValue('company_name', companyName);
      if (logoUrl) companyInfoForm.setValue('company_logo_url', logoUrl);
      if (timezone) regionalForm.setValue('default_timezone', timezone);
      if (bundesland) regionalForm.setValue('default_bundesland', bundesland);
      if (defaultRate) payrollForm.setValue('default_employee_hourly_rate', defaultRate);
      if (holidayMultiplier) payrollForm.setValue('holiday_premium_pay_multiplier', holidayMultiplier);
      if (weekendMultiplier) payrollForm.setValue('weekend_premium_pay_multiplier', weekendMultiplier);
      if (baseVacationDays) payrollForm.setValue('base_vacation_days', baseVacationDays);
      if (minijobVacationCalc) payrollForm.setValue('minijob_vacation_calculation', minijobVacationCalc);

      // Load invoice settings
      if (invoiceSettings) {
        invoiceForm.setValue('invoice_prefix', invoiceSettings.invoice_prefix);
        invoiceForm.setValue('next_invoice_number', invoiceSettings.next_invoice_number?.toString() || "1001");
        invoiceForm.setValue('offer_prefix', invoiceSettings.offer_prefix || "AN");
        invoiceForm.setValue('next_offer_number', invoiceSettings.next_offer_number?.toString() || "5001");
        invoiceForm.setValue('credit_note_prefix', invoiceSettings.credit_note_prefix || "GS");
        invoiceForm.setValue('next_credit_note_number', invoiceSettings.next_credit_note_number?.toString() || "2001");
        invoiceForm.setValue('default_payment_term', invoiceSettings.default_payment_term || "30");
        invoiceForm.setValue('default_invoice_header_text', invoiceSettings.default_invoice_header_text || "");
        invoiceForm.setValue('default_invoice_footer_text', invoiceSettings.default_invoice_footer_text || "");
        invoiceForm.setValue('default_offer_header_text', invoiceSettings.default_offer_header_text || "");
        invoiceForm.setValue('default_offer_footer_text', invoiceSettings.default_offer_footer_text || "");
      }

      // Load tax settings
      if (taxSettings) {
        taxForm.setValue('currency', taxSettings.currency || "EUR");
        taxForm.setValue('vat_number', taxSettings.vat_number || "");
        taxForm.setValue('vat_option', taxSettings.vat_option || "withVat");
      }

      // Load bank connection
      if (bankConnection) {
        bankForm.setValue('account_holder', bankConnection.account_holder || "");
        bankForm.setValue('iban', bankConnection.iban || "");
        bankForm.setValue('bic', bankConnection.bic || "");
        bankForm.setValue('bank_name', bankConnection.bank_name || "");
      }

      if (isRetry) {
        toast.success('Einstellungen erfolgreich neu geladen', {
          description: `Versuch ${retryCount + 1} war erfolgreich`,
        });
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      const errorMessage = error.message || 'Fehler beim Laden der Einstellungen';
      setLoadError(errorMessage);

      toast.error('Fehler beim Laden', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveCompanyInfo = async (data: CompanyInfoForm) => {
    await saveSettings([
      { key: 'company_name', value: data.company_name },
      { key: 'company_logo_url', value: data.company_logo_url },
    ], "Firmeninformationen");
  };

  const handleSaveRegional = async (data: RegionalSettingsForm) => {
    await saveSettings([
      { key: 'default_timezone', value: data.default_timezone },
      { key: 'default_bundesland', value: data.default_bundesland },
    ], "Regionale Einstellungen");
  };

  const handleSavePayroll = async (data: PayrollSettingsForm) => {
    await saveSettings([
      { key: 'default_employee_hourly_rate', value: data.default_employee_hourly_rate },
      { key: 'holiday_premium_pay_multiplier', value: data.holiday_premium_pay_multiplier },
      { key: 'weekend_premium_pay_multiplier', value: data.weekend_premium_pay_multiplier },
      { key: 'base_vacation_days', value: data.base_vacation_days },
      { key: 'minijob_vacation_calculation', value: data.minijob_vacation_calculation },
    ], "Lohnbuchhaltung");
  };

  const handleSaveInvoice = async (data: InvoiceSettingsForm) => {
    setSaving(true);
    try {
      const result = await settingsService.updateInvoiceSettings({
        invoice_prefix: data.invoice_prefix,
        next_invoice_number: parseInt(data.next_invoice_number),
        offer_prefix: data.offer_prefix,
        next_offer_number: parseInt(data.next_offer_number),
        credit_note_prefix: data.credit_note_prefix,
        next_credit_note_number: parseInt(data.next_credit_note_number),
        default_payment_term: data.default_payment_term,
        default_invoice_header_text: data.default_invoice_header_text,
        default_invoice_footer_text: data.default_invoice_footer_text,
        default_offer_header_text: data.default_offer_header_text,
        default_offer_footer_text: data.default_offer_footer_text,
      });

      if (result.success) {
        toast.success("Rechnungseinstellungen erfolgreich gespeichert");
        await loadSettings();
      } else {
        toast.error(`Fehler: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error saving invoice settings:', error);
      toast.error(`Fehler beim Speichern: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTax = async (data: TaxSettingsForm) => {
    setSaving(true);
    try {
      const result = await settingsService.updateTaxSettings({
        currency: data.currency,
        vat_number: data.vat_number,
        vat_option: data.vat_option,
      });

      if (result.success) {
        toast.success("Steuereinstellungen erfolgreich gespeichert");
        await loadSettings();
      } else {
        toast.error(`Fehler: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error saving tax settings:', error);
      toast.error(`Fehler beim Speichern: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBank = async (data: BankConnectionForm) => {
    setSaving(true);
    try {
      const result = await settingsService.updateBankConnection({
        account_holder: data.account_holder,
        iban: data.iban,
        bic: data.bic,
        bank_name: data.bank_name,
      });

      if (result.success) {
        toast.success("Bankverbindung erfolgreich gespeichert");
        await loadSettings();
      } else {
        toast.error(`Fehler: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error saving bank connection:', error);
      toast.error(`Fehler beim Speichern: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async (
    settings: { key: string; value: string }[],
    category: string
  ) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      for (const setting of settings) {
        await settingsService.updateSetting(setting.key, setting.value, user.id);
      }

      toast.success(`${category} erfolgreich gespeichert`);

      // Reload all settings to show the actual saved values from database
      await loadSettings();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(`Fehler beim Speichern: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading && retryCount === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto"></div>
          <div className="space-y-2">
            <p className="text-lg font-medium">Einstellungen werden geladen...</p>
            <p className="text-sm text-muted-foreground">
              Verbindung zur Datenbank wird hergestellt
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="border border-destructive/20 rounded-lg bg-destructive/5 p-8">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-destructive">
                Fehler beim Laden der Einstellungen
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                {loadError}
              </p>
            </div>

            {!connectionHealthy && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                <p className="text-sm font-medium text-destructive">
                  Datenbankverbindung unterbrochen
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.
                </p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                onClick={() => loadSettings(true)}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Lädt...' : retryCount > 0 ? `Erneut versuchen (${retryCount})` : 'Erneut versuchen'}
              </Button>

              {retryCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {retryCount} Versuche unternommen
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="company" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="company">Unternehmen</TabsTrigger>
        <TabsTrigger value="regional">Region</TabsTrigger>
        <TabsTrigger value="payroll">Lohnbuchhaltung</TabsTrigger>
        <TabsTrigger value="billing">Faktura</TabsTrigger>
      </TabsList>

      <TabsContent value="company">
        <Card>
          <CardHeader>
            <CardTitle>Unternehmensinformationen</CardTitle>
            <CardDescription>
              Grundlegende Informationen zu Ihrem Unternehmen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={companyInfoForm.handleSubmit(handleSaveCompanyInfo)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company_name">Firmenname</Label>
                <Input
                  id="company_name"
                  {...companyInfoForm.register('company_name')}
                  placeholder="ReinPlaner Management"
                />
                {companyInfoForm.formState.errors.company_name && (
                  <p className="text-sm text-red-500">
                    {companyInfoForm.formState.errors.company_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_logo_url">Logo-URL</Label>
                <Input
                  id="company_logo_url"
                  {...companyInfoForm.register('company_logo_url')}
                  placeholder="/logo.png"
                />
                {companyInfoForm.formState.errors.company_logo_url && (
                  <p className="text-sm text-red-500">
                    {companyInfoForm.formState.errors.company_logo_url.message}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? "Speichern..." : "Speichern"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="regional">
        <Card>
          <CardHeader>
            <CardTitle>Regionale Einstellungen</CardTitle>
            <CardDescription>
              Zeitzone und Standard-Bundesland für Feiertage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={regionalForm.handleSubmit(handleSaveRegional)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="default_timezone">Zeitzone</Label>
                <Select
                  value={regionalForm.watch('default_timezone')}
                  onValueChange={(value) => regionalForm.setValue('default_timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wählen Sie eine Zeitzone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Europe/Berlin">Europe/Berlin</SelectItem>
                    <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                    <SelectItem value="Europe/London">Europe/London</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_bundesland">Standard-Bundesland</Label>
                <Select
                  value={regionalForm.watch('default_bundesland')}
                  onValueChange={(value) => regionalForm.setValue('default_bundesland', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wählen Sie ein Bundesland" />
                  </SelectTrigger>
                  <SelectContent>
                    {bundeslaender.map((state) => (
                      <SelectItem key={state.code} value={state.code}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? "Speichern..." : "Speichern"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="payroll">
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">Allgemein</TabsTrigger>
            <TabsTrigger value="tarif">Tariftabelle (TV GD 2026)</TabsTrigger>
            <TabsTrigger value="vacation">Urlaub</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Allgemeine Lohnbuchhaltung</CardTitle>
                <CardDescription>
                  Standard-Stundensätze und Zuschläge für Feiertage/Wochenenden
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={payrollForm.handleSubmit(handleSavePayroll)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="default_employee_hourly_rate">Standard-Stundensatz (€)</Label>
                    <Input
                      id="default_employee_hourly_rate"
                      type="number"
                      step="0.01"
                      {...payrollForm.register('default_employee_hourly_rate')}
                    />
                    {payrollForm.formState.errors.default_employee_hourly_rate && (
                      <p className="text-sm text-red-500">
                        {payrollForm.formState.errors.default_employee_hourly_rate.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="holiday_premium_pay_multiplier">
                      Feiertag-Zuschlag (Multiplikator)
                    </Label>
                    <Input
                      id="holiday_premium_pay_multiplier"
                      type="number"
                      step="0.1"
                      {...payrollForm.register('holiday_premium_pay_multiplier')}
                    />
                    <p className="text-sm text-muted-foreground">
                      Beispiel: 1.5 = 150% des normalen Stundensatzes
                    </p>
                    {payrollForm.formState.errors.holiday_premium_pay_multiplier && (
                      <p className="text-sm text-red-500">
                        {payrollForm.formState.errors.holiday_premium_pay_multiplier.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weekend_premium_pay_multiplier">
                      Wochenende-Zuschlag (Multiplikator)
                    </Label>
                    <Input
                      id="weekend_premium_pay_multiplier"
                      type="number"
                      step="0.1"
                      {...payrollForm.register('weekend_premium_pay_multiplier')}
                    />
                    <p className="text-sm text-muted-foreground">
                      Beispiel: 1.4 = 140% des normalen Stundensatzes
                    </p>
                    {payrollForm.formState.errors.weekend_premium_pay_multiplier && (
                      <p className="text-sm text-red-500">
                        {payrollForm.formState.errors.weekend_premium_pay_multiplier.message}
                      </p>
                    )}
                  </div>

                  <Button type="submit" disabled={saving}>
                    {saving ? "Speichern..." : "Speichern"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tarif">
            <Card>
              <CardHeader>
                <CardTitle>Tariftabelle TV GD 2026</CardTitle>
                <CardDescription>
                  Bundeseinheitliche Lohngruppen gemäß Tarifvertrag für die Gebäudereinigung 2026
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Lohngruppen Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 font-medium">LG</th>
                          <th className="text-left p-3 font-medium">Bezeichnung</th>
                          <th className="text-right p-3 font-medium">Stundenlohn</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lohngruppen.map((lg) => (
                          <tr key={lg.id} className="border-t">
                            <td className="p-3 font-medium">{lg.id}</td>
                            <td className="p-3">
                              <div className="font-medium">{lg.bezeichnung}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {lg.taetigkeiten.slice(0, 2).join(", ")}
                                {lg.taetigkeiten.length > 2 && "..."}
                              </div>
                            </td>
                            <td className="p-3 text-right font-semibold text-primary">
                              {formatEuro(lg.stundenlohn)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* PSA Zuschläge */}
                  <div>
                    <h4 className="font-medium mb-3">PSA-Zuschläge (Persönliche Schutzausrüstung)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {psaZuschlaege.filter(p => p.id !== "none").map((psa) => (
                        <div key={psa.id} className="flex justify-between p-2 bg-muted/30 rounded text-sm">
                          <span>{psa.bezeichnung}</span>
                          <span className="font-medium">+{psa.zuschlagProzent}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Zeit Zuschläge */}
                  <div>
                    <h4 className="font-medium mb-3">Zeit-Zuschläge</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {zeitZuschlaege.filter(z => z.id !== "normal").map((zeit) => (
                        <div key={zeit.id} className="flex justify-between p-2 bg-muted/30 rounded text-sm">
                          <span>
                            {zeit.bezeichnung}
                            {zeit.zeitraum && <span className="text-muted-foreground ml-1">({zeit.zeitraum})</span>}
                          </span>
                          <span className="font-medium">
                            {(zeit.multiplier - 1) * 100 > 0 ? `+${(zeit.multiplier - 1) * 100}%` : "Normal"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Raum Zuschläge */}
                  <div>
                    <h4 className="font-medium mb-3">Erschwernis-Zuschläge (pro Stunde)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {raumZuschlaege.filter(r => r.id !== "none").map((raum) => (
                        <div key={raum.id} className="flex justify-between p-2 bg-muted/30 rounded text-sm">
                          <span>{raum.bezeichnung}</span>
                          <span className="font-medium">+{formatEuro(raum.zuschlagEuro)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vacation">
            <Card>
              <CardHeader>
                <CardTitle>Urlaubseinstellungen</CardTitle>
                <CardDescription>
                  Konfiguration der Urlaubstage-Berechnung für verschiedene Vertragsarten
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={payrollForm.handleSubmit(handleSavePayroll)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="base_vacation_days">Basis-Urlaubstage pro Jahr</Label>
                    <Input
                      id="base_vacation_days"
                      type="number"
                      min="0"
                      max="365"
                      {...payrollForm.register('base_vacation_days')}
                    />
                    <p className="text-sm text-muted-foreground">
                      Standard-Urlaubstage für Vollzeit-Mitarbeiter (z.B. 26)
                    </p>
                    {payrollForm.formState.errors.base_vacation_days && (
                      <p className="text-sm text-red-500">
                        {payrollForm.formState.errors.base_vacation_days.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minijob_vacation_calculation">Minijob-Urlaubsberechnung</Label>
                    <Select
                      value={payrollForm.watch('minijob_vacation_calculation')}
                      onValueChange={(value) => payrollForm.setValue('minijob_vacation_calculation', value as "proportional" | "full")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="proportional">Proportional (anteilig nach Arbeitstagen)</SelectItem>
                        <SelectItem value="full">Vollständig (gleiche Tage wie Vollzeit)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Bei proportionaler Berechnung wird der Urlaub anteilig nach den tatsächlichen Arbeitstagen pro Woche berechnet.
                    </p>
                  </div>

                  {/* Berechnungsbeispiel */}
                  <div className="bg-muted/30 rounded-lg p-4 mt-4">
                    <h4 className="font-medium mb-2">Berechnungsbeispiel</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>40h/Woche (Vollzeit):</span>
                        <span className="font-medium">26 Tage</span>
                      </div>
                      <div className="flex justify-between">
                        <span>12h/Woche (Minijob, 2 Tage):</span>
                        <span className="font-medium">26 × 2/5 = 10 Tage (proportional)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>20h/Woche (Minijob, 3 Tage):</span>
                        <span className="font-medium">26 × 3/5 = 16 Tage (proportional)</span>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" disabled={saving}>
                    {saving ? "Speichern..." : "Speichern"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </TabsContent>

      <TabsContent value="billing">
        <Tabs defaultValue="invoices" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="invoices">Rechnungen</TabsTrigger>
            <TabsTrigger value="tax">Steuer</TabsTrigger>
            <TabsTrigger value="bank">Bankdaten</TabsTrigger>
            <TabsTrigger value="products">Produkte</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>Rechnungs- & Angebotseinstellungen</CardTitle>
                <CardDescription>
                  Konfigurieren Sie Präfixe, Nummernkreise und Standardtexte für Rechnungen und Angebote
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={invoiceForm.handleSubmit(handleSaveInvoice)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="invoice_prefix">Rechnungspräfix</Label>
                      <Input
                        id="invoice_prefix"
                        {...invoiceForm.register('invoice_prefix')}
                        placeholder="RE"
                      />
                      {invoiceForm.formState.errors.invoice_prefix && (
                        <p className="text-sm text-red-500">
                          {invoiceForm.formState.errors.invoice_prefix.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="next_invoice_number">Nächste Rechnungsnummer</Label>
                      <Input
                        id="next_invoice_number"
                        type="number"
                        {...invoiceForm.register('next_invoice_number')}
                        placeholder="1001"
                      />
                      {invoiceForm.formState.errors.next_invoice_number && (
                        <p className="text-sm text-red-500">
                          {invoiceForm.formState.errors.next_invoice_number.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="offer_prefix">Angebotspräfix</Label>
                      <Input
                        id="offer_prefix"
                        {...invoiceForm.register('offer_prefix')}
                        placeholder="AN"
                      />
                      {invoiceForm.formState.errors.offer_prefix && (
                        <p className="text-sm text-red-500">
                          {invoiceForm.formState.errors.offer_prefix.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="next_offer_number">Nächste Angebotsnummer</Label>
                      <Input
                        id="next_offer_number"
                        type="number"
                        {...invoiceForm.register('next_offer_number')}
                        placeholder="5001"
                      />
                      {invoiceForm.formState.errors.next_offer_number && (
                        <p className="text-sm text-red-500">
                          {invoiceForm.formState.errors.next_offer_number.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="credit_note_prefix">Gutschriftpräfix</Label>
                      <Input
                        id="credit_note_prefix"
                        {...invoiceForm.register('credit_note_prefix')}
                        placeholder="GS"
                      />
                      {invoiceForm.formState.errors.credit_note_prefix && (
                        <p className="text-sm text-red-500">
                          {invoiceForm.formState.errors.credit_note_prefix.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="next_credit_note_number">Nächste Gutschriftnummer</Label>
                      <Input
                        id="next_credit_note_number"
                        type="number"
                        {...invoiceForm.register('next_credit_note_number')}
                        placeholder="2001"
                      />
                      {invoiceForm.formState.errors.next_credit_note_number && (
                        <p className="text-sm text-red-500">
                          {invoiceForm.formState.errors.next_credit_note_number.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="default_payment_term">Zahlungsziel (Tage)</Label>
                      <Input
                        id="default_payment_term"
                        type="number"
                        {...invoiceForm.register('default_payment_term')}
                        placeholder="30"
                      />
                      {invoiceForm.formState.errors.default_payment_term && (
                        <p className="text-sm text-red-500">
                          {invoiceForm.formState.errors.default_payment_term.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="default_invoice_header_text">Standard-Kopfzeile (Rechnung)</Label>
                      <Textarea
                        id="default_invoice_header_text"
                        {...invoiceForm.register('default_invoice_header_text')}
                        placeholder="Hier können Sie einen Standardtext für den Kopf von Rechnungen eingeben..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="default_invoice_footer_text">Standard-Fußzeile (Rechnung)</Label>
                      <Textarea
                        id="default_invoice_footer_text"
                        {...invoiceForm.register('default_invoice_footer_text')}
                        placeholder="Hier können Sie einen Standardtext für die Fußzeile von Rechnungen eingeben..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="default_offer_header_text">Standard-Kopfzeile (Angebot)</Label>
                      <Textarea
                        id="default_offer_header_text"
                        {...invoiceForm.register('default_offer_header_text')}
                        placeholder="Hier können Sie einen Standardtext für den Kopf von Angeboten eingeben..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="default_offer_footer_text">Standard-Fußzeile (Angebot)</Label>
                      <Textarea
                        id="default_offer_footer_text"
                        {...invoiceForm.register('default_offer_footer_text')}
                        placeholder="Hier können Sie einen Standardtext für die Fußzeile von Angeboten eingeben..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={saving}>
                    {saving ? "Speichern..." : "Speichern"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tax">
            <Card>
              <CardHeader>
                <CardTitle>Steuereinstellungen</CardTitle>
                <CardDescription>
                  Konfigurieren Sie Währung, Umsatzsteuernummer und Mehrwertsteuer-Optionen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={taxForm.handleSubmit(handleSaveTax)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Währung</Label>
                    <Select
                      value={taxForm.watch('currency')}
                      onValueChange={(value) => taxForm.setValue('currency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wählen Sie eine Währung" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR (Euro)</SelectItem>
                        <SelectItem value="USD">USD (US-Dollar)</SelectItem>
                        <SelectItem value="GBP">GBP (Britisches Pfund)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vat_number">Umsatzsteuernummer</Label>
                    <Input
                      id="vat_number"
                      {...taxForm.register('vat_number')}
                      placeholder="DE123456789"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vat_option">MwSt.-Option</Label>
                    <Select
                      value={taxForm.watch('vat_option')}
                      onValueChange={(value) => taxForm.setValue('vat_option', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wählen Sie eine Option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="withVat">Preise inkl. MwSt.</SelectItem>
                        <SelectItem value="withoutVat">Preise exkl. MwSt.</SelectItem>
                        <SelectItem value="smallBusiness">Kleinunternehmerregelung</SelectItem>
                      </SelectContent>
                    </Select>
                    {taxForm.formState.errors.vat_option && (
                      <p className="text-sm text-red-500">
                        {taxForm.formState.errors.vat_option.message}
                      </p>
                    )}
                  </div>

                  <Button type="submit" disabled={saving}>
                    {saving ? "Speichern..." : "Speichern"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bank">
            <Card>
              <CardHeader>
                <CardTitle>Bankverbindung</CardTitle>
                <CardDescription>
                  Hinterlegen Sie Ihre Bankverbindung für die Anzeige in Rechnungen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={bankForm.handleSubmit(handleSaveBank)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="account_holder">Kontoinhaber</Label>
                    <Input
                      id="account_holder"
                      {...bankForm.register('account_holder')}
                      placeholder="Max Mustermann"
                    />
                    {bankForm.formState.errors.account_holder && (
                      <p className="text-sm text-red-500">
                        {bankForm.formState.errors.account_holder.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="iban">IBAN</Label>
                    <Input
                      id="iban"
                      {...bankForm.register('iban')}
                      placeholder="DE89 3704 0044 0532 0130 00"
                    />
                    {bankForm.formState.errors.iban && (
                      <p className="text-sm text-red-500">
                        {bankForm.formState.errors.iban.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bic">BIC (optional)</Label>
                    <Input
                      id="bic"
                      {...bankForm.register('bic')}
                      placeholder="COBADEFFXXX"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Bankname</Label>
                    <Input
                      id="bank_name"
                      {...bankForm.register('bank_name')}
                      placeholder="Sparkasse KölnBonn"
                    />
                    {bankForm.formState.errors.bank_name && (
                      <p className="text-sm text-red-500">
                        {bankForm.formState.errors.bank_name.message}
                      </p>
                    )}
                  </div>

                  <Button type="submit" disabled={saving}>
                    {saving ? "Speichern..." : "Speichern"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Produkte & Dienstleistungen</CardTitle>
                <CardDescription>
                  Verwalten Sie Ihre Produkte und Dienstleistungen für Angebote und Rechnungen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Hier können Sie Produkte und Dienstleistungen anlegen, die Sie in Angeboten und Rechnungen verwenden können.
                  </p>
                  <div className="border rounded-lg p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      Produktverwaltung wird in der nächsten Version verfügbar sein.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  );
}
