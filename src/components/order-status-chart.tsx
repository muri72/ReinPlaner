"use client";

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OrderStatusChartProps {
  data: { name: string; value: number }[];
}

// Farben für die Segmente des Tortendiagramms
const COLORS = ['hsl(var(--warning))', 'hsl(var(--secondary))', 'hsl(var(--primary))']; // Gelb für Ausstehend, Grau für In Bearbeitung, Blau für Abgeschlossen

export function OrderStatusChart({ data }: OrderStatusChartProps) {
  // Filtern Sie Datenpunkte mit Wert 0 heraus, damit sie nicht im Diagramm erscheinen
  const filteredData = data.filter(entry => entry.value > 0);

  if (filteredData.length === 0) {
    return (
      <Card className="col-span-full lg:col-span-2">
        <CardHeader>
          <CardTitle>Auftragsstatus-Verteilung</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground text-sm py-4">Keine Auftragsdaten verfügbar.</p> {/* Adjusted text size and padding */}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full lg:col-span-2"> {/* Nimmt mehr Platz ein */}
      <CardHeader>
        <CardTitle>Auftragsstatus-Verteilung</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] w-full"> {/* Ensure fixed height for responsiveness */}
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filteredData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {filteredData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}