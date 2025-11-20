"use client";

import { useState, useEffect } from "react";
import { DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, UserCheck } from "lucide-react";
import { UserForm, UserFormValues } from "@/components/user-form";
import { updateUser } from "@/app/dashboard/users/actions";
import { createClient } from "@/lib/supabase/client";
import { RecordDialog } from "@/components/ui/record-dialog";

interface UserEditDialogProps {
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
  };
  trigger?: React.ReactNode;
  onActionSuccess?: () => void;
}

export function UserEditDialog({ user, trigger, onActionSuccess }: UserEditDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [employeeData, setEmployeeData] = useState<{ id: string; first_name: string; last_name: string } | null>(null);
  const [customerContactData, setCustomerContactData] = useState<{ id: string; first_name: string; last_name: string; customer_id: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchAssignmentData = async () => {
      if (!internalOpen) return;

      setLoading(true);
      try {
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
  }, [internalOpen, supabase, user.id]);

  const setOpenState = (next: boolean) => {
    setInternalOpen(next);
  };

  const handleUpdate = async (data: UserFormValues) => {
    const result = await updateUser(user.id, data);
    if (result.success) {
      setOpenState(false);
      onActionSuccess?.();
    }
    return result;
  };

  const defaultTrigger = (
    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10">
      <Pencil className="h-4 w-4" />
    </Button>
  );

  return (
    <RecordDialog
      open={internalOpen}
      onOpenChange={setOpenState}
      title="Benutzer bearbeiten"
      description="Formular zum Bearbeiten der Benutzerdaten."
      icon={<UserCheck className="h-5 w-5 text-primary" />}
      size="lg"
    >
      <DialogTrigger asChild>
        {trigger ?? defaultTrigger}
      </DialogTrigger>

      <UserForm
        initialData={{
          email: user.email,
          firstName: user.first_name ?? undefined,
          lastName: user.last_name ?? undefined,
          role: user.role as UserFormValues["role"],
        }}
        onSubmit={handleUpdate}
        submitButtonText={loading ? "Lädt..." : "Änderungen speichern"}
        onSuccess={() => setInternalOpen(false)}
        isEditMode={true}
        employee={employeeData}
        customerContact={customerContactData}
        isInDialog={true}
      />
    </RecordDialog>
  );
}
