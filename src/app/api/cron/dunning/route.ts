"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { sendReminderEmail } from "@/lib/invoicing/email-service";
import { format, parseISO, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";

// API Key for cron job authentication
// Set in .env.local as CRON_API_KEY
const CRON_API_KEY = process.env.CRON_API_KEY || "";

// Dunning configuration
const DUNNING_STAGES = [
  { daysOverdue: 7,  label: "1. Mahnung", fee_cents: 0 },
  { daysOverdue: 14, label: "2. Mahnung", fee_cents: 1500 },   // €15 fee
  { daysOverdue: 21, label: "3. Mahnung (Letzte)", fee_cents: 3500 }, // €35 fee
];

export async function POST(request: Request) {
  try {
    // Verify API key
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    if (token !== CRON_API_KEY) {
      return Response.json({ error: "Invalid API key" }, { status: 403 });
    }

    const supabaseAdmin = createAdminClient();
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    console.log("[DUNNING CRON] Starting dunning run at", today.toISOString());

    // First: mark sent invoices as overdue if past due date
    const { data: sentInvoices } = await supabaseAdmin
      .from("invoices")
      .select("id")
      .eq("status", "sent")
      .lt("due_date", todayStr)
      .or(`paid_amount_cents.lt.total_amount_cents,paid_amount_cents.is.null`);

    let markedOverdue = 0;
    for (const inv of sentInvoices || []) {
      await supabaseAdmin
        .from("invoices")
        .update({ status: "overdue", updated_at: today.toISOString() })
        .eq("id", inv.id);
      markedOverdue++;
    }

    if (markedOverdue > 0) {
      console.log(`[DUNNING CRON] Marked ${markedOverdue} invoices as overdue`);
    }

    // Find overdue invoices: status=overdue AND not fully paid
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
      console.error("[DUNNING CRON] Error fetching overdue invoices:", fetchError);
      return Response.json({ error: fetchError.message }, { status: 500 });
    }

    const results = {
      processed: 0,
      reminders_sent: 0,
      errors: 0,
      skipped: 0,
      marked_overdue: markedOverdue,
      details: [] as string[],
    };

    for (const invoice of overdueInvoices || []) {
      try {
        const dueDate = parseISO(invoice.due_date);
        const daysOverdue = differenceInDays(today, dueDate);
        const currentReminderCount = invoice.reminder_count || 0;

        // Find the appropriate dunning stage
        let stage = DUNNING_STAGES[currentReminderCount];
        
        // Skip if no more stages available
        if (!stage) {
          results.skipped++;
          results.details.push(`SKIP: ${invoice.invoice_number} - already at max reminders (${currentReminderCount})`);
          continue;
        }

        // Check if this stage's overdue threshold is met
        if (daysOverdue < stage.daysOverdue) {
          results.skipped++;
          results.details.push(`SKIP: ${invoice.invoice_number} - only ${daysOverdue} days overdue (need ${stage.daysOverdue} for ${stage.label})`);
          continue;
        }

        // Check if we already sent this stage's reminder today
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

        // Build reminder email content
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

        // Send reminder email
        const emailResult = await sendRawReminderEmail(recipientEmail, subject, text);

        if (emailResult.success) {
          // Update invoice with new reminder count and timestamp
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

    console.log("[DUNNING CRON] Complete:", results);

    return Response.json({
      success: true,
      ...results,
      run_at: today.toISOString(),
    });
  } catch (error: any) {
    console.error("[DUNNING CRON] Fatal error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

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

// Direct email sending without PDF attachment (for reminders)
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
