import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EmployeeSummaryCard } from "@/components/employee-summary-card";
import { EmployeeDetailTabs } from "@/components/employee-detail-tabs";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type EmployeeDetailPageProps = {
  params: { id: string };
};

export default async function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: employee, error } = await supabase
    .from('employees')
    .select(`
      *,
      time_entries (
        *,
        orders ( title ),
        objects ( name )
      ),
      order_employee_assignments (
        orders ( *, objects(name) )
      ),
      absence_requests ( * )
    `)
    .eq('id', params.id)
    .order('start_date', { foreignTable: 'absence_requests', ascending: false })
    .single();

  if (error || !employee) {
    console.error("Fehler beim Laden des Mitarbeiters:", error?.message || "Mitarbeiter nicht gefunden");
    redirect("/dashboard/employees");
  }

  // Extract and flatten orders from assignments
  if (employee.order_employee_assignments) {
    (employee as any).orders = employee.order_employee_assignments
      .map((assignment: any) => assignment.orders)
      .filter(Boolean); // Filter out any null/undefined orders
  }


  // Sort time entries by start_time descending
  if (employee.time_entries) {
    employee.time_entries.sort((a: { start_time: string }, b: { start_time: string }) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <PageHeader title={`${employee.first_name} ${employee.last_name}`}>
        <Button variant="outline" asChild>
          <Link href="/dashboard/employees">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Zurück zur Übersicht
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <EmployeeSummaryCard employee={employee} />
        </div>
        <div className="lg:col-span-2">
          <EmployeeDetailTabs employee={employee} />
        </div>
      </div>
    </div>
  );
}