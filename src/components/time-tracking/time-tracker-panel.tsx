"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOfflineTimeTracker } from "@/hooks/use-offline-time-tracker";
import { TouchButton, TouchIconButton, ActionStrip } from "@/components/ui/touch-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Clock,
  Play,
  Square,
  RotateCcw,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  CalendarDays,
  MapPin,
  FileText,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface OrderWithDetails {
  id: string;
  title: string;
  customer_id: string;
  object_id: string | null;
  order_type: string;
  object: {
    name: string;
    address?: string;
  } | null;
}

interface TimeTrackerPanelProps {
  userId: string;
  employeeId: string | null;
  employeeStatus: string | null;
  onEntryCreated?: () => void;
}

export function TimeTrackerPanel({
  userId,
  employeeId,
  employeeStatus,
  onEntryCreated,
}: TimeTrackerPanelProps) {
  const supabase = createClient();

  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [showNotesSheet, setShowNotesSheet] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const {
    isRunning,
    isOnline,
    elapsedSeconds,
    displayTime,
    pendingCount,
    activeEntry,
    isSyncing,
    start,
    stop,
    syncPendingEntries,
    refreshPendingCount,
  } = useOfflineTimeTracker({
    userId,
    employeeId,
    onSyncComplete: onEntryCreated,
  });

  // Fetch available orders
  useEffect(() => {
    if (!employeeId || employeeStatus !== "active") return;

    const fetchOrders = async () => {
      setLoadingOrders(true);
      const { data } = await supabase
        .from("orders")
        .select(`
          id, title, customer_id, object_id, order_type,
          objects ( name, address )
        `)
        .eq("request_status", "approved")
        .order("title", { ascending: true });

      if (data) {
        const mapped: OrderWithDetails[] = data.map((o: any) => ({
          id: o.id,
          title: o.title,
          customer_id: o.customer_id,
          object_id: o.object_id,
          order_type: o.order_type,
          object: o.objects
            ? {
                name: (Array.isArray(o.objects) ? o.objects[0] : o.objects)?.name,
                address: (Array.isArray(o.objects) ? o.objects[0] : o.objects)?.address,
              }
            : null,
        }));
        setOrders(mapped);
      }
      setLoadingOrders(false);
    };

    fetchOrders();
  }, [employeeId, employeeStatus, supabase]);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  const handleStart = () => {
    if (!employeeId) {
      toast.error("Kein Mitarbeiter zugewiesen.");
      return;
    }
    start(selectedOrderId, selectedOrder?.object_id || null, notes || undefined);
  };

  const handleStop = () => {
    stop(notes || undefined);
  };

  const handleSync = () => {
    syncPendingEntries();
  };

  // Employee not active
  if (!employeeId || (employeeStatus !== "active" && employeeStatus !== "on_leave")) {
    return (
      <Card className="border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="flex items-center gap-3 p-4">
          <AlertCircle className="h-8 w-8 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-100">
              Zeiterfassung nicht verfügbar
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-200">
              Ihr Konto ist keinem aktiven Mitarbeiter zugewiesen.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Online/Offline indicator */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
              isOnline
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            )}
          >
            {isOnline ? (
              <Wifi className="h-3.5 w-3.5" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}
            {isOnline ? "Online" : "Offline"}
          </div>

          {/* Pending sync indicator */}
          {pendingCount > 0 && (
            <Badge
              variant="outline"
              className="text-xs border-amber-400 text-amber-700 dark:text-amber-300"
            >
              {pendingCount} ausstehend
            </Badge>
          )}
        </div>

        {/* Sync button */}
        {pendingCount > 0 && isOnline && (
          <TouchIconButton
            variant="outline"
            size="sm"
            icon={<RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />}
            label="Synchronisieren"
            isLoading={isSyncing}
            onClick={handleSync}
          />
        )}
      </div>

      {/* Main Time Display */}
      <Card
        className={cn(
          "border-2 transition-colors duration-300",
          isRunning
            ? "border-green-400 dark:border-green-600 bg-green-50/50 dark:bg-green-950/20"
            : "border-border"
        )}
      >
        <CardContent className="p-6">
          {/* Large Timer Display */}
          <div className="text-center mb-6">
            <div
              className={cn(
                "text-6xl md:text-7xl font-mono font-bold tracking-tight",
                isRunning
                  ? "text-green-700 dark:text-green-400"
                  : "text-muted-foreground"
              )}
            >
              {displayTime}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {isRunning && activeEntry ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Läuft seit {format(new Date(activeEntry.startTime), "HH:mm", { locale: de })} Uhr
                </span>
              ) : (
                <span>Zeiterfassung gestoppt</span>
              )}
            </div>
          </div>

          {/* Order Selection */}
          {!isRunning && (
            <div className="space-y-3 mb-6">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  Auftrag auswählen (optional)
                </Label>
                <Select
                  value={selectedOrderId || "none"}
                  onValueChange={(v) => setSelectedOrderId(v === "none" ? null : v)}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Kein Auftrag – einfach stempeln" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kein Auftrag</SelectItem>
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        <div className="flex flex-col items-start">
                          <span>{order.title}</span>
                          {order.object && (
                            <span className="text-xs text-muted-foreground">
                              {order.object.name}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected Order Info */}
              {selectedOrder && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium text-foreground">
                      {selectedOrder.title}
                    </span>
                  </div>
                  {selectedOrder.object && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span>{selectedOrder.object.name}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes Button (shown when running or for quick add) */}
          {isRunning && (
            <div className="mb-4">
              <Sheet open={showNotesSheet} onOpenChange={setShowNotesSheet}>
                <SheetTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl border",
                      "text-sm transition-colors",
                      notes
                        ? "bg-primary/5 border-primary/20 text-foreground"
                        : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                    )}
                    onClick={() => setShowNotesSheet(true)}
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {notes ? "Notiz bearbeiten" : "Notiz hinzufügen"}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-3xl">
                  <SheetHeader className="pb-4">
                    <SheetTitle>Notiz zum Zeiteintrag</SheetTitle>
                  </SheetHeader>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="z.B. Besonderheit heute, Materialien verwendet..."
                    className="min-h-[120px] text-base"
                    autoFocus
                  />
                  <div className="mt-4 flex gap-2">
                    <TouchButton
                      label="Abbrechen"
                      variant="outline"
                      size="md"
                      fullWidth
                      onClick={() => setShowNotesSheet(false)}
                    />
                    <TouchButton
                      label="Speichern"
                      variant="primary"
                      size="md"
                      fullWidth
                      onClick={() => setShowNotesSheet(false)}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}

          {/* Main Action Buttons */}
          <ActionStrip
            actions={
              isRunning
                ? [
                    {
                      id: "stop",
                      label: "Stopp",
                      icon: <Square className="h-7 w-7" />,
                      variant: "danger",
                      onClick: handleStop,
                    },
                  ]
                : [
                    {
                      id: "start",
                      label: "Start",
                      icon: <Play className="h-7 w-7" />,
                      variant: "success",
                      onClick: handleStart,
                    },
                  ]
            }
          />
        </CardContent>
      </Card>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Today's date */}
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Datum</p>
              <p className="font-semibold text-sm truncate">
                {format(new Date(), "EEE, dd.MM.", { locale: de })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Online status detail */}
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                isOnline ? "bg-green-100 dark:bg-green-900/30" : "bg-amber-100 dark:bg-amber-900/30"
              )}
            >
              {isOnline ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-amber-600" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-semibold text-sm">
                {isOnline ? "Bereit" : `${pendingCount} gepuffert`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Status */}
      {pendingCount > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                {pendingCount} Eintrag{pendingCount > 1 ? "e" : ""} warten auf Synchronisation
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-200 mt-0.5">
                {isOnline
                  ? "Tippen Sie auf Synchronisieren, um die Daten jetzt hochzuladen."
                  : "Sobald eine Internetverbindung besteht, werden die Daten automatisch synchronisiert."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
