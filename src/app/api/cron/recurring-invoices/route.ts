"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { createInvoiceFromOrder } from "@/lib/invoicing/invoice-service";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { verifyCronRequest } from "@/lib/cron/auth";

export async function POST(request: Request) {
  try {
    const auth = verifyCronRequest(request);
    if (!auth.ok) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    const supabaseAdmin = createAdminClient();
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    console.log("[RECURRING INVOICES CRON] Starting at", today.toISOString());

    // Find all active permanent orders with fixed monthly price
    const { data: permanentOrders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        title,
        order_type,
        fixed_monthly_price,
        status,
        tenant_id,
        customer_id,
        objects!inner(
          customers!inner(
            id,
            name,
            email,
            address,
            postal_code,
            city
          )
        )
      `)
      .eq("order_type", "permanent")
      .not("fixed_monthly_price", "is", null)
      .eq("status", "active");

    if (ordersError) {
      console.error("[RECURRING INVOICES] Error fetching orders:", ordersError);
      return Response.json({ error: ordersError.message }, { status: 500 });
    }

    console.log(`[RECURRING INVOICES] Found ${permanentOrders?.length || 0} permanent orders`);

    const results = {
      processed: 0,
      invoices_created: 0,
      skipped_already_billed: 0,
      skipped_no_customer: 0,
      errors: 0,
      details: [] as string[],
    };

    for (const order of permanentOrders || []) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orderAny = order as any;
        // Check if customer exists — objects is a join, customers might be array or object
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const customerRef = orderAny.objects?.customers;
        const customer = Array.isArray(customerRef) ? customerRef[0] : customerRef;

        if (!customer?.id) {
          results.skipped_no_customer++;
          results.details.push(`SKIP: ${order.title} - no customer`);
          continue;
        }

        // Check if invoice already exists for this order this month
        const { data: existingInvoices } = await supabaseAdmin
          .from("invoices")
          .select("id, invoice_number")
          .eq("order_id", order.id)
          .gte("issue_date", format(monthStart, "yyyy-MM-dd"))
          .lte("issue_date", format(monthEnd, "yyyy-MM-dd"));

        if (existingInvoices && existingInvoices.length > 0) {
          results.skipped_already_billed++;
          results.details.push(
            `SKIP: ${order.title} - already billed this month (${existingInvoices[0].invoice_number})`
          );
          continue;
        }

        // Get a tenant admin user for invoice creation
        // We use the first admin user of the tenant
        const { data: adminUser } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("tenant_id", order.tenant_id)
          .eq("role", "admin")
          .limit(1)
          .single();

        if (!adminUser?.id) {
          results.errors++;
          results.details.push(`ERROR: ${order.title} - no admin user found for tenant`);
          continue;
        }

        // Create invoice using the existing service function
        const invoiceResult = await createInvoiceFromOrder(order.id, adminUser.id, order.tenant_id, {
          issue_date: todayStr,
          due_days: 30,
          notes: `Automatisch erstellt am ${format(today, "dd.MM.yyyy")} — Wiederkehrende Rechnung für permanente Bestellung.`,
        });

        if (invoiceResult.success && invoiceResult.data) {
          results.invoices_created++;
          results.details.push(
            `CREATED: ${order.title} → ${invoiceResult.data.invoice_number} (${invoiceResult.data.total_amount_cents / 100}€)`
          );
        } else {
          results.errors++;
          results.details.push(`ERROR: ${order.title} - ${invoiceResult.message}`);
        }

        results.processed++;
      } catch (err: any) {
        results.errors++;
        results.details.push(`ERROR: ${order.title} - ${err.message}`);
      }
    }

    console.log("[RECURRING INVOICES CRON] Complete:", results);

    return Response.json({
      success: true,
      ...results,
      run_at: today.toISOString(),
    });
  } catch (error: any) {
    console.error("[RECURRING INVOICES CRON] Fatal error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
