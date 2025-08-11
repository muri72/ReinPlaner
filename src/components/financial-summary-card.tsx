"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FinancialSummaryCardProps {
  title: string;
  value: number;
  isCost?: boolean;
  isProfit?: boolean;
}

export function FinancialSummaryCard({ title, value, isCost, isProfit }: FinancialSummaryCardProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);
  };

  return (
    <Card className="flex-1 min-w-[180px]"> {/* Ensure cards can flex and have a minimum width */}
      <CardHeader className="pb-2"> {/* Reduced padding for mobile */}
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn(
          "text-xl font-bold", // Changed to text-xl
          isCost && "text-destructive",
          isProfit && (value >= 0 ? "text-success" : "text-destructive") // Changed to text-success
        )}>
          {formatCurrency(value)}
        </div>
      </CardContent>
    </Card>
  );
}