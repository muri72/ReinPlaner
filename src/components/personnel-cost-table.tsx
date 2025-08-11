"use client";

import {
  Table,
  TableBody,
  TableCell,
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
}

export function PersonnelCostTable({ data }: PersonnelCostTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(2)} Std.`;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mitarbeiter</TableHead>
          <TableHead className="text-right">Geleistete Stunden</TableHead>
          <TableHead className="text-right">Gesamtkosten</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="h-24 text-center">
              Keine Personalkosten für diesen Monat gefunden.
            </TableCell>
          </TableRow>
        ) : (
          data.map((employee) => (
            <TableRow key={employee.employee_id}>
              <TableCell className="font-medium">{`${employee.first_name} ${employee.last_name}`}</TableCell>
              <TableCell className="text-right">{formatHours(employee.total_hours)}</TableCell>
              <TableCell className="text-right text-destructive">{formatCurrency(employee.total_cost)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}