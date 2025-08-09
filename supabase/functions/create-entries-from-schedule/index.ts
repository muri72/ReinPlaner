// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pausenberechnung basierend auf Netto-Stunden
function calculateBreakMinutes(netHours: number): number {
  if (netHours > 9) return 45;
  if (netHours > 6) return 30;
  return 0;
}

// Funktion zum Parsen von HH:MM Zeit-Strings in Minuten seit Mitternacht
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Funktion zum Konvertieren von Minuten seit Mitternacht in einen HH:MM String
function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logs = [];
  try {
    logs.push("Function 'create-entries-from-schedule' started.");
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        customer_id,
        employee_id,
        object_id,
        recurring_start_date,
        recurring_end_date,
        objects ( * )
      `)
      .not('employee_id', 'is', null)
      .not('object_id', 'is', null)
      .not('recurring_start_date', 'is', null);

    if (ordersError) throw ordersError;
    logs.push(`Found ${orders.length} potentially relevant orders.`);

    let createdCount = 0;

    for (const order of orders) {
      logs.push(`\nProcessing Order ID: ${order.id}`);
      if (!order.objects || !order.employee_id) {
        logs.push(`  - SKIPPING: Missing object or employee data.`);
        continue;
      }
      
      const { data: employee, error: employeeError } = await supabaseAdmin
        .from('employees')
        .select('user_id')
        .eq('id', order.employee_id)
        .single();

      if (employeeError || !employee || !employee.user_id) {
        logs.push(`  - SKIPPING: Could not find a linked user for employee ID ${order.employee_id}. Error: ${employeeError?.message}`);
        continue;
      }
      const employeeUserId = employee.user_id;
      logs.push(`  - Found Employee User ID: ${employeeUserId}`);

      const startDate = new Date(order.recurring_start_date);
      const endDate = order.recurring_end_date ? new Date(order.recurring_end_date) : new Date();
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (d > new Date()) continue;

        const dayOfWeek = d.getDay();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[dayOfWeek];
        
        const netHours = order.objects[`${dayName}_hours`];
        const startTimeStr = order.objects[`${dayName}_start_time`];

        if (netHours && netHours > 0 && startTimeStr) {
          const entryDateStr = d.toISOString().split('T')[0];
          logs.push(`  - Checking date: ${entryDateStr}. Found schedule: ${netHours} net hours, starting at ${startTimeStr}.`);
          
          const { data: existingEntry, error: checkError } = await supabaseAdmin
            .from('time_entries')
            .select('id')
            .eq('employee_id', order.employee_id)
            .gte('start_time', `${entryDateStr}T00:00:00.000Z`)
            .lte('start_time', `${entryDateStr}T23:59:59.999Z`)
            .limit(1);

          if (checkError) {
            logs.push(`    - ERROR checking for existing entry: ${checkError.message}`);
            continue;
          }

          if (existingEntry && existingEntry.length > 0) {
            logs.push(`    - SKIPPING: Entry already exists for this day.`);
            continue;
          }

          const netMinutes = netHours * 60;
          const breakMinutes = calculateBreakMinutes(netHours);
          const grossMinutes = netMinutes + breakMinutes;

          const startMinutesFromMidnight = timeToMinutes(startTimeStr);
          const endMinutesFromMidnight = startMinutesFromMidnight + grossMinutes;

          const startTime = new Date(`${entryDateStr}T${startTimeStr}:00`);
          const endTime = new Date(startTime.getTime() + grossMinutes * 60000);

          const newEntry = {
            user_id: employeeUserId,
            employee_id: order.employee_id,
            customer_id: order.customer_id,
            object_id: order.object_id,
            order_id: order.id,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            duration_minutes: grossMinutes,
            break_minutes: breakMinutes,
            type: 'automatic_scheduled_order',
            notes: `Automatisch erstellter Eintrag basierend auf Objektplan.`,
          };

          const { error: insertError } = await supabaseAdmin.from('time_entries').insert(newEntry);
          if (insertError) {
            logs.push(`    - FAILED to insert new entry: ${insertError.message}`);
          } else {
            logs.push(`    - SUCCESS: Created new time entry.`);
            createdCount++;
          }
        }
      }
    }

    logs.push(`\nFunction finished. Created ${createdCount} new entries.`);
    return new Response(JSON.stringify({ success: true, message: `Funktion erfolgreich ausgeführt. ${createdCount} Einträge erstellt.`, logs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    logs.push(`\nFATAL ERROR: ${error.message}`);
    return new Response(JSON.stringify({ success: false, message: error.message, logs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});