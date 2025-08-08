/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, employeeId, customerId, objectId, orderId, startDate, endDate, searchQuery } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Call the RPC function to get filtered time entries
    const { data: timeEntries, error: rpcError } = await supabaseAdmin.rpc('search_time_entries', {
      search_query: searchQuery || '',
      filter_user_id: userId,
      filter_employee_id: employeeId,
      filter_customer_id: customerId,
      filter_object_id: objectId,
      filter_order_id: orderId,
      start_date_filter: startDate,
      end_date_filter: endDate,
    });

    if (rpcError) {
      console.error('Error fetching time entries:', rpcError.message);
      return new Response(JSON.stringify({ error: rpcError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Create a new PDFDocument
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = page.getHeight() - 50;
    const margin = 50;
    const fontSize = 10;
    const lineHeight = 15;
    const tableStartY = y - 100; // Approximate start for table after title and filters

    // Title
    page.drawText('Zeiterfassungsbericht', {
      x: margin,
      y: y,
      font: boldFont,
      size: 24,
      color: rgb(0, 0, 0),
    });
    y -= 30;

    // Filters applied
    page.drawText('Filter angewendet:', { x: margin, y: y, font: boldFont, size: 12, color: rgb(0, 0, 0) });
    y -= lineHeight;
    if (userId) page.drawText(`Benutzer ID: ${userId}`, { x: margin + 10, y: y, font, size: fontSize, color: rgb(0, 0, 0) }); y -= lineHeight;
    if (employeeId) page.drawText(`Mitarbeiter ID: ${employeeId}`, { x: margin + 10, y: y, font, size: fontSize, color: rgb(0, 0, 0) }); y -= lineHeight;
    if (customerId) page.drawText(`Kunden ID: ${customerId}`, { x: margin + 10, y: y, font, size: fontSize, color: rgb(0, 0, 0) }); y -= lineHeight;
    if (objectId) page.drawText(`Objekt ID: ${objectId}`, { x: margin + 10, y: y, font, size: fontSize, color: rgb(0, 0, 0) }); y -= lineHeight;
    if (orderId) page.drawText(`Auftrag ID: ${orderId}`, { x: margin + 10, y: y, font, size: fontSize, color: rgb(0, 0, 0) }); y -= lineHeight;
    if (startDate) page.drawText(`Startdatum: ${startDate}`, { x: margin + 10, y: y, font, size: fontSize, color: rgb(0, 0, 0) }); y -= lineHeight;
    if (endDate) page.drawText(`Enddatum: ${endDate}`, { x: margin + 10, y: y, font, size: fontSize, color: rgb(0, 0, 0) }); y -= lineHeight;
    if (searchQuery) page.drawText(`Suchanfrage: "${searchQuery}"`, { x: margin + 10, y: y, font, size: fontSize, color: rgb(0, 0, 0) }); y -= lineHeight;
    y -= 10; // Extra space

    // Table Headers
    const headers = ['Datum', 'Start', 'Ende', 'Dauer (Min)', 'Typ', 'Mitarbeiter', 'Kunde', 'Objekt', 'Auftrag', 'Notizen'];
    const columnWidths = [60, 40, 40, 60, 60, 80, 80, 80, 80, 100]; // Adjust as needed
    let currentX = margin;
    for (let i = 0; i < headers.length; i++) {
      page.drawText(headers[i], { x: currentX, y: y, font: boldFont, size: fontSize, color: rgb(0, 0, 0) });
      currentX += columnWidths[i];
    }
    y -= lineHeight;
    page.drawLine({
      start: { x: margin, y: y },
      end: { x: page.getWidth() - margin, y: y },
      color: rgb(0, 0, 0),
      thickness: 1,
    });
    y -= 5;

    let totalDurationMinutes = 0;

    // Table Rows
    for (const entry of timeEntries) {
      if (y < margin + 50) { // Check if new page is needed
        page = pdfDoc.addPage();
        y = page.getHeight() - 50;
        currentX = margin;
        for (let i = 0; i < headers.length; i++) {
          page.drawText(headers[i], { x: currentX, y: y, font: boldFont, size: fontSize, color: rgb(0, 0, 0) });
          currentX += columnWidths[i];
        }
        y -= lineHeight;
        page.drawLine({
          start: { x: margin, y: y },
          end: { x: page.getWidth() - margin, y: y },
          color: rgb(0, 0, 0),
          thickness: 1,
        });
        y -= 5;
      }

      const startDateObj = new Date(entry.start_time);
      const endDateObj = entry.end_time ? new Date(entry.end_time) : null;

      const rowData = [
        startDateObj.toLocaleDateString('de-DE'),
        startDateObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        endDateObj ? endDateObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        entry.duration_minutes !== null ? entry.duration_minutes.toFixed(0) : 'N/A',
        entry.type,
        `${entry.employee_first_name || ''} ${entry.employee_last_name || ''}`.trim() || 'N/A',
        entry.customer_name || 'N/A',
        entry.object_name || 'N/A',
        entry.order_title || 'N/A',
        entry.notes || '',
      ];

      currentX = margin;
      for (let i = 0; i < rowData.length; i++) {
        // Truncate notes if too long
        let text = rowData[i];
        if (i === 9 && text.length > 30) { // Notes column
          text = text.substring(0, 27) + '...';
        }
        page.drawText(text, { x: currentX, y: y, font, size: fontSize - 2, color: rgb(0, 0, 0) }); // Smaller font for notes
        currentX += columnWidths[i];
      }
      y -= lineHeight;

      if (entry.duration_minutes !== null) {
        totalDurationMinutes += entry.duration_minutes;
      }
    }

    // Summary
    y -= 20;
    page.drawText(`Gesamtdauer: ${formatDuration(totalDurationMinutes)}`, {
      x: margin,
      y: y,
      font: boldFont,
      size: 14,
      color: rgb(0, 0, 0),
    });

    // Serialize the PDFDocument to bytes (a Uint8Array)
    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="zeiterfassungsbericht.pdf"',
      },
      status: 200,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Unhandled error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

// Helper to format duration from minutes to HH:MM (copied from src/lib/utils.ts)
const formatDuration = (minutes: number | null) => {
  if (minutes === null) return "N/A";
  const totalSeconds = Math.round(minutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const remainingMinutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${remainingMinutes}m`;
};