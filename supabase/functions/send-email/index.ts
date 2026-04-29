// @ts-ignore: Deno-specific import
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore: Deno-specific import
import { Resend } from "npm:resend@3.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting state (in-memory, per-instance)
// For production, use Supabase database or Redis
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const emailRateLimit = new Map<string, RateLimitEntry>();
const reminderRateLimit = new Map<string, RateLimitEntry>();

// 10 emails per minute per tenant
const EMAIL_MAX = 10;
const EMAIL_WINDOW_MS = 60 * 1000;

// 2 reminders per day per invoice
const REMINDER_MAX = 2;
const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

function checkRateLimit(
  key: string,
  limitMap: Map<string, RateLimitEntry>,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = limitMap.get(key);

  if (!entry || now > entry.resetAt) {
    // New or expired window
    const resetAt = now + windowMs;
    limitMap.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // @ts-ignore: Deno is a global in the Supabase Edge Function environment
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY ist nicht gesetzt.");
    }
    const resend = new Resend(resendApiKey);

    const { to, subject, html, type, invoiceId, tenantId } = await req.json();

    // Rate limiting
    if (type === 'reminder' && invoiceId) {
      const reminderKey = `reminder:${invoiceId}`;
      const reminderCheck = checkRateLimit(reminderKey, reminderRateLimit, REMINDER_MAX, REMINDER_WINDOW_MS);
      if (!reminderCheck.allowed) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded', 
          message: 'Maximale Anzahl an Erinnerungen für diese Rechnung erreicht (2 pro Tag).',
          resetAt: reminderCheck.resetAt 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (type === 'invoice' && tenantId) {
      const emailKey = `email:${tenantId}`;
      const emailCheck = checkRateLimit(emailKey, emailRateLimit, EMAIL_MAX, EMAIL_WINDOW_MS);
      if (!emailCheck.allowed) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded', 
          message: 'Zu viele E-Mails versendet. Bitte warten Sie.',
          resetAt: emailCheck.resetAt 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data, error } = await resend.emails.send({
      from: "ReinPlaner Management <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error("Resend API Fehler:", error?.message || error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data,
      rateLimit: type === 'reminder' ? {
        remaining: REMINDER_MAX - ((reminderRateLimit.get(`reminder:${invoiceId}`)?.count) || 0),
      } : {
        remaining: EMAIL_MAX - ((emailRateLimit.get(`email:${tenantId}`)?.count) || 0),
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Ein unbekannter Fehler ist aufgetreten.";
    console.error("Server Fehler:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});