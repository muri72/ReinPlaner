export interface ServiceFeature {
  title: string;
}

export interface Service {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  category: string;
  basePrice: number;
  features: ServiceFeature[];
}

export interface ServiceCategory {
  id: string;
  title: string;
  description: string;
}

export interface Services {
  [key: string]: Service;
}

export const services: Services = {
  // Gewerbliche Reinigung
  bueroreinigung: {
    id: "bueroreinigung",
    title: "Büroreinigung",
    shortDescription: "Professionelle Reinigung von Büroräumen für ein sauberes und produktives Arbeitsumfeld.",
    description: "Maßgeschneiderte Büroreinigung für Unternehmen jeder Größe.",
    category: "commercial",
    basePrice: 100,
    features: [
      { title: "Bodenreinigung" },
      { title: "Staubwischen" },
      { title: "Sanitärreinigung" },
      { title: "Müllentsorgung" },
    ],
  },
  praxisreinigung: {
    id: "praxisreinigung",
    title: "Praxisreinigung",
    shortDescription: "Hygienische Reinigung für Arztpraxen und medizinische Einrichtungen.",
    description: "Spezialisierte Reinigung unter Berücksichtigung höchster Hygienestandards.",
    category: "commercial",
    basePrice: 150,
    features: [
      { title: "Desinfizierende Reinigung" },
      { title: "Medizinische Hygienestandards" },
      { title: "Wartezimmerreinigung" },
      { title: "Behandlungsraumreinigung" },
    ],
  },
  kitareinigung: {
    id: "kitareinigung",
    title: "Kitareinigung",
    shortDescription: "Kindgerechte und hygienische Reinigung von Kindertagesstätten.",
    description: "Spezielle Reinigungslösungen für Kitas mit Fokus auf Hygiene und Sicherheit.",
    category: "commercial",
    basePrice: 120,
    features: [
      { title: "Kindgerechte Reinigungsmittel" },
      { title: "Spielbereichsreinigung" },
      { title: "Sanitärbereichsreinigung" },
      { title: "Küchenbereichsreinigung" },
    ],
  },
  fitnessstudioreinigung: {
    id: "fitnessstudioreinigung",
    title: "Fitnessstudioreinigung",
    shortDescription: "Professionelle Reinigung und Desinfektion von Fitnessstudios.",
    description: "Spezialisierte Reinigung für Sportstätten und Fitnessanlagen.",
    category: "commercial",
    basePrice: 130,
    features: [
      { title: "Gerätedesinfektion" },
      { title: "Umkleidereinigung" },
      { title: "Duschbereichsreinigung" },
      { title: "Studioflächen" },
    ],
  },
  gastronomiereinigung: {
    id: "gastronomiereinigung",
    title: "Gastronomiereinigung",
    shortDescription: "Professionelle Reinigung für Restaurants und Gastronomiebetriebe.",
    description: "HACCP-konforme Reinigung für die Gastronomiebranche.",
    category: "commercial",
    basePrice: 140,
    features: [
      { title: "Küchenreinigung" },
      { title: "Gastraumreinigung" },
      { title: "HACCP-Standards" },
      { title: "Hygienedokumentation" },
    ],
  },
  supermarktreinigung: {
    id: "supermarktreinigung",
    title: "Supermarktreinigung",
    shortDescription: "Professionelle Reinigung für Supermärkte und Einzelhandelsflächen.",
    description: "Umfassende Reinigung für den Lebensmitteleinzelhandel.",
    category: "commercial",
    basePrice: 160,
    features: [
      { title: "Verkaufsflächenreinigung" },
      { title: "Frischebereichsreinigung" },
      { title: "Lagerreinigung" },
      { title: "Eingangsbereichsreinigung" },
    ],
  },

  // Spezialreinigung
  glasreinigung: {
    id: "glasreinigung",
    title: "Glasreinigung",
    shortDescription: "Professionelle Reinigung von Fenstern und Glasflächen.",
    description: "Streifenfreie Reinigung aller Glasflächen inkl. Rahmen und Fensterbänke.",
    category: "special",
    basePrice: 150,
    features: [{ title: "Fenster innen/außen" }, { title: "Glastrennwände" }, { title: "Glastüren" }],
  },
  graffittireinigung: {
    id: "graffittireinigung",
    title: "Grafittireinigung",
    shortDescription: "Professionelle Entfernung von Graffiti und Farbschmierereien.",
    description: "Schonende und effektive Entfernung von Graffiti von allen Oberflächen.",
    category: "special",
    basePrice: 200,
    features: [
      { title: "Graffiti-Entfernung" },
      { title: "Anti-Graffiti-Beschichtung" },
      { title: "Fassadenschutz" },
      { title: "Oberflächenaufbereitung" },
    ],
  },
  teppichbodenreinigung: {
    id: "teppichbodenreinigung",
    title: "Teppichbodenreinigung",
    shortDescription: "Professionelle Reinigung von Teppichen und Teppichböden.",
    description: "Gründliche Reinigung mit Spezialmaschinen für alle Arten von Teppichen.",
    category: "special",
    basePrice: 180,
    features: [
      { title: "Tiefenreinigung" },
      { title: "Fleckentfernung" },
      { title: "Geruchsbeseitigung" },
      { title: "Imprägnierung" },
    ],
  },
  fassadenreinigung: {
    id: "fassadenreinigung",
    title: "Fassadenreinigung",
    shortDescription: "Professionelle Reinigung und Pflege von Gebäudefassaden.",
    description: "Schonende und effektive Reinigung aller Arten von Fassaden.",
    category: "special",
    basePrice: 250,
    features: [
      { title: "Hochdruckreinigung" },
      { title: "Algenentfernung" },
      { title: "Fassadenschutz" },
      { title: "Imprägnierung" },
    ],
  },
  sonderreinigung: { // Sonderreinigung hinzugefügt
    id: "sonderreinigung",
    title: "Sonderreinigung",
    shortDescription: "Spezielle Reinigungsdienste für besondere Anforderungen.",
    description: "Individuelle Reinigungslösungen für außergewöhnliche Verschmutzungen oder spezielle Objekte.",
    category: "special",
    basePrice: 200,
    features: [
      { title: "Einzelfallanalyse" },
      { title: "Spezialgeräte" },
      { title: "Maßgeschneiderte Lösungen" },
    ],
  },

  // Bau & Event
  bauendreinigung: {
    id: "bauendreinigung",
    title: "Bauendreinigung",
    shortDescription: "Professionelle Reinigung nach Bauarbeiten und Renovierungen.",
    description: "Finale Reinigung nach Abschluss aller Bauarbeiten.",
    category: "construction",
    basePrice: 280,
    features: [
      { title: "Grundreinigung" },
      { title: "Detailreinigung" },
      { title: "Sanitärreinigung" },
      { title: "Abnahmereinigung" },
    ],
  },
  eventreinigung: {
    id: "eventreinigung",
    title: "Eventreinigung",
    shortDescription: "Professionelle Reinigung für Veranstaltungen und Events.",
    description: "Komplette Reinigungsbetreuung vor, während und nach Events.",
    category: "construction",
    basePrice: 220,
    features: [
      { title: "Vorreinigung" },
      { title: "Zwischenreinigung" },
      { title: "Nachreinigung" },
      { title: "Abfallentsorgung" },
    ],
  },
  festivalreinigung: {
    id: "festivalreinigung",
    title: "Festivalreinigung",
    shortDescription: "Professionelle Reinigung für Festivals und Open-Air-Events.",
    description: "Umfassende Reinigung für Großveranstaltungen im Freien.",
    category: "construction",
    basePrice: 250,
    features: [
      { title: "Geländereinigung" },
      { title: "Sanitäranlagen" },
      { title: "Müllmanagement" },
      { title: "24/7 Service" },
    ],
  },

  // Facility Services
  winterdienst: {
    id: "winterdienst",
    title: "Winterdienst",
    shortDescription: "Zuverlässiger Winterdienst für sichere Wege bei Schnee und Eis.",
    description: "Professioneller Winterdienst mit 24/7 Bereitschaft.",
    category: "facility",
    basePrice: 180,
    features: [
      { title: "Schneeräumung" },
      { title: "Streudienst" },
      { title: "24/7 Bereitschaft" },
      { title: "Dokumentation" },
    ],
  },
  hausmeisterservice: {
    id: "hausmeisterservice",
    title: "Hausmeisterservice",
    shortDescription: "Umfassender Hausmeisterservice für Gewerbe- und Wohnimmobilien.",
    description: "Technische Betreuung, Wartung und Instandhaltung von Immobilien.",
    category: "facility",
    basePrice: 160,
    features: [
      { title: "Technische Wartung" },
      { title: "Kleinreparaturen" },
      { title: "Außenanlagenpflege" },
      { title: "Kontrolldienste" },
    ],
  },
  gartenpflege: {
    id: "gartenpflege",
    title: "gartenpflege",
    shortDescription: "Professionelle Pflege und Gestaltung von Außenanlagen.",
    description: "Umfassende Gartenpflege für Gewerbe- und Privatobjekte.",
    category: "facility",
    basePrice: 150,
    features: [
      { title: "Rasenpflege" },
      { title: "Heckenschnitt" },
      { title: "Beetpflege" },
      { title: "Laubbeseitigung" },
    ],
  },

  // Privatkunden
  haushaltshilfe: {
    id: "haushaltshilfe",
    title: "Haushaltshilfe",
    shortDescription: "Professionelle Haushaltshilfe für Privathaushalte.",
    description: "Unterstützung bei allen anfallenden Aufgaben im Haushalt.",
    category: "private",
    basePrice: 140,
    features: [
      { title: "Reinigung" },
      { title: "Wäschepflege" },
      { title: "Einkaufsservice" },
      { title: "Küchen- und Badpflege" },
    ],
  },
  treppenhausreinigung: {
    id: "treppenhausreinigung",
    title: "Treppenhausreinigung",
    shortDescription: "Professionelle Reinigung von Treppenhäusern.",
    description: "Regelmäßige und gründliche Reinigung von Treppenhäusern.",
    category: "private",
    basePrice: 120,
    features: [
      { title: "Treppenreinigung" },
      { title: "Geländerreinigung" },
      { title: "Fensterbänke" },
      { title: "Eingangsbereiche" },
    ],
  },
  entrümpelung: {
    id: "entrümpelung",
    title: "Entrümpelung",
    shortDescription: "Professionelle Entrümpelung von Wohnungen und Häusern.",
    description: "Schnelle und zuverlässige Entrümpelung mit fachgerechter Entsorgung.",
    category: "private",
    basePrice: 300,
    features: [
      { title: "Komplettentsorgung" },
      { title: "Wertanrechnung" },
      { title: "Besenreine Übergabe" },
      { title: "Fachgerechte Entsorgung" },
    ],
  },
}

export const serviceCategories: ServiceCategory[] = [
  {
    id: "commercial",
    title: "Gewerbliche Reinigung",
    description: "Professionelle Reinigungslösungen für unterschiedliche Branchen und Gewerbeimmobilien.",
  },
  {
    id: "special",
    title: "Spezialreinigung",
    description: "Spezialisierte Reinigungsdienstleistungen für besondere Anforderungen und Materialien.",
  },
  {
    id: "construction",
    title: "Bau & Event",
    description: "Professionelle Reinigung für Baustellen, Veranstaltungen und Großevents.",
  },
  {
    id: "facility",
    title: "Facility Services",
    description: "Umfassende Dienstleistungen für die Betreuung und Wartung von Immobilien.",
  },
  {
    id: "private",
    title: "Privatkunden",
    description: "Zuverlässige Reinigungsservices und Dienstleistungen für Privathaushalte.",
  },
]