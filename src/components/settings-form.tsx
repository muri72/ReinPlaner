"use client";

import { useState, useEffect } from "react";
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
import { FormActions } from "@/components/ui/form-actions";

const companyInfoSchema = z.object({
  company_name: z.string().min(1, "Firmenname ist erforderlich"),
  company_logo_url: z.string().url("Muss eine gültige URL sein"),
});

const regionalSettingsSchema = z.object({
  default_timezone: z.string(),
  default_bundesland: z.string().min(1, "Bundesland ist erforderlich"),
});

const payrollSettingsSchema = z.object({
  default_employee_hourly_rate: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Muss eine gültige Zahl sein",
  }),
  holiday_premium_pay_multiplier: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 1, {
    message: "Muss mindestens 1 sein",
  }),
  weekend_premium_pay_multiplier: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 1, {
    message: "Muss mindestens 1 sein",
  }),
});

type CompanyInfoForm = z.infer<typeof companyInfoSchema>;
type RegionalSettingsForm = z.infer<typeof regionalSettingsSchema>;
type PayrollSettingsForm = z.infer<typeof payrollSettingsSchema>;

export function SettingsForm() {
  const supabase = createClient();
  const [bundeslaender, setBundeslaender] = useState<Bundesland[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const companyInfoForm = useForm<CompanyInfoForm>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: {
      company_name: "ARIS Management",
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

  // Register with unsaved changes context
  useFormUnsavedChanges("company-info-form", companyInfoForm.formState.isDirty);
  useFormUnsavedChanges("regional-form", regionalForm.formState.isDirty);

  const payrollForm = useForm<PayrollSettingsForm>({
    resolver: zodResolver(payrollSettingsSchema),
    defaultValues: {
      default_employee_hourly_rate: "14.25",
      holiday_premium_pay_multiplier: "1.5",
      weekend_premium_pay_multiplier: "1.4",
    },
  });

  // Register with unsaved changes context
  useFormUnsavedChanges("payroll-form", payrollForm.formState.isDirty);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Clear cache to ensure we get fresh values from database
      settingsService.clearCache();

      // Load Bundesländer
      const states = await settingsService.getBundeslaender();
      setBundeslaender(states);

      // Load all settings
      const [
        companyName,
        logoUrl,
        timezone,
        bundesland,
        defaultRate,
        holidayMultiplier,
        weekendMultiplier,
      ] = await Promise.all([
        settingsService.getSetting('company_name'),
        settingsService.getSetting('company_logo_url'),
        settingsService.getSetting('default_timezone'),
        settingsService.getSetting('default_bundesland'),
        settingsService.getSetting('default_employee_hourly_rate'),
        settingsService.getSetting('holiday_premium_pay_multiplier'),
        settingsService.getSetting('weekend_premium_pay_multiplier'),
      ]);

      if (companyName) companyInfoForm.setValue('company_name', companyName);
      if (logoUrl) companyInfoForm.setValue('company_logo_url', logoUrl);
      if (timezone) regionalForm.setValue('default_timezone', timezone);
      if (bundesland) regionalForm.setValue('default_bundesland', bundesland);
      if (defaultRate) payrollForm.setValue('default_employee_hourly_rate', defaultRate);
      if (holidayMultiplier) payrollForm.setValue('holiday_premium_pay_multiplier', holidayMultiplier);
      if (weekendMultiplier) payrollForm.setValue('weekend_premium_pay_multiplier', weekendMultiplier);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Fehler beim Laden der Einstellungen');
    } finally {
      setLoading(false);
    }
  };

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
    ], "Lohnbuchhaltung");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Einstellungen werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="company" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="company">Unternehmen</TabsTrigger>
        <TabsTrigger value="regional">Region</TabsTrigger>
        <TabsTrigger value="payroll">Lohnbuchhaltung</TabsTrigger>
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
                  placeholder="ARIS Management"
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
        <Card>
          <CardHeader>
            <CardTitle>Lohnbuchhaltung</CardTitle>
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
    </Tabs>
  );
}
