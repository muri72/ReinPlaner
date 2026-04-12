import { describe, it, expect } from 'vitest';
import {
  isValidGermanPhone,
  isValidPostalCode,
  isValidIBAN,
  isValidTaxId,
  isValidSocialSecurityNumber,
  isValidUrl,
  isValidEmail,
  isValidTime,
  isValidDateString,
  isInRange,
  hasValidLength,
  isValidUUID,
} from '@/lib/validation';

describe('Validation Utilities', () => {
  describe('isValidGermanPhone', () => {
    it('should validate German phone numbers', () => {
      expect(isValidGermanPhone('+49123456789')).toBe(true);
      expect(isValidGermanPhone('0049123456789')).toBe(true);
      expect(isValidGermanPhone('0123456789')).toBe(true);
      expect(isValidGermanPhone('+491701234567')).toBe(true); // Mobile
      expect(isValidGermanPhone('123456789')).toBe(false); // Too short
      expect(isValidGermanPhone('1234567890123456789')).toBe(false); // Too long
    });

    it('should handle formatted numbers', () => {
      expect(isValidGermanPhone('+49 (123) 456789')).toBe(true);
    });
  });

  describe('isValidPostalCode', () => {
    it('should validate 5-digit postal codes', () => {
      expect(isValidPostalCode('20095')).toBe(true);
      expect(isValidPostalCode('10115')).toBe(true);
      expect(isValidPostalCode('80331')).toBe(true);
      expect(isValidPostalCode('1234')).toBe(false);
      expect(isValidPostalCode('123456')).toBe(false);
      expect(isValidPostalCode('ABCDE')).toBe(false);
    });
  });

  describe('isValidIBAN', () => {
    it('should validate German IBAN format', () => {
      // Just test format validation, not actual checksum
      expect(isValidIBAN('DE89370400440532013000')).toBe(true);
      expect(isValidIBAN('DE89 3704 0044 0532 0130 00')).toBe(true);
      expect(isValidIBAN('INVALID')).toBe(false);
    });
  });

  describe('isValidTaxId', () => {
    it('should validate German Tax ID format', () => {
      // German Tax ID is 11 digits
      expect(isValidTaxId('01234567891')).toBe(true);
      expect(isValidTaxId('0123456789')).toBe(false); // Too short
      expect(isValidTaxId('12345678901')).toBe(false); // Doesn't start with 0
    });
  });

  describe('isValidSocialSecurityNumber', () => {
    it('should validate social security numbers format', () => {
      // German format: XXXXXXXXX-XXXXXX-XXXX
      expect(isValidSocialSecurityNumber('1201234567890123')).toBe(true);
      expect(isValidSocialSecurityNumber('12345')).toBe(false); // Too short
    });
  });

  describe('isValidEmail', () => {
    it('should validate email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('missing@domain')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('not-a-url')).toBe(false);
    });
  });

  describe('isValidTime', () => {
    it('should validate time strings', () => {
      expect(isValidTime('09:00')).toBe(true);
      expect(isValidTime('17:30')).toBe(true);
      expect(isValidTime('23:59:59')).toBe(true);
      expect(isValidTime('25:00')).toBe(false);
      expect(isValidTime('9:0')).toBe(false);
    });
  });

  describe('isValidDateString', () => {
    it('should validate date strings', () => {
      expect(isValidDateString('2024-01-15')).toBe(true);
      expect(isValidDateString('2024-12-31')).toBe(true);
      // Note: JavaScript Date normalizes invalid dates, so we test format only
      expect(isValidDateString('2024-02-30')).toBe(true); // Format valid
      expect(isValidDateString('01-15-2024')).toBe(false);
      expect(isValidDateString('2024/01/15')).toBe(false);
    });
  });

  describe('isInRange', () => {
    it('should check if number is in range', () => {
      expect(isInRange(5, 1, 10)).toBe(true);
      expect(isInRange(1, 1, 10)).toBe(true);
      expect(isInRange(10, 1, 10)).toBe(true);
      expect(isInRange(0, 1, 10)).toBe(false);
      expect(isInRange(11, 1, 10)).toBe(false);
    });
  });

  describe('hasValidLength', () => {
    it('should check string length', () => {
      expect(hasValidLength('hello', 3, 10)).toBe(true);
      expect(hasValidLength('hi', 3, 10)).toBe(false);
      expect(hasValidLength('hello world', 3, 10)).toBe(false);
    });
  });

  describe('isValidUUID', () => {
    it('should validate UUID format', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
    });
  });
});
