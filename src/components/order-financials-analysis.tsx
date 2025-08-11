"use client";

import { useState, useEffect } from "react";
import { getMonthlyFinancialsForAllOrders } from "@/app/dashboard/finances/actions";
import { OrderFinancialsTable } from "@/components/order-financials-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface OrderFinancial {
  order_id: string;
  order_title: string;
  customer_name: string;
  object_name: string | null;
  employee_first_name: string | null;
  employee_last_name: string | null;
  total_revenue: number;
  total_cost: number;
  profit: number;
}

export function OrderFinancialsAnalysis() {
  const [data, setData] = useState<OrderFinancial[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await getMonthlyFinancialsForAllOrders(Number(selectedYear), Number(selectedMonth));
      if (result.success && result.data) {
        setData(result.data as OrderFinancial[]);
      } else {
        toast.error(result.message || "Fehler beim Laden der Finanzdaten.");
        setData([]);
      }
      setLoading(false);
    };
    fetchData();
  }, [selectedMonth, selectedYear]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(0, i).toLocaleString('de-DE', { month: 'long' }),
  }));

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Monat" />
          </SelectTrigger>
          <SelectContent>
            {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Jahr" />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <OrderFinancialsTable data={data} />
      )}
    </div>
  );
}