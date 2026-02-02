/**
 * Shared form utilities and validation schemas
 * Extracted to eliminate code duplication across multiple form components
 */

/**
 * Preprocess function to convert empty strings to null for numeric fields
 * Used with Zod schemas to handle form input normalization
 */
export const preprocessNumber = (val: unknown): number | null => {
  if (val === "" || val === null || val === undefined) return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

/**
 * Regular expression for validating time format (HH:MM, 24-hour format)
 */
export const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Array of day names in English (lowercase)
 * Used for schedule and calendar operations
 */
export const dayNames = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
] as const;

/**
 * Mapping from English day names to German abbreviations
 * Used for display purposes in German UI
 */
export const germanDayNames: Record<string, string> = {
  monday: 'Mo',
  tuesday: 'Di',
  wednesday: 'Mi',
  thursday: 'Do',
  friday: 'Fr',
  saturday: 'Sa',
  sunday: 'So',
};

/**
 * Zod schema for daily schedule validation
 * Validates hours, start time, and end time for a single day
 */
export const dailyScheduleSchema = z.object({
  hours: z.preprocess(
    preprocessNumber,
    z.number().min(0).max(24).optional().nullable()
  ),
  start: z
    .string()
    .regex(timeRegex, "Ungültiges Format (HH:MM)")
    .or(z.literal(""))
    .optional()
    .nullable(),
  end: z
    .string()
    .regex(timeRegex, "Ungültiges Format (HH:MM)")
    .or(z.literal(""))
    .optional()
    .nullable(),
});

/**
 * Zod schema for weekly schedule validation
 * Validates all 7 days of the week
 */
export const weeklyScheduleSchema = z.object({
  monday: dailyScheduleSchema.optional(),
  tuesday: dailyScheduleSchema.optional(),
  wednesday: dailyScheduleSchema.optional(),
  thursday: dailyScheduleSchema.optional(),
  friday: dailyScheduleSchema.optional(),
  saturday: dailyScheduleSchema.optional(),
  sunday: dailyScheduleSchema.optional(),
});

// Re-export zod to make it available in this module
import * as z from 'zod';

/**
 * Settings Form Schemas
 * Extracted from settings-form.tsx to eliminate duplication
 */

/**
 * Company information schema
 */
export const companyInfoSchema = z.object({
  company_name: z.string().min(1, "Firmenname ist erforderlich"),
  company_logo_url: z.string().url("Muss eine gültige URL sein"),
});

/**
 * Regional settings schema
 */
export const regionalSettingsSchema = z.object({
  default_timezone: z.string(),
  default_bundesland: z.string().min(1, "Bundesland ist erforderlich"),
});

/**
 * Payroll settings schema
 */
export const payrollSettingsSchema = z.object({
  default_employee_hourly_rate: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Muss eine gültige Zahl sein",
  }),
  holiday_premium_pay_multiplier: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 1, {
    message: "Muss mindestens 1 sein",
  }),
  weekend_premium_pay_multiplier: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 1, {
    message: "Muss mindestens 1 sein",
  }),
  // Vacation settings
  base_vacation_days: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 365, {
    message: "Muss zwischen 0 und 365 liegen",
  }),
  minijob_vacation_calculation: z.enum(["proportional", "full"]),
});

/**
 * Invoice settings schema
 */
export const invoiceSettingsSchema = z.object({
  invoice_prefix: z.string().min(1, "Rechnungspräfix ist erforderlich"),
  next_invoice_number: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Muss eine gültige Zahl sein",
  }),
  offer_prefix: z.string().min(1, "Angebotspräfix ist erforderlich"),
  next_offer_number: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Muss eine gültige Zahl sein",
  }),
  credit_note_prefix: z.string().min(1, "Gutschriftpräfix ist erforderlich"),
  next_credit_note_number: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Muss eine gültige Zahl sein",
  }),
  default_payment_term: z.string().min(1, "Zahlungsziel ist erforderlich"),
  default_invoice_header_text: z.string().optional(),
  default_invoice_footer_text: z.string().optional(),
  default_offer_header_text: z.string().optional(),
  default_offer_footer_text: z.string().optional(),
});

/**
 * Tax settings schema
 */
export const taxSettingsSchema = z.object({
  currency: z.string().min(1, "Währung ist erforderlich"),
  vat_number: z.string().optional(),
  vat_option: z.string().min(1, "MwSt.-Option ist erforderlich"),
});

/**
 * Bank connection schema
 */
export const bankConnectionSchema = z.object({
  account_holder: z.string().min(1, "Kontoinhaber ist erforderlich"),
  iban: z.string().min(1, "IBAN ist erforderlich"),
  bic: z.string().optional(),
  bank_name: z.string().min(1, "Bankname ist erforderlich"),
});

/**
 * Type inference for settings forms
 */
export type CompanyInfoForm = z.infer<typeof companyInfoSchema>;
export type RegionalSettingsForm = z.infer<typeof regionalSettingsSchema>;
export type PayrollSettingsForm = z.infer<typeof payrollSettingsSchema>;
export type InvoiceSettingsForm = z.infer<typeof invoiceSettingsSchema>;
export type TaxSettingsForm = z.infer<typeof taxSettingsSchema>;
export type BankConnectionForm = z.infer<typeof bankConnectionSchema>;

/**
 * Common form field validation patterns
 */
export const formValidations = {
  email: z
    .union([
      z.string().email("Ungültiges E-Mail-Format"),
      z.literal(""),
    ])
    .transform(e => (e === "" ? null : e))
    .optional()
    .nullable(),

  password: z
    .string()
    .min(6, "Passwort muss mindestens 6 Zeichen lang sein")
    .optional(),

  requiredString: (fieldName: string) =>
    z.string().min(1, `${fieldName} ist erforderlich`).max(100, `${fieldName} ist zu lang`),

  optionalString: (maxLength: number = 500) =>
    z.string().max(maxLength).optional().nullable(),

  positiveNumber: (fieldName: string, max?: number) =>
    z.preprocess(
      preprocessNumber,
      z
        .number()
        .min(0, `${fieldName} muss positiv sein`)
        .max(max ?? 999999, `${fieldName} ist zu hoch`)
        .optional()
        .nullable()
    ),

  uuid: (fieldName: string) =>
    z.string().uuid(`Ungültige ${fieldName}-ID`),

  uuidOptional: (fieldName: string) =>
    z.string().uuid(`Ungültige ${fieldName}-ID`).optional().nullable(),
};

/**
 * Default values generator for form initialization
 * Helps reduce boilerplate in form components
 *
 * Note: This is a simplified version. In production, you might want to use
 * zod's built-in default values or a more sophisticated approach.
 */
export const createDefaultValues = <T extends z.ZodType<any, any, any>>(
  schema: T,
  overrides: Partial<z.infer<T>> = {}
): z.infer<T> => {
  // For now, just return the overrides
  // This can be enhanced later to automatically extract defaults from the schema
  return { ...overrides } as z.infer<T>;
};

/**
 * User Form Schemas
 * Extracted from user-form.tsx to eliminate duplication
 */

/**
 * Base user schema for form validation
 */
export const baseUserSchema = z.object({
  email: z.union([
    z.string().email("Ungültiges E-Mail-Format"),
    z.literal(""),
  ]).transform(e => e === "" ? null : e).optional().nullable(),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein").optional(),
  firstName: z.string().min(1, "Vorname ist erforderlich").max(100, "Vorname ist zu lang"),
  lastName: z.string().min(1, "Nachname ist erforderlich").max(100, "Nachname ist zu lang"),
  role: z.enum(["admin", "manager", "employee", "customer"]).default("employee"),
  employeeId: z.string().uuid("Ungültige Mitarbeiter-ID").optional().nullable(),
  customerId: z.string().uuid("Ungültige Kunden-ID").optional().nullable(),
  customerContactId: z.string().uuid("Ungültige Kundenkontakt-ID").optional().nullable(),
  managerCustomerIds: z.array(z.string().uuid()).optional(),
});

/**
 * Type definitions for user form
 */
export type UserFormInput = z.input<typeof baseUserSchema>;
export type UserFormValues = z.infer<typeof baseUserSchema>;

/**
 * Full user schema with validation refinements
 */
export const userSchema = baseUserSchema
  .refine((data) => {
    // Email is required for new users if no direct assignment
    if (data.password !== undefined && !data.employeeId && !data.customerContactId) {
      return data.email !== null && data.email !== "";
    }
    return true;
  }, {
    message: "E-Mail ist erforderlich, wenn kein Mitarbeiter oder Kundenkontakt zugewiesen ist.",
    path: ["email"],
  })
  .refine((data) => {
    if (data.password !== undefined) {
      // Cannot be both an employee and a customer contact
      const directAssignments = [data.employeeId, data.customerContactId].filter(Boolean);
      if (directAssignments.length > 1) {
        return false;
      }
      // Customer contact must have 'customer' role
      if (data.customerContactId && data.role !== 'customer') {
        return false;
      }
      // Non-manager roles should not have managerCustomerIds
      if (data.role !== 'manager' && data.managerCustomerIds && data.managerCustomerIds.length > 0) {
        return false;
      }
    }
    return true;
  }, {
    message: "Ungültige Rollen- und Zuweisungskombination.",
    path: ["role"],
  });

/**
 * Time Entry Form Schemas
 * Extracted from time-entry-form.tsx
 */

/**
 * Time entry schema for form validation
 */
export const timeEntrySchema = z.object({
  employeeId: z.string().uuid("Ungültige Mitarbeiter-ID").optional().nullable(),
  customerId: z.string().uuid("Ungültige Kunden-ID").optional().nullable(),
  objectId: z.string().uuid("Ungültiges Objekt-ID").optional().nullable(),
  orderId: z.string().uuid("Ungültige Auftrags-ID").optional().nullable(),
  shiftId: z.string().uuid("Ungültige Schicht-ID").optional().nullable(),
  startDate: z.date({ required_error: "Startdatum ist erforderlich" }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Startzeitformat (HH:MM)"),
  endDate: z.date().optional().nullable(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ungültiges Endzeitformat (HH:MM)").optional().nullable(),
  durationMinutes: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.nullable(z.number().min(0, "Dauer muss positiv sein").max(99999, "Dauer ist zu hoch")).optional()
  ),
  breakMinutes: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.nullable(z.number().min(0).max(1440, "Pausenminuten sind zu hoch")).optional()
  ),
  type: z.enum(["manual", "clock_in_out", "stopwatch", "automatic_scheduled_order", "shift"]).default("manual"),
  notes: z.string().max(500, "Notizen sind zu lang").optional().nullable(),
}).superRefine((data, ctx) => {
  // End date and time must both be provided or both be empty
  if ((data.endDate && !data.endTime) || (!data.endDate && data.endTime)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enddatum und Endzeit müssen beide angegeben oder beide weggelassen werden.",
      path: ["endDate"],
    });
  }

  // End time must be after start time
  if (data.startDate && data.startTime && data.endDate && data.endTime) {
    const startDateTime = new Date(data.startDate);
    const [startH, startM] = data.startTime.split(':').map(Number);
    startDateTime.setHours(startH, startM, 0, 0);

    const endDateTime = new Date(data.endDate);
    const [endH, endM] = data.endTime.split(':').map(Number);
    endDateTime.setHours(endH, endM, 0, 0);

    if (endDateTime < startDateTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Endzeit muss nach der Startzeit liegen.",
        path: ["endTime"],
      });
    }
  }
});

/**
 * Type definitions for time entry form
 */
export type TimeEntryFormInput = z.input<typeof timeEntrySchema>;
export type TimeEntryFormValues = z.infer<typeof timeEntrySchema>;
