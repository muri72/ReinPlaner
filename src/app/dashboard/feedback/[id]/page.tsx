import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { BackButtonWithParams } from "@/components/back-button-with-params";
import { FeedbackDetailTabs } from "@/components/feedback-detail-tabs";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare } from "lucide-react";

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  // Fetch user profile for role check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const currentUserRole = profile?.role || "employee";

  // Try to find in order_feedback first, then general_feedback
  let feedback: any = null;
  let feedbackType: "order" | "general" = "order";

  // Try order_feedback
  const { data: orderFeedback, error: orderError } = await supabase
    .from("order_feedback")
    .select(`
      *,
      orders (
        id,
        title,
        customers ( name ),
        order_employee_assignments ( employees ( first_name, last_name ) )
      ),
      profiles ( first_name, last_name )
    `)
    .eq("id", id)
    .single();

  if (!orderError && orderFeedback) {
    const employeeAssignment = orderFeedback.orders?.order_employee_assignments?.[0];
    const employee = employeeAssignment?.employees;
    const employeeName = [employee?.first_name, employee?.last_name].filter(Boolean).join(" ") || "N/A";

    feedback = {
      ...orderFeedback,
      order: {
        id: orderFeedback.orders?.id,
        title: orderFeedback.orders?.title || "Unbekannter Auftrag",
        customer_name: orderFeedback.orders?.customers?.[0]?.name || "N/A",
        employee_name: employeeName,
      },
      replied_by_name: [orderFeedback.profiles?.first_name, orderFeedback.profiles?.last_name]
        .filter(Boolean)
        .join(" ") || "Admin",
    };
    feedbackType = "order";
  } else {
    // Try general_feedback
    const { data: generalFeedback, error: generalError } = await supabase
      .from("general_feedback")
      .select(`
        *,
        profiles ( first_name, last_name )
      `)
      .eq("id", id)
      .single();

    if (!generalError && generalFeedback) {
      feedback = {
        ...generalFeedback,
        replied_by_name: [generalFeedback.profiles?.first_name, generalFeedback.profiles?.last_name]
          .filter(Boolean)
          .join(" ") || "Admin",
      };
      feedbackType = "general";
    }
  }

  if (!feedback) {
    redirect("/dashboard/feedback");
  }

  const title =
    feedbackType === "order"
      ? feedback.order?.title || "Feedback"
      : feedback.subject || "Allgemeines Feedback";

  return (
    <>
      <div className="p-4 md:p-8 space-y-8">
        <PageHeader title={title}>
          <BackButtonWithParams backUrl="/dashboard/feedback" />
        </PageHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <div className="flex items-center space-x-2">
                {feedbackType === "order" ? (
                  <Star className="h-5 w-5 text-yellow-400" />
                ) : (
                  <MessageSquare className="h-5 w-5 text-blue-400" />
                )}
                <Badge variant={feedbackType === "order" ? "default" : "secondary"}>
                  {feedbackType === "order" ? "Auftragsfeedback" : "Allgemeines Feedback"}
                </Badge>
              </div>

              {feedback.is_resolved && (
                <Badge variant="default" className="w-full justify-center">
                  Gelöst
                </Badge>
              )}

              {feedbackType === "order" && feedback.rating && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Bewertung:</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= feedback.rating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <FeedbackDetailTabs
              feedback={feedback}
              feedbackType={feedbackType}
              currentUserId={user.id}
              currentUserRole={currentUserRole as any}
            />
          </div>
        </div>
      </div>
    </>
  );
}