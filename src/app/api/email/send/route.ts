/**
 * Email Sending API Route
 * 
 * POST /api/email/send
 * Used for sending transactional emails (welcome, verification reminders, etc.)
 */

import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail, sendVerificationReminder, sendPasswordResetEmail } from "@/lib/email/send";
import { NextRequest, NextResponse } from "next/server";

interface SendEmailRequest {
  type: "welcome" | "verification_reminder" | "password_reset";
  email: string;
  firstName: string;
  companyName?: string;
  planName?: string;
  verificationUrl?: string;
  resetUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated (optional - can be called from server actions)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Allow unauthenticated calls for password reset
    const body: SendEmailRequest = await request.json();

    if (!body.email || !body.type || !body.firstName) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: email, type, firstName" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    let result: { success: boolean; error?: string };

    switch (body.type) {
      case "welcome":
        result = await sendWelcomeEmail(
          body.email,
          body.firstName,
          body.companyName,
          body.planName
        );
        break;

      case "verification_reminder":
        if (!body.verificationUrl) {
          return NextResponse.json(
            { success: false, error: "verificationUrl is required for verification_reminder" },
            { status: 400 }
          );
        }
        result = await sendVerificationReminder(
          body.email,
          body.firstName,
          body.verificationUrl
        );
        break;

      case "password_reset":
        if (!body.resetUrl) {
          return NextResponse.json(
            { success: false, error: "resetUrl is required for password_reset" },
            { status: 400 }
          );
        }
        result = await sendPasswordResetEmail(
          body.email,
          body.firstName,
          body.resetUrl
        );
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown email type: ${body.type}` },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Email API] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
