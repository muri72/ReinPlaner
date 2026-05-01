# ============================================
# E2E Test Data Seeder for Supabase
# ============================================
# 
# This script creates test data in Supabase for E2E testing
# Run BEFORE running E2E tests
#
# Usage:
#   npx tsx e2e/seed-test-data.ts
#

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedTestData() {
  console.log('🌱 Starting E2E test data seeding...\n');

  // Get or create test tenant
  const { data: existingTenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', 'reinplaner')
    .single();

  let tenantId = existingTenant?.id;

  if (!tenantId) {
    console.log('📝 Creating test tenant...');
    const { data: newTenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: 'ReinPlaner Test GmbH',
        slug: 'reinplaner',
        domain: 'reinplaner.de',
        settings: { timezone: 'Europe/Berlin', currency: 'EUR' }
      })
      .select('id')
      .single();

    if (tenantError) {
      console.error('❌ Failed to create tenant:', tenantError);
      process.exit(1);
    }
    tenantId = newTenant.id;
    console.log('✅ Tenant created:', tenantId);
  } else {
    console.log('✅ Using existing tenant:', tenantId);
  }

  // Create test users and employees
  console.log('\n👥 Creating test users and employees...');

  const testUsers = [
    { email: 'admin@reinplaner.de', password: 'TestPassword123!', role: 'admin' },
    { email: 'manager@reinplaner.de', password: 'TestPassword123!', role: 'manager' },
    { email: 'employee@reinplaner.de', password: 'TestPassword123!', role: 'employee' },
  ];

  const createdUsers: string[] = [];
  const createdEmployees: string[] = [];

  for (const user of testUsers) {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single();

    if (existingUser) {
      console.log(`  ✅ User ${user.email} already exists`);
      createdUsers.push(existingUser.id);
      createdEmployees.push(existingUser.id);
      continue;
    }

    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
    });

    if (authError) {
      console.log(`  ⚠️ Auth user creation failed for ${user.email}:`, authError.message);
      continue;
    }

    const authId = authUser.id;
    createdUsers.push(authId);

    // Create user profile
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authId,
        email: user.email,
        tenant_id: tenantId,
        role: user.role,
      });

    if (userError) {
      console.log(`  ⚠️ User profile creation failed for ${user.email}:`, userError.message);
    } else {
      console.log(`  ✅ Created user: ${user.email} (${user.role})`);
    }

    // Create employee profile
    const firstName = user.role === 'employee' ? 'Max' : 'Admin';
    const lastName = user.role === 'employee' ? 'Mustermann' : 'Admin';

    const { data: employee, error: empError } = await supabase
      .from('employees')
      .insert({
        tenant_id: tenantId,
        user_id: authId,
        first_name: firstName,
        last_name: lastName,
        email: user.email,
        phone: '+49 40 1234567' + createdEmployees.length,
        employment_type: user.role === 'employee' ? 'full_time' : 'permanent',
        hourly_rate: user.role === 'employee' ? 15.50 : 35.00,
        created_by: authId,
      })
      .select('id')
      .single();

    if (empError) {
      console.log(`  ⚠️ Employee creation failed:`, empError.message);
    } else {
      createdEmployees.push(employee.id);
      console.log(`  ✅ Created employee: ${firstName} ${lastName}`);
    }
  }

  // Create test customers
  console.log('\n🏢 Creating test customers...');

  const testCustomers = [
    {
      tenant_id: tenantId,
      name: 'Testfirma GmbH',
      email: 'info@testfirma.de',
      phone: '+49 40 9876543',
      address: 'Teststraße 1, 20095 Hamburg',
      vat_id: 'DE123456789',
      payment_terms_days: 30,
    },
    {
      tenant_id: tenantId,
      name: 'Muster AG',
      email: 'kontakt@musterag.de',
      phone: '+49 40 5554443',
      address: 'Musterweg 10, 20354 Hamburg',
      vat_id: 'DE987654321',
      payment_terms_days: 14,
    },
  ];

  const createdCustomers: string[] = [];

  for (const customer of testCustomers) {
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', customer.email)
      .single();

    if (existingCustomer) {
      console.log(`  ✅ Customer ${customer.name} already exists`);
      createdCustomers.push(existingCustomer.id);
      continue;
    }

    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert(customer)
      .select('id')
      .single();

    if (customerError) {
      console.log(`  ⚠️ Customer creation failed:`, customerError.message);
    } else {
      createdCustomers.push(newCustomer.id);
      console.log(`  ✅ Created customer: ${customer.name}`);
    }
  }

  // Create test cleaning objects
  console.log('\n🏠 Creating test cleaning objects...');

  if (createdCustomers.length > 0) {
    const testObjects = [
      {
        tenant_id: tenantId,
        customer_id: createdCustomers[0],
        name: 'Bürogebäude Hamburg',
        address: 'Teststraße 1, 20095 Hamburg',
        description: 'Bürokomplex mit 5 Etagen',
        size_sqm: 1500,
        cleaning_frequency: 'daily',
      },
      {
        tenant_id: tenantId,
        customer_id: createdCustomers[0],
        name: 'Einkaufszentrum',
        address: 'Musterallee 5, 20354 Hamburg',
        description: 'Shopping Mall mit 3 Gebäuden',
        size_sqm: 5000,
        cleaning_frequency: 'twice_daily',
      },
      {
        tenant_id: tenantId,
        customer_id: createdCustomers[1] || createdCustomers[0],
        name: 'Firmenzentrale',
        address: 'Industriepark 20, 21079 Hamburg',
        description: 'Hauptquartier der Muster AG',
        size_sqm: 2500,
        cleaning_frequency: 'weekly',
      },
    ];

    const createdObjects: string[] = [];

    for (const object of testObjects) {
      const { data: existingObject } = await supabase
        .from('objects')
        .select('id')
        .eq('name', object.name)
        .single();

      if (existingObject) {
        console.log(`  ✅ Object ${object.name} already exists`);
        createdObjects.push(existingObject.id);
        continue;
      }

      const { data: newObject, error: objectError } = await supabase
        .from('objects')
        .insert(object)
        .select('id')
        .single();

      if (objectError) {
        console.log(`  ⚠️ Object creation failed:`, objectError.message);
      } else {
        createdObjects.push(newObject.id);
        console.log(`  ✅ Created object: ${object.name}`);
      }
    }

    // Create test orders
    console.log('\n📋 Creating test orders...');

    if (createdObjects.length > 0 && createdEmployees.length > 0) {
      const testOrders = [
        {
          tenant_id: tenantId,
          object_id: createdObjects[0],
          customer_id: createdCustomers[0],
          title: 'Regelmäßige Büroreinigung',
          description: 'Tägliche Reinigung der Büroräume',
          status: 'active',
          order_type: 'recurring',
          frequency: 'daily',
          price_per_month: 1500,
          start_date: new Date().toISOString().split('T')[0],
        },
        {
          tenant_id: tenantId,
          object_id: createdObjects[0],
          customer_id: createdCustomers[0],
          title: 'Grundreinigung',
          description: 'Einmalige Tiefenreinigung',
          status: 'pending',
          order_type: 'one_time',
          price: 800,
          start_date: new Date().toISOString().split('T')[0],
        },
      ];

      for (const order of testOrders) {
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('title', order.title)
          .single();

        if (existingOrder) {
          console.log(`  ✅ Order "${order.title}" already exists`);
          continue;
        }

        const { error: orderError } = await supabase
          .from('orders')
          .insert(order);

        if (orderError) {
          console.log(`  ⚠️ Order creation failed:`, orderError.message);
        } else {
          console.log(`  ✅ Created order: ${order.title}`);
        }
      }
    }
  }

  // Create test invoices
  console.log('\n💰 Creating test invoices...');

  if (createdCustomers.length > 0) {
    const testInvoices = [
      {
        tenant_id: tenantId,
        customer_id: createdCustomers[0],
        invoice_number: 'R/2026/0001',
        status: 'paid',
        total_amount: 1500,
        vat_amount: 240,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        paid_date: new Date().toISOString().split('T')[0],
      },
      {
        tenant_id: tenantId,
        customer_id: createdCustomers[0],
        invoice_number: 'R/2026/0002',
        status: 'pending',
        total_amount: 800,
        vat_amount: 128,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    ];

    for (const invoice of testInvoices) {
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('invoice_number', invoice.invoice_number)
        .single();

      if (existingInvoice) {
        console.log(`  ✅ Invoice ${invoice.invoice_number} already exists`);
        continue;
      }

      const { error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoice);

      if (invoiceError) {
        console.log(`  ⚠️ Invoice creation failed:`, invoiceError.message);
      } else {
        console.log(`  ✅ Created invoice: ${invoice.invoice_number}`);
      }
    }
  }

  console.log('\n✅ Test data seeding complete!');
  console.log('\n📝 Test credentials:');
  console.log('   admin: aris@reinplaner.de / ARIS2026Secure!');
  console.log('\n🔗 Run E2E tests with: npx playwright test');
}

seedTestData().catch(console.error);