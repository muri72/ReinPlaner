"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// API Key for cron job authentication (set this in .env.local as CRON_API_KEY)
const CRON_API_KEY = process.env.CRON_API_KEY;

export async function POST(request: Request) {
  try {
    // Verify API key
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    if (token !== CRON_API_KEY) {
      return Response.json({ error: "Invalid API key" }, { status: 403 });
    }

    const supabaseAdmin = createAdminClient();
    const now = new Date();
    const today = new Date(now.toISOString().split("T")[0]);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    console.log("[CRON] Checking for overdue shifts at", now.toISOString());

    // Get all scheduled/in_progress shifts that should be marked as completed
    const { data: shiftsToUpdate, error: fetchError } = await supabaseAdmin
      .from("shifts")
      .select("id, shift_date, start_time, end_time, status")
      .in("status", ["scheduled", "in_progress"]);

    if (fetchError) {
      console.error("[CRON] Error fetching shifts:", fetchError);
      return Response.json({ error: fetchError.message }, { status: 500 });
    }

    let updatedCount = 0;
    let timeEntriesCreated = 0;
    const nowDateStr = today.toISOString().split("T")[0];
    const completedShiftIds: string[] = [];

    for (const shift of shiftsToUpdate || []) {
      let shouldBeCompleted = false;

      // Shift date is in the past
      if (shift.shift_date < nowDateStr) {
        shouldBeCompleted = true;
      } else if (shift.shift_date === nowDateStr && shift.end_time) {
        // Same date - check if end_time has passed
        const [endHour, endMin] = shift.end_time.split(":").map(Number);
        const endTimeMinutes = endHour * 60 + endMin;

        if (currentTimeMinutes >= endTimeMinutes) {
          shouldBeCompleted = true;
        }
      }

      if (shouldBeCompleted && shift.status !== "completed") {
        const { error: updateError } = await supabaseAdmin
          .from("shifts")
          .update({
            status: "completed",
            completed_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("id", shift.id);

        if (!updateError) {
          updatedCount++;
          completedShiftIds.push(shift.id);
        }
      }
    }

    // Generate time entries for completed shifts
    for (const shiftId of completedShiftIds) {
      const shiftResult = await generateTimeEntryForShift(supabaseAdmin, shiftId);
      if (shiftResult.created > 0) {
        timeEntriesCreated += shiftResult.created;
      }
    }

    console.log("[CRON] Completed. Updated", updatedCount, "shifts, created", timeEntriesCreated, "time entries");

    revalidatePath("/dashboard/planning");
    revalidatePath("/dashboard/time-tracking");

    return Response.json({
      success: true,
      message: `${updatedCount} shifts marked as completed, ${timeEntriesCreated} time entries created`,
      updated_count: updatedCount,
      time_entries_created: timeEntriesCreated,
    });
  } catch (error: any) {
    console.error("[CRON] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function generateTimeEntryForShift(supabaseAdmin: any, shiftId: string): Promise<{ created: number }> {
  try {
    // Fetch shift with employees and order info
    const { data: shift, error: shiftError } = await supabaseAdmin
      .from("shifts")
      .select(`
        id,
        shift_date,
        start_time,
        end_time,
        estimated_hours,
        order_id,
        notes,
        shift_employees (
          employee_id,
          actual_hours,
          employees!inner (id, user_id)
        ),
        orders!inner (id, customer_id, object_id)
      `)
      .eq("id", shiftId)
      .single();

    if (shiftError || !shift) {
      return { created: 0 };
    }

    // Check existing time entries
    const { data: existingEntries } = await supabaseAdmin
      .from("time_entries")
      .select("employee_id")
      .eq("shift_id", shiftId);

    const existingEmployees = new Set((existingEntries || []).map((e: any) => e.employee_id));
    const timeEntriesToCreate: any[] = [];

    for (const se of shift.shift_employees || []) {
      const employee = Array.isArray(se.employees) ? se.employees[0] : se.employees;
      if (!employee || existingEmployees.has(employee.id)) continue;

      // Calculate duration
      let durationMinutes = null;
      if (se.actual_hours) {
        durationMinutes = Number(se.actual_hours) * 60;
      } else if (shift.estimated_hours) {
        durationMinutes = Number(shift.estimated_hours) * 60;
      }

      // Build start/end times with timezone
      const month = parseInt(shift.shift_date.split("-")[1]);
      const offset = month >= 3 && month <= 10 ? "+02:00" : "+01:00";

      const startTime = `${shift.shift_date}T${shift.start_time}:00${offset}`;
      let endTime = `${shift.shift_date}T${shift.end_time}:00${offset}`;

      // Handle overnight shifts
      if (shift.start_time && shift.end_time) {
        const [startH] = shift.start_time.split(":").map(Number);
        const [endH] = shift.end_time.split(":").map(Number);
        if (endH < startH) {
          const nextDay = new Date(shift.shift_date);
          nextDay.setDate(nextDay.getDate() + 1);
          const nextDayStr = nextDay.toISOString().split("T")[0];
          endTime = `${nextDayStr}T${shift.end_time}:00${offset}`;
        }
      }

      const order = Array.isArray(shift.orders) ? shift.orders[0] : shift.orders;

      timeEntriesToCreate.push({
        user_id: employee.user_id,
        employee_id: employee.id,
        customer_id: order?.customer_id || null,
        object_id: order?.object_id || null,
        order_id: order?.id || null,
        shift_id: shift.id,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: durationMinutes,
        break_minutes: 0,
        type: "shift",
        notes: shift.notes || null,
        created_at: new Date().toISOString(),
      });
    }

    if (timeEntriesToCreate.length === 0) {
      return { created: 0 };
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("time_entries")
      .insert(timeEntriesToCreate)
      .select("id");

    if (insertError) {
      console.error("[CRON] Error inserting time entries:", insertError);
      return { created: 0 };
    }

    return { created: inserted?.length || 0 };
  } catch (error) {
    console.error("[CRON] Error generating time entry:", error);
    return { created: 0 };
  }
}
