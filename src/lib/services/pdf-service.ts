"use client";

import jsPDF from 'jspdf';
import 'jspdf-autotable';

export interface CompanyBrandingData {
  company_name: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  logo_url?: string;
  footer_text?: string;
}

export interface BankDetails {
  account_holder?: string;
  iban?: string;
  bic?: string;
  bank_name?: string;
}

export interface PDFGenerationOptions {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface PDFGenerationResult {
  success: boolean;
  pdf?: jsPDF;
  error?: string;
  fileName?: string;
}

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

class PDFService {
  private defaultOptions: PDFGenerationOptions = {
    format: 'a4',
    orientation: 'portrait',
    margins: {
      top: 25,
      right: 20,
      bottom: 25,
      left: 20,
    },
  };

  /**
   * Convert HTML content to plain text for PDF
   * Strips HTML tags and converts to simple text
   */
  private htmlToText(html: string): string {
    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, '');

    // Decode common HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Convert line breaks
    text = text.replace(/\n\s*\n/g, '\n\n');

    // Convert multiple spaces to single space
    text = text.replace(/[ \t]+/g, ' ');

    // Trim each line
    text = text.split('\n').map(line => line.trim()).join('\n');

    return text.trim();
  }

  /**
   * Calculate text height for wrapping
   */
  private calculateTextHeight(
    text: string,
    fontSize: number,
    maxWidth: number,
    lineHeight: number = 1.4
  ): number {
    const doc = new jsPDF();
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    return lines.length * fontSize * lineHeight;
  }

  /**
   * Add corporate header to PDF
   */
  private addHeader(
    doc: jsPDF,
    branding: CompanyBrandingData,
    pageWidth: number,
    margin: number
  ): number {
    let yPosition = margin;

    // Company Logo (placeholder - would need image loading)
    if (branding.logo_url) {
      try {
        // In a real implementation, you would load the logo image
        // For now, we'll draw a placeholder box
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPosition, 40, 15, 'F');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('LOGO', margin + 10, yPosition + 10);
        yPosition += 20;
      } catch (error) {
        console.error('Error loading logo:', error);
        yPosition += 20;
      }
    } else {
      yPosition += 15;
    }

    // Company name
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(branding.company_name, pageWidth - margin, yPosition - 15, { align: 'right' });

    // Company details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);

    let detailsY = yPosition - 10;
    if (branding.company_address) {
      doc.text(branding.company_address, pageWidth - margin, detailsY, { align: 'right' });
      detailsY += 5;
    }
    if (branding.company_phone) {
      doc.text(`Tel: ${branding.company_phone}`, pageWidth - margin, detailsY, { align: 'right' });
      detailsY += 5;
    }
    if (branding.company_email) {
      doc.text(branding.company_email, pageWidth - margin, detailsY, { align: 'right' });
      detailsY += 5;
    }

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);

    return yPosition + 5;
  }

  /**
   * Add corporate footer to PDF
   */
  private addFooter(
    doc: jsPDF,
    branding: CompanyBrandingData,
    bankDetails: BankDetails | undefined,
    pageWidth: number,
    pageHeight: number,
    margin: number,
    pageNumber: number,
    totalPages: number
  ): void {
    const footerY = pageHeight - margin - 20;

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    // Footer text
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);

    // Bank details on the left
    let bankY = footerY;
    if (bankDetails?.bank_name && bankDetails?.iban) {
      const bankText = `Bank: ${bankDetails.bank_name}`;
      const ibanText = `IBAN: ${bankDetails.iban}`;
      doc.text(bankText, margin, bankY);
      if (bankDetails.bic) {
        doc.text(`BIC: ${bankDetails.bic}`, margin, bankY + 4);
        bankY += 8;
      } else {
        bankY += 4;
      }
      doc.text(ibanText, margin, bankY);
    }

    // Custom footer text on the right
    if (branding.footer_text) {
      const footerLines = doc.splitTextToSize(branding.footer_text, 100);
      let textY = footerY;
      footerLines.forEach((line: string) => {
        doc.text(line, pageWidth - margin, textY, { align: 'right' });
        textY += 4;
      });
    }

    // Page number in center
    doc.text(
      `Seite ${pageNumber} von ${totalPages}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  /**
   * Generate PDF from rendered HTML content
   */
  async generatePDF(
    htmlContent: string,
    branding: CompanyBrandingData,
    bankDetails?: BankDetails,
    options: PDFGenerationOptions = {}
  ): Promise<PDFGenerationResult> {
    try {
      // Merge options with defaults
      const opts = { ...this.defaultOptions, ...options };

      // Create PDF document
      const doc = new jsPDF({
        orientation: opts.orientation,
        unit: 'mm',
        format: opts.format,
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const { top, right, bottom, left } = opts.margins!;

      // Calculate content width (accounting for margins)
      const contentWidth = pageWidth - left - right;

      // Add header and get starting Y position
      let currentY = this.addHeader(doc, branding, pageWidth, top);

      // Convert HTML to plain text
      const textContent = this.htmlToText(htmlContent);

      // Set font for content
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      // Split text into lines
      const lines = doc.splitTextToSize(textContent, contentWidth);

      // Track lines per page for footer pagination
      let pageNumber = 1;
      const totalPagesEstimate = Math.ceil(
        lines.length / ((pageHeight - top - bottom - 30) / 6)
      );

      // Add content line by line, managing page breaks
      for (let i = 0; i < lines.length; i++) {
        // Check if we need a new page
        if (currentY > pageHeight - bottom - 40) {
          doc.addPage();
          pageNumber++;
          currentY = top;
          // Re-add header on new page
          currentY = this.addHeader(doc, branding, pageWidth, top);
        }

        // Add the line
        doc.text(lines[i], left, currentY);
        currentY += 6; // Line height

        // Add extra space for section breaks
        if (lines[i].trim() === '') {
          currentY += 3;
        }
      }

      // Add footer to all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        this.addFooter(doc, branding, bankDetails, pageWidth, pageHeight, left, i, totalPages);
      }

      // Set document properties
      if (opts.title) {
        doc.setProperties({
          title: opts.title,
          author: opts.author || branding.company_name,
          subject: opts.subject,
          keywords: opts.keywords,
          creator: 'ReinPlaner Management System',
        });
      }

      return {
        success: true,
        pdf: doc,
        fileName: `${opts.title || 'document'}.pdf`,
      };
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate PDF',
      };
    }
  }

  /**
   * Generate PDF and save to blob
   */
  async generatePDFAsBlob(
    htmlContent: string,
    branding: CompanyBrandingData,
    bankDetails?: BankDetails,
    options: PDFGenerationOptions = {}
  ): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    const result = await this.generatePDF(htmlContent, branding, bankDetails, options);

    if (!result.success || !result.pdf) {
      return {
        success: false,
        error: result.error || 'PDF generation failed',
      };
    }

    try {
      const pdfBlob = result.pdf.output('blob');
      return {
        success: true,
        blob: pdfBlob,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create blob',
      };
    }
  }

  /**
   * Generate PDF and trigger download
   */
  async generateAndDownloadPDF(
    htmlContent: string,
    branding: CompanyBrandingData,
    bankDetails?: BankDetails,
    options: PDFGenerationOptions = {}
  ): Promise<PDFGenerationResult> {
    const result = await this.generatePDF(htmlContent, branding, bankDetails, options);

    if (result.success && result.pdf) {
      try {
        result.pdf.save(result.fileName || 'document.pdf');
        return result;
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to download PDF',
        };
      }
    }

    return result;
  }

  /**
   * Generate PDF from table data
   */
  generateTablePDF(
    headers: string[],
    data: any[][],
    branding: CompanyBrandingData,
    bankDetails?: BankDetails,
    options: PDFGenerationOptions = {}
  ): PDFGenerationResult {
    try {
      const opts = { ...this.defaultOptions, ...options };
      const doc = new jsPDF({
        orientation: opts.orientation,
        unit: 'mm',
        format: opts.format,
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const { top, right, bottom, left } = opts.margins!;

      // Add header
      let currentY = this.addHeader(doc, branding, pageWidth, top);

      // Add table
      doc.autoTable({
        head: [headers],
        body: data,
        startY: currentY,
        margin: { left, right },
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      });

      // Add footer
      const pageHeight = doc.internal.pageSize.getHeight();
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        this.addFooter(doc, branding, bankDetails, pageWidth, pageHeight, left, i, totalPages);
      }

      return {
        success: true,
        pdf: doc,
        fileName: `${opts.title || 'table'}.pdf`,
      };
    } catch (error: any) {
      console.error('Error generating table PDF:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate table PDF',
      };
    }
  }

  /**
   * Preview PDF without downloading
   */
  async previewPDF(
    htmlContent: string,
    branding: CompanyBrandingData,
    bankDetails?: BankDetails,
    options: PDFGenerationOptions = {}
  ): Promise<string> {
    const result = await this.generatePDF(htmlContent, branding, bankDetails, options);

    if (result.success && result.pdf) {
      return result.pdf.output('datauristring');
    }

    throw new Error(result.error || 'Failed to generate PDF preview');
  }
}

export const pdfService = new PDFService();
