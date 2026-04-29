// ============================================
// Invoice PDF Generator
// Uses jsPDF to create professional German invoices
// ============================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice } from './types';
import { formatCurrency } from './invoice-service';
import { escapeHtml } from '@/lib/security';
import { format, parseISO } from 'date-fns';

interface PDFResult {
  success: boolean;
  data?: Buffer;
  filename?: string;
  message?: string;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'ENTWURF',
    sent: 'VERSENDET',
    paid: 'BEZAHLT',
    partial: 'TEILWEISE BEZAHLT',
    overdue: 'ÜBERFÄLLIG',
    cancelled: 'STORNIERT',
    void: 'UNGÜLTIG',
  };
  return labels[status] || status.toUpperCase();
}

function getStatusColor(status: string): [number, number, number] {
  const colors: Record<string, [number, number, number]> = {
    draft: [128, 128, 128],
    sent: [26, 54, 93],
    paid: [22, 163, 74],
    partial: [245, 158, 11],
    overdue: [220, 38, 38],
    cancelled: [220, 38, 38],
    void: [128, 128, 128],
  };
  return colors[status] || [0, 0, 0];
}

export async function generateInvoicePDF(invoice: Invoice): Promise<PDFResult> {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const rightMargin = 15;

    // Colors
    const primaryColor: [number, number, number] = [26, 54, 93];
    const textColor: [number, number, number] = [0, 0, 0];
    const mutedColor: [number, number, number] = [100, 100, 100];

    let y = margin;

    // ============================================
    // HEADER
    // ============================================

    // Company name (left)
    pdf.setTextColor(...primaryColor);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ReinPlaner', margin, y + 6);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...mutedColor);
    y += 10;
    pdf.text('Gebäudereinigung & Dienstleistungen', margin, y);
    y += 5;
    pdf.text('Deutschland', margin, y);

    // Invoice title (right)
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...primaryColor);
    pdf.text('RECHNUNG', pageWidth - margin, margin + 8, { align: 'right' });

    // Invoice number
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...mutedColor);
    pdf.text(invoice.invoice_number, pageWidth - margin, margin + 16, { align: 'right' });

    y = 45;

    // ============================================
    // STATUS BADGE
    // ============================================
    if (invoice.status !== 'draft') {
      const statusColor = getStatusColor(invoice.status);
      const statusLabel = getStatusLabel(invoice.status);
      const badgeWidth = pdf.getTextWidth(statusLabel) + 8;

      pdf.setFillColor(...statusColor);
      pdf.roundedRect(pageWidth - margin - badgeWidth, y - 5, badgeWidth, 7, 2, 2, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(statusLabel, pageWidth - margin - badgeWidth + 4, y);
      y += 5;
    }

    // ============================================
    // INVOICE INFO BOX (left) & DEBTOR (right)
    // ============================================

    // Invoice dates box
    pdf.setFillColor(245, 247, 250);
    pdf.roundedRect(margin, y, 85, 35, 3, 3, 'F');

    pdf.setFontSize(9);
    pdf.setTextColor(...primaryColor);
    pdf.setFont('helvetica', 'bold');
    y += 6;
    pdf.text('Rechnungsdatum:', margin + 5, y);
    pdf.text('Fälligkeitsdatum:', margin + 5, y + 8);
    pdf.text('Lieferzeitraum:', margin + 5, y + 16);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...textColor);

    const issueDate = invoice.issue_date ? format(parseISO(invoice.issue_date), 'dd.MM.yyyy') : '—';
    const dueDate = invoice.due_date ? format(parseISO(invoice.due_date), 'dd.MM.yyyy') : '—';
    let deliveryPeriod = '—';
    if (invoice.delivery_date_start) {
      deliveryPeriod = format(parseISO(invoice.delivery_date_start), 'dd.MM.yyyy');
      if (invoice.delivery_date_end) {
        deliveryPeriod += ` – ${format(parseISO(invoice.delivery_date_end), 'dd.MM.yyyy')}`;
      }
    }

    y += 6;
    pdf.text(issueDate, margin + 55, y);
    y += 8;
    pdf.text(dueDate, margin + 55, y);
    y += 8;
    pdf.text(deliveryPeriod, margin + 55, y);

    y = 45;

    // Debtor address box (right side)
    const debtorX = pageWidth / 2 + 5;
    const debtorWidth = pageWidth / 2 - margin;

    pdf.setFillColor(245, 247, 250);
    pdf.roundedRect(debtorX, y, debtorWidth, 35, 3, 3, 'F');

    pdf.setFontSize(9);
    pdf.setTextColor(...primaryColor);
    pdf.setFont('helvetica', 'bold');
    y += 6;
    pdf.text('Rechnungsempfänger:', debtorX + 5, y);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...textColor);
    y += 6;

    const debtor = invoice.debtor;
    const lines = [
      escapeHtml(debtor?.billing_name) || '—',
      escapeHtml(debtor?.billing_street) || '',
      debtor?.billing_postal_code && debtor?.billing_city
        ? `${escapeHtml(debtor.billing_postal_code)} ${escapeHtml(debtor.billing_city)}`
        : debtor?.billing_postal_code || debtor?.billing_city || '',
      escapeHtml(debtor?.billing_country) || '',
    ].filter(l => l.trim());

    lines.forEach(line => {
      pdf.text(line, debtorX + 5, y);
      y += 5;
    });

    y = 85;

    // ============================================
    // REFERENCE / ORDER REFERENCE
    // ============================================
    if (invoice.reference_text || invoice.order_reference) {
      pdf.setFontSize(9);
      pdf.setTextColor(...mutedColor);
      if (invoice.order_reference) {
        pdf.text(`Ihre Referenz: ${invoice.order_reference}`, margin, y);
        y += 5;
      }
      if (invoice.reference_text) {
        pdf.text(`Unsere Referenz: ${invoice.reference_text}`, margin, y);
        y += 5;
      }
      y += 3;
    }

    // ============================================
    // ITEMS TABLE
    // ============================================
    const items = invoice.items || [];

    const tableHeaders = [
      'Nr.',
      'Leistungsbeschreibung',
      'Datum',
      'Menge',
      'Einheit',
      'Einzelpreis',
      'Netto',
    ];

    const tableData = items.map((item, idx) => [
      String(item.line_number || idx + 1),
      item.service_description || '—',
      item.service_date ? format(parseISO(item.service_date), 'dd.MM.yyyy') : '—',
      String(item.quantity),
      item.unit || '',
      formatCurrency(item.unit_price_cents, invoice.currency),
      formatCurrency(item.net_amount_cents, invoice.currency),
    ]);

    autoTable(pdf, {
      head: [tableHeaders],
      body: tableData,
      startY: y,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        valign: 'middle',
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        textColor: textColor,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 65 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 15, halign: 'right' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 25, halign: 'right' },
      },
    });

    y = (pdf as any).lastAutoTable.finalY + 10;

    // ============================================
    // TOTALS
    // ============================================
    const totalsX = pageWidth - margin - 85;

    pdf.setFillColor(245, 247, 250);
    pdf.roundedRect(totalsX, y - 3, 85, 38, 3, 3, 'F');

    pdf.setFontSize(9);
    pdf.setTextColor(...mutedColor);

    const labelX = totalsX + 5;
    const valueX = totalsX + 80;

    // Netto
    pdf.setFont('helvetica', 'normal');
    pdf.text('Netto:', labelX, y + 5);
    pdf.setTextColor(...textColor);
    pdf.text(formatCurrency(invoice.net_amount_cents, invoice.currency), valueX, y + 5, { align: 'right' });

    // MwSt
    y += 10;
    pdf.setTextColor(...mutedColor);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`MwSt. (${invoice.tax_rate}%):`, labelX, y);
    pdf.setTextColor(...textColor);
    pdf.text(formatCurrency(invoice.tax_amount_cents, invoice.currency), valueX, y, { align: 'right' });

    // Separator
    y += 7;
    pdf.setDrawColor(...primaryColor);
    pdf.setLineWidth(0.3);
    pdf.line(labelX, y, totalsX + 80, y);

    // Gesamt
    y += 7;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...primaryColor);
    pdf.text('Gesamtbetrag:', labelX, y);
    pdf.text(formatCurrency(invoice.total_amount_cents, invoice.currency), valueX, y, { align: 'right' });

    // Paid / outstanding
    if (invoice.status === 'partial') {
      y += 7;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(245, 158, 11);
      const open = invoice.total_amount_cents - invoice.paid_amount_cents;
      pdf.text(`Noch offen:`, labelX, y);
      pdf.text(formatCurrency(open, invoice.currency), valueX, y, { align: 'right' });
    }

    y += 15;

    // ============================================
    // PAYMENT TERMS
    // ============================================
    if (y < pageHeight - 60) {
      pdf.setFontSize(9);
      pdf.setTextColor(...primaryColor);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Zahlungsbedingungen', margin, y);
      y += 6;

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...textColor);
      pdf.setFontSize(9);

      if (debtor?.payment_terms_days) {
        pdf.text(`Zahlbar innerhalb von ${Number(debtor.payment_terms_days)} Tagen.`, margin, y);
      } else {
        pdf.text('Zahlbar innerhalb von 30 Tagen.', margin, y);
      }
      y += 5;
      pdf.text(`Bankverbindung: IBAN: ${escapeHtml(debtor?.bank_iban) || 'DE89 3704 0044 0532 0130 00'}, BIC: ${escapeHtml(debtor?.bank_bic) || 'COBADEFFXXX'}`, margin, y);
      y += 5;
      pdf.text(`Bei Überweisung bitte Rechnungsnummer ${invoice.invoice_number} angeben.`, margin, y);
    }

    // ============================================
    // NOTES
    // ============================================
    if (invoice.notes && y < pageHeight - 60) {
      y += 8;
      pdf.setFontSize(9);
      pdf.setTextColor(...primaryColor);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Anmerkungen', margin, y);
      y += 5;

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...textColor);
      pdf.setFontSize(9);

      const noteLines = pdf.splitTextToSize(escapeHtml(invoice.notes), pageWidth - margin * 2);
      pdf.text(noteLines, margin, y);
      y += noteLines.length * 4;
    }

    // ============================================
    // FOOTER
    // ============================================
    const footerY = pageHeight - 20;

    pdf.setDrawColor(230, 230, 230);
    pdf.setLineWidth(0.3);
    pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    pdf.setFontSize(8);
    pdf.setTextColor(...mutedColor);
    pdf.setFont('helvetica', 'normal');

    const footerLine1 = 'ReinPlaner | Gebäudereinigung & Dienstleistungen';
    const footerLine2 = 'ReinPlaner GmbH | Musterstraße 1, 20095 Hamburg | info@reinplaner.de';

    pdf.text(footerLine1, margin, footerY);
    pdf.text(footerLine2, margin, footerY + 4);

    // Page number
    const pageCount = (pdf as any).internal.getNumberOfPages();
    pdf.text(`Seite 1 von ${pageCount}`, pageWidth - margin, footerY, { align: 'right' });

    // ============================================
    // GENERATE OUTPUT
    // ============================================
    const output = pdf.output('arraybuffer');

    return {
      success: true,
      data: Buffer.from(output),
      filename: `Rechnung_${invoice.invoice_number.replace(/\//g, '-')}.pdf`,
    };
  } catch (error: any) {
    console.error('Error generating invoice PDF:', error);
    return { success: false, message: error.message };
  }
}
