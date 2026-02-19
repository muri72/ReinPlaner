import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generateTimeEntriesForShift } from "@/app/dashboard/time-tracking/actions";

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();

    // Get all completed shifts without time entries
    const { data: completedShifts, error: shiftsError } = await supabaseAdmin
      .from("shifts")
      .select("id")
      .eq("status", "completed");

    if (shiftsError) {
      return NextResponse.json(
        { success: false, message: `Fehler beim Abrufen der Einsätze: ${shiftsError.message}` },
        { status: 500 }
      );
    }

    if (!completedShifts || completedShifts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Keine abgeschlossenen Einsätze gefunden.",
        created: 0,
        skipped: 0,
      });
    }

    // Get existing shift IDs from time_entries
    const { data: existingEntries, error: existingError } = await supabaseAdmin
      .from("time_entries")
      .select("shift_id")
      .eq("type", "shift")
      .not("shift_id", "is", null);

    if (existingError) {
      return NextResponse.json(
        { success: false, message: `Fehler beim Abrufen der Zeiteinträge: ${existingError.message}` },
        { status: 500 }
      );
    }

    const existingShiftIds = new Set(existingEntries?.map(e => e.shift_id) || []);
    const shiftsToProcess = completedShifts.filter(s => !existingShiftIds.has(s.id));

    let totalCreated = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    // Generate time entries for shifts that don't have them
    for (const shift of shiftsToProcess) {
      const result = await generateTimeEntriesForShift(shift.id);
      if (result.success) {
        totalCreated += result.created;
      } else {
        errors.push(`Shift ${shift.id.slice(0, 8)}: ${result.message}`);
      }
    }

    totalSkipped = completedShifts.length - shiftsToProcess.length;

    return NextResponse.json({
      success: true,
      message: `Synchronisation abgeschlossen. ${totalCreated} Zeiteinträge erstellt, ${totalSkipped} übersprungen.`,
      created: totalCreated,
      skipped: totalSkipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("[ADMIN-SYNC-SHIFTS] Error:", error);
    return NextResponse.json(
      { success: false, message: `Fehler: ${error.message}` },
      { status: 500 }
    );
  }
}

// GET endpoint to check sync status
export async function GET() {
  try {
    const supabaseAdmin = createAdminClient();

    const [completedShiftsResult, timeEntriesResult] = await Promise.all([
      supabaseAdmin.from("shifts").select("id").eq("status", "completed"),
      supabaseAdmin.from("time_entries").select("shift_id").eq("type", "shift").not("shift_id", "is", null),
    ]);

    const totalCompletedShifts = completedShiftsResult.data?.length || 0;
    const shiftIdsWithEntries = new Set(timeEntriesResult.data?.map(e => e.shift_id) || []);
    const shiftsMissingEntries = (completedShiftsResult.data || []).filter(s => !shiftIdsWithEntries.has(s.id)).length;

    return NextResponse.json({
      success: true,
      total_completed_shifts: totalCompletedShifts,
      shifts_with_entries: totalCompletedShifts - shiftsMissingEntries,
      shifts_missing_entries: shiftsMissingEntries,
    });
  } catch (error: any) {
    console.error("[ADMIN-SYNC-SHIFTS-STATUS] Error:", error);
    return NextResponse.json(
      { success: false, message: `Fehler: ${error.message}` },
      { status: 500 }
    );
  }
}
