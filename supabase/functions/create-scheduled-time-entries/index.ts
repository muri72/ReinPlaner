// @ts-nocheck
// This file is a Supabase Edge Function, which uses the Deno runtime.
// The Deno-specific imports and globals (like `Deno`) are not recognized
// by the Next.js TypeScript compiler, so we disable type checking for this file.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to calculate break minutes based on net work duration
function calculateBreakMinutes(netDurationMinutes: number): number {
  if (netDurationMinutes > 9 * 60) { // More than 9 hours
    return 45;
  } else if (netDurationMinutes > 6 * 60) { // More than 6 hours
    return 30;
  }
  return 0;
}

// Helper to parse HH:MM time string into minutes from midnight
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logs = [];
  try {
    logs.push("Function execution started.");
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const today = new Date().toISOString().split('T')[0];
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        user_id,
        employee_id,
        customer_id,
        object_id,
        recurring_start_date,
        recurring_end_date,
        objects ( * )
      `)
      .in('order_type', ['permanent', 'recurring'])
      .not('employee_id', 'is', null)
      .not('object_id', 'is', null)
      .lte('recurring_start_date', today);

    if (ordersError) throw ordersError;
    logs.push(`Found ${orders.length} active, assigned, permanent/recurring orders.`);

    let createdCount = 0;

    for (const order of orders) {
      logs.push(`\nProcessing Order ID: ${order.id}`);
      if (!order.objects) {
        logs.push(`  - SKIPPING: No associated object data found for this order.`);
        continue;
      }
      logs.push(`  - Associated Object: ${order.objects.name} (ID: ${order.objects.id})`);
      logs.push(`  - Assigned Employee ID: ${order.employee_id}`);

      const startDate = new Date(order.recurring_start_date);
      const endDate = order.recurring_end_date ? new Date(order.recurring_end_date) : new Date();
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (d > new Date()) continue;

        const dayOfWeek = d.getDay();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[dayOfWeek];

        const objectStartTime = order.objects[`${dayName}_start_time`];
        const objectEndTime = order.objects[`${dayName}_end_time`];

        if (objectStartTime && objectEndTime) {
          const entryDateStr = d.toISOString().split('T')[0];
          logs.push(`  - Checking date: ${entryDateStr}. Found schedule: ${objectStartTime}-${objectEndTime}`);
          
          const entryDateStart = new Date(d);
          entryDateStart.setUTCHours(0, 0, 0, 0);
          const entryDateEnd = new Date(entryDateStart.getTime() + 24 * 60 * 60 * 1000);

          const { count: existingCount, error: checkError } = await supabaseAdmin
            .from('time_entries')
            .select('id', { count: 'exact', head: true })
            .eq('employee_id', order.employee_id)
            .eq('object_id', order.object_id)
            .gte('start_time', entryDateStart.toISOString())
            .lt('start_time', entryDateEnd.toISOString());

          if (checkError) {
            logs.push(`    - ERROR checking for existing entry: ${checkError.message}`);
            continue;
          }

          if (existingCount === 0) {
            logs.push(`    - No existing entry found. Creating new one.`);
            
            const netDurationMinutes = timeToMinutes(objectEndTime) - timeToMinutes(objectStartTime);
            const breakMinutes = calculateBreakMinutes(netDurationMinutes);
            const grossDurationMinutes = netDurationMinutes + breakMinutes;

            const finalStartTime = new Date(entryDateStart);
            const [startH, startM] = objectStartTime.split(':').map(Number);
            finalStartTime.setUTCHours(startH, startM);

            const finalEndTime = new Date(finalStartTime.getTime() + grossDurationMinutes * 60 * 1000);

            const newEntry = {
              user_id: order.user_id,
              employee_id: order.employee_id,
              customer_id: order.customer_id,
              object_id: order.object_id,
              order_id: order.id,
              start_time: finalStartTime.toISOString(),
              end_time: finalEndTime.toISOString(),
              duration_minutes: grossDurationMinutes,
              break_minutes: breakMinutes,
              type: 'automatic_scheduled_order',
              notes: `Automatisch erstellter Eintrag für ${order.objects.name}.`,
            };

            const { error: insertError } = await supabaseAdmin.from('time_entries').insert(newEntry);

            if (insertError) {
              logs.push(`    - FAILED to insert entry: ${insertError.message}`);
            } else {
              logs.push(`    - SUCCESS: Created new time entry.`);
              createdCount++;
            }
          } else {
            logs.push(`    - SKIPPING: An entry already exists for this day.`);
          }
        }
      }
    }

    logs.push(`\nFunction finished. Created ${createdCount} new entries.`);
    console.log(logs.join('\n'));

    return new Response(
      JSON.stringify({
        success: true,
        message: `Überprüfung abgeschlossen. ${createdCount} neue Zeiteinträge erstellt.`,
        logs: logs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    logs.push(`FATAL ERROR: ${message}`);
    console.error(logs.join('\n'));
    return new Response(JSON.stringify({ success: false, message, logs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});