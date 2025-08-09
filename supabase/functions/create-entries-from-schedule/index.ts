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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logs = [];
  logs.push("--- Invoking create-entries-from-schedule (v6 - Heavy Debugging) ---");

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    logs.push("Supabase admin client created.");

    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, customer_id, employee_id, object_id, recurring_start_date, recurring_end_date')
      .not('employee_id', 'is', null)
      .not('object_id', 'is', null)
      .not('recurring_start_date', 'is', null);

    if (ordersError) {
      logs.push(`FATAL: Could not fetch orders. Error: ${ordersError.message}`);
      throw ordersError;
    }
    logs.push(`Found ${orders.length} orders to process.`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const order of orders) {
      logs.push(`\n[Processing Order ID: ${order.id}]`);
      
      // Check 1: user_id on order
      const entryUserId = order.user_id;
      if (!entryUserId) {
        logs.push(`  - SKIP: Order has no user_id.`);
        skippedCount++;
        continue;
      }
      logs.push(`  - OK: Found user_id on order: ${entryUserId}`);

      // Check 2: Fetch object
      const { data: objectData, error: objectError } = await supabaseAdmin
        .from('objects')
        .select('*')
        .eq('id', order.object_id)
        .single();

      if (objectError || !objectData) {
        logs.push(`  - SKIP: Could not fetch object with ID ${order.object_id}. Error: ${objectError?.message}`);
        skippedCount++;
        continue;
      }
      logs.push(`  - OK: Fetched object "${objectData.name}"`);

      // Check 3: Date range
      const startDate = new Date(order.recurring_start_date);
      const today = new Date();
      logs.push(`  - Checking date: StartDate=${startDate.toISOString()}, Today=${today.toISOString()}`);
      if (startDate > today) {
        logs.push(`  - SKIP: recurring_start_date (${order.recurring_start_date}) is in the future.`);
        skippedCount++;
        continue;
      }
      logs.push(`  - OK: Date range is valid.`);

      const endDate = order.recurring_end_date ? new Date(order.recurring_end_date) : today;

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (d > today) continue; // Don't create for future days within the range

        const dayOfWeek = d.getDay();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[dayOfWeek];
        const entryDateStr = d.toISOString().split('T')[0];
        
        logs.push(`    [Checking day: ${entryDateStr} (${dayName})]`);

        // Check 4: Schedule for the day
        const netHours = objectData[`${dayName}_hours`];
        const startTimeStr = objectData[`${dayName}_start_time`];

        if (!netHours || netHours <= 0 || !startTimeStr) {
          logs.push(`    - SKIP Day: No valid schedule. (Hours: ${netHours}, StartTime: ${startTimeStr})`);
          continue;
        }
        logs.push(`    - OK Day: Found schedule. Hours=${netHours}, StartTime=${startTimeStr}`);

        // Check 5: Existing entry
        const { count: existingEntryCount, error: checkError } = await supabaseAdmin
          .from('time_entries')
          .select('id', { count: 'exact', head: true })
          .eq('employee_id', order.employee_id)
          .gte('start_time', `${entryDateStr}T00:00:00.000Z`)
          .lte('start_time', `${entryDateStr}T23:59:59.999Z`);

        if (checkError) {
          logs.push(`    - ERROR Day: Could not check for existing entry. ${checkError.message}`);
          continue;
        }

        if (existingEntryCount > 0) {
          logs.push(`    - SKIP Day: Entry already exists for this employee on this day.`);
          continue;
        }
        logs.push(`    - OK Day: No existing entry found. Proceeding to create.`);

        // Create entry
        const netMinutes = netHours * 60;
        const breakMinutes = calculateBreakMinutes(netHours);
        const grossMinutes = netMinutes + breakMinutes;
        const startTime = new Date(`${entryDateStr}T${startTimeStr}`);
        const endTime = new Date(startTime.getTime() + grossMinutes * 60000);

        const newEntry = {
          user_id: entryUserId,
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
          logs.push(`    - SUCCESS: Created new time entry for ${entryDateStr}.`);
          createdCount++;
        }
      }
    }

    const successMessage = `Funktion erfolgreich ausgeführt. ${createdCount} Einträge erstellt, ${skippedCount} Aufträge übersprungen.`;
    logs.push(`\nFunction finished. ${successMessage}`);
    return new Response(JSON.stringify({ success: true, message: successMessage, logs: logs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (globalError) {
    logs.push(`--- FATAL ERROR in Edge Function --- ${globalError.message}`);
    return new Response(JSON.stringify({ success: false, message: globalError.message, errorDetails: globalError.toString(), logs: logs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});