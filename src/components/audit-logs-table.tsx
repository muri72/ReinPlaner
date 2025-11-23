"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { RefreshCw, Shield, User, Settings, Database, FileText, ChevronDown, Eye } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AuditLog {
  id: string;
  created_at: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_data: any;
  new_data: any;
  ip_address: string | null;
  user_agent: string | null;
}

interface AuditLogsTableProps {
  limit?: number;
}

export function AuditLogsTable({ limit = 100 }: AuditLogsTableProps) {
  const supabase = createClient();
  const isMobile = useIsMobile();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>("all");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLogs(data || []);
    } catch (err: any) {
      setError(err.message || "Fehler beim Laden der Audit-Logs");
      console.error("Audit-Logs fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "insert":
        return <FileText className="h-4 w-4 text-green-600" />;
      case "update":
        return <Settings className="h-4 w-4 text-blue-600" />;
      case "delete":
        return <Database className="h-4 w-4 text-red-600" />;
      case "login":
      case "logout":
        return <User className="h-4 w-4 text-purple-600" />;
      default:
        return <Shield className="h-4 w-4 text-gray-600" />;
    }
  };

  // Mobile Card View
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Filter Controls - Mobile */}
        <div className="space-y-2">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Aktion filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Aktionen</SelectItem>
              <SelectItem value="INSERT">Erstellen</SelectItem>
              <SelectItem value="UPDATE">Bearbeiten</SelectItem>
              <SelectItem value="DELETE">Löschen</SelectItem>
              <SelectItem value="LOGIN">Login</SelectItem>
              <SelectItem value="LOGOUT">Logout</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={fetchLogs} variant="outline" size="sm" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
        </div>

        {/* Loading State - Mobile */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
                    <div className="h-6 bg-muted rounded w-1/2 animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          /* Error State - Mobile */
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center p-4 space-y-4">
                <p className="text-destructive text-center">{error}</p>
                <Button onClick={fetchLogs} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Erneut versuchen
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Card List - Mobile */
          <div className="space-y-3">
            {logs.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Keine Audit-Logs gefunden
                  </p>
                </CardContent>
              </Card>
            ) : (
              logs.map((log) => (
                <Card key={log.id} className="overflow-hidden">
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base flex items-center gap-2 truncate">
                              {getActionIcon(log.action)}
                              <span className="truncate">{log.action}</span>
                            </CardTitle>
                            <CardDescription className="mt-1">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs">
                                  {format(new Date(log.created_at), "dd.MM.yyyy HH:mm:ss", { locale: de })}
                                </span>
                                <span className="text-sm font-medium truncate">
                                  {log.user_id ? log.user_id.substring(0, 8) + "..." : "System"}
                                </span>
                              </div>
                            </CardDescription>
                          </div>
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="space-y-1">
                              <p className="text-muted-foreground text-xs">Tabelle</p>
                              <Badge variant="outline" className="w-fit">
                                {log.table_name || "-"}
                              </Badge>
                            </div>
                            {log.record_id && (
                              <div className="space-y-1">
                                <p className="text-muted-foreground text-xs">Datensatz-ID</p>
                                <p className="font-mono text-xs truncate" title={log.record_id}>
                                  {log.record_id.substring(0, 12)}...
                                </p>
                              </div>
                            )}
                          </div>

                          {log.user_id && (
                            <div className="space-y-1">
                              <p className="text-muted-foreground text-xs">User-ID</p>
                              <p className="font-mono text-xs truncate" title={log.user_id}>
                                {log.user_id}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))
            )}
          </div>
        )}

        {logs.length > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Zeige {logs.length} von {limit} neuesten Einträgen
          </p>
        )}
      </div>
    );
  }

  // Desktop Table View
  return (
    <div className="space-y-4">
      {/* Filter Controls - Desktop */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Aktion filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Aktionen</SelectItem>
            <SelectItem value="INSERT">Erstellen</SelectItem>
            <SelectItem value="UPDATE">Bearbeiten</SelectItem>
            <SelectItem value="DELETE">Löschen</SelectItem>
            <SelectItem value="LOGIN">Login</SelectItem>
            <SelectItem value="LOGOUT">Logout</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={fetchLogs} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Aktualisieren
        </Button>
      </div>

      {/* Loading State - Desktop */}
      {loading ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-[250px] bg-muted rounded animate-pulse" />
            <div className="h-10 w-[100px] bg-muted rounded animate-pulse" />
          </div>
          <div className="rounded-md border">
            <div className="h-[400px] w-full bg-muted rounded animate-pulse" />
          </div>
        </div>
      ) : error ? (
        /* Error State - Desktop */
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <p className="text-destructive">{error}</p>
          <Button onClick={fetchLogs} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Erneut versuchen
          </Button>
        </div>
      ) : (
        <>
          {/* Table - Desktop */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zeitpunkt</TableHead>
                  <TableHead>Benutzer</TableHead>
                  <TableHead>Aktion</TableHead>
                  <TableHead>Tabelle</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Keine Audit-Logs gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.created_at), "dd.MM.yyyy HH:mm:ss", { locale: de })}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {log.user_id ? log.user_id.substring(0, 8) + "..." : "System"}
                          </span>
                          {log.user_id && (
                            <span className="text-xs text-muted-foreground">
                              User-ID
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <span className="font-mono text-sm">{log.action}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.table_name || "-"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          {log.record_id && (
                            <p className="text-xs text-muted-foreground">
                              ID: {log.record_id.substring(0, 8)}...
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {logs.length > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Zeige {logs.length} von {limit} neuesten Einträgen
            </p>
          )}
        </>
      )}
    </div>
  );
}
