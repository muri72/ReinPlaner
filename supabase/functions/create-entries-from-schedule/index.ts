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

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, customer_id, employee_id, object_id, recurring_start_date, recurring_end_date')
      .not('employee_id', 'is', null)
      .not('object_id', 'is', null)
      .not('recurring_start_date', 'is', null);

    if (ordersError) {
      throw ordersError;
    }

    let createdCount = 0;

    for (const order of orders) {
      // KORREKTUR: Hole die user_id vom zugewiesenen Mitarbeiter, nicht vom Auftrag
      const { data: employee, error: employeeError } = await supabaseAdmin
        .from('employees')
        .select('user_id')
        .eq('id', order.employee_id)
        .single();

      // Überspringe, wenn der Mitarbeiter nicht gefunden oder nicht mit einem Benutzer verknüpft ist
      if (employeeError || !employee || !employee.user_id) {
        continue;
      }
      const employeeUserId = employee.user_id;

      const { data: objectData, error: objectError } = await supabaseAdmin
        .from('objects')
        .select('*')
        .eq('id', order.object_id)
        .single();

      if (objectError || !objectData) {
        continue;
      }

      const startDate = new Date(order.recurring_start_date);
      const today = new Date();
      const endDate = order.recurring_end_date ? new Date(order.recurring_end_date) : today;

      if (startDate > today) {
        continue;
      }

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (d > today) continue;

        const dayOfWeek = d.getDay();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[dayOfWeek];
        const entryDateStr = d.toISOString().split('T')[0];

        const netHours = objectData[`${dayName}_hours`];
        const startTimeStr = objectData[`${dayName}_start_time`];

        if (netHours && netHours > 0 && startTimeStr) {
          const { count: existingEntryCount } = await supabaseAdmin
            .from('time_entries')
            .select('id', { count: 'exact', head: true })
            .eq('employee_id', order.employee_id)
            .gte('start_time', `${entryDateStr}T00:00:00.000Z`)
            .lte('start_time', `${entryDateStr}T23:59:59.999Z`);

          if (existingEntryCount === 0) {
            const netMinutes = netHours * 60;
            const breakMinutes = calculateBreakMinutes(netHours);
            const grossMinutes = netMinutes + breakMinutes;
            const startTime = new Date(`${entryDateStr}T${startTimeStr}`);
            const endTime = new Date(startTime.getTime() + grossMinutes * 60000);

            const newEntry = {
              user_id: employeeUserId, // KORRIGIERT
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
            if (!insertError) {
              createdCount++;
            }
          }
        }
      }
    }

    const successMessage = `Funktion erfolgreich ausgeführt. ${createdCount} neue Einträge erstellt.`;
    return new Response(JSON.stringify({ success: true, message: successMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (globalError) {
    return new Response(JSON.stringify({ success: false, message: globalError.message, errorDetails: globalError.toString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});