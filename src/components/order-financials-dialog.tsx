"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OrderFinancialsDialogProps {
  orderId: string;
  orderTitle: string;
}

interface Financials {
  total_revenue: number;
  total_cost: number;
  profit: number;
}

export function OrderFinancialsDialog({ orderId, orderTitle }: OrderFinancialsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [financials, setFinancials] = useState<Financials | null>(null);

  const fetchFinancials = async () => {
    if (!open || financials) return; // Don't refetch if already loaded

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .rpc('get_order_financials', { p_order_id: orderId })
      .single();

    if (error) {
      toast.error("Finanzdaten konnten nicht geladen werden.");
      console.error(error);
    } else {
      setFinancials(data as Financials | null);
    }
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) {
        fetchFinancials();
      } else {
        setFinancials(null); // Reset on close
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" title="Finanzdetails anzeigen">
          <DollarSign className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finanzübersicht: {orderTitle}</DialogTitle>
          <DialogDescription>
            Eine Aufschlüsselung der Einnahmen, Kosten und des Gewinns für diesen Auftrag.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : financials ? (
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-secondary">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-3 text-muted-foreground" />
                <span className="font-medium">Einnahmen</span>
              </div>
              <span className="font-bold text-lg">{formatCurrency(financials.total_revenue)}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-secondary">
              <div className="flex items-center">
                <TrendingDown className="h-5 w-5 mr-3 text-muted-foreground" />
                <span className="font-medium">Kosten</span>
              </div>
              <span className="font-bold text-lg text-destructive">{formatCurrency(financials.total_cost)}</span>
            </div>
            <div className="flex justify-between items-center p-4 rounded-lg border-2">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 mr-3" />
                <span className="font-medium text-lg">Gewinn</span>
              </div>
              <span className={cn(
                "font-bold text-xl",
                financials.profit >= 0 ? "text-green-600" : "text-destructive"
              )}>
                {formatCurrency(financials.profit)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">Keine Finanzdaten für diesen Auftrag gefunden.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}