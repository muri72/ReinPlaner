"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { UserForm, UserFormValues } from "@/components/user-form";
import { updateUser } from "@/app/dashboard/users/actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { createClient } from "@/lib/supabase/client";

interface UserEditDialogProps {
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
  };
  onActionSuccess?: () => void;
}

export function UserEditDialog({ user, onActionSuccess }: UserEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [employeeData, setEmployeeData] = useState<{ id: string; first_name: string; last_name: string } | null>(null);
  const [customerContactData, setCustomerContactData] = useState<{ id: string; first_name: string; last_name: string; customer_id: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Fetch employee and customer contact data when dialog opens
  useEffect(() => {
    const fetchAssignmentData = async () => {
      if (!open) return;

      setLoading(true);
      try {
        // Check if user is assigned to an employee
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('id, first_name, last_name')
          .eq('user_id', user.id)
          .single();

        if (employeeError && employeeError.code !== 'PGRST116') {
          console.error("Error fetching employee data:", employeeError);
        } else {
          setEmployeeData(employeeData);
        }

        // Check if user is assigned to a customer contact
        const { data: contactData, error: contactError } = await supabase
          .from('customer_contacts')
          .select('id, first_name, last_name, customer_id')
          .eq('user_id', user.id)
          .single();

        if (contactError && contactError.code !== 'PGRST116') {
          console.error("Error fetching customer contact data:", contactError);
        } else {
          setCustomerContactData(contactData);
        }
      } catch (error) {
        console.error("Error fetching assignment data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignmentData();
  }, [open, supabase, user.id]);

  const handleUpdate = async (data: UserFormValues) => {
    const result = await updateUser(user.id, data);
    if (result.success) {
      setOpen(false);
      onActionSuccess?.();  // Triggere Neuladen der Daten
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80">
                <Pencil className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Benutzer bearbeiten</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent 
        key={open ? "user-edit-open" : "user-edit-closed"} 
        className="sm:max-w-3xl max-h-[90vh] overflow-y-auto glassmorphism-card"
      >
        <DialogHeader>
          <DialogTitle>Benutzer bearbeiten</DialogTitle>
          <DialogDescription>
            Formular zum Bearbeiten der Benutzerdaten.
          </DialogDescription>
        </DialogHeader>
        <UserForm
          initialData={{
            email: user.email,
            firstName: user.first_name ?? undefined,
            lastName: user.last_name ?? undefined,
            role: user.role as UserFormValues["role"],
          }}
          onSubmit={handleUpdate}
          submitButtonText={loading ? "Lädt..." : "Änderungen speichern"}
          onSuccess={() => setOpen(false)}
          isEditMode={true}
          employee={employeeData}
          customerContact={customerContactData}
        />
      </DialogContent>
    </Dialog>
  );
}