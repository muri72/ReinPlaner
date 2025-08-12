"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

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

interface OrderFinancialsTableProps {
  data: OrderFinancial[];
  totals: {
    revenue: number;
    cost: number;
    profit: number;
  };
}

export function OrderFinancialsTable({ data, totals }: OrderFinancialsTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  return (
    <div className="overflow-x-auto"> {/* Added overflow-x-auto for mobile scrolling */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-sm font-semibold min-w-[120px]">Auftrag</TableHead><TableHead className="text-sm font-semibold min-w-[100px]">Kunde</TableHead><TableHead className="text-sm font-semibold min-w-[100px]">Objekt</TableHead><TableHead className="text-sm font-semibold min-w-[120px]">Mitarbeiter</TableHead><TableHead className="text-right text-sm font-semibold min-w-[100px]">Einnahmen</TableHead><TableHead className="text-right text-sm font-semibold min-w-[100px]">Kosten</TableHead><TableHead className="text-right text-sm font-semibold min-w-[100px]">Gewinn</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                Keine Auftragsdaten zur Analyse gefunden.
              </TableCell>
            </TableRow>
          ) : (
            data.map((order) => (
              <TableRow key={order.order_id}>
                <TableCell className="font-medium text-xs">{order.order_title}</TableCell><TableCell className="text-xs">{order.customer_name}</TableCell><TableCell className="text-xs">{order.object_name || 'N/A'}</TableCell><TableCell className="text-xs">
                  {order.employee_first_name || order.employee_last_name
                    ? `${order.employee_first_name || ''} ${order.employee_last_name || ''}`.trim()
                    : 'N/A'}
                </TableCell><TableCell className="text-right text-xs">{formatCurrency(order.total_revenue)}</TableCell><TableCell className="text-right text-xs text-destructive">{formatCurrency(order.total_cost)}</TableCell><TableCell className={cn(
                  "text-right font-medium text-xs",
                  order.profit >= 0 ? "text-success" : "text-destructive"
                )}>
                  {formatCurrency(order.profit)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4} className="text-right font-bold text-sm">Gesamt</TableCell><TableCell className="text-right font-bold text-sm">{formatCurrency(totals.revenue)}</TableCell><TableCell className="text-right font-bold text-sm text-destructive">{formatCurrency(totals.cost)}</TableCell><TableCell className={cn(
              "text-right font-bold text-sm",
              totals.profit >= 0 ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(totals.profit)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}