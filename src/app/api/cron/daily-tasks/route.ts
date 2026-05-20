"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { sendReminderEmail } from "@/lib/invoicing/email-service";
import { createInvoiceFromOrder } from "@/lib/invoicing/invoice-service";
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth } from "date-fns";
import { de } from "date-fns/locale";
import { revalidatePath } from "next/cache";
import { verifyCronRequest } from "@/lib/cron/auth";

// Dunning configuration
const DUNNING_STAGES = [
  { daysOverdue: 7,  label: "1. Mahnung", fee_cents: 0 },
  { daysOverdue: 14, label: "2. Mahnung", fee_cents: 1500 },   // €15 fee
  { daysOverdue: 21, label: "3. Mahnung (Letzte)", fee_cents: 3500 }, // €35 fee
];

export async function POST(request: Request) {
  try {
    const auth = verifyCronRequest(request);
    if (!auth.ok) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    const supabaseAdmin = createAdminClient();
    const now = new Date();
    const today = new Date(now.toISOString().split("T")[0]);
    const todayStr = today.toISOString().split("T")[0];
    const dayOfMonth = today.getDate();

    console.log("[DAILY TASKS CRON] Starting at", now.toISOString());

    const results = {
      dunning: { processed: 0, reminders_sent: 0, errors: 0, skipped: 0, marked_overdue: 0, details: [] as string[] },
      overdue_shifts: { updated_count: 0, time_entries_created: 0 },
      recurring_invoices: { processed: 0, invoices_created: 0, skipped_already_billed: 0, skipped_no_customer: 0, errors: 0, details: [] as string[] },
    };

    // === DUNNING (daily) ===
    console.log("[DAILY TASKS] Running dunning check...");
    const dunningResult = await runDunning(supabaseAdmin, today, todayStr);
    results.dunning = dunningResult;

    // === MARK OVERDUE SHIFTS (daily) ===
    console.log("[DAILY TASKS] Running overdue shifts check...");
    const overdueShiftsResult = await runMarkOverdueShifts(supabaseAdmin, now, today);
    results.overdue_shifts = overdueShiftsResult;

    // === RECURRING INVOICES (only on 1st of month) ===
    if (dayOfMonth === 1) {
      console.log("[DAILY TASKS] Running recurring invoices check (1st of month)...");
      const recurringResult = await runRecurringInvoices(supabaseAdmin, today, todayStr);
      results.recurring_invoices = recurringResult;
    } else {
      console.log(`[DAILY TASKS] Skipping recurring invoices (not 1st of month, today is day ${dayOfMonth})`);
    }

    console.log("[DAILY TASKS CRON] Complete:", results);

    // Revalidate relevant paths
    revalidatePath("/dashboard/planning");
    revalidatePath("/dashboard/time-tracking");

    return Response.json({
      success: true,
      ...results,
      run_at: now.toISOString(),
    });
  } catch (error: any) {
    console.error("[DAILY TASKS CRON] Fatal error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ==================== DUNNING LOGIC ====================
async function runDunning(supabaseAdmin: any, today: Date, todayStr: string) {
  const results = {
    processed: 0,
    reminders_sent: 0,
    errors: 0,
    skipped: 0,
    marked_overdue: 0,
    details: [] as string[],
  };

  try {
    // First: mark sent invoices as overdue if past due date
    const { data: sentInvoices } = await supabaseAdmin
      .from("invoices")
      .select("id")
      .eq("status", "sent")
      .lt("due_date", todayStr)
      .or(`paid_amount_cents.lt.total_amount_cents,paid_amount_cents.is.null`);

    for (const inv of sentInvoices || []) {
      await supabaseAdmin
        .from("invoices")
        .update({ status: "overdue", updated_at: today.toISOString() })
        .eq("id", inv.id);
      results.marked_overdue++;
    }

    if (results.marked_overdue > 0) {
      console.log(`[DAILY TASKS - DUNNING] Marked ${results.marked_overdue} invoices as overdue`);
    }

    // Find overdue invoices
    const { data: overdueInvoices, error: fetchError } = await supabaseAdmin
      .from("invoices")
      .select(`
        id,
        debtor_id,
        invoice_number,
        due_date,
        total_amount_cents,
        paid_amount_cents,
        status,
        reminder_count,
        last_reminder_at,
        debtor:debtors(
          id,
          billing_name,
          invoice_email,
          payment_terms_days
        )
      `)
      .eq("status", "sent")
      .or(`paid_amount_cents.lt.total_amount_cents,paid_amount_cents.is.null`)
      .lte("due_date", todayStr);

    if (fetchError) {
      console.error("[DAILY TASKS - DUNNING] Error fetching overdue invoices:", fetchError);
      results.errors++;
      return results;
    }

    for (const invoice of overdueInvoices || []) {
      try {
        const dueDate = parseISO(invoice.due_date);
        const daysOverdue = differenceInDays(today, dueDate);
        const currentReminderCount = invoice.reminder_count || 0;

        let stage = DUNNING_STAGES[currentReminderCount];
        
        if (!stage) {
          results.skipped++;
          results.details.push(`SKIP: ${invoice.invoice_number} - already at max reminders (${currentReminderCount})`);
          continue;
        }

        if (daysOverdue < stage.daysOverdue) {
          results.skipped++;
          results.details.push(`SKIP: ${invoice.invoice_number} - only ${daysOverdue} days overdue (need ${stage.daysOverdue} for ${stage.label})`);
          continue;
        }

        if (invoice.last_reminder_at) {
          const lastReminder = parseISO(invoice.last_reminder_at);
          const daysSinceLastReminder = differenceInDays(today, lastReminder);
          if (daysSinceLastReminder < stage.daysOverdue) {
            results.skipped++;
            results.details.push(`SKIP: ${invoice.invoice_number} - ${stage.label} already sent ${daysSinceLastReminder} days ago`);
            continue;
          }
        }

        const debtorArr = invoice.debtor;
        const debtor = Array.isArray(debtorArr) ? debtorArr[0] : debtorArr;
        const recipientEmail = debtor?.invoice_email;

        if (!recipientEmail) {
          results.errors++;
          results.details.push(`ERROR: ${invoice.invoice_number} - no invoice email for debtor ${debtor?.billing_name || invoice.debtor_id}`);
          continue;
        }

        const overdueAmount = invoice.total_amount_cents - (invoice.paid_amount_cents || 0);
        const subject = `${stage.label}: Rechnung ${invoice.invoice_number} ist überfällig`;
        
        const text = buildReminderEmailText({
          invoiceNumber: invoice.invoice_number,
          dueDate: format(dueDate, "dd. MMMM yyyy", { locale: de }),
          daysOverdue,
          overdueAmountCents: overdueAmount,
          reminderLabel: stage.label,
          feeCents: stage.fee_cents,
          debtorName: debtor?.billing_name || "Kunde",
        });

        const emailResult = await sendRawReminderEmail(recipientEmail, subject, text);

        if (emailResult.success) {
          await supabaseAdmin
            .from("invoices")
            .update({
              reminder_count: currentReminderCount + 1,
              last_reminder_at: today.toISOString(),
              updated_at: today.toISOString(),
            })
            .eq("id", invoice.id);

          results.reminders_sent++;
          results.details.push(`SENT: ${invoice.invoice_number} → ${recipientEmail} (${stage.label}, ${overdueAmount / 100}€ open)`);
        } else {
          results.errors++;
          results.details.push(`EMAIL ERROR: ${invoice.invoice_number} - ${emailResult.message}`);
        }

        results.processed++;
      } catch (err: any) {
        results.errors++;
        results.details.push(`ERROR: ${invoice.invoice_number} - ${err.message}`);
      }
    }
  } catch (error: any) {
    console.error("[DAILY TASKS - DUNNING] Fatal error:", error);
    results.errors++;
  }

  return results;
}

// ==================== MARK OVERDUE SHIFTS LOGIC ====================
async function runMarkOverdueShifts(supabaseAdmin: any, now: Date, today: Date) {
  const results = {
    updated_count: 0,
    time_entries_created: 0,
  };

  try {
    const nowDateStr = today.toISOString().split("T")[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    const { data: shiftsToUpdate, error: fetchError } = await supabaseAdmin
      .from("shifts")
      .select("id, shift_date, start_time, end_time, status")
      .in("status", ["scheduled", "in_progress"]);

    if (fetchError) {
      console.error("[DAILY TASKS - OVERDUE SHIFTS] Error fetching shifts:", fetchError);
      return results;
    }

    const completedShiftIds: string[] = [];

    for (const shift of shiftsToUpdate || []) {
      let shouldBeCompleted = false;

      if (shift.shift_date < nowDateStr) {
        shouldBeCompleted = true;
      } else if (shift.shift_date === nowDateStr && shift.end_time) {
        const [endHour, endMin] = shift.end_time.split(":").map(Number);
        const endTimeMinutes = endHour * 60 + endMin;

        if (currentTimeMinutes >= endTimeMinutes) {
          shouldBeCompleted = true;
        }
      }

      if (shouldBeCompleted && shift.status !== "completed") {
        const { error: updateError } = await supabaseAdmin
          .from("shifts")
          .update({
            status: "completed",
            completed_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("id", shift.id);

        if (!updateError) {
          results.updated_count++;
          completedShiftIds.push(shift.id);
        }
      }
    }

    // Generate time entries for completed shifts
    for (const shiftId of completedShiftIds) {
      const shiftResult = await generateTimeEntryForShift(supabaseAdmin, shiftId);
      if (shiftResult.created > 0) {
        results.time_entries_created += shiftResult.created;
      }
    }
  } catch (error: any) {
    console.error("[DAILY TASKS - OVERDUE SHIFTS] Fatal error:", error);
  }

  return results;
}

// ==================== RECURRING INVOICES LOGIC ====================
async function runRecurringInvoices(supabaseAdmin: any, today: Date, todayStr: string) {
  const results = {
    processed: 0,
    invoices_created: 0,
    skipped_already_billed: 0,
    skipped_no_customer: 0,
    errors: 0,
    details: [] as string[],
  };

  try {
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

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
      console.error("[DAILY TASKS - RECURRING INVOICES] Error fetching orders:", ordersError);
      results.errors++;
      return results;
    }

    for (const order of permanentOrders || []) {
      try {
        const orderAny = order as any;
        const customerRef = orderAny.objects?.customers;
        const customer = Array.isArray(customerRef) ? customerRef[0] : customerRef;

        if (!customer?.id) {
          results.skipped_no_customer++;
          results.details.push(`SKIP: ${order.title} - no customer`);
          continue;
        }

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
          results.details.push(`ERROR: ${order.title} - ${(invoiceResult as { success: false; message: string }).message}`);
        }

        results.processed++;
      } catch (err: any) {
        results.errors++;
        results.details.push(`ERROR: ${order.title} - ${err.message}`);
      }
    }
  } catch (error: any) {
    console.error("[DAILY TASKS - RECURRING INVOICES] Fatal error:", error);
    results.errors++;
  }

  return results;
}

// ==================== SHARED HELPERS ====================
function buildReminderEmailText(params: {
  invoiceNumber: string;
  dueDate: string;
  daysOverdue: number;
  overdueAmountCents: number;
  reminderLabel: string;
  feeCents: number;
  debtorName: string;
}): string {
  const { invoiceNumber, dueDate, daysOverdue, overdueAmountCents, reminderLabel, feeCents, debtorName } = params;
  
  const overdueAmount = (overdueAmountCents / 100).toFixed(2).replace(".", ",");
  const feeAmount = feeCents > 0 ? `zzgl. Mahngebühr von ${(feeCents / 100).toFixed(2).replace(".", ",")}€` : "ohne Mahngebühr";

  return `
Sehr geehrte/r ${debtorName},

wir möchten Sie höflich daran erinnern, dass die Rechnung ${invoiceNumber} seit ${daysOverdue} Tag(en) überfällig ist.

Rechnungsdetails:
- Rechnungsnummer: ${invoiceNumber}
- Fälligkeitsdatum: ${dueDate}
- Überfällig seit: ${daysOverdue} Tag(en)
- Offener Betrag: ${overdueAmount}€ ${feeAmount}

Bitte begleichen Sie den offenen Betrag innerhalb von 7 Tagen, um weitere Mahngebühren zu vermeiden.

Hinweis: Diese ist eine automatische ${reminderLabel.toLowerCase()}.

Bei Fragen oder Unstimmigkeiten kontaktieren Sie uns bitte umgehend.

Mit freundlichen Grüßen

Ihr ReinPlaner Team
ARIS Gebäudereinigung
`.trim();
}

async function sendRawReminderEmail(
  toEmail: string,
  subject: string,
  text: string
): Promise<{ success: boolean; message?: string; messageId?: string }> {
  try {
    const { Resend } = await import("resend");
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "ReinPlaner <noreply@reinplaner.de>";

    if (!RESEND_API_KEY) {
      return { success: false, message: "RESEND_API_KEY not configured" };
    }

    const resend = new Resend(RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject,
      text,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

async function generateTimeEntryForShift(supabaseAdmin: any, shiftId: string): Promise<{ created: number }> {
  try {
    const { data: shift, error: shiftError } = await supabaseAdmin
      .from("shifts")
      .select(`
        id,
        shift_date,
        start_time,
        end_time,
        estimated_hours,
        order_id,
        notes,
        shift_employees (
          employee_id,
          actual_hours,
          employees!inner (id, user_id)
        ),
        orders!inner (id, customer_id, object_id)
      `)
      .eq("id", shiftId)
      .single();

    if (shiftError || !shift) {
      return { created: 0 };
    }

    const { data: existingEntries } = await supabaseAdmin
      .from("time_entries")
      .select("employee_id")
      .eq("shift_id", shiftId);

    const existingEmployees = new Set((existingEntries || []).map((e: any) => e.employee_id));
    const timeEntriesToCreate: any[] = [];

    for (const se of shift.shift_employees || []) {
      const employee = Array.isArray(se.employees) ? se.employees[0] : se.employees;
      if (!employee || existingEmployees.has(employee.id)) continue;

      let durationMinutes = null;
      if (se.actual_hours) {
        durationMinutes = Number(se.actual_hours) * 60;
      } else if (shift.estimated_hours) {
        durationMinutes = Number(shift.estimated_hours) * 60;
      }

      const getBerlinOffset = (dateString: string): string => {
        const date = new Date(dateString + 'T12:00:00Z');
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth();
        const day = date.getUTCDate();

        const marchLastDay = new Date(Date.UTC(year, 2, 31));
        const marchLastSunday = 31 - ((marchLastDay.getUTCDay() + 1) % 7);

        const octLastDay = new Date(Date.UTC(year, 9, 31));
        const octLastSunday = 31 - ((octLastDay.getUTCDay() + 1) % 7);

        const isDST = (
          (month === 2 && day >= marchLastSunday) ||
          (month > 2 && month < 9) ||
          (month === 9 && day <= octLastSunday)
        );

        return isDST ? "+02:00" : "+01:00";
      };

      const offset = getBerlinOffset(shift.shift_date);
      const startTime = `${shift.shift_date}T${shift.start_time}:00${offset}`;
      let endTime = `${shift.shift_date}T${shift.end_time}:00${offset}`;

      if (shift.start_time && shift.end_time) {
        const [startH] = shift.start_time.split(":").map(Number);
        const [endH] = shift.end_time.split(":").map(Number);
        if (endH < startH) {
          const nextDay = new Date(shift.shift_date);
          nextDay.setDate(nextDay.getDate() + 1);
          const nextDayStr = nextDay.toISOString().split("T")[0];
          const nextDayOffset = getBerlinOffset(nextDayStr);
          endTime = `${nextDayStr}T${shift.end_time}:00${nextDayOffset}`;
        }
      }

      const order = Array.isArray(shift.orders) ? shift.orders[0] : shift.orders;

      timeEntriesToCreate.push({
        user_id: employee.user_id,
        employee_id: employee.id,
        customer_id: order?.customer_id || null,
        object_id: order?.object_id || null,
        order_id: order?.id || null,
        shift_id: shift.id,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: durationMinutes,
        break_minutes: 0,
        type: "shift",
        notes: shift.notes || null,
        created_at: new Date().toISOString(),
      });
    }

    if (timeEntriesToCreate.length === 0) {
      return { created: 0 };
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("time_entries")
      .insert(timeEntriesToCreate)
      .select("id");

    if (insertError) {
      console.error("[DAILY TASKS] Error inserting time entries:", insertError);
      return { created: 0 };
    }

    return { created: inserted?.length || 0 };
  } catch (error) {
    console.error("[DAILY TASKS] Error generating time entry:", error);
    return { created: 0 };
  }
}
