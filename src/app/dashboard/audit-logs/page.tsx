import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Shield, User, Clock, Database } from "lucide-react";
import { PageHeader } from "@/components/page-header";

interface AuditLog {
  id: string;
  user_id: string;
  impersonation_session_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_data: any;
  new_data: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default async function AuditLogsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if the current user is an admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    console.error("Fehler beim Abrufen des Benutzerprofils:", profileError?.message || profileError);
    redirect("/dashboard");
  }

  // Fetch audit logs
  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      profiles (first_name, last_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error("Fehler beim Laden der Audit-Logs:", error?.message || error);
  }

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'START_IMPERSONATION':
      case 'STOP_IMPERSONATION':
        return 'destructive';
      case 'INSERT':
        return 'default';
      case 'UPDATE':
        return 'secondary';
      case 'DELETE':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'START_IMPERSONATION':
      case 'STOP_IMPERSONATION':
        return <User className="h-4 w-4" />;
      case 'INSERT':
        return <Database className="h-4 w-4" />;
      case 'UPDATE':
        return <Database className="h-4 w-4" />;
      case 'DELETE':
        return <Database className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Audit-Logs</h1>
          <div className="text-sm text-muted-foreground">
            Protokollierung aller wichtigen Aktionen und Impersonationen
          </div>
        </div>
      </div>

      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Letzte 100 Aktionen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!logs || logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Keine Audit-Logs gefunden
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zeitpunkt</TableHead>
                    <TableHead>Benutzer</TableHead>
                    <TableHead>Aktion</TableHead>
                    <TableHead>Tabelle</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP-Adresse</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: AuditLog) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: de })}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {log.profiles?.first_name} {log.profiles?.last_name}
                          </span>
                          {log.profiles?.email && (
                            <span className="text-xs text-muted-foreground">
                              {log.profiles.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getActionIcon(log.action)}
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {log.action}
                          </Badge>
                          {log.impersonation_session_id && (
                            <Badge variant="outline" className="text-xs">
                              Impersonation
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.table_name || '-'}
                      </TableCell>
                      <TableCell className="text-sm max-w-xs">
                        {log.new_data && (
                          <div className="space-y-1">
                            {Object.entries(log.new_data).map(([key, value]) => (
                              <div key={key} className="text-xs">
                                <span className="font-medium">{key}:</span> {String(value)}
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.ip_address || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}