"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarDays, CalendarRange, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SeriesEditMode = "single" | "future" | "all" | null;

interface SeriesEditModeDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (mode: SeriesEditMode) => void;
  orderTitle: string;
  isRecurring: boolean;
}

export function SeriesEditModeDialog({
  open,
  onClose,
  onSelect,
  orderTitle,
  isRecurring,
}: SeriesEditModeDialogProps) {
  // If not recurring, auto-select "single" mode
  React.useEffect(() => {
    if (open && !isRecurring) {
      onSelect("single");
    }
  }, [open, isRecurring, onSelect]);

  // Don't show dialog for non-recurring orders
  if (!isRecurring) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-blue-500" />
            Serien-Einsatz bearbeiten
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                <strong>{orderTitle}</strong> ist ein wiederkehrender Einsatz.
              </p>
              <p>Welche Termine möchten Sie bearbeiten?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-3 py-4">
          <Button
            variant="outline"
            className="justify-start h-auto py-3 px-4"
            onClick={() => onSelect("single")}
          >
            <CalendarDays className="h-5 w-5 mr-3 text-muted-foreground" />
            <div className="text-left">
              <div className="font-medium">Nur diesen Termin</div>
              <div className="text-xs text-muted-foreground">
                Nur der aktuelle Termin wird geändert
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="justify-start h-auto py-3 px-4"
            onClick={() => onSelect("future")}
          >
            <CalendarRange className="h-5 w-5 mr-3 text-muted-foreground" />
            <div className="text-left">
              <div className="font-medium">Alle zukünftigen Termine</div>
              <div className="text-xs text-muted-foreground">
                Dieser und alle folgenden Termine werden geändert
              </div>
            </div>
          </Button>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Abbrechen</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
