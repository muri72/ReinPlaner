// ============================================
// Invoice Email Service
// Sends invoice emails via Resend with PDF attachment
// ============================================

import { Resend } from 'resend';
import { Invoice } from './types';
import { formatCurrency } from './invoice-service';
import { format, parseISO } from 'date-fns';

interface SendInvoiceEmailParams {
  invoice: Invoice;
  recipientEmail: string;
  pdfBuffer: Buffer;
  subject?: string;
  message?: string;
}

interface EmailResult {
  success: boolean;
  message?: string;
  messageId?: string;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ReinPlaner <noreply@reinplaner.de>';

function getEmailClient(): Resend | null {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured');
    return null;
  }
  return new Resend(RESEND_API_KEY);
}

export async function sendInvoiceEmail({
  invoice,
  recipientEmail,
  pdfBuffer,
  subject,
  message,
}: SendInvoiceEmailParams): Promise<EmailResult> {
  const resend = getEmailClient();

  if (!resend) {
    return { success: false, message: 'E-Mail-Service nicht konfiguriert (RESEND_API_KEY fehlt).' };
  }

  const invoiceDate = invoice.issue_date
    ? format(parseISO(invoice.issue_date), 'dd. MMMM yyyy', { locale: require('date-fns/locale/de') })
    : new Date().toLocaleDateString('de-DE');

  const dueDate = invoice.due_date
    ? format(parseISO(invoice.due_date), 'dd. MMMM yyyy', { locale: require('date-fns/locale/de') })
    : '—';

  const defaultSubject = `Rechnung ${invoice.invoice_number} vom ${invoiceDate}`;

  const defaultMessage = `
Sehr geehrte Damen und Herren,

anbei erhalten Sie die Rechnung ${invoice.invoice_number} über ${formatCurrency(invoice.total_amount_cents, invoice.currency)}.

Rechnungsdetails:
- Rechnungsnummer: ${invoice.invoice_number}
- Rechnungsdatum: ${invoiceDate}
- Fälligkeitsdatum: ${dueDate}
- Gesamtbetrag: ${formatCurrency(invoice.total_amount_cents, invoice.currency)}

Bitte überweisen Sie den Betrag innerhalb der genannten Frist auf unser Konto.

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
Ihr ReinPlaner Team
`.trim();

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: subject || defaultSubject,
      text: message || defaultMessage,
      attachments: [
        {
          filename: `Rechnung_${invoice.invoice_number.replace(/\//g, '-')}.pdf`,
          content: pdfBuffer.toString('base64'),
        },
      ],
    });

    if (error) {
      console.error('Resend email error:', error);
      return { success: false, message: error.message || 'E-Mail-Versand fehlgeschlagen.' };
    }

    return {
      success: true,
      message: `Rechnung erfolgreich an ${recipientEmail} gesendet.`,
      messageId: data?.id,
    };
  } catch (error: any) {
    console.error('Error sending invoice email:', error);
    return { success: false, message: error.message || 'E-Mail-Versand fehlgeschlagen.' };
  }
}

export async function sendReminderEmail(
  invoice: Invoice,
  recipientEmail: string
): Promise<EmailResult> {
  const resend = getEmailClient();

  if (!resend) {
    return { success: false, message: 'E-Mail-Service nicht konfiguriert.' };
  }

  const overdueDays = invoice.due_date
    ? Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const subject = `Erinnerung: Rechnung ${invoice.invoice_number} ist überfällig`;

  const text = `
Sehr geehrte Damen und Herren,

wir möchten Sie freundlich daran erinnern, dass die Rechnung ${invoice.invoice_number} seit ${overdueDays} Tag(en) überfällig ist.

Rechnungsdetails:
- Rechnungsnummer: ${invoice.invoice_number}
- Fälligkeitsdatum: ${invoice.due_date ? format(parseISO(invoice.due_date), 'dd. MMMM yyyy', { locale: require('date-fns/locale/de') }) : '—'}
- Offener Betrag: ${formatCurrency(invoice.total_amount_cents - invoice.paid_amount_cents, invoice.currency)}

Bitte begleichen Sie den offenen Betrag schnellstmöglich.

Bei Fragen oder Unstimmigkeiten kontaktieren Sie uns bitte.

Mit freundlichen Grüßen
Ihr ReinPlaner Team
`.trim();

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject,
      text,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Erinnerung gesendet.', messageId: data?.id };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
