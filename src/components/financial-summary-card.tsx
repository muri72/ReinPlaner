import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinancialSummaryCardProps {
  title: string;
  value: number;
  isCost?: boolean;
  isProfit?: boolean;
}

export function FinancialSummaryCard({ title, value, isCost = false, isProfit = false }: FinancialSummaryCardProps) {
  const formattedValue = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);

  const getIcon = () => {
    if (isCost) return <TrendingDown className="h-4 w-4 text-muted-foreground" />;
    if (isProfit) return <DollarSign className="h-4 w-4 text-muted-foreground" />;
    return <TrendingUp className="h-4 w-4 text-muted-foreground" />;
  };

  const valueColor = isCost ? "text-destructive" : (isProfit && value >= 0 ? "text-green-600" : (isProfit && value < 0 ? "text-destructive" : ""));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {getIcon()}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", valueColor)}>{formattedValue}</div>
      </CardContent>
    </Card>
  );
}