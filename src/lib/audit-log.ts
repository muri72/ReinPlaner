import { createClient } from "@/lib/supabase/server";

export interface AuditLogData {
  userId?: string;
  action: string;
  tableName?: string;
  recordId?: string;
  oldValues?: any;
  newValues?: any;
  status: "success" | "error" | "warning";
  errorMessage?: string;
}

/**
 * Erstellt einen Audit-Log-Eintrag in der Datenbank
 */
export async function createAuditLog(data: AuditLogData) {
  const supabase = await createClient();

  try {
    const logEntry = {
      user_id: data.userId,
      action: data.action,
      table_name: data.tableName,
      record_id: data.recordId,
      old_values: data.oldValues,
      new_values: data.newValues,
      status: data.status,
      error_message: data.errorMessage,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("audit_logs").insert(logEntry);

    if (error) {
      console.error("Fehler beim Erstellen des Audit-Logs:", error);
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error("Audit-Log Fehler:", error);
    return { success: false, error };
  }
}

/**
 * Audit-Log für Benutzeraktionen
 */
export async function logUserAction(
  userId: string,
  action: string,
  status: "success" | "error" | "warning" = "success",
  details?: string
) {
  return createAuditLog({
    userId,
    action,
    status,
    errorMessage: details,
  });
}

/**
 * Audit-Log für Datenbankänderungen
 */
export async function logDataChange(
  userId: string,
  action: "INSERT" | "UPDATE" | "DELETE",
  tableName: string,
  recordId: string,
  oldValues?: any,
  newValues?: any
) {
  return createAuditLog({
    userId,
    action,
    tableName,
    recordId,
    oldValues,
    newValues,
    status: "success",
  });
}

/**
 * Audit-Log für kritische Aktionen (z.B. Benutzerverwaltung)
 */
export async function logCriticalAction(
  userId: string,
  action: string,
  status: "success" | "error" | "warning",
  details?: string,
  oldValues?: any,
  newValues?: any
) {
  return createAuditLog({
    userId,
    action: `CRITICAL: ${action}`,
    tableName: "users",
    status,
    errorMessage: details,
    oldValues,
    newValues,
  });
}
