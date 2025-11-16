import { createClient } from "@/lib/supabase/server";
import { logUserAction } from "@/lib/audit-log";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await logUserAction(
      user.id,
      'LOGIN',
      'success',
      'User logged in successfully',
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error logging login:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
