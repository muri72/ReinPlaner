"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Pencil, UserCog, FileStack } from "lucide-react";
import { EmployeeForm, EmployeeFormValues } from "@/components/employee-form";
import { updateEmployee } from "@/app/dashboard/employees/actions";
import { RecordDialog } from "@/components/ui/record-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { DialogTrigger } from "@/components/ui/dialog";

interface EmployeeEditDialogProps {
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    hire_date: string | null;
    status: "active" | "inactive" | "on_leave";
    contract_type: "full_time" | "part_time" | "minijob" | "freelancer" | null;
    hourly_rate: number | null;
    start_date: string | null;
    job_title: string | null;
    department: string | null;
    notes: string | null;
    address: string | null;
    date_of_birth: string | null;
    social_security_number: string | null;
    tax_id_number: string | null;
    health_insurance_provider: string | null;
    contract_end_date: string | null;
    can_work_holidays: boolean;
    default_daily_schedules: any[];
    default_recurrence_interval_weeks: number;
    default_start_week_offset: number;
  };
  trigger?: React.ReactNode;
  onActionSuccess?: () => void;
}

export function EmployeeEditDialog({ employee, trigger, onActionSuccess }: EmployeeEditDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const setOpenState = (next: boolean) => {
    setInternalOpen(next);
  };

  const handleUpdate = async (data: EmployeeFormValues) => {
    const result = await updateEmployee(employee.id, data);

    if (result.success) {
      setInternalOpen(false);
      router.refresh();
      onActionSuccess?.();
    }
    return result;
  };

  return (
    <RecordDialog
      open={internalOpen}
      onOpenChange={setOpenState}
      title="Mitarbeiter bearbeiten"
      description={`Bearbeiten Sie die Details für ${employee.first_name} ${employee.last_name}.`}
      icon={<UserCog className="h-5 w-5 text-primary" />}
      size="lg"
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="documents">
            <FileStack className="mr-2 h-4 w-4" />
            Dokumente
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="details" className="h-full m-0 p-0">
            <EmployeeForm
              key={`employee-form-${employee.id}`}
              initialData={employee as any}
              onSubmit={handleUpdate}
              submitButtonText="Änderungen speichern"
              onSuccess={() => setInternalOpen(false)}
              isInDialog={true}
            />
          </TabsContent>

          <TabsContent value="documents" className="h-full m-0 p-0">
            <div className="flex-1 overflow-y-auto space-y-4 px-6 py-4">
              <h3 className="text-md font-semibold flex items-center">
                <FileStack className="mr-2 h-5 w-5" /> Dokumente
              </h3>
              <DocumentUploader
                associatedEmployeeId={employee.id}
                onDocumentUploaded={() => {}}
              />
              <DocumentList associatedEmployeeId={employee.id} />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </RecordDialog>
  );
}
