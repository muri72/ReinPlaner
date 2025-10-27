"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Clock, 
  Calendar, 
  Users, 
  MessageSquare, 
  FileText,
  Camera,
  Scan
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  action: () => void;
  badge?: number;
}

interface MobileQuickActionsProps {
  onNewOrder?: () => void;
  onStartTimeEntry?: () => void;
  onViewSchedule?: () => void;
  onContactTeam?: () => void;
  onNewTicket?: () => void;
  onViewReports?: () => void;
  onScanDocument?: () => void;
  onTakePhoto?: () => void;
  onNewBooking?: () => void;
  notificationCount?: number;
  pendingTasksCount?: number;
}

export function MobileQuickActions({
  onNewOrder,
  onStartTimeEntry,
  onViewSchedule,
  onContactTeam,
  onNewTicket,
  onViewReports,
  onScanDocument,
  onTakePhoto,
  onNewBooking,
  notificationCount = 0,
  pendingTasksCount = 0,
}: MobileQuickActionsProps) {
  const quickActions: QuickAction[] = [
    {
      id: 'new-order',
      title: 'Neuer Auftrag',
      description: 'Auftrag erstellen',
      icon: <Plus className="h-6 w-6" />,
      color: 'bg-blue-500',
      action: onNewOrder || (() => {}),
    },
    {
      id: 'start-time',
      title: 'Zeit starten',
      description: 'Zeiterfassung beginnen',
      icon: <Clock className="h-6 w-6" />,
      color: 'bg-green-500',
      action: onStartTimeEntry || (() => {}),
    },
    {
      id: 'view-schedule',
      title: 'Planung',
      description: 'Wochenplan einsehen',
      icon: <Calendar className="h-6 w-6" />,
      color: 'bg-purple-500',
      action: onViewSchedule || (() => {}),
    },
    {
      id: 'contact-team',
      title: 'Team',
      description: 'Mitarbeiter kontaktieren',
      icon: <Users className="h-6 w-6" />,
      color: 'bg-orange-500',
      action: onContactTeam || (() => {}),
    },
    {
      id: 'new-ticket',
      title: 'Ticket',
      description: 'Support-Ticket',
      icon: <MessageSquare className="h-6 w-6" />,
      color: 'bg-red-500',
      action: onNewTicket || (() => {}),
      badge: pendingTasksCount,
    },
    {
      id: 'view-reports',
      title: 'Berichte',
      description: 'Reports & Analysen',
      icon: <FileText className="h-6 w-6" />,
      color: 'bg-gray-500',
      action: onViewReports || (() => {}),
    },
  ];

  const utilityActions = [
    {
      id: 'scan-document',
      title: 'Scannen',
      description: 'Dokument scannen',
      icon: <Scan className="h-6 w-6" />,
      color: 'bg-cyan-500',
      action: onScanDocument || (() => {}),
    },
    {
      id: 'take-photo',
      title: 'Foto',
      description: 'Foto machen',
      icon: <Camera className="h-6 w-6" />,
      color: 'bg-pink-500',
      action: onTakePhoto || (() => {}),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Primary Actions */}
      <Card className="glassmorphism-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Schnellaktionen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.id}
                variant="ghost"
                className="h-16 flex flex-col items-center justify-center p-2 rounded-lg transition-all hover:scale-105 active:scale-95"
                onClick={action.action}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-white mb-2",
                  action.color
                )}>
                  {action.icon}
                </div>
                <span className="text-xs font-medium text-center">{action.title}</span>
                {action.badge && action.badge > 0 && (
                  <div className="absolute -top-1 -right-1 bg-destructive text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {action.badge > 99 ? '99+' : action.badge}
                  </div>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Utility Actions */}
      <Card className="glassmorphism-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Werkzeuge</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {utilityActions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                className="h-14 flex flex-col items-center justify-center p-2 rounded-lg transition-all hover:scale-105 active:scale-95"
                onClick={action.action}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center mb-1",
                  action.color,
                  "text-white"
                )}>
                  {action.icon}
                </div>
                <span className="text-xs font-medium">{action.title}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Overview */}
      {(notificationCount > 0 || pendingTasksCount > 0) && (
        <Card className="glassmorphism-card border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-orange-600">Ausstehende Aufgaben</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notificationCount > 0 && (
              <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-sm font-medium">Benachrichtigungen</span>
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  {notificationCount}
                </span>
              </div>
            )}
            {pendingTasksCount > 0 && (
              <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <span className="text-sm font-medium">Anstehende Aufgaben</span>
                <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                  {pendingTasksCount}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}