// @ts-ignore: Deno-specific import
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore: Deno-specific import
import { Resend } from "npm:resend@3.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Resend API-Schlüssel aus den Umgebungsvariablen holen
    // @ts-ignore: Deno is a global in the Supabase Edge Function environment
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY ist nicht gesetzt.");
    }
    const resend = new Resend(resendApiKey);

    const { to, subject, html } = await req.json();

    const { data, error } = await resend.emails.send({
      from: "ARIS Management <onboarding@resend.dev>", // Absenderadresse konfigurieren
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

    return new Response(JSON.stringify(data), {
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