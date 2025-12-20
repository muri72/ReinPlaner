"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Calendar,
  MessageSquare,
  Star,
  FileText,
  Edit,
  Phone,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Order {
  id: string;
  title: string;
  status: string;
  priority: string;
  start_date: string | null;
  end_date: string | null;
  order_type: string;
  service_type: string | null;
  customer_name: string | null;
  object_name: string | null;
  employee_names: string[] | null;
  notes: string | null;
  customer_notes: string | null;
  order_feedback?: {
    rating: number;
    comment: string;
  } | null;
}

interface MobileOrderCardProps {
  order: Order;
  onStatusChange?: (orderId: string, newStatus: string) => void;
  onEdit?: () => void;
  onContact?: () => void;
  onViewDetails?: () => void;
}

export function MobileOrderCard({
  order,
  onStatusChange,
  onEdit,
  onContact,
  onViewDetails,
}: MobileOrderCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
      case 'medium':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Abgeschlossen';
      case 'in_progress':
        return 'In Bearbeitung';
      case 'pending':
        return 'Ausstehend';
      default:
        return status;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Hoch';
      case 'medium':
        return 'Mittel';
      case 'low':
        return 'Niedrig';
      default:
        return priority;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= rating
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Card className="glassmorphism-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{order.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {order.service_type || order.order_type}
            </p>
          </div>
          <Badge variant="secondary" className={`ml-2 ${getPriorityColor(order.priority)}`}>
            {getPriorityLabel(order.priority)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge variant="outline" className={getStatusColor(order.status)}>
            {getStatusLabel(order.status)}
          </Badge>
        </div>

        {/* Dates */}
        {(order.start_date || order.end_date) && (
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {order.start_date
                ? format(new Date(order.start_date), 'dd.MM.yyyy', { locale: de })
                : 'N/A'}
              {order.end_date && (
                <>
                  {' - '}
                  {format(new Date(order.end_date), 'dd.MM.yyyy', { locale: de })}
                </>
              )}
            </span>
          </div>
        )}

        {/* Feedback */}
        {order.order_feedback && (
          <div className="bg-muted/30 p-3 rounded-md space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Ihre Bewertung:</span>
              {renderStars(order.order_feedback.rating)}
            </div>
            {order.order_feedback.comment && (
              <p className="text-sm text-muted-foreground">
                "{order.order_feedback.comment}"
              </p>
            )}
          </div>
        )}

        {/* Notes */}
        {order.notes && (
          <div className="text-sm">
            <div className="flex items-start space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-muted-foreground">{order.notes}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDetails}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            Details
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onContact}
            className="flex-1"
          >
            <Phone className="h-4 w-4 mr-1" />
            Kontakt
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-1" />
            Bearbeiten
          </Button>
        </div>

        {/* Feedback Button (if no feedback yet and order is completed) */}
        {order.status === 'completed' && !order.order_feedback && (
          <Button
            variant="default"
            size="sm"
            onClick={() => console.log('Give feedback for order:', order.id)}
            className="w-full mt-2"
          >
            <Star className="h-4 w-4 mr-2" />
            Feedback geben
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
