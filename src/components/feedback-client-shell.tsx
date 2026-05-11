"use client";

import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeedbackCard } from "@/components/feedback-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Star } from "lucide-react";
import { GiveOrderFeedbackDialog } from "@/components/give-order-feedback-dialog";
import { GiveGeneralFeedbackDialog } from "@/components/give-general-feedback-dialog";

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

interface FeedbackClientShellProps {
  orderFeedback: OrderFeedback[];
  generalFeedback: GeneralFeedback[];
  currentUserId: string;
  currentUserRole: "admin" | "manager" | "employee" | "customer" | "platform_admin";
  onRefresh: () => Promise<void>;
}

export function FeedbackClientShell({
  orderFeedback,
  generalFeedback,
  currentUserId,
  currentUserRole,
  onRefresh,
}: FeedbackClientShellProps) {
  const [localOrderFeedback, setLocalOrderFeedback] = useState(orderFeedback);
  const [localGeneralFeedback, setLocalGeneralFeedback] = useState(generalFeedback);

  const handleRefresh = useCallback(async () => {
    await onRefresh();
  }, [onRefresh]);

  // Keep local state in sync when props change (after refresh)
  const syncedOrderFeedback = orderFeedback.length > 0 ? orderFeedback : localOrderFeedback;
  const syncedGeneralFeedback = generalFeedback.length > 0 ? generalFeedback : localGeneralFeedback;

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">Feedback</h1>

      {currentUserRole !== "admin" && currentUserRole !== "manager" && (
        <Card className="dashboard-card">
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
                <GiveOrderFeedbackDialog onSuccess={handleRefresh} />
              </TabsContent>
              <TabsContent value="general" className="mt-6">
                <GiveGeneralFeedbackDialog onSuccess={handleRefresh} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-xl md:text-2xl font-bold mt-8 mb-4">Eingegangenes Feedback</h2>
        <Tabs defaultValue="orders">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders">Auftragsbezogen ({syncedOrderFeedback.length})</TabsTrigger>
            <TabsTrigger value="general">Allgemein ({syncedGeneralFeedback.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="orders" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {syncedOrderFeedback.length === 0 ? (
                <div className="col-span-full text-center text-slate-600 dark:text-slate-400 py-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-8 border border-dashed border-slate-300 dark:border-slate-700 dashboard-card">
                  <Star className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                  <p className="text-base md:text-lg font-semibold">Bisher kein auftragsbezogenes Feedback</p>
                  <p className="text-sm">Wenn Sie Feedback zu einem Auftrag haben, können Sie es hier einreichen.</p>
                  {currentUserRole !== "admin" && currentUserRole !== "manager" && (
                    <div className="mt-4">
                      <GiveOrderFeedbackDialog onSuccess={handleRefresh} />
                    </div>
                  )}
                </div>
              ) : (
                syncedOrderFeedback.map((feedback) => (
                  <FeedbackCard
                    key={feedback.id}
                    feedback={feedback as any}
                    feedbackType="order"
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    onDeleteSuccess={handleRefresh}
                  />
                ))
              )}
            </div>
          </TabsContent>
          <TabsContent value="general" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {syncedGeneralFeedback.length === 0 ? (
                <div className="col-span-full text-center text-slate-600 dark:text-slate-400 py-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-8 border border-dashed border-slate-300 dark:border-slate-700 dashboard-card">
                  <MessageSquare className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                  <p className="text-base md:text-lg font-semibold">Kein allgemeines Feedback vorhanden</p>
                  <p className="text-sm">Wenn Sie allgemeines Feedback haben, können Sie es hier einreichen.</p>
                  {currentUserRole !== "admin" && currentUserRole !== "manager" && (
                    <div className="mt-4">
                      <GiveGeneralFeedbackDialog onSuccess={handleRefresh} />
                    </div>
                  )}
                </div>
              ) : (
                syncedGeneralFeedback.map((feedback) => (
                  <FeedbackCard
                    key={feedback.id}
                    feedback={feedback as any}
                    feedbackType="general"
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    onDeleteSuccess={handleRefresh}
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