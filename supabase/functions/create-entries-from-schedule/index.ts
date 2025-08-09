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

  console.log("--- Invoking create-entries-from-schedule (v3 - Robust) ---");

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    console.log("Supabase admin client created.");

    // 1. Fetch all relevant orders WITHOUT nesting to avoid join issues.
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, customer_id, employee_id, object_id, recurring_start_date, recurring_end_date')
      .not('employee_id', 'is', null)
      .not('object_id', 'is', null)
      .not('recurring_start_date', 'is', null);

    if (ordersError) {
      console.error("FATAL: Could not fetch orders.", ordersError);
      throw ordersError;
    }
    console.log(`Found ${orders.length} orders to process.`);

    let createdCount = 0;
    let skippedCount = 0;

    // 2. Loop through each order.
    for (const order of orders) {
      // 3. Wrap each order's processing in a try/catch to prevent one bad order from crashing everything.
      try {
        console.log(`\nProcessing Order ID: ${order.id}`);

        // 4. Fetch the associated object separately and safely.
        const { data: objectData, error: objectError } = await supabaseAdmin
          .from('objects')
          .select('*')
          .eq('id', order.object_id)
          .single();

        if (objectError || !objectData) {
          console.warn(`  - SKIPPING: Could not fetch object with ID ${order.object_id}. Error: ${objectError?.message}`);
          skippedCount++;
          continue; // Skip to the next order
        }

        // 5. Fetch the associated employee safely.
        const { data: employee, error: employeeError } = await supabaseAdmin
          .from('employees')
          .select('user_id')
          .eq('id', order.employee_id)
          .single();

        if (employeeError || !employee || !employee.user_id) {
          console.warn(`  - SKIPPING: Could not find a linked user for employee ID ${order.employee_id}. Error: ${employeeError?.message}`);
          skippedCount++;
          continue; // Skip to the next order
        }
        const employeeUserId = employee.user_id;

        // 6. Process dates and create entries
        const startDate = new Date(order.recurring_start_date);
        const endDate = order.recurring_end_date ? new Date(order.recurring_end_date) : new Date();
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          if (d > new Date()) continue;

          const dayOfWeek = d.getDay();
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayName = dayNames[dayOfWeek];
          
          const netHours = objectData[`${dayName}_hours`];
          const startTimeStr = objectData[`${dayName}_start_time`];

          if (netHours && netHours > 0 && startTimeStr) {
            const entryDateStr = d.toISOString().split('T')[0];
            
            const { count: existingEntryCount, error: checkError } = await supabaseAdmin
              .from('time_entries')
              .select('id', { count: 'exact', head: true })
              .eq('employee_id', order.employee_id)
              .gte('start_time', `${entryDateStr}T00:00:00.000Z`)
              .lte('start_time', `${entryDateStr}T23:59:59.999Z`);

            if (checkError) {
              console.error(`    - ERROR checking for existing entry:`, checkError);
              continue;
            }

            if (existingEntryCount > 0) {
              continue;
            }

            const netMinutes = netHours * 60;
            const breakMinutes = calculateBreakMinutes(netHours);
            const grossMinutes = netMinutes + breakMinutes;

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
              console.error(`    - FAILED to insert new entry:`, insertError);
            } else {
              console.log(`    - SUCCESS: Created new time entry for ${entryDateStr}.`);
              createdCount++;
            }
          }
        }
      } catch (orderError) {
        console.error(`--- ERROR processing Order ID ${order.id}: ${orderError.message} ---`);
        skippedCount++;
      }
    }

    const successMessage = `Funktion erfolgreich ausgeführt. ${createdCount} Einträge erstellt, ${skippedCount} Aufträge übersprungen.`;
    console.log(`\nFunction finished. ${successMessage}`);
    return new Response(JSON.stringify({ success: true, message: successMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (globalError) {
    console.error("--- FATAL ERROR in Edge Function ---", globalError);
    return new Response(JSON.stringify({ success: false, message: globalError.message, errorDetails: globalError.toString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});