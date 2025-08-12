"use client";

import { toast } from "sonner";

interface ActionResponse {
  success: boolean;
  message: string;
}

/**
 * Behandelt die Antwort einer Server-Aktion oder einer anderen asynchronen Operation
 * und zeigt entsprechende Toast-Benachrichtigungen an.
 *
 * @param response Das Ergebnis der Aktion, das ein success-Flag und eine Nachricht enthält.
 * @param successMessage Eine optionale benutzerdefinierte Erfolgsmeldung.
 * @param errorMessage Eine optionale benutzerdefinierte Fehlermeldung.
 */
export function handleActionResponse(
  response: ActionResponse,
  successMessage?: string,
  errorMessage?: string
) {
  if (response.success) {
    toast.success(successMessage || response.message);
  } else {
    toast.error(errorMessage || response.message);
  }
}