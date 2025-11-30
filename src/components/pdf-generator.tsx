import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WorkTimeReportData, EmployeeWorkTimeReportData } from '@/app/dashboard/reports/actions';
import { formatDuration, formatDateWithWeekday } from '@/lib/utils';
import { settingsService } from '@/lib/services/settings-service';

interface PdfGeneratorProps {
  data: WorkTimeReportData | EmployeeWorkTimeReportData;
  reportType: 'object' | 'employee';
  title: string;
  objectName?: string;
  employeeName?: string;
  month: string;
  year: string;
  objects?: { id: string; name: string; customer_id: string | null }[];
  objectId?: string;
  bundeslandCode?: string; // Add bundesland for holiday detection
}

export async function generateProfessionalPDF({
  data,
  reportType,
  title,
  objectName,
  employeeName,
  month,
  year,
  objects,
  objectId,
  bundeslandCode = 'HH', // Default to Hamburg
}: PdfGeneratorProps): Promise<void> {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    // Constants
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8; // Minimal margin for maximum table width
    const logoWidth = 55; // Larger logo for professional appearance
    const logoHeight = 37;

    // Helper function to check if we need a new page
    const checkPageBreak = (currentY: number, requiredHeight: number) => {
      if (currentY + requiredHeight > pageHeight - margin) {
        pdf.addPage();
        return margin;
      }
      return currentY;
    };

    let yPosition = margin;

    // Header with logo (WHITE background for better logo visibility)
    pdf.setFillColor(255, 255, 255); // White background
    pdf.rect(0, 0, pageWidth, 35, 'F');

    // Company name (dark blue text)
    pdf.setTextColor(26, 54, 93);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ARIS', margin, 15);

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Arbeitszeitnachweise', margin, 23);

    pdf.setFontSize(9);
    pdf.text(new Date().toLocaleDateString('de-DE'), margin, 29);

    // Add ultra-high-quality logo via API route (works locally and deployed)
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Fetch logo via API route (works on both local and deployed environments)
      const logoUrl = `/api/logo?file=logo.png`;
      const response = await fetch(logoUrl);
      const logoData = await response.json();

      if (!logoData.success || !logoData.dataUrl) {
        throw new Error('Failed to fetch logo from API');
      }

      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = () => {
          // ULTRA high resolution for crisp logo (10x instead of 4x)
          canvas.width = logoWidth * 10;
          canvas.height = logoHeight * 10;
          // Enable image smoothing for better quality
          ctx!.imageSmoothingEnabled = true;
          ctx!.imageSmoothingQuality = 'high';
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const logoBase64 = canvas.toDataURL('image/png');
          try {
            pdf.addImage(logoBase64, 'PNG', pageWidth - margin - logoWidth, 5, logoWidth, logoHeight, undefined, 'FAST');
            resolve(true);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = reject;
        img.src = logoData.dataUrl;
      });
    } catch (e) {
      // Fallback to placeholder if logo fails
      console.warn('Logo could not be loaded from API, using placeholder');
      pdf.setDrawColor(26, 54, 93);
      pdf.setLineWidth(2);
      pdf.rect(pageWidth - margin - logoWidth, 5, logoWidth, logoHeight);
      pdf.setTextColor(26, 54, 93);
      pdf.setFontSize(8);
      pdf.text('ARIS', pageWidth - margin - logoWidth + 5, 5 + logoHeight / 2);
    }

    yPosition = 45;

    // Title and info section
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(74, 85, 104);

    const monthLabel = new Date(0, parseInt(month) - 1).toLocaleString('de-DE', { month: 'long' });
    const createdDate = new Date().toLocaleDateString('de-DE');

    const infoLines = [
      { label: 'Monat:', value: `${month} ${year}` },
      { label: 'Erstellt am:', value: createdDate },
    ];

    if (objectName) {
      infoLines.push({ label: 'Objekt:', value: objectName });
    }
    if (employeeName) {
      infoLines.push({ label: 'Mitarbeiter:', value: employeeName });
    }

    infoLines.forEach((line, index) => {
      pdf.text(`${line.label} ${line.value}`, margin, yPosition + (index * 5));
    });
    yPosition += infoLines.length * 5 + 5;

    // Table data preparation
    const tableHeaders = reportType === 'object'
      ? ['Datum', 'Mitarbeiter', 'Start', 'Ende', 'Pause', 'Arbeitsstunden']
      : ['Datum', 'Objekt', 'Kunde', 'Start', 'Ende', 'Pause', 'Arbeitsstunden'];

    // Process entries with work type information using BATCH PROCESSING
    let holidayCount = 0;
    let weekendCount = 0;

    // Get unique dates for batch holiday detection
    const uniqueDates = [...new Set(data.entries.map(entry => {
      const [day, month, year] = entry.date.split('.');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }))];

    console.log(`[PDF] Batch processing ${data.entries.length} entries with ${uniqueDates.length} unique dates`);
    console.log(`[PDF] Unique dates:`, uniqueDates);

    // Get holidays using batch processing (single database call)
    const holidayResults = await settingsService.checkMultipleHolidays(uniqueDates, bundeslandCode);

    console.log(`[PDF] Checking ${data.entries.length} entries for holidays (Bundesland: ${bundeslandCode})...`);

    // Build work types map for all entries
    const workTypesMap: { [key: string]: { type: 'normal' | 'holiday' | 'weekend'; label: string; color: string; holidayName?: string } } = {};

    data.entries.forEach(entry => {
      const [day, month, year] = entry.date.split('.');
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const holiday = holidayResults[isoDate];

      // Check if it's a weekend
      const date = new Date(isoDate);
      const dayOfWeek = date.getDay();

      let workType: { type: 'normal' | 'holiday' | 'weekend'; label: string; color: string; holidayName?: string };

      if (holiday) {
        workType = {
          type: 'holiday',
          label: 'Feiertag',
          color: '#dc2626',
          holidayName: holiday.name,
        };
        holidayCount++;
        console.log(`[PDF] ✓ Holiday detected: ${entry.date} (${(entry as any).employeeName || (entry as any).objectName || 'Entry'}) - ${holiday.name}`);
      } else if (dayOfWeek === 0 || dayOfWeek === 6) {
        workType = {
          type: 'weekend',
          label: 'Wochenende',
          color: '#7c3aed',
        };
        weekendCount++;
        console.log(`[PDF] Weekend detected: ${entry.date}`);
      } else {
        workType = {
          type: 'normal',
          label: 'Normal',
          color: '#16a34a',
        };
      }

      workTypesMap[entry.id] = workType;
    });

    const entriesWithWorkType = data.entries.map(entry => ({
      ...entry,
      workType: workTypesMap[entry.id],
    }));

    // Create table rows and track which rows are holidays/weekends
    const tableRows = entriesWithWorkType.map((entry) => {
      const dateText = formatDateWithWeekday(entry.date);
      const holidayBadge = entry.workType.type === 'holiday'
        ? ` (${entry.workType.holidayName || 'Feiertag'})`
        : entry.workType.type === 'weekend'
        ? ' (Wochenende)'
        : '';

      if (reportType === 'object') {
        return [
          dateText + holidayBadge,
          (entry as any).employeeName || '',
          entry.startTime || '',
          entry.endTime || '',
          formatDuration(entry.breakMinutes),
          formatDuration(entry.duration - entry.breakMinutes),
        ];
      } else {
        return [
          dateText + holidayBadge,
          (entry as any).objectName || '',
          (entry as any).customerName || '',
          entry.startTime || '',
          entry.endTime || '',
          formatDuration(entry.breakMinutes),
          formatDuration(entry.duration - entry.breakMinutes),
        ];
      }
    });

    // Track which rows are holidays/weekends for row-based coloring
    const holidayRowIndices = new Set<number>();
    const weekendRowIndices = new Set<number>();
    entriesWithWorkType.forEach((entry, index) => {
      if (entry.workType.type === 'holiday') {
        holidayRowIndices.add(index);
      } else if (entry.workType.type === 'weekend') {
        weekendRowIndices.add(index);
      }
    });

    console.log(`[PDF] Summary: ${holidayCount} holidays, ${weekendCount} weekends detected out of ${data.entries.length} entries`);
    console.log(`[PDF] Holiday rows:`, Array.from(holidayRowIndices));
    console.log(`[PDF] Weekend rows:`, Array.from(weekendRowIndices));

    // Create table with autoTable
    autoTable(pdf, {
      head: [tableHeaders],
      body: tableRows,
      startY: yPosition,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [26, 54, 93],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: [247, 250, 252], // #f7fafc
      },
      columnStyles: reportType === 'employee'
        ? {
            0: { cellWidth: 35 }, // Date column (WIDER)
            1: { cellWidth: 30 }, // Object column
            2: { cellWidth: 28 }, // Customer column
            3: { cellWidth: 22 }, // Start column
            4: { cellWidth: 22 }, // End column
            5: { cellWidth: 18 }, // Break column
            6: { cellWidth: 30 }, // Work hours column
          }
        : {
            0: { cellWidth: 35 }, // Date column (WIDER)
            1: { cellWidth: 35 }, // Employee column
            2: { cellWidth: 25 }, // Start column
            3: { cellWidth: 25 }, // End column
            4: { cellWidth: 20 }, // Break column
            5: { cellWidth: 35 }, // Work hours column
          },
      didParseCell: function(data) {
        // Color entire rows based on row index (not just cells with text)
        // Only apply to body rows (not header)
        if (data.section === 'body' && data.row && typeof data.row.index === 'number') {
          const rowIndex = data.row.index;

          if (holidayRowIndices.has(rowIndex)) {
            // Use same red color as browser: #dc2626 = RGB(220, 38, 38)
            data.cell.styles.fillColor = [220, 38, 38];
            data.cell.styles.textColor = [255, 255, 255]; // White text for better contrast
            data.cell.styles.fontStyle = 'bold';
          } else if (weekendRowIndices.has(rowIndex)) {
            // Purple background for weekends
            data.cell.styles.fillColor = [124, 58, 237]; // #7c3aed - purple-600
            data.cell.styles.textColor = [255, 255, 255]; // White text for better contrast
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      didDrawPage: function(data) {
        // Add page numbers
        const pageNumber = (pdf as any).internal.getNumberOfPages();
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(
          `Seite ${pageNumber}`,
          pageWidth - margin,
          pageHeight - 10,
          { align: 'right' }
        );
      },
    });

    // Get the final Y position after table
    let finalY = (pdf as any).lastAutoTable.finalY || yPosition;

    // Calculate holiday hours for breakdown
    let holidayHours = 0;
    let regularHours = 0;
    let weekendHours = 0;

    entriesWithWorkType.forEach(entry => {
      const netHours = (entry.duration - entry.breakMinutes) / 60;
      if (entry.workType.type === 'holiday') {
        holidayHours += netHours;
      } else if (entry.workType.type === 'weekend') {
        weekendHours += netHours;
      } else {
        regularHours += netHours;
      }
    });

    // Add totals section UNDER THE TABLE (not on separate page)
    finalY += 10;

    // Add employee breakdown for object reports with multiple employees
    if (reportType === 'object' && data.entries.length > 0) {
      const employeeHours: { [key: string]: number } = {};
      data.entries.forEach(entry => {
        const employeeName = (entry as any).employeeName;
        const netHours = (entry.duration - entry.breakMinutes) / 60;
        if (employeeHours[employeeName]) {
          employeeHours[employeeName] += netHours;
        } else {
          employeeHours[employeeName] = netHours;
        }
      });

      if (Object.keys(employeeHours).length > 1) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(26, 54, 93);
        pdf.text('Gesamtarbeitsstunden pro Mitarbeiter:', margin, finalY);
        finalY += 8;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(26, 54, 93);

        Object.entries(employeeHours).forEach(([name, hours]) => {
          pdf.text(`• ${name}: ${hours.toFixed(2)} Stunden`, margin + 5, finalY);
          finalY += 6;
        });

        finalY += 5;
      }
    }

    // Holiday hours breakdown - REMOVED detailed list per user request
    // Only showing summary in the breakdown section below

    // Weekend hours breakdown - REMOVED detailed list per user request
    // Only showing summary in the breakdown section below

    // Total hours with breakdown
    pdf.setDrawColor(26, 54, 93);
    pdf.setLineWidth(0.5);
    pdf.line(margin, finalY, pageWidth - margin, finalY);
    finalY += 8;

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(26, 54, 93);
    pdf.text(`Gesamtarbeitsstunden: ${data.totalHours} Stunden`, margin, finalY);
    finalY += 7;

    // Show breakdown ONLY if holidays or weekends exist
    if (holidayCount > 0 || weekendCount > 0) {
      // Show breakdown with and without holidays/weekends
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(26, 54, 93);

      const hoursWithoutHolidays = regularHours + weekendHours;
      pdf.text(`• Normale Arbeitszeit: ${hoursWithoutHolidays.toFixed(2)} Stunden`, margin, finalY);
      finalY += 6;

      if (holidayCount > 0) {
        pdf.setTextColor(220, 38, 38);
        pdf.text(`• Feiertage: ${holidayHours.toFixed(2)} Stunden`, margin, finalY);
        finalY += 6;
      }

      if (weekendCount > 0) {
        pdf.setTextColor(124, 58, 237);
        pdf.text(`• Am Wochenende: ${weekendHours.toFixed(2)} Stunden`, margin, finalY);
      }
    }

    // Generate filename - NEW CONVENTION: YEAR_MONTH_Arbeitszeitnachweis_NAME.pdf
    // Format: 2025_10_Arbeitszeitnachweis_Max_Mustermann.pdf or 2025_10_Arbeitszeitnachweis_Baustelle_XYZ.pdf
    const yearValue = parseInt(year);
    const monthValue = parseInt(month);
    const monthPadded = monthValue.toString().padStart(2, '0'); // Ensure 2 digits (01, 02, etc.)

    let fileName = `Arbeitszeitnachweis_${yearValue}_${monthPadded}.pdf`;
    if (objectName) {
      fileName = `${yearValue}_${monthPadded}_Arbeitszeitnachweis_${objectName.replace(/\s+/g, '_')}.pdf`;
    } else if (employeeName) {
      fileName = `${yearValue}_${monthPadded}_Arbeitszeitnachweis_${employeeName.replace(/\s+/g, '_')}.pdf`;
    }

    // Save the PDF
    pdf.save(fileName);
  } catch (error) {
    console.error('Fehler beim Generieren der PDF:', error);
    throw error;
  }
}
