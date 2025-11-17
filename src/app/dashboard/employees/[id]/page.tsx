import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EmployeeSummaryCard } from "@/components/employee-summary-card";
import { EmployeeDetailTabs } from "@/components/employee-detail-tabs";
import { PageHeader } from "@/components/page-header";
import { BackButtonWithParams } from "@/components/back-button-with-params";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Await the params
  const { id } = await params;

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
    .eq('id', id)
    .order('start_date', { foreignTable: 'absence_requests', ascending: false })
    .maybeSingle();

  if (error) {
    console.error("Fehler beim Laden des Mitarbeiters:", error?.message || error);
    redirect("/dashboard/employees");
  }

  if (!employee) {
    console.log("Mitarbeiter nicht gefunden");
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
        <BackButtonWithParams backUrl="/dashboard/employees" />
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