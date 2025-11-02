"use client";

import { createClient } from "@/lib/supabase/client";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeedbackCard } from "@/components/feedback-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Star } from "lucide-react";
import { GiveOrderFeedbackDialog } from "@/components/give-order-feedback-dialog";
import { GiveGeneralFeedbackDialog } from "@/components/give-general-feedback-dialog";
import { useState, useEffect, useCallback } from "react";

// Typdefinitionen, die beide Feedback-Arten abdecken
type OrderFeedback = {
  id: string;
  user_id: string;
  created_at: string;
  image_urls: string[] | null;
  reply: string | null;
  replied_at: string | null;
  replied_by_name: string | null;
  rating: number; // Required for order feedback
  comment: string | null; // Can be null
  is_resolved: boolean; // New field
  order: { // Required for order feedback
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
  message: string; // Required for general feedback
  is_resolved: boolean; // New field
};

type Feedback = OrderFeedback | GeneralFeedback;

export default function FeedbackPage() {
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'manager' | 'employee' | 'customer'>('employee');
  const [mappedOrderFeedback, setMappedOrderFeedback] = useState<OrderFeedback[]>([]);
  const [mappedGeneralFeedback, setMappedGeneralFeedback] = useState<GeneralFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedbackData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
      return;
    }
    setCurrentUser(user);

    const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profileError) {
      console.error("Fehler beim Abrufen des Benutzerprofils:", profileError?.message || profileError);
    }
    setCurrentUserRole(profile?.role as 'admin' | 'manager' | 'employee' | 'customer' || 'employee');

    // Fetch order-specific feedback
    const { data: orderFeedbackData, error: orderFeedbackError } = await supabase
      .from('order_feedback')
      .select(`
        *,
        orders (
          title,
          customers ( name ),
          order_employee_assignments ( employees ( first_name, last_name ) )
        ),
        profiles ( first_name, last_name )
      `)
      .order('created_at', { ascending: false });

    // Fetch general feedback
    const { data: generalFeedbackData, error: generalFeedbackError } = await supabase
      .from('general_feedback')
      .select(`
        *,
        profiles ( first_name, last_name )
      `)
      .order('created_at', { ascending: false });

    if (orderFeedbackError) console.error("Fehler beim Laden des Auftrags-Feedbacks:", orderFeedbackError?.message || orderFeedbackError);
    if (generalFeedbackError) console.error("Fehler beim Laden des allgemeinen Feedbacks:", generalFeedbackError?.message || generalFeedbackError);

    setMappedOrderFeedback(orderFeedbackData?.map(f => {
      const employeeAssignment = f.orders?.order_employee_assignments?.[0];
      const employee = employeeAssignment?.employees;
      const employeeName = (employee?.first_name || employee?.last_name) ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim() : 'N/A';

      return {
        ...f,
        order: {
          title: f.orders?.title || 'Unbekannter Auftrag',
          customer_name: f.orders?.customers?.[0]?.name || 'N/A',
          employee_name: employeeName,
        },
        replied_by_name: `${f.profiles?.first_name || ''} ${f.profiles?.last_name || ''}`.trim() || 'Admin',
      };
    }) || []);

    setMappedGeneralFeedback(generalFeedbackData?.map(f => ({
      ...f,
      replied_by_name: `${f.profiles?.first_name || ''} ${f.profiles?.last_name || ''}`.trim() || 'Admin',
    })) || []);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchFeedbackData();
  }, [fetchFeedbackData]);

  if (!currentUser) {
    return null; // Render nothing or a global loading if user is not yet determined
  }

  const allUnresolvedFeedback = [...mappedOrderFeedback.filter(f => !f.is_resolved), ...mappedGeneralFeedback.filter(f => !f.is_resolved)].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="p-4 md:p-8 space-y-8">
      
      <h1 className="text-2xl md:text-3xl font-bold">Feedback</h1>
      
      {currentUserRole !== 'admin' && currentUserRole !== 'manager' && (
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Neues Feedback einreichen</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="orders">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="orders">Auftragsbezogen</TabsTrigger>
                <TabsTrigger value="general">Allgemein</TabsTrigger>
              </TabsList>
              <TabsContent value="orders" className="mt-6">
                <GiveOrderFeedbackDialog onSuccess={fetchFeedbackData} />
              </TabsContent>
              <TabsContent value="general" className="mt-6">
                <GiveGeneralFeedbackDialog onSuccess={fetchFeedbackData} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Removed GradientDivider as it's not a component */}

      <div>
        <h2 className="text-xl md:text-2xl font-bold mt-8 mb-4">Eingegangenes Feedback</h2>
        <Tabs defaultValue="orders">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders">Auftragsbezogen ({mappedOrderFeedback.length})</TabsTrigger>
            <TabsTrigger value="general">Allgemein ({mappedGeneralFeedback.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="orders" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {mappedOrderFeedback.length === 0 ? (
                <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
                  <Star className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                  <p className="text-base md:text-lg font-semibold">Bisher kein auftragsbezogenes Feedback</p>
                  <p className="text-sm">Wenn Sie Feedback zu einem Auftrag haben, können Sie es hier einreichen.</p>
                  {currentUserRole !== 'admin' && currentUserRole !== 'manager' && (
                    <div className="mt-4">
                      <GiveOrderFeedbackDialog onSuccess={fetchFeedbackData} />
                    </div>
                  )}
                </div>
              ) : (
                mappedOrderFeedback.map((feedback) => (
                  <FeedbackCard
                    key={feedback.id}
                    feedback={feedback as any}
                    feedbackType="order"
                    currentUserId={currentUser.id}
                    currentUserRole={currentUserRole}
                    onDeleteSuccess={fetchFeedbackData} // Pass callback
                  />
                ))
              )}
            </div>
          </TabsContent>
          <TabsContent value="general" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {mappedGeneralFeedback.length === 0 ? (
                <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
                  <MessageSquare className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                  <p className="text-base md:text-lg font-semibold">Kein allgemeines Feedback vorhanden</p>
                  <p className="text-sm">Wenn Sie allgemeines Feedback haben, können Sie es hier einreichen.</p>
                  {currentUserRole !== 'admin' && currentUserRole !== 'manager' && (
                    <div className="mt-4">
                      <GiveGeneralFeedbackDialog onSuccess={fetchFeedbackData} />
                    </div>
                  )}
                </div>
              ) : (
                mappedGeneralFeedback.map((feedback) => (
                  <FeedbackCard
                    key={feedback.id}
                    feedback={feedback as any}
                    feedbackType="general"
                    currentUserId={currentUser.id}
                    currentUserRole={currentUserRole}
                    onDeleteSuccess={fetchFeedbackData} // Pass callback
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}