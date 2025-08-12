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

interface PersonnelCost {
  employee_id: string;
  first_name: string;
  last_name: string;
  total_hours: number;
  total_cost: number;
}

interface PersonnelCostTableProps {
  data: PersonnelCost[];
  totalHours: number;
  totalCost: number;
}

export function PersonnelCostTable({ data, totalHours, totalCost }: PersonnelCostTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(2)} Std.`;
  };

  return (
    <div className="overflow-x-auto"> {/* Added overflow-x-auto for mobile scrolling */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-sm font-semibold min-w-[150px]">Mitarbeiter</TableHead><TableHead className="text-right text-sm font-semibold min-w-[120px]">Geleistete Stunden</TableHead><TableHead className="text-right text-sm font-semibold min-w-[120px]">Gesamtkosten</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center text-sm text-muted-foreground">
                Keine Personalkosten für diesen Monat gefunden.
              </TableCell>
            </TableRow>
          ) : (
            data.map((employee) => (
              <TableRow key={employee.employee_id}>
                <TableCell className="font-medium text-xs">{`${employee.first_name} ${employee.last_name}`}</TableCell><TableCell className="text-right text-xs">{formatHours(employee.total_hours)}</TableCell><TableCell className="text-right text-xs text-destructive">{formatCurrency(employee.total_cost)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2} className="font-bold text-sm text-right">Gesamt</TableCell><TableCell className="text-right font-bold text-sm text-destructive">{formatCurrency(totalCost)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}