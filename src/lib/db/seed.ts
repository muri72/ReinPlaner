import { db } from './index';
import { eq } from 'drizzle-orm';
import type { InferInsertModel } from 'drizzle-orm';
import {
  tenants, profiles, employees, customers, objects, services,
  orders, orderEmployeeAssignments, shifts, invoices, invoiceItems,
  germanHolidays
} from './schema';
import { hash } from 'bcryptjs';

type TenantInsert = InferInsertModel<typeof tenants>;
type ProfileInsert = InferInsertModel<typeof profiles>;
type EmployeeInsert = InferInsertModel<typeof employees>;
type CustomerInsert = InferInsertModel<typeof customers>;
type ObjectInsert = InferInsertModel<typeof objects>;
type ServiceInsert = InferInsertModel<typeof services>;
type OrderInsert = InferInsertModel<typeof orders>;
type ShiftInsert = InferInsertModel<typeof shifts>;
type InvoiceInsert = InferInsertModel<typeof invoices>;
type InvoiceItemInsert = InferInsertModel<typeof invoiceItems>;

async function seed() {
  console.log('🧹 Starte Seed...');

  // === TENANT 1: ARIS Reinigungsfirma Hamburg ===
  const [arisTenant] = await db.insert(tenants).values({
    name: 'ARIS Reinigungsfirma Hamburg',
    slug: 'aris-hamburg',
    plan: 'professional',
    status: 'active',
  } as TenantInsert).returning();

  console.log('✓ Tenant ARIS erstellt');

  // === TENANT 2: CleanMaster Berlin ===
  const [cleanMasterTenant] = await db.insert(tenants).values({
    name: 'CleanMaster Berlin',
    slug: 'cleanmaster-berlin',
    plan: 'enterprise',
    status: 'active',
  } as TenantInsert).returning();

  console.log('✓ Tenant CleanMaster erstellt');

  // ==================== ARIS PROFILES ====================
  const arisAdminProfile = await db.insert(profiles).values({
    email: 'admin@aris-hamburg.de',
    fullName: 'Max Muster',
    role: 'platform_admin',
    tenantId: arisTenant.id,
    isActive: true,
  } as ProfileInsert).returning().then(r => r[0]);

  const arisManagerProfile = await db.insert(profiles).values({
    email: 'manager@aris-hamburg.de',
    fullName: 'Sarah Schmidt',
    role: 'manager',
    tenantId: arisTenant.id,
    isActive: true,
  } as ProfileInsert).returning().then(r => r[0]);

  const arisAdmin2Profile = await db.insert(profiles).values({
    email: 'aris-admin@aris-hamburg.de',
    fullName: 'Tom Richter',
    role: 'admin',
    tenantId: arisTenant.id,
    isActive: true,
  } as ProfileInsert).returning().then(r => r[0]);

  const arisEmployeeNames = [
    'Hans Müller', 'Anna Fischer', 'Peter Weber', 'Marina Schulz',
    'Klaus Hoffmann', 'Lisa Braun', 'Jürgen Koch', 'Petra Hoffmann',
    'Wolfgang Schmidt', 'Elke König',
  ];

  const arisEmployeeProfiles: typeof arisAdminProfile[] = [];
  for (const name of arisEmployeeNames) {
    const p = await db.insert(profiles).values({
      email: name.toLowerCase().replace(/ /g, '.') + '@aris-hamburg.de',
      fullName: name,
      role: 'employee',
      tenantId: arisTenant.id,
      isActive: true,
    } as ProfileInsert).returning().then(r => r[0]);
    arisEmployeeProfiles.push(p);
  }

  const arisCustomerNames = ['Firma GmbH', 'Hotel Hamburg', 'Restaurant Bahnhof', 'Büro City', 'EKZ West', 'Zahnarztpraxis', 'FitLife', 'Kita Sonnenschein'];
  const arisCustomerProfiles: typeof arisAdminProfile[] = [];
  for (const name of arisCustomerNames) {
    const p = await db.insert(profiles).values({
      email: name.toLowerCase().replace(/ /g, '-') + '@example.de',
      fullName: name + ' Kontakt',
      role: 'customer',
      tenantId: arisTenant.id,
      isActive: true,
    } as ProfileInsert).returning().then(r => r[0]);
    arisCustomerProfiles.push(p);
  }

  console.log('✓ ARIS Profiles erstellt');

  // ==================== CLEANMASTER PROFILES ====================
  const cmManagerProfile = await db.insert(profiles).values({
    email: 'manager@cleanmaster-berlin.de',
    fullName: 'Julia Berger',
    role: 'manager',
    tenantId: cleanMasterTenant.id,
    isActive: true,
  } as ProfileInsert).returning().then(r => r[0]);

  const cmAdminProfile = await db.insert(profiles).values({
    email: 'admin@cleanmaster-berlin.de',
    fullName: 'Michael Wagner',
    role: 'admin',
    tenantId: cleanMasterTenant.id,
    isActive: true,
  } as ProfileInsert).returning().then(r => r[0]);

  const cmEmployeeNames = [
    'Max Schuster', 'Lena Lehmann', 'Ralf Engel', 'Claudia Otto',
    'Stefan Bauer', 'Birgit Hahn', 'Rainer Zimmermann', 'Ursula Vogel',
  ];

  const cmEmployeeProfiles: typeof arisAdminProfile[] = [];
  for (const name of cmEmployeeNames) {
    const p = await db.insert(profiles).values({
      email: name.toLowerCase().replace(/ /g, '.') + '@cleanmaster-berlin.de',
      fullName: name,
      role: 'employee',
      tenantId: cleanMasterTenant.id,
      isActive: true,
    } as ProfileInsert).returning().then(r => r[0]);
    cmEmployeeProfiles.push(p);
  }

  console.log('✓ CleanMaster Profiles erstellt');

  // ==================== EMPLOYEES ====================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const arisEmployees: any[] = [];
  for (const profile of arisEmployeeProfiles) {
    const emp = await db.insert(employees).values({
      tenantId: arisTenant.id,
      profileId: profile.id,
      hourlyRate: 15 + Math.floor(Math.random() * 20),
      contractHoursPerWeek: [20, 25, 30, 35, 40][Math.floor(Math.random() * 5)],
      hireDate: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      isActive: true,
    } as EmployeeInsert).returning().then(r => r[0]);
    arisEmployees.push(emp);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cmEmployees: any[] = [];
  for (const profile of cmEmployeeProfiles) {
    const emp = await db.insert(employees).values({
      tenantId: cleanMasterTenant.id,
      profileId: profile.id,
      hourlyRate: 15 + Math.floor(Math.random() * 20),
      contractHoursPerWeek: [20, 25, 30, 35, 40][Math.floor(Math.random() * 5)],
      hireDate: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      isActive: true,
    } as EmployeeInsert).returning().then(r => r[0]);
    cmEmployees.push(emp);
  }

  console.log('✓ Employees erstellt');

  // ==================== SERVICES ====================
  const arisServices = await db.insert(services).values([
    { tenantId: arisTenant.id, name: 'Unterhaltsreinigung', description: 'Regelmäßige Unterhaltsreinigung', basePrice: 450, durationMinutes: 180, isActive: true } as ServiceInsert,
    { tenantId: arisTenant.id, name: 'Grundreinigung', description: 'Intensive Grundreinigung', basePrice: 850, durationMinutes: 300, isActive: true } as ServiceInsert,
    { tenantId: arisTenant.id, name: 'Fensterreinigung', description: 'Fensterreinigung innen und außen', basePrice: 220, durationMinutes: 120, isActive: true } as ServiceInsert,
    { tenantId: arisTenant.id, name: 'Baureinigung', description: 'Reinigung nach Bauarbeiten', basePrice: 1200, durationMinutes: 480, isActive: true } as ServiceInsert,
    { tenantId: arisTenant.id, name: 'Sonderreinigung', description: 'Sonderreinigung', basePrice: 650, durationMinutes: 240, isActive: true } as ServiceInsert,
    { tenantId: arisTenant.id, name: 'Teppichreinigung', description: 'Tiefenreinigung Teppiche', basePrice: 380, durationMinutes: 150, isActive: true } as ServiceInsert,
  ] as ServiceInsert[]).returning();

  const cmServices = await db.insert(services).values([
    { tenantId: cleanMasterTenant.id, name: 'Büro-Reinigung', description: 'Regelmäßige Büroflächenreinigung', basePrice: 500, durationMinutes: 200, isActive: true } as ServiceInsert,
    { tenantId: cleanMasterTenant.id, name: 'Hotelreinigung', description: 'Hotelzimmer und Bereiche', basePrice: 750, durationMinutes: 280, isActive: true } as ServiceInsert,
    { tenantId: cleanMasterTenant.id, name: 'Gastro-Reinigung', description: 'Gastronomie-Spezialreinigung', basePrice: 600, durationMinutes: 220, isActive: true } as ServiceInsert,
    { tenantId: cleanMasterTenant.id, name: 'Industriereinigung', description: 'Industrie und Lager', basePrice: 950, durationMinutes: 360, isActive: true } as ServiceInsert,
  ] as ServiceInsert[]).returning();

  console.log('✓ Services erstellt');

  // ==================== CUSTOMERS ====================
  const arisCustomerData = [
    { name: 'Firma GmbH', email: 'info@firma.de', phone: '040-12345678', address: 'Hauptstraße 1, 20095 Hamburg' },
    { name: 'Hotel Hamburg', email: 'kontakt@hotel-hh.de', phone: '040-87654321', address: 'Bahnhofstraße 50, 20095 Hamburg' },
    { name: 'Restaurant Bahnhof', email: 'info@alter-bahnhof.de', phone: '040-5551234', address: 'Bahnhofsplatz 12, 20095 Hamburg' },
    { name: 'Büro City', email: 'verwaltung@city-center.de', phone: '040-99988877', address: 'Jungfernstieg 30, 20354 Hamburg' },
    { name: 'EKZ West', email: 'info@ekz-west.de', phone: '040-11122233', address: 'Osdorfer Weg 5, 22607 Hamburg' },
    { name: 'Zahnarztpraxis', email: 'info@zahnarzt-schulz.de', phone: '040-44455566', address: 'Colonnaden 18, 20354 Hamburg' },
    { name: 'FitLife Studio', email: 'kontakt@fitlife-hh.de', phone: '040-77788899', address: 'Klosterstern 8, 20149 Hamburg' },
    { name: 'Kita Sonnenschein', email: 'leitung@kitasonnenschein.de', phone: '040-22233344', address: 'Harvestehuder Weg 15, 20149 Hamburg' },
  ];

  const arisCustomerRows: any[] = [];
  for (const c of arisCustomerData) {
    const r = await db.insert(customers).values({
      tenantId: arisTenant.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
    } as CustomerInsert).returning().then(r => r[0]);
    arisCustomerRows.push(r);
  }

  const cmCustomerData = [
    { name: 'Senatsverwaltung', email: 'info@senat-berlin.de', phone: '030-12345678', address: 'Jüdenstraße 1, 10178 Berlin' },
    { name: 'Hotel Berlin Plaza', email: 'kontakt@plaza-hotel.de', phone: '030-87654321', address: 'Friedrichstraße 165, 10117 Berlin' },
    { name: 'Restaurants Kette', email: 'info@restaurants-berlin.de', phone: '030-5551234', address: 'Alexanderplatz 5, 10178 Berlin' },
    { name: 'Büro Mitte Tower', email: 'verwaltung@mitte-tower.de', phone: '030-99988877', address: 'Friedrichstraße 95, 10117 Berlin' },
  ];

  const cmCustomerRows: any[] = [];
  for (const c of cmCustomerData) {
    const r = await db.insert(customers).values({
      tenantId: cleanMasterTenant.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
    } as CustomerInsert).returning().then(r => r[0]);
    cmCustomerRows.push(r);
  }

  console.log('✓ Customers erstellt');

  // ==================== OBJECTS ====================
  const objectNames = ['Erdgeschoss', '1. OG', '2. OG'];

  const arisObjects: any[] = [];
  for (const customer of arisCustomerRows) {
    for (let i = 0; i < 3; i++) {
      const obj = await db.insert(objects).values({
        tenantId: arisTenant.id,
        customerId: customer.id as string,
        name: customer.name + ' - ' + objectNames[i],
        address: customer.address as string,
        postalCode: '20095',
        city: 'Hamburg',
      } as ObjectInsert).returning().then(r => r[0]);
      arisObjects.push(obj);
    }
  }

  const cmObjects: any[] = [];
  for (const customer of cmCustomerRows) {
    for (let i = 0; i < 3; i++) {
      const obj = await db.insert(objects).values({
        tenantId: cleanMasterTenant.id,
        customerId: customer.id as string,
        name: customer.name + ' - ' + objectNames[i],
        address: customer.address as string,
        postalCode: '10117',
        city: 'Berlin',
      } as ObjectInsert).returning().then(r => r[0]);
      cmObjects.push(obj);
    }
  }

  console.log('✓ Objects erstellt');

  // ==================== ORDERS ====================
  const orderStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled', 'pending'] as const;
  const now = new Date();

  // ARIS Orders (50)
  for (let i = 0; i < 50; i++) {
    const customer = arisCustomerRows[Math.floor(Math.random() * arisCustomerRows.length)];
    const obj = arisObjects.find(o => o.id !== undefined) || arisObjects[0];
    const service = arisServices[Math.floor(Math.random() * arisServices.length)];
    const daysFromNow = Math.floor(Math.random() * 60) - 10;
    const scheduledDate = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
    const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];

    const order = await db.insert(orders).values({
      tenantId: arisTenant.id,
      customerId: customer.id as string,
      objectId: obj.id as string,
      serviceId: service.id as string,
      status,
      scheduledDate,
      scheduledEndDate: new Date(scheduledDate.getTime() + (service.durationMinutes || 180) * 60 * 1000),
      totalPrice: (service.basePrice || 0) + Math.floor(Math.random() * 200),
      notes: 'Auftrag #' + (1000 + i),
    } as OrderInsert).returning().then(r => r[0]);

    const numEmps = Math.floor(Math.random() * 3) + 1;
    const assigned = [...arisEmployees].sort(() => Math.random() - 0.5).slice(0, numEmps);
    for (const emp of assigned) {
      await db.insert(orderEmployeeAssignments).values({
        orderId: order.id as string,
        employeeId: emp.id as string,
      });
    }
  }

  // CleanMaster Orders (30)
  for (let i = 0; i < 30; i++) {
    const customer = cmCustomerRows[Math.floor(Math.random() * cmCustomerRows.length)];
    const obj = cmObjects.find(o => o.id !== undefined) || cmObjects[0];
    const service = cmServices[Math.floor(Math.random() * cmServices.length)];
    const daysFromNow = Math.floor(Math.random() * 60) - 10;
    const scheduledDate = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
    const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];

    const order = await db.insert(orders).values({
      tenantId: cleanMasterTenant.id,
      customerId: customer.id as string,
      objectId: obj.id as string,
      serviceId: service.id as string,
      status,
      scheduledDate,
      scheduledEndDate: new Date(scheduledDate.getTime() + (service.durationMinutes || 180) * 60 * 1000),
      totalPrice: (service.basePrice || 0) + Math.floor(Math.random() * 200),
      notes: 'Auftrag #' + (2000 + i),
    } as OrderInsert).returning().then(r => r[0]);

    const numEmps = Math.floor(Math.random() * 3) + 1;
    const assigned = [...cmEmployees].sort(() => Math.random() - 0.5).slice(0, numEmps);
    for (const emp of assigned) {
      await db.insert(orderEmployeeAssignments).values({
        orderId: order.id as string,
        employeeId: emp.id as string,
      });
    }
  }

  console.log('✓ 80 Orders erstellt (50x ARIS, 30x CleanMaster)');

  // ==================== SHIFTS ====================
  for (let day = 0; day < 14; day++) {
    const date = new Date(now.getTime() + day * 24 * 60 * 60 * 1000);
    const shiftsPerDay = Math.floor(Math.random() * 4) + 2;

    for (let s = 0; s < shiftsPerDay; s++) {
      const emp = arisEmployees[Math.floor(Math.random() * arisEmployees.length)];
      const service = arisServices[Math.floor(Math.random() * arisServices.length)];
      const startHour = 7 + Math.floor(Math.random() * 8);
      const start = new Date(date);
      start.setHours(startHour, 0, 0, 0);
      const end = new Date(start.getTime() + (service.durationMinutes || 180) * 60 * 1000);

      await db.insert(shifts).values({
        tenantId: arisTenant.id,
        employeeId: emp.id as string,
        status: day === 0 ? 'in_progress' : 'scheduled',
        scheduledStart: start,
        scheduledEnd: end,
        breakMinutes: Math.floor(Math.random() * 3) * 15,
      } as ShiftInsert);
    }
  }

  console.log('✓ Shifts erstellt');

  // ==================== INVOICES ====================
  const completedOrders = await db.select().from(orders).where(eq(orders.status, 'completed')).limit(20);
  for (const order of completedOrders) {
    const invoice = await db.insert(invoices).values({
      tenantId: order.tenantId,
      customerId: order.customerId,
      invoiceNumber: 'INV-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      status: Math.random() > 0.3 ? 'paid' : 'pending',
      totalAmount: order.totalPrice || 0,
      paidAmount: 0,
      dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    } as InvoiceInsert).returning().then(r => r[0]);

    await db.insert(invoiceItems).values({
      invoiceId: invoice.id as string,
      description: 'Reinigungsleistung',
      quantity: 1,
      unitPrice: order.totalPrice || 0,
      totalPrice: order.totalPrice || 0,
    } as InvoiceItemInsert);
  }

  console.log('✓ Invoices erstellt');

  // ==================== GERMAN HOLIDAYS ====================
  const holidays = [
    { date: new Date('2026-01-01'), name: 'Neujahr', bundesland: 'HH' },
    { date: new Date('2026-03-20'), name: 'Karfreitag', bundesland: 'HH' },
    { date: new Date('2026-03-22'), name: 'Ostersonntag', bundesland: 'HH' },
    { date: new Date('2026-03-24'), name: 'Ostermontag', bundesland: 'HH' },
    { date: new Date('2026-05-01'), name: 'Tag der Arbeit', bundesland: 'HH' },
    { date: new Date('2026-05-25'), name: 'Christi Himmelfahrt', bundesland: 'HH' },
    { date: new Date('2026-06-05'), name: 'Pfingstmontag', bundesland: 'HH' },
    { date: new Date('2026-10-03'), name: 'Tag der Deutschen Einheit', bundesland: 'HH' },
    { date: new Date('2026-12-25'), name: 'Weihnachten', bundesland: 'HH' },
    { date: new Date('2026-12-26'), name: '2. Weihnachtsfeiertag', bundesland: 'HH' },
    { date: new Date('2026-01-01'), name: 'Neujahr', bundesland: 'BE' },
    { date: new Date('2026-03-20'), name: 'Karfreitag', bundesland: 'BE' },
    { date: new Date('2026-03-22'), name: 'Ostersonntag', bundesland: 'BE' },
    { date: new Date('2026-03-24'), name: 'Ostermontag', bundesland: 'BE' },
    { date: new Date('2026-05-01'), name: 'Tag der Arbeit', bundesland: 'BE' },
    { date: new Date('2026-05-25'), name: 'Christi Himmelfahrt', bundesland: 'BE' },
    { date: new Date('2026-06-05'), name: 'Pfingstmontag', bundesland: 'BE' },
    { date: new Date('2026-10-03'), name: 'Tag der Deutschen Einheit', bundesland: 'BE' },
    { date: new Date('2026-12-25'), name: 'Weihnachten', bundesland: 'BE' },
    { date: new Date('2026-12-26'), name: '2. Weihnachtsfeiertag', bundesland: 'BE' },
  ];

  for (const h of holidays) {
    await db.insert(germanHolidays).values({
      date: h.date,
      name: h.name,
      bundesland: h.bundesland,
    }).onConflictDoNothing();
  }

  console.log('✓ Feiertage erstellt');

  console.log('\n🎉 Seed abgeschlossen!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Zwei Tenants angelegt:');
  console.log('1. ARIS Reinigungsfirma Hamburg (professional)');
  console.log('   - admin@aris-hamburg.de (platform_admin)');
  console.log('   - manager@aris-hamburg.de (manager)');
  console.log('   - aris-admin@aris-hamburg.de (admin)');
  console.log('   - 10 employees');
  console.log('   - 8 customers, 24 objects, 50 orders');
  console.log('');
  console.log('2. CleanMaster Berlin (enterprise)');
  console.log('   - manager@cleanmaster-berlin.de (manager)');
  console.log('   - admin@cleanmaster-berlin.de (admin)');
  console.log('   - 8 employees');
  console.log('   - 4 customers, 12 objects, 30 orders');
  console.log('');
  console.log('Passwort für alle: demo123');
}

seed().catch(console.error);
