"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getDebtorsAction } from "@/lib/invoicing/actions";
import { INVOICE_STATUS_LABELS, formatCurrency } from "@/lib/invoicing/formatters";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Send, Download, Eye, MoreHorizontal, Search, Filter, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";
import { InvoiceListClient } from "@/components/invoice-list-client";
import { DATEVDialog } from "@/components/datev-dialog";
import { Button } from "@/components/ui/button";
import { InvoiceCreateDialog } from "@/components/invoice-create-dialog";
import { Invoice } from "@/lib/invoicing/types";
import { Debtor } from "@/lib/invoicing/types";

interface OrderOption {
  id: string;
  title: string;
  customer_name: string;
  order_type: string;
  fixed_monthly_price: number | null;
}

export function InvoicesClientPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      // Load invoices
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("id", user.user.id)
          .single();

        if (profile?.tenant_id) {
          // Fetch invoices
          const { data: invoicesData } = await supabase
            .from("invoices")
            .select("*, debtor:debtors(*), items:invoice_items(*)")
            .eq("tenant_id", profile.tenant_id)
            .order("created_at", { ascending: false });

          const today = new Date().toISOString().split("T")[0];
          const processedInvoices = (invoicesData || []).map((inv: any) => ({
            ...inv,
            status:
              inv.status === "sent" && inv.due_date < today && inv.paid_amount_cents < inv.total_amount_cents
                ? "overdue"
                : inv.status,
          }));
          setInvoices(processedInvoices);

          // Fetch debtors
          const { data: debtorsData } = await supabase
            .from("debtors")
            .select("*")
            .eq("tenant_id", profile.tenant_id)
            .order("billing_name");
          setDebtors(debtorsData || []);

          // Fetch active orders
          const { data: ordersData } = await supabase
            .from("orders")
            .select("id, title, customer_id, order_type, fixed_monthly_price, objects:objects(customer_id, customers:name)")
            .eq("tenant_id", profile.tenant_id)
            .eq("status", "active")
            .order("created_at", { ascending: false });

          const processedOrders = (ordersData || []).map((o: any) => ({
            id: o.id,
            title: o.title,
            customer_name: o.objects?.customers?.name || "Unbekannt",
            order_type: o.order_type,
            fixed_monthly_price: o.fixed_monthly_price,
          }));
          setOrders(processedOrders);
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const stats = {
    total: invoices?.length || 0,
    draft: invoices?.filter((i) => i.status === "draft").length || 0,
    sent: invoices?.filter((i) => i.status === "sent").length || 0,
    paid: invoices?.filter((i) => i.status === "paid").length || 0,
    overdue: invoices?.filter((i) => i.status === "overdue").length || 0,
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <div className="animate-pulse">Lädt...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Rechnungen</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Alle Rechnungen im Überblick
          </p>
        </div>
        <div className="flex gap-2">
          <DATEVDialog>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              DATEV Export
            </Button>
          </DATEVDialog>
          <InvoiceCreateDialog
            debtors={debtors}
            orders={orders}
            hideTrigger
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
          >
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Neue Rechnung
            </Button>
          </InvoiceCreateDialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Gesamt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-500">{stats.draft}</div>
            <p className="text-xs text-muted-foreground">Entwürfe</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
            <p className="text-xs text-muted-foreground">Versendet</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-500">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">Überfällig</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Alle Rechnungen</CardTitle>
          <CardDescription className="text-sm">
            Klicken Sie auf eine Rechnung, um Details anzuzeigen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvoiceListClient invoices={invoices} />
        </CardContent>
      </Card>
    </div>
  );
}
