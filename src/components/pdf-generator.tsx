import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { WorkTimeReportData, EmployeeWorkTimeReportData } from '@/app/dashboard/reports/actions';
import { formatDuration } from '@/lib/utils';

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
}: PdfGeneratorProps): Promise<void> {
  try {
    // Create a temporary container for the PDF content
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.width = '794px'; // DIN A4 width in pixels at 96 DPI
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.padding = '40px';
    tempContainer.style.fontFamily = 'Arial, sans-serif';
    tempContainer.style.color = '#000000';

    // Logo section
    const logoSection = document.createElement('div');
    logoSection.style.display = 'flex';
    logoSection.style.justifyContent = 'space-between';
    logoSection.style.alignItems = 'flex-start';
    logoSection.style.marginBottom = '40px';
    logoSection.style.borderBottom = '2px solid #1a365d';
    logoSection.style.paddingBottom = '20px';

    const companyInfo = document.createElement('div');
    companyInfo.innerHTML = `
      <h1 style="margin: 0; color: #1a365d; font-size: 28px; font-weight: bold;">ARIS</h1>
      <p style="margin: 5px 0; color: #4a5568; font-size: 14px;">Arbeitszeitnachweise</p>
      <p style="margin: 5px 0; color: #718096; font-size: 12px;">${new Date().toLocaleDateString('de-DE')}</p>
    `;

    // Logo
    const logoImg = document.createElement('img');
    logoImg.src = '/logo.png';
    logoImg.alt = 'ARIS Logo';
    logoImg.style.maxWidth = '150px';
    logoImg.style.maxHeight = '100px';
    logoImg.style.objectFit = 'contain';

    logoSection.appendChild(companyInfo);
    logoSection.appendChild(logoImg);

    // Report info
    const reportInfo = document.createElement('div');
    reportInfo.style.marginBottom = '30px';
    reportInfo.innerHTML = `
      <h2 style="margin: 0 0 15px 0; color: #2d3748; font-size: 22px; font-weight: 600;">${title}</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; color: #4a5568;">
        <div><strong>Monat:</strong> ${month} ${year}</div>
        <div><strong>Erstellt am:</strong> ${new Date().toLocaleDateString('de-DE')}</div>
        ${objectName ? `<div><strong>Objekt:</strong> ${objectName}</div>` : ''}
        ${employeeName ? `<div><strong>Mitarbeiter:</strong> ${employeeName}</div>` : ''}
      </div>
    `;

    // Table container
    const tableContainer = document.createElement('div');
    tableContainer.style.marginBottom = '30px';
    tableContainer.style.pageBreakInside = 'avoid';

    // Table styles
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '11px';

    // Table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.backgroundColor = '#1a365d';
    headerRow.style.color = '#ffffff';

    const headers = reportType === 'object'
      ? ['Datum', 'Mitarbeiter', 'Start', 'Ende', 'Pause', 'Arbeitsstunden']
      : ['Datum', 'Objekt', 'Kunde', 'Start', 'Ende', 'Pause', 'Arbeitsstunden'];

    headers.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      th.style.padding = '12px 8px';
      th.style.textAlign = 'left';
      th.style.border = '1px solid #e2e8f0';
      th.style.fontWeight = '600';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Table body
    const tbody = document.createElement('tbody');
    data.entries.forEach((entry, index) => {
      const row = document.createElement('tr');
      row.style.backgroundColor = index % 2 === 0 ? '#f7fafc' : '#ffffff';

      const cells = reportType === 'object'
        ? [
            entry.date,
            (entry as any).employeeName,
            entry.startTime,
            entry.endTime,
            formatDuration(entry.breakMinutes),
            formatDuration(entry.duration - entry.breakMinutes),
          ]
        : [
            entry.date,
            (entry as any).objectName,
            (entry as any).customerName,
            entry.startTime,
            entry.endTime,
            formatDuration(entry.breakMinutes),
            formatDuration(entry.duration - entry.breakMinutes),
          ];

      cells.forEach(cell => {
        const td = document.createElement('td');
        td.textContent = cell;
        td.style.padding = '10px 8px';
        td.style.border = '1px solid #e2e8f0';
        td.style.color = '#2d3748';
        row.appendChild(td);
      });

      tbody.appendChild(row);
    });

    table.appendChild(thead);
    table.appendChild(tbody);

    // Footer
    const footer = document.createElement('div');
    footer.style.marginTop = '30px';
    footer.style.paddingTop = '20px';
    footer.style.borderTop = '2px solid #1a365d';

    const footerContent = document.createElement('div');

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
        const employeeBreakdownDiv = document.createElement('div');
        employeeBreakdownDiv.style.marginBottom = '15px';
        employeeBreakdownDiv.innerHTML = `
          <div style="font-size: 14px; color: #1a365d; font-weight: 600; margin-bottom: 10px;">
            Gesamtarbeitsstunden pro Mitarbeiter:
          </div>
        `;

        Object.entries(employeeHours).forEach(([name, hours]) => {
          const employeeLine = document.createElement('div');
          employeeLine.style.fontSize = '13px';
          employeeLine.style.color = '#1a365d';
          employeeLine.style.marginLeft = '20px';
          employeeLine.style.marginBottom = '5px';
          employeeLine.style.fontWeight = '500';
          employeeLine.textContent = `${name}: ${hours.toFixed(2)} Stunden`;
          employeeBreakdownDiv.appendChild(employeeLine);
        });

        footerContent.appendChild(employeeBreakdownDiv);
      }
    }

    const totalHoursDiv = document.createElement('div');
    totalHoursDiv.innerHTML = `
      <div style="font-size: 16px; font-weight: bold; color: #1a365d;">
        Gesamtarbeitsstunden: ${data.totalHours} Stunden
      </div>
    `;

    footerContent.appendChild(totalHoursDiv);
    footer.appendChild(footerContent);

    // Assemble the document
    tableContainer.appendChild(table);
    tempContainer.appendChild(logoSection);
    tempContainer.appendChild(reportInfo);
    tempContainer.appendChild(tableContainer);
    tempContainer.appendChild(footer);

    document.body.appendChild(tempContainer);

    // Wait for logo to load
    await new Promise((resolve) => {
      if (logoImg.complete) {
        resolve(true);
      } else {
        logoImg.onload = () => resolve(true);
        logoImg.onerror = () => resolve(true); // Continue even if logo fails
      }
    });

    // Generate PDF with higher scale for better quality
    const canvas = await html2canvas(tempContainer, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794, // DIN A4 width at 96 DPI
      height: 1123, // DIN A4 height at 96 DPI
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width * 0.264583; // Convert pixels to mm (96 DPI to 72 DPI)
    const imgHeight = canvas.height * 0.264583;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 0;

    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio, undefined, 'FAST');

    // Generate filename
    const monthLabel = new Date(0, parseInt(month) - 1).toLocaleString('de-DE', { month: 'long' });
    let fileName = `Arbeitszeitnachweis_${monthLabel}_${year}.pdf`;
    if (objectName) {
      fileName = `Arbeitszeitnachweis_${objectName.replace(/\s+/g, '_')}_${monthLabel}_${year}.pdf`;
    } else if (employeeName) {
      fileName = `Arbeitszeitnachweis_${employeeName.replace(/\s+/g, '_')}_${monthLabel}_${year}.pdf`;
    }

    // Clean up
    document.body.removeChild(tempContainer);

    // Save the PDF
    pdf.save(fileName);
  } catch (error) {
    console.error('Fehler beim Generieren der PDF:', error);
    throw error;
  }
}
