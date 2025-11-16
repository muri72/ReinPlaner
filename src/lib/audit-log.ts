import { createClient } from "@/lib/supabase/server";

export interface AuditLogData {
  userId?: string;
  action: string;
  tableName?: string;
  recordId?: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
  status?: "success" | "error" | "warning";
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
      old_data: data.oldData,
      new_data: data.newData,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("audit_logs").insert(logEntry);

    if (error) {
      console.error("Fehler beim Erstellen des Audit-Logs:", error);
      // Don't throw error to avoid breaking the main operation
      return { success: false, error };
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
  oldData?: any,
  newData?: any,
  ipAddress?: string,
  userAgent?: string
) {
  return createAuditLog({
    userId,
    action,
    tableName,
    recordId,
    oldData,
    newData,
    ipAddress,
    userAgent,
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
  oldData?: any,
  newData?: any,
  ipAddress?: string,
  userAgent?: string
) {
  return createAuditLog({
    userId,
    action: `CRITICAL: ${action}`,
    tableName: "users",
    status,
    errorMessage: details,
    oldData,
    newData,
    ipAddress,
    userAgent,
  });
}
