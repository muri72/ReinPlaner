/**
 * BUrlO Vacation Calculation Utility
 * Automatische Urlaubsberechnung nach Bundesurlaubsgesetz (BUrlG)
 *
 * Regelungen:
 * - Vollzeit (>= 38.5h/Woche): 30 Urlaubstage/Jahr
 * - Teilzeit anteilig: (Wochenstunden / 38.5) * 30, gerundet
 * - Mindestens 20 Tage bei 5-Tage-Woche (BUrlG §3)
 */

export interface BurlOVacationResult {
  totalDays: number;
  isProportional: boolean;
  calculationBasis: string;
  fullTimeEquivalentHours: number;
  workingDaysPerWeek: number;
  meetsMinimumRequirement: boolean;
}

export interface BurlOVacationInput {
  contractHoursPerWeek: number | null;
  workingDaysPerWeek: number | null;
  baseVacationDays?: number;
}

/**
 * Berechnet den Urlaubsanspruch nach BUrlG
 *
 * @param input - Vertragsdaten (Stunden/Woche, Arbeitstage/Woche)
 * @param baseVacationDays - Basis-Urlaubstage (default: 30 für Vollzeit)
 * @returns BUrlO-konformer Urlaubsanspruch
 */
export function calculateBurlOVacation(input: BurlOVacationInput): BurlOVacationResult {
  const { contractHoursPerWeek, workingDaysPerWeek, baseVacationDays = 30 } = input;

  // Vollzeit-Schwelle: 38.5 Stunden pro Woche gemäß BUrlG
  const FULL_TIME_THRESHOLD = 38.5;
  const MINIMUM_DAYS_FOR_5_DAY_WEEK = 20;

  const hours = contractHoursPerWeek ?? 40;
  const daysPerWeek = workingDaysPerWeek ?? 5;

  // Vollzeit: 30 Tage
  if (hours >= FULL_TIME_THRESHOLD) {
    return {
      totalDays: baseVacationDays,
      isProportional: false,
      calculationBasis: `${baseVacationDays} Tage (Vollzeit ≥${FULL_TIME_THRESHOLD}h)`,
      fullTimeEquivalentHours: hours,
      workingDaysPerWeek: daysPerWeek,
      meetsMinimumRequirement: baseVacationDays >= MINIMUM_DAYS_FOR_5_DAY_WEEK,
    };
  }

  // Teilzeit: Pro-rata Berechnung
  // Formel: (Wochenstunden / 38.5) * 30
  const proportionalDays = Math.round((hours / FULL_TIME_THRESHOLD) * baseVacationDays);

  // BUrlG §3: Mindestens 20 Werktage (5-Tage-Woche) bei Teilzeit
  // Bei 6-Tage-Woche entsprechend mehr
  let minimumRequired = MINIMUM_DAYS_FOR_5_DAY_WEEK;
  if (daysPerWeek === 6) {
    minimumRequired = 24; // 6/5 * 20 = 24
  } else if (daysPerWeek < 5) {
    minimumRequired = Math.max(12, Math.round((daysPerWeek / 5) * MINIMUM_DAYS_FOR_5_DAY_WEEK));
  }

  const effectiveDays = Math.max(proportionalDays, minimumRequired);

  return {
    totalDays: effectiveDays,
    isProportional: true,
    calculationBasis: `(${hours}h / ${FULL_TIME_THRESHOLD}h) × ${baseVacationDays} = ${proportionalDays} Tage (anteilig)`,
    fullTimeEquivalentHours: hours,
    workingDaysPerWeek: daysPerWeek,
    meetsMinimumRequirement: effectiveDays >= minimumRequired,
  };
}

// Helper constant for minimum days
const BURL0_MINIMUM_DAYS_5_DAY_WEEK = 20;

/**
 * Formatiert den BUrlO-Berechnungsergebnis für Anzeige
 */
export function formatBurlOVacation(result: BurlOVacationResult): string {
  const parts: string[] = [];

  parts.push(`${result.totalDays} Urlaubstage/Jahr`);

  if (result.isProportional) {
    parts.push(`(anteilig)`);
  }

  parts.push(`— ${result.calculationBasis}`);

  if (!result.meetsMinimumRequirement) {
    parts.push(`⚠️ Minimum ${BURL0_MINIMUM_DAYS_5_DAY_WEEK} Tage nicht erreicht`);
  }

  return parts.join(' ');
}

/**
 * Prüft ob ein Mitarbeiter Anspruch auf Mindesturlaub hat
 */
export function meetsMinimumVacationEntitlement(
  contractHoursPerWeek: number | null,
  workingDaysPerWeek: number | null,
  vacationDays: number
): boolean {
  const calculation = calculateBurlOVacation({
    contractHoursPerWeek,
    workingDaysPerWeek,
  });
  return vacationDays >= calculation.totalDays;
}