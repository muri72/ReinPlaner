/**
 * User Assignment Confirmation Dialogs
 *
 * Extracted from user-form.tsx
 * Handles confirmation dialogs for reassignment and unassignment operations.
 */

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
import { ReassignmentState, UnassignState } from "@/hooks/use-user-form-data";

interface ReassignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingReassignment: ReassignmentState | null;
  onConfirm: () => void;
}

export function ReassignmentDialog({
  open,
  onOpenChange,
  pendingReassignment,
  onConfirm,
}: ReassignmentDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Neuzuweisung bestätigen</AlertDialogTitle>
          <AlertDialogDescription>
            {pendingReassignment && (
              <>
                Sie möchten <strong>{pendingReassignment.name}</strong> einem anderen Benutzer zuweisen.
                <br /><br />
                Der aktuell zugewiesene Benutzer wird automatisch entkoppelt und dieser Benutzer wird die neue Zuweisung erhalten.
                <br /><br />
                Möchten Sie fortfahren?
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
            Ja, Zuweisung ändern
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface UnassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingUnassign: UnassignState | null;
  onConfirm: () => void;
}

export function UnassignDialog({
  open,
  onOpenChange,
  pendingUnassign,
  onConfirm,
}: UnassignDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Zuweisung aufheben</AlertDialogTitle>
          <AlertDialogDescription>
            {pendingUnassign && (
              <>
                Möchten Sie die Zuweisung von <strong>{pendingUnassign.name}</strong> wirklich aufheben?
                <br /><br />
                Der Kunde/Mitarbeiter wird dann keinen Benutzer-Account mehr zugewiesen haben.
                <br /><br />
                Diese Aktion kann rückgängig gemacht werden, indem Sie später eine neue Zuweisung vornehmen.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
            Ja, Zuweisung aufheben
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
