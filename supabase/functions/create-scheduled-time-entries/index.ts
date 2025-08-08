/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => { // 'req' explizit als 'Request' typisiert
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today in local time (or UTC if preferred)
    const todayISO = today.toISOString().split('T')[0]; // YYYY-MM-DD

    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const dayMap: Record<number, { start: string, end: string }> = {
      1: { start: 'monday_start_time', end: 'monday_end_time' },
      2: { start: 'tuesday_start_time', end: 'tuesday_end_time' },
      3: { start: 'wednesday_start_time', end: 'wednesday_end_time' },
      4: { start: 'thursday_start_time', end: 'thursday_end_time' },
      5: { start: 'friday_start_time', end: 'friday_end_time' },
      6: { start: 'saturday_start_time', end: 'saturday_end_time' },
      0: { start: 'sunday_start_time', end: 'sunday_end_time' },
    };
    const currentDayScheduleKeys = dayMap[dayOfWeek];

    if (!currentDayScheduleKeys) {
      return new Response(JSON.stringify({ message: `No schedule keys for day ${dayOfWeek}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Fetch orders that are recurring or permanent and have an assigned employee and object
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        user_id,
        employee_id,
        customer_id,
        object_id,
        order_type,
        recurring_start_date,
        recurring_end_date,
        objects (
          ${currentDayScheduleKeys.start},
          ${currentDayScheduleKeys.end}
        )
      `)
      .in('order_type', ['recurring', 'permanent'])
      .not('employee_id', 'is', null)
      .not('object_id', 'is', null);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError.message);
      return new Response(JSON.stringify({ error: ordersError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const newEntries = [];
    for (const order of orders) {
      const recurringStartDate = order.recurring_start_date ? new Date(order.recurring_start_date) : null;
      const recurringEndDate = order.recurring_end_date ? new Date(order.recurring_end_date) : null;

      // Check if the order is active today based on its recurring dates
      const isOrderActiveToday =
        (recurringStartDate && recurringStartDate <= today) &&
        (order.order_type === 'permanent' || (recurringEndDate && recurringEndDate >= today));

      if (!isOrderActiveToday) {
        continue; // Skip if the order is not active today
      }

      const objectSchedule = order.objects;
      const startTime = objectSchedule?.[currentDayScheduleKeys.start];
      const endTime = objectSchedule?.[currentDayScheduleKeys.end];

      if (startTime && endTime) {
        // Calculate duration in minutes
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);

        const startDateObj = new Date(0, 0, 0, startH, startM);
        let endDateObj = new Date(0, 0, 0, endH, endM);

        if (endDateObj < startDateObj) {
          endDateObj.setDate(endDateObj.getDate() + 1); // Spans overnight
        }

        const durationMinutes = (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60);

        // Check if an entry for this order and today already exists
        const { data: existingEntry, error: existingEntryError } = await supabaseAdmin
          .from('time_entries')
          .select('id')
          .eq('order_id', order.id)
          .eq('type', 'automatic_scheduled_order')
          .gte('start_time', today.toISOString()) // Check from start of today
          .lt('start_time', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()) // Up to start of tomorrow
          .single();

        if (existingEntryError && existingEntryError.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error(`Error checking existing entry for order ${order.id}:`, existingEntryError.message);
          continue; // Skip this order if there's an error checking for duplicates
        }

        if (existingEntry) {
          console.log(`Skipping order ${order.id}: Automatic entry already exists for today.`);
          continue; // Skip if entry already exists
        }

        // Create the time entry
        const { data: newEntry, error: insertError } = await supabaseAdmin
          .from('time_entries')
          .insert({
            user_id: order.user_id,
            employee_id: order.employee_id,
            customer_id: order.customer_id,
            object_id: order.object_id,
            order_id: order.id,
            start_time: `${todayISO}T${startTime}:00.000Z`, // Use ISO string for timestamp with timezone
            end_time: `${todayISO}T${endTime}:00.000Z`,
            duration_minutes: Math.round(durationMinutes),
            type: 'automatic_scheduled_order',
            notes: `Automatisch erfasst für geplanten Auftrag (${startTime}-${endTime})`,
          })
          .select()
          .single();

        if (insertError) {
          console.error(`Error inserting time entry for order ${order.id}:`, insertError.message);
        } else {
          newEntries.push(newEntry);
          console.log(`Successfully created automatic entry for order ${order.id}`);
        }
      }
    }

    return new Response(JSON.stringify({ message: 'Automatic time entries processed', newEntriesCount: newEntries.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) { // 'error' als 'unknown' gefangen und dann als 'Error' behandelt
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Unhandled error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});