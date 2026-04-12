import { describe, it, expect } from 'vitest';
import {
  lohngruppen,
  psaZuschlaege,
  raumZuschlaege,
  zeitZuschlaege,
  getLohngruppe,
  getPSAZuschlag,
  getRaumZuschlag,
  getZeitZuschlag,
  calculateEffectiveHourlyRate,
  formatEuro,
  getLohngruppenOptions,
  surchargeCategories,
} from '@/lib/lohngruppen-config';

describe('Lohngruppen Configuration', () => {
  describe('lohngruppen', () => {
    it('should have 8 defined wage groups', () => {
      expect(lohngruppen.length).toBe(8);
    });

    it('should have sequential IDs from 1 to 9 (with gap at 5)', () => {
      const ids = lohngruppen.map(lg => lg.id);
      expect(ids).toContain(1);
      expect(ids).toContain(2);
      expect(ids).toContain(3);
      expect(ids).toContain(4);
      expect(ids).not.toContain(5); // Gap as per real tariff
      expect(ids).toContain(6);
      expect(ids).toContain(7);
      expect(ids).toContain(8);
      expect(ids).toContain(9);
    });

    it('should have increasing hourly rates with higher groups', () => {
      for (let i = 1; i < lohngruppen.length; i++) {
        const current = lohngruppen[i];
        const previous = lohngruppen[i - 1];
        if (current.id !== 5) { // Skip comparison around the gap
          expect(current.stundenlohn).toBeGreaterThan(previous.stundenlohn);
        }
      }
    });

    it('should have valid descriptions for each group', () => {
      lohngruppen.forEach(lg => {
        expect(lg.bezeichnung).toBeTruthy();
        expect(lg.stundenlohn).toBeGreaterThan(0);
        expect(lg.taetigkeiten.length).toBeGreaterThan(0);
      });
    });

    it('should have group 1 as lowest wage (Unterhaltsreinigung)', () => {
      const group1 = lohngruppen.find(lg => lg.id === 1);
      expect(group1?.bezeichnung).toBe('Unterhaltsreinigung');
      expect(group1?.stundenlohn).toBe(15.00);
    });

    it('should have group 9 as highest wage (Fachvorarbeitende)', () => {
      const group9 = lohngruppen.find(lg => lg.id === 9);
      expect(group9?.bezeichnung).toBe('Fachvorarbeitende');
      expect(group9?.stundenlohn).toBe(21.64);
    });
  });

  describe('PSA Zuschläge', () => {
    it('should have multiple PSA surcharges defined', () => {
      expect(psaZuschlaege.length).toBeGreaterThan(0);
    });

    it('should have at least standard PSA with 0% surcharge', () => {
      const standard = psaZuschlaege.find(p => p.id === 'standard');
      expect(standard).toBeDefined();
      expect(standard?.zuschlagProzent).toBe(0);
    });

    it('should have full protection gear surcharge', () => {
      const protection = psaZuschlaege.find(p => p.id === 'schutzkleidung');
      expect(protection).toBeDefined();
      expect(protection?.zuschlagProzent).toBe(5);
    });

    it('should have full chemical protection surcharge', () => {
      const chemical = psaZuschlaege.find(p => p.id === 'vollschutz');
      expect(chemical).toBeDefined();
      expect(chemical?.zuschlagProzent).toBe(40);
    });
  });

  describe('Raum Zuschläge', () => {
    it('should have multiple room surcharges defined', () => {
      expect(raumZuschlaege.length).toBeGreaterThan(0);
    });

    it('should have no hardship surcharge as baseline (0 Euro)', () => {
      const none = raumZuschlaege.find(r => r.id === 'none');
      expect(none).toBeDefined();
      expect(none?.zuschlagEuro).toBe(0);
    });
  });

  describe('Zeit Zuschläge', () => {
    it('should have multiple time surcharges defined', () => {
      expect(zeitZuschlaege.length).toBeGreaterThan(0);
    });

    it('should have normal work hours as baseline (1.0 multiplier)', () => {
      const normal = zeitZuschlaege.find(z => z.id === 'normal');
      expect(normal).toBeDefined();
      expect(normal?.multiplier).toBe(1.0);
    });

    it('should have Sunday work multiplier greater than 1', () => {
      const sonntag = zeitZuschlaege.find(z => z.id === 'sonntag');
      expect(sonntag).toBeDefined();
      expect(sonntag?.multiplier).toBe(1.5);
    });
  });

  describe('Helper functions', () => {
    it('getLohngruppe should return correct group by ID', () => {
      const lg1 = getLohngruppe(1);
      expect(lg1?.bezeichnung).toBe('Unterhaltsreinigung');

      const lg9 = getLohngruppe(9);
      expect(lg9?.bezeichnung).toBe('Fachvorarbeitende');
    });

    it('getLohngruppe should return undefined for invalid ID', () => {
      expect(getLohngruppe(999)).toBeUndefined();
      expect(getLohngruppe(0)).toBeUndefined();
      expect(getLohngruppe(5)).toBeUndefined(); // Gap in numbering
    });

    it('getPSAZuschlag should return correct surcharge', () => {
      const standard = getPSAZuschlag('standard');
      expect(standard?.zuschlagProzent).toBe(0);
    });

    it('getPSAZuschlag should return undefined for invalid ID', () => {
      expect(getPSAZuschlag('invalid')).toBeUndefined();
    });

    it('getRaumZuschlag should return correct surcharge', () => {
      const none = getRaumZuschlag('none');
      expect(none?.zuschlagEuro).toBe(0);
    });

    it('getZeitZuschlag should return correct surcharge', () => {
      const normal = getZeitZuschlag('normal');
      expect(normal?.multiplier).toBe(1.0);
    });
  });

  describe('calculateEffectiveHourlyRate', () => {
    it('should calculate basic rate without surcharges', () => {
      const result = calculateEffectiveHourlyRate(1, 'standard', 'normal', 'regular');
      
      expect(result.basisStundenlohn).toBe(15.00);
      expect(result.psaZuschlagProzent).toBe(0);
      expect(result.psaZuschlagEuro).toBe(0);
      expect(result.raumZuschlagEuro).toBe(0);
      expect(result.zeitMultiplier).toBe(1.0);
      expect(result.effektivStundenlohn).toBe(15.00);
    });

    it('should add PSA surcharge percentage to hourly rate', () => {
      // Use schutzkleidung which has 5% surcharge
      const protection = getPSAZuschlag('schutzkleidung');
      expect(protection?.zuschlagProzent).toBe(5);
      const result = calculateEffectiveHourlyRate(1, 'schutzkleidung', 'none', 'normal');
      expect(result.psaZuschlagEuro).toBeGreaterThan(0);
      expect(result.effektivStundenlohn).toBeGreaterThan(result.basisStundenlohn);
    });

    it('should add room surcharge in euros', () => {
      const result = calculateEffectiveHourlyRate(1, 'standard', 'parkett', 'normal');
      // parkett has 3.00 € surcharge according to config
      expect(result.raumZuschlagEuro).toBe(3.00);
    });

    it('should apply time multiplier correctly', () => {
      const regular = calculateEffectiveHourlyRate(1, 'standard', 'normal', 'regular');
      const overtime = calculateEffectiveHourlyRate(1, 'standard', 'none', 'sonntag');
      
      expect(overtime.effektivStundenlohn).toBeGreaterThan(regular.effektivStundenlohn);
    });

    it('should calculate correct aufschlaege breakdown', () => {
      const result = calculateEffectiveHourlyRate(1, 'standard', 'normal', 'regular');
      
      expect(result.aufschlaege).toBeDefined();
      expect(result.aufschlaege.psa).toBeDefined();
      expect(result.aufschlaege.raum).toBeDefined();
      expect(result.aufschlaege.gesamt).toBeDefined();
    });

    it('should return 0 for invalid wage group ID', () => {
      const result = calculateEffectiveHourlyRate(999, 'standard', 'normal', 'regular');
      expect(result.basisStundenlohn).toBe(0);
      expect(result.effektivStundenlohn).toBe(0);
    });

    it('should handle missing PSA surcharge gracefully', () => {
      const result = calculateEffectiveHourlyRate(1, 'invalid', 'normal', 'regular');
      expect(result.psaZuschlagProzent).toBe(0);
      expect(result.psaZuschlagEuro).toBe(0);
    });
  });

  describe('formatEuro', () => {
    it('should format currency in German locale', () => {
      const formatted = formatEuro(15.00);
      expect(formatted).toContain('15');
      expect(formatted).toContain('€');
    });

    it('should handle decimal amounts correctly', () => {
      const formatted = formatEuro(15.50);
      expect(formatted).toContain('15,50'); // German decimal separator
    });

    it('should handle zero', () => {
      const formatted = formatEuro(0);
      expect(formatted).toBe('0,00\xa0€'); // German format with non-breaking space before €
    });

    it('should handle large amounts', () => {
      const formatted = formatEuro(1234.56);
      expect(formatted).toContain('1.234,56'); // German thousand separator
    });
  });

  describe('getLohngruppenOptions', () => {
    it('should return all wage groups as options', () => {
      const options = getLohngruppenOptions();
      expect(options.length).toBe(8);
    });

    it('should have correct option structure', () => {
      const options = getLohngruppenOptions();
      const firstOption = options[0];
      
      expect(firstOption).toHaveProperty('value');
      expect(firstOption).toHaveProperty('label');
      expect(firstOption).toHaveProperty('stundenlohn');
      expect(firstOption).toHaveProperty('bezeichnung');
    });

    it('should format option label with ID and hourly rate', () => {
      const options = getLohngruppenOptions();
      const option1 = options.find(o => o.value === '1');
      
      expect(option1?.label).toContain('1');
      expect(option1?.label).toContain('Unterhaltsreinigung');
      expect(option1?.label).toContain('€');
    });
  });

  describe('surchargeCategories', () => {
    it('should have all three categories', () => {
      expect(surchargeCategories.psa).toBeDefined();
      expect(surchargeCategories.raum).toBeDefined();
      expect(surchargeCategories.zeit).toBeDefined();
    });

    it('should have German labels for categories', () => {
      expect(surchargeCategories.psa.label).toBe('PSA-Zuschläge');
      expect(surchargeCategories.raum.label).toBe('Erschwernis-Zuschläge');
      expect(surchargeCategories.zeit.label).toBe('Zeit-Zuschläge');
    });

    it('should reference the actual surcharge arrays', () => {
      expect(surchargeCategories.psa.items).toBe(psaZuschlaege);
      expect(surchargeCategories.raum.items).toBe(raumZuschlaege);
      expect(surchargeCategories.zeit.items).toBe(zeitZuschlaege);
    });
  });
});
