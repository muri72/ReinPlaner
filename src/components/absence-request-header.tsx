"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CalendarOff, User, FileText, CheckCircle2, XCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { AbsenceRequestEditDialog } from './absence-request-edit-dialog';
import { DeleteAbsenceRequestButton } from './delete-absence-request-button';

// Define types for props
interface AbsenceRequestHeaderProps {
  request: {
    id: string;
    employee_id: string;
    start_date: string;
    end_date: string;
    type: string;
    status: string;
    notes: string | null;
    admin_notes: string | null;
    employees: { first_name: string | null; last_name: string | null } | null;
  };
  currentUserRole: 'admin' | 'manager' | 'employee';
  currentUserId: string;
  // Prop to receive data-state from AccordionTrigger when using asChild
  'data-state'?: 'open' | 'closed';
}

const typeTranslations: { [key: string]: string } = {
  vacation: "Urlaub",
  sick_leave: "Krankheit",
  training: "Weiterbildung",
  other: "Sonstiges",
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'approved': return 'success';
    case 'rejected': return 'destructive';
    case 'pending':
    default: return 'warning';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'approved': return <CheckCircle2 className="mr-2 h-4 w-4 text-success-foreground" />;
    case 'rejected': return <XCircle className="mr-2 h-4 w-4 text-destructive-foreground" />;
    case 'pending':
    default: return <AlertCircle className="mr-2 h-4 w-4 text-warning-foreground" />;
  }
};

export function AbsenceRequestHeader({ request, currentUserRole, currentUserId, ...props }: AbsenceRequestHeaderProps) {
  const isManagerOrAdmin = currentUserRole === 'admin' || currentUserRole === 'manager';
  const isAccordionOpen = props['data-state'] === 'open';

  return (
    <div className="flex items-center justify-between p-4 w-full">
      {/* Main content of the accordion header */}
      <div className="flex flex-col items-start flex-grow pr-4">
        <h3 className="text-base md:text-lg font-semibold">
          {typeTranslations[request.type] || 'Abwesenheit'}
        </h3>
        {currentUserRole !== 'employee' && request.employees && (
          <div className="flex items-center text-sm text-muted-foreground">
            <User className="mr-2 h-4 w-4" />
            <span>{request.employees.first_name} {request.employees.last_name}</span>
          </div>
        )}
        <div className="flex items-center text-sm text-muted-foreground">
          <CalendarOff className="mr-2 h-4 w-4" />
          <span>{new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}</span>
        </div>
        <Badge variant={getStatusBadgeVariant(request.status) as any} className="mt-2">
          {getStatusIcon(request.status)}
          {request.status}
        </Badge>
      </div>

      {/* Action buttons and chevron, visually grouped */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        {/* Manually rendered chevron, rotates based on data-state */}
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", { "rotate-180": isAccordionOpen })} />
        <AbsenceRequestEditDialog request={request} currentUserRole={currentUserRole} currentUserId={currentUserId} />
        <DeleteAbsenceRequestButton requestId={request.id} />
      </div>
    </div>
  );
}