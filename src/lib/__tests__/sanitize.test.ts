import { describe, it, expect } from 'vitest';
import { formValidations, preprocessNumber, timeRegex, dayNames, germanDayNames } from '../utils/form-utils';

// ============================================================================
// Form Utilities Tests
// ============================================================================

describe('preprocessNumber', () => {
  it('should convert empty string to null', () => {
    expect(preprocessNumber('')).toBeNull();
  });

  it('should convert null to null', () => {
    expect(preprocessNumber(null)).toBeNull();
  });

  it('should convert undefined to null', () => {
    expect(preprocessNumber(undefined)).toBeNull();
  });

  it('should convert valid number string to number', () => {
    expect(preprocessNumber('42')).toBe(42);
    expect(preprocessNumber('3.14')).toBe(3.14);
  });

  it('should convert NaN string to null', () => {
    expect(preprocessNumber('abc')).toBeNull();
  });
});

describe('timeRegex', () => {
  it('should match valid 24-hour time format', () => {
    expect('09:00').toMatch(timeRegex);
    expect('23:59').toMatch(timeRegex);
    expect('00:00').toMatch(timeRegex);
    expect('12:30').toMatch(timeRegex);
  });

  it('should not match invalid time format', () => {
    expect('9:00').not.toMatch(timeRegex);
    expect('25:00').not.toMatch(timeRegex);
    expect('12:60').not.toMatch(timeRegex);
    expect('abc').not.toMatch(timeRegex);
  });
});

describe('dayNames', () => {
  it('should contain all 7 days', () => {
    expect(dayNames).toHaveLength(7);
    expect(dayNames).toContain('monday');
    expect(dayNames).toContain('tuesday');
    expect(dayNames).toContain('wednesday');
    expect(dayNames).toContain('thursday');
    expect(dayNames).toContain('friday');
    expect(dayNames).toContain('saturday');
    expect(dayNames).toContain('sunday');
  });
});

describe('germanDayNames', () => {
  it('should map English days to German abbreviations', () => {
    expect(germanDayNames.monday).toBe('Mo');
    expect(germanDayNames.tuesday).toBe('Di');
    expect(germanDayNames.wednesday).toBe('Mi');
    expect(germanDayNames.thursday).toBe('Do');
    expect(germanDayNames.friday).toBe('Fr');
    expect(germanDayNames.saturday).toBe('Sa');
    expect(germanDayNames.sunday).toBe('So');
  });
});

describe('formValidations.email', () => {
  it('should validate correct email formats', () => {
    const schema = formValidations.email;
    
    expect(schema.safeParse('test@example.com').success).toBe(true);
    expect(schema.safeParse('user.name@domain.co.uk').success).toBe(true);
  });

  it('should reject invalid email formats', () => {
    const schema = formValidations.email;
    
    expect(schema.safeParse('invalid').success).toBe(false);
    expect(schema.safeParse('@example.com').success).toBe(false);
    expect(schema.safeParse('test@').success).toBe(false);
  });

  it('should transform empty string to null', () => {
    const schema = formValidations.email;
    
    const result = schema.parse('');
    expect(result).toBeNull();
  });
});

describe('formValidations.password', () => {
  it('should accept passwords with minimum 6 characters', () => {
    const schema = formValidations.password;
    
    expect(schema.safeParse('123456').success).toBe(true);
    expect(schema.safeParse('longpassword').success).toBe(true);
  });

  it('should reject passwords shorter than 6 characters', () => {
    const schema = formValidations.password;
    
    expect(schema.safeParse('12345').success).toBe(false);
    expect(schema.safeParse('').success).toBe(false);
  });
});

describe('formValidations.requiredString', () => {
  it('should accept non-empty strings', () => {
    const schema = formValidations.requiredString('Name');
    
    expect(schema.safeParse('Test').success).toBe(true);
    expect(schema.safeParse('A').success).toBe(true);
  });

  it('should reject empty strings', () => {
    const schema = formValidations.requiredString('Name');
    
    expect(schema.safeParse('').success).toBe(false);
  });

  it('should reject strings exceeding max length', () => {
    const schema = formValidations.requiredString('Name');
    const longString = 'a'.repeat(101);
    
    expect(schema.safeParse(longString).success).toBe(false);
  });
});

describe('formValidations.uuid', () => {
  it('should accept valid UUIDs', () => {
    const schema = formValidations.uuid('ID');
    
    expect(schema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
    expect(schema.safeParse('123e4567-e89b-12d3-a456-426614174000').success).toBe(true);
  });

  it('should reject invalid UUIDs', () => {
    const schema = formValidations.uuid('ID');
    
    expect(schema.safeParse('not-a-uuid').success).toBe(false);
    expect(schema.safeParse('550e8400-e29b-41d4-a716').success).toBe(false);
    expect(schema.safeParse('').success).toBe(false);
  });
});

describe('formValidations.positiveNumber', () => {
  it('should accept positive numbers', () => {
    const schema = formValidations.positiveNumber('Wert');
    
    expect(schema.safeParse(10).success).toBe(true);
    expect(schema.safeParse(0).success).toBe(true);
  });

  it('should reject negative numbers', () => {
    const schema = formValidations.positiveNumber('Wert');
    
    expect(schema.safeParse(-1).success).toBe(false);
  });

  it('should accept empty string and convert to null', () => {
    const schema = formValidations.positiveNumber('Wert');
    
    const result = schema.parse('');
    expect(result).toBeNull();
  });
});

// ============================================================================
// Email/URL Validation Tests (standalone validators)
// ============================================================================

describe('Email Validation', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  it('should validate standard email addresses', () => {
    expect(emailRegex.test('user@example.com')).toBe(true);
    expect(emailRegex.test('test.user@domain.org')).toBe(true);
    expect(emailRegex.test('admin@sub.domain.co.uk')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(emailRegex.test('')).toBe(false);
    expect(emailRegex.test('invalid')).toBe(false);
    expect(emailRegex.test('@example.com')).toBe(false);
    expect(emailRegex.test('test@')).toBe(false);
    expect(emailRegex.test('test@.com')).toBe(false);
  });
});

describe('URL Validation', () => {
  const urlRegex = /^https?:\/\/.+/i;

  it('should validate HTTP/HTTPS URLs', () => {
    expect(urlRegex.test('http://example.com')).toBe(true);
    expect(urlRegex.test('https://example.com')).toBe(true);
    expect(urlRegex.test('https://example.com/path')).toBe(true);
    expect(urlRegex.test('https://example.com/path?query=1')).toBe(true);
  });

  it('should reject invalid URLs', () => {
    expect(urlRegex.test('')).toBe(false);
    expect(urlRegex.test('example.com')).toBe(false);
    expect(urlRegex.test('ftp://example.com')).toBe(false);
  });
});

// ============================================================================
// SQL Injection Prevention Tests
// ============================================================================

describe('SQL Injection Prevention', () => {
  // Simulating a basic sanitize function similar to what's in shift-planning.ts
  const sanitizeInput = (input: string, maxLength: number = 100): string => {
    if (!input || typeof input !== 'string') return '';
    return input
      .slice(0, maxLength)
      .replace(/[\x00-\x1F\x7F]/g, '')
      .trim();
  };

  it('should remove control characters', () => {
    expect(sanitizeInput('test\x00value')).toBe('testvalue');
    expect(sanitizeInput('test\x1Fvalue')).toBe('testvalue');
  });

  it('should truncate long input', () => {
    const longInput = 'a'.repeat(200);
    expect(sanitizeInput(longInput, 100)).toHaveLength(100);
  });

  it('should handle null/undefined inputs', () => {
    expect(sanitizeInput('')).toBe('');
    expect(sanitizeInput(null as any)).toBe('');
    expect(sanitizeInput(undefined as any)).toBe('');
  });

  it('should trim whitespace', () => {
    expect(sanitizeInput('  test  ')).toBe('test');
  });

  it('should preserve safe characters', () => {
    expect(sanitizeInput('Hello World 123')).toBe('Hello World 123');
    expect(sanitizeInput('test@example.com')).toBe('test@example.com');
  });
});
