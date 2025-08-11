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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Auftrag</TableHead>
          <TableHead>Kunde</TableHead>
          <TableHead>Objekt</TableHead>
          <TableHead>Mitarbeiter</TableHead>
          <TableHead className="text-right">Einnahmen</TableHead>
          <TableHead className="text-right">Kosten</TableHead>
          <TableHead className="text-right">Gewinn</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="h-24 text-center">
              Keine Auftragsdaten zur Analyse gefunden.
            </TableCell>
          </TableRow>
        ) : (
          data.map((order) => (
            <TableRow key={order.order_id}>
              <TableCell className="font-medium">{order.order_title}</TableCell>
              <TableCell>{order.customer_name}</TableCell>
              <TableCell>{order.object_name || 'N/A'}</TableCell>
              <TableCell>
                {order.employee_first_name || order.employee_last_name
                  ? `${order.employee_first_name || ''} ${order.employee_last_name || ''}`.trim()
                  : 'N/A'}
              </TableCell>
              <TableCell className="text-right">{formatCurrency(order.total_revenue)}</TableCell>
              <TableCell className="text-right text-destructive">{formatCurrency(order.total_cost)}</TableCell>
              <TableCell className={cn(
                "text-right font-semibold",
                order.profit >= 0 ? "text-green-600" : "text-destructive"
              )}>
                {formatCurrency(order.profit)}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={4} className="text-right font-bold">Gesamt</TableCell>
          <TableCell className="text-right font-bold">{formatCurrency(totals.revenue)}</TableCell>
          <TableCell className="text-right font-bold text-destructive">{formatCurrency(totals.cost)}</TableCell>
          <TableCell className={cn(
            "text-right font-bold",
            totals.profit >= 0 ? "text-green-600" : "text-destructive"
          )}>
            {formatCurrency(totals.profit)}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}