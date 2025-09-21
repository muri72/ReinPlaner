"use client";

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
import { Button } from "./ui/button";

interface RecurringEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmSingle: () => void;
  onConfirmSeries: () => void;
}

export function RecurringEditDialog({
  open,
  onOpenChange,
  onConfirmSingle,
  onConfirmSeries,
}: RecurringEditDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="glassmorphism-card">
        <AlertDialogHeader>
          <AlertDialogTitle>Wiederkehrenden Einsatz bearbeiten</AlertDialogTitle>
          <AlertDialogDescription>
            Diese Änderung betrifft einen wiederkehrenden Einsatz. Möchten Sie nur diesen einen Termin oder auch alle zukünftigen Termine in dieser Serie ändern?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <Button variant="outline" onClick={onConfirmSingle}>
            Nur diesen Termin
          </Button>
          <AlertDialogAction onClick={onConfirmSeries}>
            Diesen & alle folgenden
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}