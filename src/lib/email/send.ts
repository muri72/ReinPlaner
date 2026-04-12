/**
 * Email Sending Utility for ReinPlaner
 * Uses Resend API for transactional emails
 */

import { Resend } from "resend";

// Lazy initialization - only create Resend client when actually sending
// This prevents build failures when RESEND_API_KEY is not set
let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const FROM_EMAIL = process.env.EMAIL_FROM || "ReinPlaner <noreply@reinplaner.de>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://reinplaner.de";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Send an email using Resend API
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const { to, subject, html, replyTo } = options;

  const resendClient = getResendClient();
  if (!resendClient) {
    console.log("[Email] RESEND_API_KEY not set, skipping email send:");
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    return { success: true };
  }

  try {
    const { data, error } = await resendClient.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
      replyTo: replyTo || "support@reinplaner.de",
    });

    if (error) {
      console.error("[Email] Failed to send email:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Sent successfully: ${to} - ${subject} (ID: ${data?.id})`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Email] Exception while sending email:", message);
    return { success: false, error: message };
  }
}

/**
 * Send welcome email to newly registered user
 */
export async function sendWelcomeEmail(
  email: string,
  firstName: string,
  companyName?: string,
  planName?: string
): Promise<{ success: boolean; error?: string }> {
  const { welcomeEmailTemplate } = await import("./templates");
  
  const { subject, html } = welcomeEmailTemplate({
    firstName,
    companyName,
    planName,
    loginUrl: `${APP_URL}/login`,
  });

  return sendEmail({ to: email, subject, html });
}

/**
 * Send email verification reminder
 */
export async function sendVerificationReminder(
  email: string,
  firstName: string,
  verificationUrl: string
): Promise<{ success: boolean; error?: string }> {
  const { verificationReminderTemplate } = await import("./templates");
  
  const { subject, html } = verificationReminderTemplate({
    firstName,
    verificationUrl,
  });

  return sendEmail({ to: email, subject, html });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  resetUrl: string
): Promise<{ success: boolean; error?: string }> {
  const { passwordResetTemplate } = await import("./templates");
  
  const { subject, html } = passwordResetTemplate({
    firstName,
    verificationUrl: resetUrl,
  });

  return sendEmail({ to: email, subject, html });
}

/**
 * Send trial ending reminder
 */
export async function sendTrialEndingReminder(
  email: string,
  firstName: string,
  companyName?: string,
  daysRemaining: number = 7
): Promise<{ success: boolean; error?: string }> {
  const { trialEndingTemplate } = await import("./templates");
  
  const { subject, html } = trialEndingTemplate({
    firstName,
    companyName,
    daysRemaining: daysRemaining.toString(),
    loginUrl: `${APP_URL}/login`,
  });

  return sendEmail({ to: email, subject, html });
}
