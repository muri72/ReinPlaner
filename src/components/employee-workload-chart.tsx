"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getMultiMonthEmployeeWorkload } from '@/lib/actions/finances';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

interface EmployeeWorkloadDataPoint {
  month: string;
  employees: {
    name: string;
    hours: number;
  }[];
}

export function EmployeeWorkloadChart() {
  const [data, setData] = useState<EmployeeWorkloadDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await getMultiMonthEmployeeWorkload(6); // Fetch data for the last 6 months
      if (result.success && result.data) {
        setData(result.data);
      } else {
        toast.error(result.message || "Fehler beim Laden der Mitarbeiter-Auslastungsdaten.");
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <Card className="col-span-full lg:col-span-2 shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle>Mitarbeiter-Auslastung (letzte 6 Monate)</CardTitle>
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
          <CardTitle>Mitarbeiter-Auslastung (letzte 6 Monate)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground text-sm py-4">Keine Mitarbeiter-Auslastungsdaten für die Trendanalyse verfügbar.</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for stacked bar chart: each month needs a sum of hours per employee
  // This is a simplified representation for a stacked bar chart.
  // For a more detailed view, you might need to transform data differently or use a different chart type.
  const chartData = data.map(monthData => {
    const monthEntry: { [key: string]: any } = { name: monthData.month };
    monthData.employees.forEach(emp => {
      monthEntry[emp.name] = emp.hours;
    });
    return monthEntry;
  });

  // Dynamically get all unique employee names for the legend and bars
  const allEmployeeNames = Array.from(new Set(data.flatMap(monthData => monthData.employees.map(emp => emp.name))));

  // Assign a color to each employee (simple example, could be more sophisticated)
  const employeeColors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FFD700'
  ];

  return (
    <Card className="col-span-full lg:col-span-2 shadow-neumorphic glassmorphism-card">
      <CardHeader>
        <CardTitle>Mitarbeiter-Auslastung (letzte 6 Monate)</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: 'Stunden', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            {allEmployeeNames.map((name, index) => (
              <Bar key={name} dataKey={name} stackId="a" fill={employeeColors[index % employeeColors.length]} name={name} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}