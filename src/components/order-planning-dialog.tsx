"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { processOrderRequest } from "@/app/dashboard/orders/actions";
import { Badge } from "./ui/badge";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Input } from "./ui/input"; // Import Input for assigned daily hours

interface OrderPlanningDialogProps {
  order: {
    id: string;
    title: string;
    description: string | null;
    customer_name: string | null;
    object_name: string | null;
    service_type: string | null;
    total_estimated_hours: number | null; // Hinzugefügt
  };
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

export function OrderPlanningDialog({ order }: OrderPlanningDialogProps) {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [assignedDailyHours, setAssignedDailyHours] = useState<number | null>(null); // Neues State für zugewiesene Stunden
  const [loading, setLoading] = useState(false);
  // Removed titleId and descriptionId as they are no longer needed for aria attributes

  useEffect(() => {
    if (open) {
      const fetchEmployees = async () => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('employees')
          .select('id, first_name, last_name')
          .order('last_name', { ascending: true });
        if (error) {
          toast.error("Mitarbeiter konnten nicht geladen werden.");
          console.error(error);
        } else {
          setEmployees(data);
        }
      };
      fetchEmployees();
    }
  }, [open]);

  // Set default assignedDailyHours when employee is selected or dialog opens
  useEffect(() => {
    if (selectedEmployeeId && order.total_estimated_hours !== null) {
      setAssignedDailyHours(order.total_estimated_hours);
    } else {
      setAssignedDailyHours(null);
    }
  }, [selectedEmployeeId, order.total_estimated_hours]);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    formData.append('assignedDailyHours', String(assignedDailyHours)); // Stunden an FormData anhängen
    const result = await processOrderRequest(formData);
    if (result.success) {
      toast.success(result.message);
      setOpen(false);
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Planen & Genehmigen</Button>
      </DialogTrigger>
      <DialogContent 
        key={open ? "order-planning-open" : "order-planning-closed"} 
        className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle>Anfrage planen: {order.title}</DialogTitle>
          <DialogDescription>
            Wählen Sie einen Mitarbeiter aus, um diese Anfrage zu genehmigen oder lehnen Sie sie ab.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <span className="font-semibold">Kunde:</span> {order.customer_name || 'N/A'}
          </div>
          <div>
            <span className="font-semibold">Objekt:</span> {order.object_name || 'N/A'}
          </div>
          {order.service_type && (
            <div>
              <span className="font-semibold">Dienstleistung:</span> <Badge variant="outline">{order.service_type}</Badge>
            </div>
          )}
          <div>
            <span className="font-semibold">Beschreibung:</span>
            <p className="text-sm text-muted-foreground">{order.description || 'Keine Beschreibung.'}</p>
          </div>
          <form id="planning-form" action={handleSubmit}>
            <input type="hidden" name="orderId" value={order.id} />
            <div className="space-y-2">
              <Label htmlFor="employeeId">Mitarbeiter zuweisen</Label>
              <Select name="employeeId" onValueChange={setSelectedEmployeeId} value={selectedEmployeeId}>
                <SelectTrigger id="employeeId">
                  <SelectValue placeholder="Mitarbeiter auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedEmployeeId && (
              <div>
                <Label htmlFor="assignedDailyHours">Zugewiesene tägliche Stunden (optional)</Label>
                <Input
                  id="assignedDailyHours"
                  name="assignedDailyHours"
                  type="number"
                  step="0.5"
                  placeholder={order.total_estimated_hours ? `Vorgeschlagen: ${order.total_estimated_hours}` : "Stunden pro Tag"}
                  value={assignedDailyHours !== null ? assignedDailyHours : ''}
                  onChange={(e) => setAssignedDailyHours(e.target.value === '' ? null : Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Wenn leer, werden die Stunden automatisch basierend auf dem Objektplan aufgeteilt.
                </p>
              </div>
            )}
          </form>
        </div>
        <DialogFooter>
          <Button form="planning-form" name="decision" value="rejected" variant="destructive" disabled={loading}>
            Ablehnen
          </Button>
          <Button form="planning-form" name="decision" value="approved" disabled={!selectedEmployeeId || loading}>
            {loading ? 'Wird bearbeitet...' : 'Genehmigen & Zuweisen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}