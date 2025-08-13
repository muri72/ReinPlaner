"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartData {
  name: string;
  hours: number;
}

interface TimeTrackingChartsProps {
  weeklyData: ChartData[];
  monthlyData: ChartData[];
}

export function TimeTrackingCharts({ weeklyData, monthlyData }: TimeTrackingChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle>Wöchentliche Stunden</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] w-full"> {/* Ensure fixed height for responsiveness */}
          {weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Stunden', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="hours" fill="hsl(var(--primary))" name="Geleistete Stunden" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-4">Keine wöchentlichen Daten verfügbar.</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle>Monatliche Stunden</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] w-full"> {/* Ensure fixed height for responsiveness */}
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Stunden', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="hours" fill="hsl(var(--accent))" name="Geleistete Stunden" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-4">Keine monatlichen Daten verfügbar.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}