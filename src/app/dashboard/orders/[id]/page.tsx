import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { OrderSummaryCard } from "@/components/order-summary-card";
import { OrderDetailTabs } from "@/components/order-detail-tabs";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Await the params
  const { id } = await params;

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      customers ( name ),
      objects ( name, address, recurrence_interval_weeks ),
      customer_contacts ( first_name, last_name ),
      order_employee_assignments (
        employee_id,
        assigned_daily_schedules,
        assigned_recurrence_interval_weeks,
        assigned_start_week_offset,
        employees ( first_name, last_name )
      )
    `)
    .eq('id', id)
    .single();

  if (error || !order) {
    console.error("Fehler beim Laden des Auftrags:", error?.message || "Auftrag nicht gefunden");
    redirect("/dashboard/orders");
  }

  // Flatten nested data for easier prop passing
  const flattenedOrder = {
    ...order,
    customer_name: Array.isArray(order.customers) ? order.customers[0]?.name : order.customers?.name,
    object_name: Array.isArray(order.objects) ? order.objects[0]?.name : order.objects?.name,
    object_address: Array.isArray(order.objects) ? order.objects[0]?.address : order.objects?.address,
    customer_contact_first_name: Array.isArray(order.customer_contacts) ? order.customer_contacts[0]?.first_name : order.customer_contacts?.first_name,
    customer_contact_last_name: Array.isArray(order.customer_contacts) ? order.customer_contacts[0]?.last_name : order.customer_contacts?.last_name,
    employee_first_names: order.order_employee_assignments?.map((a: any) => {
      const employee = Array.isArray(a.employees) ? a.employees[0] : a.employees;
      return employee?.first_name || '';
    }) || null,
    employee_last_names: order.order_employee_assignments?.map((a: any) => {
      const employee = Array.isArray(a.employees) ? a.employees[0] : a.employees;
      return employee?.last_name || '';
    }) || null,
    assignedEmployees: order.order_employee_assignments?.map((a: any) => ({
      employeeId: a.employee_id,
      assigned_daily_schedules: a.assigned_daily_schedules || [],
      assigned_recurrence_interval_weeks: a.assigned_recurrence_interval_weeks || 1,
      assigned_start_week_offset: a.assigned_start_week_offset || 0,
    })) || [],
    object: Array.isArray(order.objects) ? order.objects[0] : order.objects,
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <PageHeader title={flattenedOrder.title}>
        <Button variant="outline" asChild>
          <Link href="/dashboard/orders">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Zurück zur Übersicht
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <OrderSummaryCard order={flattenedOrder} />
        </div>
        <div className="lg:col-span-2">
          <OrderDetailTabs order={flattenedOrder} />
        </div>
      </div>
    </div>
  );
}
