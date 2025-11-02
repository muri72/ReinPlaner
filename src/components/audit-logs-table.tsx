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
import { RefreshCw, Shield, User, Settings, Database, FileText } from "lucide-react";

interface AuditLog {
  id: string;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  user_agent: string | null;
  status: string;
  error_message: string | null;
}

interface AuditLogsTableProps {
  limit?: number;
}

export function AuditLogsTable({ limit = 100 }: AuditLogsTableProps) {
  const supabase = createClient();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
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
  }, [actionFilter, statusFilter]);

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

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
        return <Badge className="bg-green-100 text-green-800">Erfolgreich</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-800">Fehler</Badge>;
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800">Warnung</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-10 w-[250px] bg-muted rounded animate-pulse" />
          <div className="h-10 w-[100px] bg-muted rounded animate-pulse" />
        </div>
        <div className="rounded-md border">
          <div className="h-[400px] w-full bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={fetchLogs} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Erneut versuchen
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
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

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="success">Erfolgreich</SelectItem>
              <SelectItem value="error">Fehler</SelectItem>
              <SelectItem value="warning">Warnung</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={fetchLogs} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Aktualisieren
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zeitpunkt</TableHead>
              <TableHead>Benutzer</TableHead>
              <TableHead>Aktion</TableHead>
              <TableHead>Tabelle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
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
                        {log.user_email || "System"}
                      </span>
                      {log.user_id && (
                        <span className="text-xs text-muted-foreground">
                          {log.user_id.substring(0, 8)}...
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
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      {log.error_message && (
                        <p className="text-xs text-red-600 truncate" title={log.error_message}>
                          {log.error_message}
                        </p>
                      )}
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
    </div>
  );
}
