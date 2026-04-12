/**
 * Email Templates for ReinPlaner
 * 
 * HTML email templates for transactional emails.
 */

export interface EmailTemplateData {
  firstName: string;
  companyName?: string;
  email?: string;
  planName?: string;
  verificationUrl?: string;
  loginUrl?: string;
  daysRemaining?: string;
}

/**
 * Base HTML template for emails
 */
function baseTemplate(content: string, preamble: string = ""): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ReinPlaner</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">ReinPlaner</h1>
        <p style="margin: 8px 0 0; font-size: 14px; color: #bfdbfe;">Die Software für Gebäudereinigung</p>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 32px 24px;">
        ${preamble}
        ${content}
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f1f5f9; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px; font-size: 14px; color: #64748b;">
          © ${new Date().getFullYear()} ReinPlaner. Alle Rechte vorbehalten.
        </p>
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://reinplaner.de'}/datenschutz" style="color: #3b82f6; text-decoration: none;">Datenschutz</a> · 
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://reinplaner.de'}/agb" style="color: #3b82f6; text-decoration: none;">AGB</a> · 
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://reinplaner.de'}/impressum" style="color: #3b82f6; text-decoration: none;">Impressum</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Welcome Email Template
 * Sent after successful registration
 */
export function welcomeEmailTemplate(data: EmailTemplateData): { subject: string; html: string } {
  const { firstName, companyName, planName = "Professional" } = data;
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://reinplaner.de'}/login`;
  
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1e293b;">Willkommen bei ReinPlaner, ${firstName}!</h2>
    
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #475569;">
      Vielen Dank für Ihre Registrierung bei ReinPlaner${
        companyName ? ` für <strong>${companyName}</strong>` : ""
      }.
    </p>
    
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #475569;">
      Ihr Konto wurde erfolgreich erstellt und Sie haben Zugriff auf den <strong>${planName}-Plan</strong> mit einer 14-tägigen kostenlosen Testphase.
    </p>
    
    <div style="background-color: #f8fafc; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <h3 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #1e293b;">Ihre nächsten Schritte:</h3>
      <ol style="margin: 0; padding: 0 0 0 24px; color: #475569; line-height: 2;">
        <li>Bestätigen Sie Ihre E-Mail-Adresse (falls noch nicht geschehen)</li>
        <li>Melden Sie sich mit Ihren Zugangsdaten an</li>
        <li>Richten Sie Ihr Unternehmen ein</li>
        <li>Laden Sie Ihre ersten Mitarbeiter ein</li>
      </ol>
    </div>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td style="text-align: center; padding: 24px 0;">
          <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 8px; font-size: 16px;">
            Jetzt anmelden
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #64748b;">
      Sie haben Fragen oder benötigen Unterstützung? Unser Support-Team hilft Ihnen gerne weiter:
    </p>
    <p style="margin: 8px 0 0; font-size: 14px; color: #3b82f6;">
      <a href="mailto:support@reinplaner.de" style="color: #3b82f6; text-decoration: none;">support@reinplaner.de</a>
    </p>
  `;

  return {
    subject: `Willkommen bei ReinPlaner, ${firstName}!`,
    html: baseTemplate(content, ""),
  };
}

/**
 * Email Verification Reminder Template
 * Sent when user hasn't verified their email yet
 */
export function verificationReminderTemplate(data: EmailTemplateData): { subject: string; html: string } {
  const { firstName, verificationUrl } = data;
  
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1e293b;">Bitte bestätigen Sie Ihre E-Mail-Adresse</h2>
    
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #475569;">
      Hallo ${firstName}, vielen Dank für Ihre Registrierung bei ReinPlaner!
    </p>
    
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #475569;">
      Um Ihr Konto zu aktivieren, klicken Sie bitte auf den folgenden Link, um Ihre E-Mail-Adresse zu bestätigen:
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td style="text-align: center; padding: 24px 0;">
          <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 8px; font-size: 16px;">
            E-Mail-Adresse bestätigen
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #64748b;">
      Dieser Link ist 24 Stunden gültig. Falls Sie sich nicht registriert haben, können Sie diese E-Mail ignorieren.
    </p>
  `;

  return {
    subject: "Bitte bestätigen Sie Ihre E-Mail-Adresse",
    html: baseTemplate(content, ""),
  };
}

/**
 * Trial Ending Reminder Template
 * Sent when trial is about to end
 */
export function trialEndingTemplate(data: EmailTemplateData): { subject: string; html: string } {
  const { firstName, companyName, loginUrl } = data;
  const daysRemaining = data.planName || "7";
  
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1e293b;">Ihre Testphase endet bald</h2>
    
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #475569;">
      Hallo ${firstName}, Ihre 14-tägige kostenlose Testphase bei ReinPlaner${
        companyName ? ` für <strong>${companyName}</strong>` : ""
      } endet in ${daysRemaining} Tagen.
    </p>
    
    <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>Wichtiger Hinweis:</strong> Nach Ablauf der Testphase werden keine kostenpflichtigen Funktionen automatisch aktiviert. Sie können ReinPlaner weiterhin kostenlos mit eingeschränkten Funktionen nutzen.
      </p>
    </div>
    
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #475569;">
      Möchten Sie alle Funktionen weiterhin nutzen? Wählen Sie jetzt einen Plan und sichern Sie sich Ihre Daten.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td style="text-align: center; padding: 24px 0;">
          <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 8px; font-size: 16px;">
            Plan auswählen
          </a>
        </td>
      </tr>
    </table>
  `;

  return {
    subject: "Ihre ReinPlaner Testphase endet in Kürze",
    html: baseTemplate(content, ""),
  };
}

/**
 * Password Reset Email Template
 */
export function passwordResetTemplate(data: EmailTemplateData): { subject: string; html: string } {
  const { firstName, verificationUrl } = data;
  
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1e293b;">Passwort zurücksetzen</h2>
    
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #475569;">
      Hallo ${firstName}, wir haben eine Anfrage erhalten, Ihr Passwort zurückzusetzen.
    </p>
    
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #475569;">
      Klicken Sie auf den folgenden Button, um ein neues Passwort festzulegen:
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td style="text-align: center; padding: 24px 0;">
          <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 8px; font-size: 16px;">
            Passwort zurücksetzen
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #64748b;">
      Dieser Link ist 1 Stunde gültig und kann nur einmal verwendet werden.<br>
      Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.
    </p>
  `;

  return {
    subject: "Passwort zurücksetzen – ReinPlaner",
    html: baseTemplate(content, ""),
  };
}
