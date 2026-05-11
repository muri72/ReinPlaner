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
    .select("*")
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error("Fehler beim Laden des Mitarbeiters:", error?.message || error);
    redirect("/dashboard/employees");
  }

  if (!employee) {
    console.log("Mitarbeiter nicht gefunden");
    redirect("/dashboard/employees");
  }

  // Fetch related data separately (embedded joins require FK constraints that don't fully exist)
  const [{ data: timeEntryRows }, { data: assignmentRows }, { data: absenceRows }] = await Promise.all([
    supabase.from("time_entries").select("id, date, start_time, end_time, break_minutes, order_id, object_id")
      .eq("employee_id", id).order("start_time", { ascending: false }),
    supabase.from("order_employee_assignments").select("id, order_id, assigned_daily_schedules, assigned_recurrence_interval_weeks, assigned_start_week_offset")
      .eq("employee_id", id),
    supabase.from("absence_requests").select("id, type, status, start_date, end_date")
      .eq("employee_id", id).order("start_date", { ascending: false }),
  ]);

  // Fetch time entry orders and objects
  const orderIds = [...new Set((timeEntryRows || []).map(e => e.order_id).filter(Boolean))];
  const objectIds = [...new Set((timeEntryRows || []).map(e => e.object_id).filter(Boolean))];
  const [{ data: timeOrderRows }, { data: timeObjectRows }] = await Promise.all([
    orderIds.length > 0 ? supabase.from("orders").select("id, title").in("id", orderIds) : { data: [] },
    objectIds.length > 0 ? supabase.from("objects").select("id, name").in("id", objectIds) : { data: [] },
  ]);
  const timeOrderMap = Object.fromEntries((timeOrderRows || []).map(o => [o.id, o]));
  const timeObjectMap = Object.fromEntries((timeObjectRows || []).map(o => [o.id, o]));

  // Fetch assigned orders for assignments
  const assignedOrderIds = [...new Set((assignmentRows || []).map(a => a.order_id).filter(Boolean))];
  const { data: assignedOrderRows } = assignedOrderIds.length > 0
    ? await supabase.from("orders").select("id, key, title").in("id", assignedOrderIds)
    : { data: [] };
  const assignedOrderMap = Object.fromEntries((assignedOrderRows || []).map(o => [o.id, o]));

  // Build enriched data
  const enrichedEmployee = {
    ...employee,
    time_entries: (timeEntryRows || []).map(e => ({
      ...e,
      order_title: timeOrderMap[e.order_id]?.title || null,
      object_name: timeObjectMap[e.object_id]?.name || null,
    })),
    order_employee_assignments: (assignmentRows || []).map(a => ({
      ...a,
      orders: assignedOrderMap[a.order_id] || null,
    })),
    absence_requests: absenceRows || [],
  };

  // Sort time entries by start_time descending
  if (enrichedEmployee.time_entries) {
    enrichedEmployee.time_entries.sort((a: { start_time: string }, b: { start_time: string }) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  }

  return (
    <>
      <div className="p-4 md:p-8 space-y-8">
        <PageHeader title={`${enrichedEmployee.first_name} ${enrichedEmployee.last_name}`}>
          <BackButtonWithParams backUrl="/dashboard/employees" />
        </PageHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <EmployeeSummaryCard employee={enrichedEmployee} />
          </div>
          <div className="lg:col-span-2">
            <EmployeeDetailTabs employee={enrichedEmployee} />
          </div>
        </div>
      </div>
    </>
  );
}