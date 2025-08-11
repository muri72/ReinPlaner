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
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn(
          "text-2xl font-bold",
          isCost && "text-destructive",
          isProfit && (value >= 0 ? "text-green-600" : "text-destructive")
        )}>
          {formatCurrency(value)}
        </div>
      </CardContent>
    </Card>
  );
}