import { pgTable, text, timestamp, boolean, integer, uuid, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['platform_admin', 'admin', 'manager', 'employee', 'customer']);
export const tenantPlanEnum = pgEnum('tenant_plan', ['starter', 'professional', 'enterprise']);
export const tenantStatusEnum = pgEnum('tenant_status', ['active', 'suspended', 'pending', 'cancelled']);
export const orderStatusEnum = pgEnum('order_status', ['scheduled', 'in_progress', 'completed', 'cancelled', 'pending']);
export const shiftStatusEnum = pgEnum('shift_status', ['scheduled', 'in_progress', 'completed', 'cancelled']);
export const absenceTypeEnum = pgEnum('absence_type', ['vacation', 'sick', 'personal', 'other']);
export const absenceStatusEnum = pgEnum('absence_status', ['pending', 'approved', 'rejected']);

// Tenants (Mandanten)
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  plan: tenantPlanEnum('plan').default('starter'),
  status: tenantStatusEnum('status').default('active'),
  logoUrl: text('logo_url'),
  customDomain: text('custom_domain'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Profiles (Auth-User + RBAC)
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  role: userRoleEnum('role').default('employee'),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Employees
export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  profileId: uuid('profile_id').references(() => profiles.id),
  hourlyRate: integer('hourly_rate').default(0),
  contractHoursPerWeek: integer('contract_hours_per_week'),
  hireDate: timestamp('hire_date'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Customers
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Objects (zu reinigende Standorte)
export const objects = pgTable('objects', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  customerId: uuid('customer_id').references(() => customers.id),
  name: text('name').notNull(),
  address: text('address').notNull(),
  postalCode: text('postal_code'),
  city: text('city'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Services (Reinigungsdienste)
export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  description: text('description'),
  basePrice: integer('base_price').default(0),
  durationMinutes: integer('duration_minutes'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Orders (Aufträge)
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  objectId: uuid('object_id').references(() => objects.id),
  serviceId: uuid('service_id').references(() => services.id),
  status: orderStatusEnum('status').default('scheduled'),
  scheduledDate: timestamp('scheduled_date'),
  scheduledEndDate: timestamp('scheduled_end_date'),
  actualStartDate: timestamp('actual_start_date'),
  actualEndDate: timestamp('actual_end_date'),
  totalPrice: integer('total_price').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Order Employee Assignments
export const orderEmployeeAssignments = pgTable('order_employee_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// Shifts
export const shifts = pgTable('shifts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  orderId: uuid('order_id').references(() => orders.id),
  employeeId: uuid('employee_id').references(() => employees.id),
  status: shiftStatusEnum('status').default('scheduled'),
  scheduledStart: timestamp('scheduled_start').notNull(),
  scheduledEnd: timestamp('scheduled_end').notNull(),
  actualStart: timestamp('actual_start'),
  actualEnd: timestamp('actual_end'),
  breakMinutes: integer('break_minutes').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Shift Overrides
export const shiftOverrides = pgTable('shift_overrides', {
  id: uuid('id').primaryKey().defaultRandom(),
  shiftId: uuid('shift_id').notNull().references(() => shifts.id),
  overrideType: text('override_type').notNull(), // 'time', 'employee', 'note'
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  reason: text('reason'),
  createdBy: uuid('created_by').references(() => profiles.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// Service Rates (for employee-service experience)
export const serviceRates = pgTable('service_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  serviceId: uuid('service_id').notNull().references(() => services.id),
  hourlyRate: integer('hourly_rate').notNull(),
  yearsExperience: integer('years_experience').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Invoices
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  invoiceNumber: text('invoice_number').unique(),
  status: text('status').default('draft'), // draft, sent, paid, overdue, cancelled
  issueDate: timestamp('issue_date').defaultNow(),
  dueDate: timestamp('due_date'),
  totalAmount: integer('total_amount').default(0),
  paidAmount: integer('paid_amount').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Invoice Items
export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  description: text('description').notNull(),
  quantity: integer('quantity').default(1),
  unitPrice: integer('unit_price').notNull(),
  totalPrice: integer('total_price').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Debtors
export const debtors = pgTable('debtors', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  totalDebt: integer('total_debt').default(0),
  lastPaymentDate: timestamp('last_payment_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Payments
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').references(() => invoices.id),
  debtorId: uuid('debtor_id').references(() => debtors.id),
  amount: integer('amount').notNull(),
  paymentDate: timestamp('payment_date').defaultNow(),
  paymentMethod: text('payment_method'),
  reference: text('reference'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Time Entries
export const timeEntries = pgTable('time_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  shiftId: uuid('shift_id').references(() => shifts.id),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  date: timestamp('date').notNull(),
  hoursWorked: integer('hours_worked').default(0), // in minutes
  breakMinutes: integer('break_minutes').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Absence Requests
export const absenceRequests = pgTable('absence_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  absenceType: absenceTypeEnum('absence_type').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  status: absenceStatusEnum('status').default('pending'),
  reason: text('reason'),
  approvedBy: uuid('approved_by').references(() => profiles.id),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Employee Holiday Preferences
export const employeeHolidayPreferences = pgTable('employee_holiday_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  year: integer('year').notNull(),
  entitledDays: integer('entitled_days').default(0),
  usedDays: integer('used_days').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// German Holidays (lookup table)
export const germanHolidays = pgTable('german_holidays', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: timestamp('date').notNull(),
  name: text('name').notNull(),
  bundesland: text('bundesland'), // nullable for national holidays
});

// Bundesländer
export const bundeslaender = pgTable('bundeslaender', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
});

// Customer Contacts
export const customerContacts = pgTable('customer_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  role: text('role'),
  isPrimary: boolean('is_primary').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Products
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  sku: text('sku'),
  description: text('description'),
  unitPrice: integer('unit_price').default(0),
  stock: integer('stock').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// General Feedback
export const generalFeedback = pgTable('general_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  customerId: uuid('customer_id').references(() => customers.id),
  rating: integer('rating'), // 1-5
  comment: text('comment'),
  source: text('source'), // 'portal', 'email', 'survey'
  createdAt: timestamp('created_at').defaultNow(),
});

// Order Feedback
export const orderFeedback = pgTable('order_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  customerId: uuid('customer_id').references(() => customers.id),
  rating: integer('rating').notNull(), // 1-5
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Invoice Settings
export const invoiceSettings = pgTable('invoice_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id).unique(),
  invoicePrefix: text('invoice_prefix').default('RE'),
  nextInvoiceNumber: integer('next_invoice_number').default(1),
  defaultDueDays: integer('default_due_days').default(14),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tax Settings
export const taxSettings = pgTable('tax_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id).unique(),
  taxRate: integer('tax_rate').default(1900), // in basis points (19.00%)
  taxNumber: text('tax_number'),
  vatId: text('vat_id'),
  isTaxExempt: boolean('is_tax_exempt').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Bank Connections
export const bankConnections = pgTable('bank_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  bankName: text('bank_name').notNull(),
  iban: text('iban'),
  bic: text('bic'),
  accountHolder: text('account_holder'),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Document Templates
export const documentTemplates = pgTable('document_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'invoice', 'quote', 'letter'
  content: jsonb('content').notNull(),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Template Placeholders
export const templatePlaceholders = pgTable('template_placeholders', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull().references(() => documentTemplates.id),
  key: text('key').notNull(),
  label: text('label').notNull(),
  type: text('type').default('text'), // text, date, number, select
  required: boolean('required').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Generated Documents
export const generatedDocuments = pgTable('generated_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  templateId: uuid('template_id').references(() => documentTemplates.id),
  type: text('type').notNull(),
  referenceId: uuid('reference_id'), // e.g. invoice_id
  fileUrl: text('file_url'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Company Branding
export const companyBranding = pgTable('company_branding', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id).unique(),
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color').default('#3B82F6'),
  secondaryColor: text('secondary_color').default('#1E40AF'),
  fontFamily: text('font_family'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// App Settings
export const appSettings = pgTable('app_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id).unique(),
  settings: jsonb('settings').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  profileId: uuid('profile_id').references(() => profiles.id),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: uuid('entity_id'),
  metadata: jsonb('metadata'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Invoice Sequences
export const invoiceSequences = pgTable('invoice_sequences', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id).unique(),
  lastNumber: integer('last_number').default(0),
  year: integer('year').notNull(),
  prefix: text('prefix').default('RE'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Helper for date-only columns (stored as timestamp at midnight)
function date(name: string) {
  return timestamp(name, { withTimezone: false });
}

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  profiles: many(profiles),
  employees: many(employees),
  customers: many(customers),
  objects: many(objects),
  services: many(services),
  orders: many(orders),
  invoices: many(invoices),
  products: many(products),
  auditLogs: many(auditLogs),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  tenant: one(tenants, { fields: [profiles.tenantId], references: [tenants.id] }),
  employee: one(employees, { fields: [profiles.id], references: [employees.profileId] }),
  auditLogs: many(auditLogs),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  tenant: one(tenants, { fields: [employees.tenantId], references: [tenants.id] }),
  profile: one(profiles, { fields: [employees.profileId], references: [profiles.id] }),
  serviceRates: many(serviceRates),
  shifts: many(shifts),
  timeEntries: many(timeEntries),
  absenceRequests: many(absenceRequests),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  tenant: one(tenants, { fields: [customers.tenantId], references: [tenants.id] }),
  contacts: many(customerContacts),
  orders: many(orders),
  invoices: many(invoices),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  tenant: one(tenants, { fields: [orders.tenantId], references: [tenants.id] }),
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  object: one(objects, { fields: [orders.objectId], references: [objects.id] }),
  service: one(services, { fields: [orders.serviceId], references: [services.id] }),
  assignments: many(orderEmployeeAssignments),
  shifts: many(shifts),
}));

export const orderEmployeeAssignmentsRelations = relations(orderEmployeeAssignments, ({ one }) => ({
  order: one(orders, { fields: [orderEmployeeAssignments.orderId], references: [orders.id] }),
  employee: one(employees, { fields: [orderEmployeeAssignments.employeeId], references: [employees.id] }),
}));

export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  tenant: one(tenants, { fields: [shifts.tenantId], references: [tenants.id] }),
  order: one(orders, { fields: [shifts.orderId], references: [orders.id] }),
  employee: one(employees, { fields: [shifts.employeeId], references: [employees.id] }),
  overrides: many(shiftOverrides),
  timeEntries: many(timeEntries),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  tenant: one(tenants, { fields: [services.tenantId], references: [tenants.id] }),
  serviceRates: many(serviceRates),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  tenant: one(tenants, { fields: [invoices.tenantId], references: [tenants.id] }),
  customer: one(customers, { fields: [invoices.customerId], references: [customers.id] }),
  items: many(invoiceItems),
  payments: many(payments),
}));