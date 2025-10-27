"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Users, 
  Briefcase, 
  Clock, 
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Star,
  MessageSquare,
  FileText,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfDay, endOfDay } from "date-fns";
import { de } from "date-fns/locale";

interface WidgetProps {
  title: string;
  icon?: React.ReactNode;
  value?: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  items?: Array<{
    label: string;
    value: string | number;
    status?: string;
    priority?: string;
  }>;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'compact' | 'list' | 'stats';
  color?: string;
}

export function MobileDashboardWidget({
  title,
  icon,
  value,
  change,
  changeType = 'neutral',
  items,
  action,
  variant = 'default',
  color = 'primary',
}: WidgetProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case 'increase': return 'text-green-600 dark:text-green-400';
      case 'decrease': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case 'increase': return '↑';
      case 'decrease': return '↓';
      default: return '→';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200';
    }
  };

  if (variant === 'compact') {
    return (
      <Card className="glassmorphism-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {icon && <div className="text-muted-foreground">{icon}</div>}
              <div>
                <div className="text-sm text-muted-foreground">{title}</div>
                <div className="text-xl font-bold">{value}</div>
              </div>
            </div>
            {change !== undefined && (
              <div className={cn("text-sm flex items-center", getChangeColor())}>
                <span className="mr-1">{getChangeIcon()}</span>
                {Math.abs(change)}%
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'stats') {
    return (
      <Card className="glassmorphism-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center">
            {icon && <div className="mr-2">{icon}</div>}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{value}</div>
            {change !== undefined && (
              <div className={cn("text-sm mt-1", getChangeColor())}>
                <span className="mr-1">{getChangeIcon()}</span>
                {Math.abs(change)}% zum Vormonat
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'list') {
    return (
      <Card className="glassmorphism-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center">
              {icon && <div className="mr-2">{icon}</div>}
              {title}
            </div>
            {items && (
              <Badge variant="secondary" className="text-xs">
                {items.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items?.slice(0, 5).map((item, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
              <div className="flex-grow min-w-0">
                <div className="text-sm font-medium truncate">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.value}</div>
              </div>
              {item.status && (
                <Badge variant="outline" className={cn("text-xs", getStatusColor(item.status))}>
                  {item.status}
                </Badge>
              )}
              {item.priority && (
                <Badge variant="outline" className={cn("text-xs", getStatusColor(item.priority))}>
                  {item.priority}
                </Badge>
              )}
            </div>
          ))}
          {items && items.length > 5 && (
            <div className="text-center text-sm text-muted-foreground pt-2">
              +{items.length - 5} weitere
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glassmorphism-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          {icon && <div className="mr-2">{icon}</div>}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {value !== undefined && (
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{value}</div>
            {change !== undefined && (
              <div className={cn("text-sm mt-1", getChangeColor())}>
                <span className="mr-1">{getChangeIcon()}</span>
                {Math.abs(change)}%
              </div>
            )}
          </div>
        )}

        {items && (
          <div className="space-y-2">
            {items.slice(0, 3).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm">{item.label}</span>
                <span className="text-sm font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {action && (
          <Button
            onClick={action.onClick}
            className="w-full"
            variant={color === 'primary' ? 'default' : 'outline'}
          >
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Predefined widgets for common use cases
export const Widgets = {
  TodayHours: (hours: number, change?: number) => (
    <MobileDashboardWidget
      title="Heute"
      icon={<Clock className="h-5 w-5" />}
      value={`${hours.toFixed(1)}h`}
      change={change}
      changeType={change && change > 0 ? 'increase' : change && change < 0 ? 'decrease' : 'neutral'}
      variant="compact"
    />
  ),

  WeekHours: (hours: number, change?: number) => (
    <MobileDashboardWidget
      title="Woche"
      icon={<Calendar className="h-5 w-5" />}
      value={`${hours.toFixed(1)}h`}
      change={change}
      changeType={change && change > 0 ? 'increase' : change && change < 0 ? 'decrease' : 'neutral'}
      variant="compact"
    />
  ),

  ActiveOrders: (count: number) => (
    <MobileDashboardWidget
      title="Aktive Aufträge"
      icon={<Briefcase className="h-5 w-5" />}
      value={count}
      variant="stats"
      color="blue"
    />
  ),

  PendingTasks: (tasks: Array<{ label: string; priority: string }>) => (
    <MobileDashboardWidget
      title="Anstehende Aufgaben"
      icon={<AlertTriangle className="h-5 w-5" />}
      items={tasks.map(task => ({ ...task, value: task.priority }))}
      variant="list"
      color="orange"
    />
  ),

  RecentActivity: (activities: Array<{ label: string; value: string; status: string }>) => (
    <MobileDashboardWidget
      title="Letzte Aktivität"
      icon={<Activity className="h-5 w-5" />}
      items={activities}
      variant="list"
    />
  ),

  Revenue: (revenue: number, change?: number) => (
    <MobileDashboardWidget
      title="Umsatz"
      icon={<DollarSign className="h-5 w-5" />}
      value={`€${revenue.toFixed(2)}`}
      change={change}
      changeType={change && change > 0 ? 'increase' : change && change < 0 ? 'decrease' : 'neutral'}
      variant="stats"
      color="green"
    />
  ),

  TeamMembers: (members: Array<{ name: string; status: string }>) => (
    <MobileDashboardWidget
      title="Team"
      icon={<Users className="h-5 w-5" />}
      items={members.map(m => ({ label: m.name, value: m.status, status: m.status }))}
      variant="list"
      action={{
        label: "Team verwalten",
        onClick: () => console.log('Manage team'),
      }}
    />
  ),
};