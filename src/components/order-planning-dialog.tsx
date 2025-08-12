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

interface OrderPlanningDialogProps {
  order: {
    id: string;
    title: string;
    description: string | null;
    customer_name: string | null;
    object_name: string | null;
    service_type: string | null;
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
  const [loading, setLoading] = useState(false);
  const titleId = `order-planning-dialog-title`;
  const descriptionId = `order-planning-dialog-description`;

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

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
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
        aria-labelledby={titleId} 
        aria-describedby={descriptionId}
      >
        <DialogHeader>
          <DialogTitle id={titleId}>Anfrage planen: {order.title}</DialogTitle>
          <DialogDescription id={descriptionId}>
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
                <SelectTrigger>
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