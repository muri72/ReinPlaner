"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2, Calendar, AlertTriangle } from "lucide-react";
import { deleteShift, deleteSeries, SeriesDeleteMode } from "@/lib/actions/shift-planning";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";

interface DeleteShiftDialogProps {
  shiftId: string;
  assignmentId?: string;
  shiftDate: string;
  shiftTitle: string;
  isRecurring: boolean;
  isDetached: boolean;
  onSuccess: () => void;
  children?: React.ReactNode;
}

export function DeleteShiftDialog({
  shiftId,
  assignmentId,
  shiftDate,
  shiftTitle,
  isRecurring,
  isDetached,
  onSuccess,
  children,
}: DeleteShiftDialogProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<SeriesDeleteMode>("future");

  const formattedDate = format(parseISO(shiftDate), "EEEE, d. MMMM yyyy", { locale: de });

  const handleDeleteSingle = async () => {
    setLoading(true);
    console.log("[DELETE-DIALOG] Deleting single shift:", { shiftId, shiftDate });

    const result = await deleteShift(shiftId, shiftDate, "Einzeltermin gelöscht");

    if (result.success) {
      toast.success(result.message);
      setOpen(false);
      onSuccess();
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  const handleDeleteSeries = async () => {
    if (!assignmentId) {
      toast.error("Keine Zuweisungs-ID gefunden");
      return;
    }

    setLoading(true);
    console.log("[DELETE-DIALOG] Deleting series:", { assignmentId, mode: deleteMode, shiftDate });

    const result = await deleteSeries(assignmentId, deleteMode, shiftDate);

    if (result.success) {
      toast.success(result.message);
      setOpen(false);
      onSuccess();
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              {children || (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive/80 h-6 w-6"
                  disabled={loading}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto glassmorphism-card">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-destructive" />
                  Einsatz löschen
                </DialogTitle>
                <DialogDescription>
                  Dieser Einsatz wird aus dem Plan entfernt.
                </DialogDescription>
              </DialogHeader>

              {/* Shift Info */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="font-semibold">{shiftTitle}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formattedDate}</span>
                </div>
                {isRecurring && (
                  <Badge variant="secondary" className="text-xs">
                    <Trash2 className="h-3 w-3 mr-1" />
                    Serieneinsatz
                  </Badge>
                )}
              </div>

              {/* Warning for recurring shifts */}
              {isRecurring && !isDetached && (
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Dieser Einsatz gehört zu einer Serie
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Wählen Sie unten, wie Sie löschen möchten:
                      </p>

                      {/* Delete Options */}
                      <div className="flex flex-col gap-2 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="deleteMode"
                            value="future"
                            checked={deleteMode === "future"}
                            onChange={(e) => setDeleteMode(e.target.value as SeriesDeleteMode)}
                            className="accent-primary"
                          />
                          <span className="text-sm">
                            Nur diesen Termin löschen
                            <span className="block text-xs text-muted-foreground">
                              Alle zukünftigen Termine bleiben bestehen
                            </span>
                          </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="deleteMode"
                            value="all"
                            checked={deleteMode === "all"}
                            onChange={(e) => setDeleteMode(e.target.value as SeriesDeleteMode)}
                            className="accent-primary"
                          />
                          <span className="text-sm">
                            Alle zukünftigen Einsätze löschen
                            <span className="block text-xs text-muted-foreground">
                              Abgeschlossene Einsätze werden übersprungen
                            </span>
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button variant="outline">Abbrechen</Button>
                </DialogClose>
                {isRecurring && !isDetached ? (
                  <Button
                    onClick={handleDeleteSeries}
                    disabled={loading}
                    variant="destructive"
                    className="min-w-[140px]"
                  >
                    {loading ? "Löschen..." : deleteMode === "future" ? "Nur diesen löschen" : "Serie löschen"}
                  </Button>
                ) : (
                  <Button
                    onClick={handleDeleteSingle}
                    disabled={loading}
                    variant="destructive"
                  >
                    {loading ? "Löschen..." : "Löschen"}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TooltipTrigger>
        <TooltipContent>
          <p>Einsatz löschen</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
