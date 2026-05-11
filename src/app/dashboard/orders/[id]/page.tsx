import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { OrderSummaryCard } from "@/components/order-summary-card";
import { OrderDetailTabs } from "@/components/order-detail-tabs";
import { BackButtonWithParams } from "@/components/back-button-with-params";
import { calculateFinalHourlyRate, calculateTotalCost } from "@/lib/utils";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  const { data: order, error } = await supabase
    .from('orders')
    .select("*")
    .eq('id', id)
    .single();

  if (error || !order) {
    console.error("Fehler beim Laden des Auftrags:", error?.message || "Auftrag nicht gefunden");
    redirect("/dashboard/orders");
  }

  // Fetch related data separately (embedded joins require FK constraints that don't exist)
  const [{ data: customerRows }, { data: objectRows }, { data: contactRows }, { data: assignmentRows }] = await Promise.all([
    order.customer_id ? supabase.from("customers").select("name").eq("id", order.customer_id).limit(1) : Promise.resolve({ data: null }),
    order.object_id ? supabase.from("objects").select("name, address, recurrence_interval_weeks").eq("id", order.object_id).limit(1) : Promise.resolve({ data: null }),
    order.customer_contact_id ? supabase.from("customer_contacts").select("first_name, last_name").eq("id", order.customer_contact_id).limit(1) : Promise.resolve({ data: null }),
    supabase.from("order_employee_assignments").select("employee_id, assigned_daily_schedules, assigned_recurrence_interval_weeks, assigned_start_week_offset").eq("order_id", id),
  ]);

  // Fetch employee names for assignments
  const employeeIds = [...new Set((assignmentRows || []).map(a => a.employee_id).filter(Boolean))];
  const { data: employeeRows } = employeeIds.length > 0
    ? await supabase.from("employees").select("id, first_name, last_name").in("id", employeeIds)
    : { data: [] };
  const employeeMap = Object.fromEntries((employeeRows || []).map(e => [e.id, e]));

  // Fetch services for hourly rate calculation
  const { data: servicesData, error: servicesError } = await supabase
    .from('services')
    .select('id, key, title, default_hourly_rate')
    .eq('is_active', true);

  if (servicesError) {
    console.error("Fehler beim Laden der Services:", servicesError.message);
  }

  // Calculate final hourly rate using the new service system
  const serviceConfig = {
    service_key: order.service_key,
    markup_percentage: order.markup_percentage,
    custom_hourly_rate: order.custom_hourly_rate,
  };
  const finalHourlyRate = calculateFinalHourlyRate(serviceConfig, servicesData || []);

  // Calculate total cost
  const totalCost = calculateTotalCost(order.total_estimated_hours, finalHourlyRate);

  // Flatten nested data for easier prop passing
  const flattenedOrder = {
    ...order,
    customer_name: customerRows?.[0]?.name || null,
    object_name: objectRows?.[0]?.name || null,
    object_address: objectRows?.[0]?.address || null,
    customer_contact_first_name: contactRows?.[0]?.first_name || null,
    customer_contact_last_name: contactRows?.[0]?.last_name || null,
    employee_first_names: assignmentRows?.map(a => employeeMap[a.employee_id]?.first_name || '').filter(Boolean) || null,
    employee_last_names: assignmentRows?.map(a => employeeMap[a.employee_id]?.last_name || '').filter(Boolean) || null,
    assignedEmployees: assignmentRows?.map(a => ({
      employeeId: a.employee_id,
      assigned_daily_schedules: a.assigned_daily_schedules || [],
      assigned_recurrence_interval_weeks: a.assigned_recurrence_interval_weeks || 1,
      assigned_start_week_offset: a.assigned_start_week_offset || 0,
    })) || [],
    object: objectRows?.[0] || null,
    hourly_rate: finalHourlyRate,
    total_cost: totalCost,
  };

  return (
    <>
      <div className="p-4 md:p-8 space-y-8">
        <PageHeader title={flattenedOrder.title}>
          <BackButtonWithParams backUrl="/dashboard/orders" />
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
    </>
  );
}