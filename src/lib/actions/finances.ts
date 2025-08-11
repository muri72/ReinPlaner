"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { startOfMonth, endOfMonth } from 'date-fns';

export async function getFinancialOverview(year: number, month: number) {
  const supabase = createAdminClient();

  const startDate = startOfMonth(new Date(year, month - 1));
  const endDate = endOfMonth(new Date(year, month - 1));

  try {
    // 1. Personalkosten berechnen
    const { data: timeEntries, error: timeEntriesError } = await supabase
      .from('time_entries')
      .select('duration_minutes, employees(hourly_rate)')
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString());

    if (timeEntriesError) throw timeEntriesError;

    const totalCosts = timeEntries.reduce((acc, entry) => {
      const employee = Array.isArray(entry.employees) ? entry.employees[0] : entry.employees;
      const hourlyRate = employee?.hourly_rate || 14.25; // Fallback auf 14.25
      const hoursWorked = (entry.duration_minutes || 0) / 60;
      return acc + (hoursWorked * Number(hourlyRate));
    }, 0);

    // 2. Einnahmen berechnen
    // 2a. Feste monatliche Preise von Daueraufträgen
    const { data: fixedPriceOrders, error: fixedPriceError } = await supabase
      .from('orders')
      .select('fixed_monthly_price')
      .eq('order_type', 'permanent')
      .not('fixed_monthly_price', 'is', null);

    if (fixedPriceError) throw fixedPriceError;

    let totalRevenue = fixedPriceOrders.reduce((acc, order) => acc + Number(order.fixed_monthly_price || 0), 0);

    // 2b. Einnahmen aus stundenbasierten Aufträgen
    const { data: serviceRatesData, error: ratesError } = await supabase.from('service_rates').select('*');
    if (ratesError) throw ratesError;
    const serviceRates = new Map(serviceRatesData.map(r => [r.service_type, Number(r.hourly_rate)]));

    const { data: hourlyTimeEntries, error: hourlyEntriesError } = await supabase
      .from('time_entries')
      .select('duration_minutes, orders(service_type, order_type, fixed_monthly_price)')
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString());

    if (hourlyEntriesError) throw hourlyEntriesError;

    hourlyTimeEntries.forEach(entry => {
      const order = Array.isArray(entry.orders) ? entry.orders[0] : entry.orders;
      // Nur Einnahmen für Aufträge berechnen, die KEINEN festen Monatspreis haben
      if (order && (order.order_type !== 'permanent' || !order.fixed_monthly_price)) {
        const rate = serviceRates.get(order.service_type || '') || 24.00; // Fallback auf 24.00
        const hoursWorked = (entry.duration_minutes || 0) / 60;
        totalRevenue += hoursWorked * rate;
      }
    });

    const profit = totalRevenue - totalCosts;

    return {
      success: true,
      message: "Finanzdaten erfolgreich geladen.",
      data: {
        totalRevenue,
        totalCosts,
        profit,
      },
    };
  } catch (error: any) {
    console.error("Fehler beim Laden der Finanzübersicht:", error);
    return { success: false, message: error.message, data: null };
  }
}

export async function getFinancialsForAllOrders() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_all_order_financials');
  if (error) {
    console.error("Fehler beim Abrufen der Finanzdaten für alle Aufträge:", error);
    return { success: false, message: error.message, data: null };
  }
  return { success: true, message: "Daten geladen.", data };
}

export async function getServiceRates() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('service_rates').select('*');
  if (error) {
    return { success: false, message: error.message, data: null };
  }
  return { success: true, message: "Stundensätze geladen.", data };
}

export async function updateServiceRates(rates: { service_type: string; hourly_rate: number }[]) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('service_rates').upsert(rates, { onConflict: 'service_type' });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath('/dashboard/finances');
  return { success: true, message: "Stundensätze erfolgreich aktualisiert." };
}