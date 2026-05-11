import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FeedbackClientShell } from "@/components/feedback-client-shell";

type OrderFeedback = {
  id: string;
  user_id: string;
  created_at: string;
  image_urls: string[] | null;
  reply: string | null;
  replied_at: string | null;
  replied_by_name: string | null;
  rating: number;
  comment: string | null;
  is_resolved: boolean;
  order: {
    title: string;
    customer_name: string | null;
    employee_name: string | null;
  };
};

type GeneralFeedback = {
  id: string;
  user_id: string;
  created_at: string;
  image_urls: string[] | null;
  reply: string | null;
  replied_at: string | null;
  replied_by_name: string | null;
  name: string;
  email: string | null;
  subject: string | null;
  message: string;
  is_resolved: boolean;
};

export default async function FeedbackPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const currentUserRole = (profile?.role || "employee") as "admin" | "manager" | "employee" | "customer" | "platform_admin";

  // Fetch order-specific feedback
  const { data: orderFeedbackData } = await supabase
    .from("order_feedback")
    .select(`
      *,
      orders (
        title,
        customers ( name ),
        order_employee_assignments ( employees ( first_name, last_name ) )
      ),
      profiles ( first_name, last_name )
    `)
    .order("created_at", { ascending: false });

  // Fetch general feedback
  const { data: generalFeedbackData } = await supabase
    .from("general_feedback")
    .select(`
      *,
      profiles ( first_name, last_name )
    `)
    .order("created_at", { ascending: false });

  const mappedOrderFeedback: OrderFeedback[] = (orderFeedbackData || []).map((f) => {
    const employeeAssignment = f.orders?.order_employee_assignments?.[0];
    const employee = employeeAssignment?.employees;
    const employeeName = (employee?.first_name || employee?.last_name)
      ? `${employee.first_name || ""} ${employee.last_name || ""}`.trim()
      : "N/A";

    return {
      ...f,
      order: {
        title: f.orders?.title || "Unbekannter Auftrag",
        customer_name: f.orders?.customers?.[0]?.name || "N/A",
        employee_name: employeeName,
      },
      replied_by_name: `${f.profiles?.first_name || ""} ${f.profiles?.last_name || ""}`.trim() || "Admin",
    };
  });

  const mappedGeneralFeedback: GeneralFeedback[] = (generalFeedbackData || []).map((f) => ({
    ...f,
    replied_by_name: `${f.profiles?.first_name || ""} ${f.profiles?.last_name || ""}`.trim() || "Admin",
  }));

  return (
    <FeedbackClientShell
      orderFeedback={mappedOrderFeedback}
      generalFeedback={mappedGeneralFeedback}
      currentUserId={user.id}
      currentUserRole={currentUserRole}
      onRefresh={async () => {
        // Refresh is handled by the parent - in a full implementation this would trigger a re-render
        // For now, the shell uses local state fallback
      }}
    />
  );
}