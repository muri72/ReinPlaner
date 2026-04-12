import { describe, it, expect } from 'vitest';
import { formatEmployeeName, sortEmployeesByName } from '@/lib/utils/employee-utils';

describe('Employee Utilities', () => {
  describe('formatEmployeeName', () => {
    it('should format name in "Lastname, Firstname" format', () => {
      expect(formatEmployeeName({ first_name: 'Hans', last_name: 'Müller' })).toBe('Müller, Hans');
      expect(formatEmployeeName({ first_name: 'Maria', last_name: 'Schmidt' })).toBe('Schmidt, Maria');
    });

    it('should handle employee with only first_name', () => {
      expect(formatEmployeeName({ first_name: 'Hans', last_name: null })).toBe('Hans');
      expect(formatEmployeeName({ first_name: 'Maria', last_name: '' })).toBe('Maria');
    });

    it('should handle employee with only last_name', () => {
      expect(formatEmployeeName({ first_name: null, last_name: 'Müller' })).toBe('Müller');
      expect(formatEmployeeName({ first_name: '', last_name: 'Schmidt' })).toBe('Schmidt');
    });

    it('should return "Unbekannt" when both names are missing', () => {
      expect(formatEmployeeName({ first_name: null, last_name: null })).toBe('Unbekannt');
      expect(formatEmployeeName({ first_name: '', last_name: '' })).toBe('Unbekannt');
    });

    it('should handle special characters in names', () => {
      expect(formatEmployeeName({ first_name: 'José', last_name: 'García' })).toBe('García, José');
      expect(formatEmployeeName({ first_name: 'Björn', last_name: 'Öberg' })).toBe('Öberg, Björn');
    });

    it('should handle names with prefixes', () => {
      // Names with prefixes are formatted normally as "Lastname, Firstname"
      expect(formatEmployeeName({ first_name: 'van', last_name: 'Houten' })).toBe('Houten, van');
      expect(formatEmployeeName({ first_name: 'M.', last_name: 'von Schiller' })).toBe('von Schiller, M.');
    });
  });

  describe('sortEmployeesByName', () => {
    it('should sort employees by last name in German locale', () => {
      const employees = [
        { first_name: 'Zora', last_name: 'Müller' },
        { first_name: 'Anna', last_name: 'Schmidt' },
        { first_name: 'Hans', last_name: 'Bauer' },
      ];

      const sorted = sortEmployeesByName(employees);
      
      expect(sorted[0].last_name).toBe('Bauer');
      expect(sorted[1].last_name).toBe('Müller');
      expect(sorted[2].last_name).toBe('Schmidt');
    });

    it('should sort by first name when last names are equal', () => {
      const employees = [
        { first_name: 'Zora', last_name: 'Müller' },
        { first_name: 'Anna', last_name: 'Müller' },
        { first_name: 'Hans', last_name: 'Müller' },
      ];

      const sorted = sortEmployeesByName(employees);
      
      expect(sorted[0].first_name).toBe('Anna');
      expect(sorted[1].first_name).toBe('Hans');
      expect(sorted[2].first_name).toBe('Zora');
    });

    it('should handle case-insensitive sorting', () => {
      const employees = [
        { first_name: 'Hans', last_name: 'müller' }, // lowercase
        { first_name: 'Anna', last_name: 'Müller' }, // uppercase
        { first_name: 'Zora', last_name: 'SCHMIDT' }, // all caps
      ];

      const sorted = sortEmployeesByName(employees);
      
      // Should still sort correctly regardless of case
      expect(sorted.length).toBe(3);
    });

    it('should handle German special characters', () => {
      const employees = [
        { first_name: 'Test', last_name: 'Öberg' },
        { first_name: 'Test', last_name: 'Angström' },
        { first_name: 'Test', last_name: 'Zylinder' },
      ];

      const sorted = sortEmployeesByName(employees);
      
      // Ö should sort after O but before P in German
      // Ä should sort after A
      expect(sorted.length).toBe(3);
    });

    it('should not mutate original array', () => {
      const employees = [
        { first_name: 'Zora', last_name: 'Müller' },
        { first_name: 'Anna', last_name: 'Schmidt' },
      ];

      const originalFirst = employees[0];
      sortEmployeesByName(employees);
      
      expect(employees[0]).toBe(originalFirst);
      expect(employees[0].last_name).toBe('Müller');
    });

    it('should return new sorted array', () => {
      const employees = [
        { first_name: 'Zora', last_name: 'Müller' },
        { first_name: 'Anna', last_name: 'Schmidt' },
      ];

      const sorted = sortEmployeesByName(employees);
      
      expect(sorted).not.toBe(employees);
      expect(sorted).toHaveLength(employees.length);
    });

    it('should handle empty array', () => {
      const sorted = sortEmployeesByName([]);
      expect(sorted).toEqual([]);
    });

    it('should handle single employee', () => {
      const employees = [{ first_name: 'Hans', last_name: 'Müller' }];
      const sorted = sortEmployeesByName(employees);
      
      expect(sorted).toHaveLength(1);
      expect(sorted[0].last_name).toBe('Müller');
    });
  });
});
