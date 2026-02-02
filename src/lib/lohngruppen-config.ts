/**
 * Lohngruppen-Konfiguration für Gebäudereinigung (TV GD 2026)
 *
 * Zentrale Konfiguration aller Lohngruppen, Zuschläge und Berechnungsfunktionen
 * basierend auf dem Tarifvertrag für die Gebäudereinigung 2026.
 */

// Lohngruppen gemäß TV GD 2026 (bundeseinheitlich)
export interface Lohngruppe {
  id: number;
  bezeichnung: string;
  stundenlohn: number;
  taetigkeiten: string[];
}

export const lohngruppen: Lohngruppe[] = [
  {
    id: 1,
    bezeichnung: "Unterhaltsreinigung",
    stundenlohn: 15.00,
    taetigkeiten: ["Regelmäßige Reinigungsarbeiten in Büros", "Schulen", "Treppenhäusern", "Allgemeinräumen"],
  },
  {
    id: 2,
    bezeichnung: "Sensible Bereiche",
    stundenlohn: 15.46,
    taetigkeiten: ["OP-Säle", "Reinräume", "Isotopenlabore", "Klinische Labore"],
  },
  {
    id: 3,
    bezeichnung: "Spezielle Qualifikation",
    stundenlohn: 15.95,
    taetigkeiten: ["Desinfektoren", "Schädlingsbekämpfer", "Sonderreinigung"],
  },
  {
    id: 4,
    bezeichnung: "Bauschluss/Vorarbeiter",
    stundenlohn: 16.66,
    taetigkeiten: ["Reinigung nach Bauarbeiten", "Grundreinigung", "Teamkoordination"],
  },
  // Lohngruppe 5 existiert nicht im Tarifvertrag
  {
    id: 6,
    bezeichnung: "Glas- & Fassadenreinigung",
    stundenlohn: 18.40,
    taetigkeiten: ["Hebebühnen", "Seilzugangstechnik", "Fassadenreinigung"],
  },
  {
    id: 7,
    bezeichnung: "Facharbeiter Ausbildung",
    stundenlohn: 19.39,
    taetigkeiten: ["3-jährige Berufsausbildung zum Gebäudereiniger", "Fachkompetente Tätigkeiten"],
  },
  {
    id: 8,
    bezeichnung: "Ausbilder",
    stundenlohn: 20.42,
    taetigkeiten: ["Mit Ausbildereignungsprüfung (AEVO)", "Ausbildung von Azubis"],
  },
  {
    id: 9,
    bezeichnung: "Fachvorarbeitende",
    stundenlohn: 21.64,
    taetigkeiten: ["Leitende Funktion in Außenreinigung", "Koordination von Teams"],
  },
];

// PSA-Zuschläge (Persönliche Schutzausrüstung)
export interface PSAZuschlag {
  id: string;
  bezeichnung: string;
  zuschlagProzent: number;
  beschreibung: string;
}

export const psaZuschlaege: PSAZuschlag[] = [
  {
    id: "standard",
    bezeichnung: "Standard PSA",
    zuschlagProzent: 0,
    beschreibung: "Kein zusätzlicher Zuschlag",
  },
  {
    id: "schutzkleidung",
    bezeichnung: "Schutzanzug + Überschuhe + Handschuhe + Brille",
    zuschlagProzent: 5,
    beschreibung: "Vollständiger Schutzanzug mit Überschuhen, Handschuhen und Schutzbrille",
  },
  {
    id: "filterschutzmaske",
    bezeichnung: "+ Filterschutzmaske",
    zuschlagProzent: 15,
    beschreibung: "Standard PSA zusätzlich mit Filterschutzmaske",
  },
  {
    id: "schlauchgeraet",
    bezeichnung: "+ Frischluftschlauch/Druckluftgerät",
    zuschlagProzent: 20,
    beschreibung: "Atemschutz mit Frischluftschlauch oder Druckluftgerät",
  },
  {
    id: "vollschutz",
    bezeichnung: "Vollschutz/Chemikalienschutz (Form C)",
    zuschlagProzent: 40,
    beschreibung: "Vollständiger Chemikalienschutzanzug (Form C)",
  },
  {
    id: "atemschutzmaske",
    bezeichnung: "Vorgeschriebene Atemschutzmaske",
    zuschlagProzent: 10,
    beschreibung: "Atemschutzmaske gemäß Gefährdungsbeurteilung vorgeschrieben",
  },
];

// Raum- und Bedingungs-Zuschläge (pro Stunde)
export interface RaumZuschlag {
  id: string;
  bezeichnung: string;
  zuschlagEuro: number;
  beschreibung: string;
}

export const raumZuschlaege: RaumZuschlag[] = [
  {
    id: "none",
    bezeichnung: "Keine Erschwernis",
    zuschlagEuro: 0,
    beschreibung: "Standard-Arbeitsbedingungen",
  },
  {
    id: "parkett",
    bezeichnung: "Manuelles Parkettabziehen",
    zuschlagEuro: 3.00,
    beschreibung: "Manuelles Abziehen von Parkettböden",
  },
  {
    id: "staubdach",
    bezeichnung: "Staubdacharbeiten",
    zuschlagEuro: 3.00,
    beschreibung: "Arbeiten auf Staubdächern",
  },
  {
    id: "strahlgut",
    bezeichnung: "Steinfassaden mit Strahlgut",
    zuschlagEuro: 3.00,
    beschreibung: "Fassadenreinigung mit Strahlgut (Sandstrahlen etc.)",
  },
  {
    id: "sheddach",
    bezeichnung: "Sheddächer (>6 Monate Intervall)",
    zuschlagEuro: 3.00,
    beschreibung: "Reinigung von Sheddächern mit mehr als 6 Monaten Intervall",
  },
  {
    id: "stark_verschmutzt",
    bezeichnung: "Stark verschmutzte Bereiche",
    zuschlagEuro: 0.75,
    beschreibung: "Bereiche mit extremer Verschmutzung",
  },
  {
    id: "temperatur_40",
    bezeichnung: "Temperatur > 40°C",
    zuschlagEuro: 0.50,
    beschreibung: "Arbeiten bei Temperaturen über 40°C",
  },
  {
    id: "kuehlraum",
    bezeichnung: "Kühlräume < 6°C",
    zuschlagEuro: 0.50,
    beschreibung: "Arbeiten in Kühlräumen unter 6°C",
  },
];

// Zeit-Zuschläge
export interface ZeitZuschlag {
  id: string;
  bezeichnung: string;
  multiplier: number;
  beschreibung: string;
  zeitraum?: string;
}

export const zeitZuschlaege: ZeitZuschlag[] = [
  {
    id: "normal",
    bezeichnung: "Normale Arbeitszeit",
    multiplier: 1.0,
    beschreibung: "Standardarbeitszeit ohne Zuschläge",
  },
  {
    id: "nachtarbeit",
    bezeichnung: "Nachtarbeit (22:00 - 06:00 Uhr)",
    multiplier: 1.25,
    beschreibung: "Arbeit zwischen 22:00 und 06:00 Uhr",
    zeitraum: "22:00 - 06:00",
  },
  {
    id: "sonntag",
    bezeichnung: "Sonntagsarbeit",
    multiplier: 1.5,
    beschreibung: "Arbeit an Sonntagen",
    zeitraum: "Sonntag",
  },
  {
    id: "feiertag",
    bezeichnung: "Feiertagsarbeit",
    multiplier: 2.0,
    beschreibung: "Arbeit an gesetzlichen Feiertagen",
    zeitraum: "Feiertage",
  },
];

// Urlaubsberechnung
export interface UrlaubsBerechnung {
  tage: number;
  istProportional: boolean;
  berechnungsgrundlage: string;
}

/**
 * Zählt die tatsächlichen Arbeitstage pro Woche aus dem Schedule
 * Ein Tag gilt als Arbeitstag wenn Stunden > 0 eingetragen sind
 */
export function getDaysPerWeekFromSchedule(schedule: any): number {
  if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
    return 0;
  }
  const firstWeek = schedule[0];
  if (!firstWeek) return 0;

  let daysWithWork = 0;
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  for (const day of days) {
    const dayData = firstWeek[day];
    if (dayData && dayData.hours && Number(dayData.hours) > 0) {
      daysWithWork++;
    }
  }

  return daysWithWork;
}

/**
 * Berechnet den Urlaubsanspruch basierend auf Basis-Tagen, tatsächlichen Arbeitstagen und Vertragsart
 * @param baseDays Basis-Urlaubstage (aus Settings, z.B. 26)
 * @param daysPerWeek Tatsächliche Arbeitstage pro Woche (aus Schedule)
 * @param contractType Vertragsart (full_time, part_time, minijob, etc.)
 */
export function calculateVacationDays(
  baseDays: number,
  daysPerWeek: number,
  contractType: string
): UrlaubsBerechnung {
  if (contractType === "minijob") {
    const proportionalDays = Math.round(baseDays * daysPerWeek / 5);
    return {
      tage: proportionalDays,
      istProportional: true,
      berechnungsgrundlage: `${baseDays} × ${daysPerWeek}/5 = ${proportionalDays} Tage (anteilig)`,
    };
  }

  return {
    tage: baseDays,
    istProportional: false,
    berechnungsgrundlage: `${baseDays} Tage (Vollanspruch)`,
  };
}

/**
 * Findet eine Lohngruppe nach ID
 */
export function getLohngruppe(id: number): Lohngruppe | undefined {
  return lohngruppen.find((lg) => lg.id === id);
}

/**
 * Findet einen PSA-Zuschlag nach ID
 */
export function getPSAZuschlag(id: string): PSAZuschlag | undefined {
  return psaZuschlaege.find((z) => z.id === id);
}

/**
 * Findet einen Raum-Zuschlag nach ID
 */
export function getRaumZuschlag(id: string): RaumZuschlag | undefined {
  return raumZuschlaege.find((z) => z.id === id);
}

/**
 * Findet einen Zeit-Zuschlag nach ID
 */
export function getZeitZuschlag(id: string): ZeitZuschlag | undefined {
  return zeitZuschlaege.find((z) => z.id === id);
}

// Zuschlags-Kategorien für UI-Darstellung
export const surchargeCategories = {
  psa: {
    label: "PSA-Zuschläge",
    items: psaZuschlaege,
  },
  raum: {
    label: "Erschwernis-Zuschläge",
    items: raumZuschlaege,
  },
  zeit: {
    label: "Zeit-Zuschläge",
    items: zeitZuschlaege,
  },
};

// Berechnungs-Ergebnis für effektiven Stundensatz
export interface EffectiveRateCalculation {
  basisStundenlohn: number;
  psaZuschlagProzent: number;
  psaZuschlagEuro: number;
  raumZuschlagEuro: number;
  zeitMultiplier: number;
  effektivStundenlohn: number;
  aufschlaege: {
    psa: { euro: number; prozent: number };
    raum: { euro: number };
    gesamt: { euro: number };
  };
}

/**
 * Berechnet den effektiven Stundensatz mit allen Zuschlägen
 */
export function calculateEffectiveHourlyRate(
  lohngruppeId: number,
  psaZuschlagId: string,
  raumZuschlagId: string,
  zeitZuschlagId: string
): EffectiveRateCalculation {
  const lohngruppe = getLohngruppe(lohngruppeId);
  const psa = getPSAZuschlag(psaZuschlagId);
  const raum = getRaumZuschlag(raumZuschlagId);
  const zeit = getZeitZuschlag(zeitZuschlagId);

  const basisStundenlohn = lohngruppe?.stundenlohn || 0;
  const psaZuschlagProzent = psa?.zuschlagProzent || 0;
  const psaZuschlagEuro = (basisStundenlohn * psaZuschlagProzent) / 100;
  const raumZuschlagEuro = raum?.zuschlagEuro || 0;
  const zeitMultiplier = zeit?.multiplier || 1.0;

  // Berechnung: (Basis + PSA + Raum) × Zeit-Multiplier
  const vorZeitZuschlag = basisStundenlohn + psaZuschlagEuro + raumZuschlagEuro;
  const effektivStundenlohn = vorZeitZuschlag * zeitMultiplier;

  const aufschlaege = {
    psa: { euro: psaZuschlagEuro, prozent: psaZuschlagProzent },
    raum: { euro: raumZuschlagEuro },
    gesamt: { euro: effektivStundenlohn - basisStundenlohn },
  };

  return {
    basisStundenlohn,
    psaZuschlagProzent,
    psaZuschlagEuro,
    raumZuschlagEuro,
    zeitMultiplier,
    effektivStundenlohn: Math.round(effektivStundenlohn * 100) / 100,
    aufschlaege,
  };
}

/**
 * Formatiert einen Euro-Betrag
 */
export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/**
 * Gibt alle verfügbaren Lohngruppen-Optionen für Select-Inputs zurück
 */
export function getLohngruppenOptions() {
  return lohngruppen.map((lg) => ({
    value: lg.id.toString(),
    label: `${lg.id} - ${lg.bezeichnung} (${formatEuro(lg.stundenlohn)}/Std.)`,
    stundenlohn: lg.stundenlohn,
    bezeichnung: lg.bezeichnung,
  }));
}
