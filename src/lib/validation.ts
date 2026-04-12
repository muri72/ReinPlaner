/**
 * Validation utilities for forms and data
 */

// German phone number validation
export function isValidGermanPhone(phone: string): boolean {
  const germanPhoneRegex = /^(\+49|0049|0)[1-9][0-9]{1,14}$/;
  return germanPhoneRegex.test(phone.replace(/[\s\-()/]/g, ''));
}

// German postal code validation
export function isValidPostalCode(postalCode: string): boolean {
  const postalRegex = /^\d{5}$/;
  return postalRegex.test(postalCode);
}

// German IBAN validation
export function isValidIBAN(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  if (!/^DE\d{2}[0-9]{18}$/.test(cleaned)) return false;
  
  // Move first 4 chars to end
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  // Convert letters to numbers (A=10, B=11, etc.)
  const numeric = rearranged.split('').map(char => {
    if (/[A-Z]/.test(char)) {
      return (char.charCodeAt(0) - 55).toString();
    }
    return char;
  }).join('');
  
  // Mod 97 check
  let remainder = 0;
  for (let i = 0; i < numeric.length; i++) {
    remainder = (remainder * 10 + parseInt(numeric[i])) % 97;
  }
  
  return remainder === 1;
}

// German tax ID (Steuer-ID) validation
export function isValidTaxId(taxId: string): boolean {
  // German Tax ID is 11 digits, starting with 0
  const taxIdRegex = /^0\d{10}$/;
  return taxIdRegex.test(taxId.replace(/\s/g, ''));
}

// Social security number (Sozialversicherungsnummer) validation
export function isValidSocialSecurityNumber(ssn: string): boolean {
  // Format: XXDDMMYY-NNNNN-NNN
  const ssnRegex = /^[0-9]{2}[0-9]{2}[0-9]{2}[0-9]{5}[0-9]{1}[0-9]{3}$/;
  return ssnRegex.test(ssn.replace(/[-\s]/g, ''));
}

// URL validation
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Email validation (stricter than default)
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

// Time string validation (HH:MM or HH:MM:SS)
export function isValidTime(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  return timeRegex.test(time);
}

// Date string validation (YYYY-MM-DD)
export function isValidDateString(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
}

// Number validation with range
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

// String length validation
export function hasValidLength(str: string, min: number, max: number): boolean {
  return str.length >= min && str.length <= max;
}

// Object ID validation (UUID format)
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// Sanitize and validate form input
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateRequired(value: any, fieldName: string): string[] {
  const errors: string[] = [];
  if (value === null || value === undefined || value === '') {
    errors.push(`${fieldName} ist erforderlich`);
  }
  return errors;
}

export function validateEmail(value: string, fieldName: string): string[] {
  const errors: string[] = [];
  if (value && !isValidEmail(value)) {
    errors.push(`${fieldName} ist keine gültige E-Mail-Adresse`);
  }
  return errors;
}

export function validatePhone(value: string, fieldName: string): string[] {
  const errors: string[] = [];
  if (value && !isValidGermanPhone(value)) {
    errors.push(`${fieldName} ist keine gültige deutsche Telefonnummer`);
  }
  return errors;
}

export function validatePostalCode(value: string, fieldName: string): string[] {
  const errors: string[] = [];
  if (value && !isValidPostalCode(value)) {
    errors.push(`${fieldName} muss eine 5-stellige Postleitzahl sein`);
  }
  return errors;
}

export function validateIBAN(value: string, fieldName: string): string[] {
  const errors: string[] = [];
  if (value && !isValidIBAN(value)) {
    errors.push(`${fieldName} ist keine gültige IBAN`);
  }
  return errors;
}

// Batch validation helper
export function validateFormField(
  value: any,
  validators: Array<(v: any) => string[]>
): string[] {
  return validators.reduce((errors, validator) => {
    return [...errors, ...validator(value)];
  }, [] as string[]);
}

// Validation chain builder
export class Validator {
  private errors: string[] = [];

  required(fieldName: string): this {
    return this;
  }

  email(fieldName: string): this {
    return this;
  }

  minLength(min: number): this {
    return this;
  }

  maxLength(max: number): this {
    return this;
  }

  pattern(regex: RegExp, message: string): this {
    return this;
  }

  custom(validatorFn: (value: any) => boolean, message: string): this {
    return this;
  }

  getErrors(): string[] {
    return this.errors;
  }

  isValid(): boolean {
    return this.errors.length === 0;
  }
}
