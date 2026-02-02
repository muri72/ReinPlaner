"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getLohngruppe,
  getPSAZuschlag,
  calculateEffectiveHourlyRate,
  formatEuro,
  calculateVacationDays,
} from "@/lib/lohngruppen-config";

interface EmployeeWageInfoProps {
  wageGroup: number | null;
  qualification: string | null;
  hasProfessionalEducation: boolean;
  psaType: string | null;
  contractHoursPerWeek: number | null;
  contractType: string | null;
  baseVacationDays?: number;
  daysPerWeek?: number; // Optional: tatsächliche Arbeitstage aus Schedule
}

export function EmployeeWageInfo({
  wageGroup,
  qualification,
  hasProfessionalEducation,
  psaType,
  contractHoursPerWeek,
  contractType,
  baseVacationDays = 26,
  daysPerWeek,
}: EmployeeWageInfoProps) {
  const lohngruppe = wageGroup ? getLohngruppe(wageGroup) : null;
  const psa = psaType ? getPSAZuschlag(psaType) : null;

  // Calculate effective hourly rate
  const calculation = wageGroup
    ? calculateEffectiveHourlyRate(
        wageGroup,
        psaType || "standard",
        "none",
        "normal"
      )
    : null;

  // Calculate vacation days - use daysPerWeek if provided, otherwise use a default
  const hours = contractHoursPerWeek || 0;
  const type = contractType || "full_time";
  // Fallback: use 5 days for full-time, otherwise estimate from hours
  const estimatedDaysPerWeek = hours > 0 ? Math.min(5, Math.ceil(hours / 8)) : 0;
  const actualDaysPerWeek = daysPerWeek ?? estimatedDaysPerWeek;
  const vacationResult = calculateVacationDays(baseVacationDays, actualDaysPerWeek, type);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Vergütungsinformationen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lohngruppe */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-1">
            Lohngruppe (TV GD 2026)
          </h4>
          {lohngruppe ? (
            <div>
              <div className="font-semibold text-lg">
                LG {lohngruppe.id} - {lohngruppe.bezeichnung}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Stundenlohn: {formatEuro(lohngruppe.stundenlohn)}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">Keine Lohngruppe zugeordnet</div>
          )}
        </div>

        {/* Qualifikationen */}
        {(qualification || hasProfessionalEducation) && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              Qualifikationen
            </h4>
            <div className="space-y-1">
              {hasProfessionalEducation && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>3-jährige Berufsausbildung zum Gebäudereiniger</span>
                </div>
              )}
              {qualification && (
                <div className="text-sm ml-4">{qualification}</div>
              )}
            </div>
          </div>
        )}

        {/* PSA */}
        {psa && psa.zuschlagProzent > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              Persönliche Schutzausrüstung
            </h4>
            <div className="text-sm">
              <div className="font-medium">{psa.bezeichnung}</div>
              <div className="text-muted-foreground">+{psa.zuschlagProzent}% Zuschlag</div>
            </div>
          </div>
        )}

        {/* Effektiver Stundensatz */}
        {calculation && (
          <div className="bg-primary/5 rounded-lg p-3">
            <h4 className="text-sm font-medium mb-2">Effektiver Stundensatz</h4>
            <div className="text-2xl font-bold text-primary">
              {formatEuro(calculation.effektivStundenlohn)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Basis: {formatEuro(calculation.basisStundenlohn)}
              {calculation.psaZuschlagEuro > 0 && (
                <> + PSA: {formatEuro(calculation.psaZuschlagEuro)}</>
              )}
            </div>
          </div>
        )}

        {/* Urlaubsberechnung */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Urlaubsanspruch
          </h4>
          <div className="text-lg font-semibold">
            {vacationResult.tage} Tage{" "}
            {vacationResult.istProportional && (
              <span className="text-sm font-normal text-muted-foreground">
                (proportional)
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {hours} Std./Woche = {actualDaysPerWeek} Tage/Woche
          </div>
          <div className="text-xs text-muted-foreground">
            Berechnungsgrundlage: {vacationResult.berechnungsgrundlage}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
