"use client";

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getMultiMonthFinancialData } from '@/lib/actions/finances';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

interface FinancialDataPoint {
  month: string;
  revenue: number;
  costs: number;
  profit: number;
}

export function FinancialTrendChart() {
  const [data, setData] = useState<FinancialDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await getMultiMonthFinancialData(6); // Fetch data for the last 6 months
      if (result.success && result.data) {
        setData(result.data);
      } else {
        toast.error(result.message || "Fehler beim Laden der Finanztrenddaten.");
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <Card className="col-span-full lg:col-span-2 shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle>Finanzielle Entwicklung (letzte 6 Monate)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] w-full">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="col-span-full lg:col-span-2 shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle>Finanzielle Entwicklung (letzte 6 Monate)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground text-sm py-4">Keine Finanzdaten für die Trendanalyse verfügbar.</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  return (
    <Card className="col-span-full lg:col-span-2 shadow-neumorphic glassmorphism-card">
      <CardHeader>
        <CardTitle>Finanzielle Entwicklung (letzte 6 Monate)</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={formatCurrency} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" name="Einnahmen" activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="costs" stroke="hsl(var(--destructive))" name="Kosten" activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="profit" stroke="hsl(var(--success))" name="Gewinn" activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}