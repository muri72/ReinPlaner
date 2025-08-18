"use server";

import { format, startOfMonth, endOfMonth, addMonths, subDays } from 'date-fns';
import { de } from 'date-fns/locale'; // Import German locale
import { createAdminClient } from "@/lib/supabase/server";

export async function getMultiMonthFinancialData(numberOfMonths: number = 6) {
  const supabase = createAdminClient();
  const financialData = [];
  const now = new Date();

  try {
    // Get default hourly rate for employees
    const { data: defaultRateData, error: defaultRateError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'default_employee_hourly_rate')
      .single();
    if (defaultRateError) throw defaultRateError;
    const defaultEmployeeRate = Number(defaultRateData?.value) || 14.25; // Fallback

    // Get all service rates
    const { data: serviceRatesData, error: ratesError } = await supabase.from('service_rates').select('*');
    if (ratesError) throw ratesError;
    const serviceRates = new Map(serviceRatesData.map(r => [r.service_type, Number(r.hourly_rate)]));

    for (let i = 0; i < numberOfMonths; i++) {
      const monthDate = addMonths(now, -i);
      const startDate = startOfMonth(monthDate);
      const endDate = endOfMonth(monthDate);

      // Calculate total costs for the month (based on net hours)
      const { data: costTimeEntries, error: timeEntriesError } = await supabase
        .from('time_entries')
        .select('duration_minutes, break_minutes, employees(hourly_rate)')
        .not('employee_id', 'is', null)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString()); // Use lte for end of month

      if (timeEntriesError) throw timeEntriesError;

      const totalCosts = costTimeEntries.reduce((acc, entry) => {
        const employee = Array.isArray(entry.employees) ? entry.employees[0] : entry.employees;
        const hourlyRate = employee?.hourly_rate || defaultEmployeeRate;
        const netMinutes = (entry.duration_minutes || 0) - (entry.break_minutes || 0);
        const hoursWorked = netMinutes / 60;
        return acc + (hoursWorked * Number(hourlyRate));
      }, 0);

      // Calculate total revenue for the month
      let totalRevenue = 0;

      // Fixed monthly prices from permanent orders (only count if the month is within their recurring period)
      const { data: fixedPriceOrders, error: fixedPriceError } = await supabase
        .from('orders')
        .select('fixed_monthly_price, recurring_start_date, recurring_end_date')
        .eq('order_type', 'permanent')
        .not('fixed_monthly_price', 'is', null)
        .lte('recurring_start_date', endDate.toISOString().split('T')[0]) // Order started before or in this month
        .or(`recurring_end_date.gte.${startDate.toISOString().split('T')[0]},recurring_end_date.is.null`); // Order ends after or in this month, or never ends

      if (fixedPriceError) throw fixedPriceError;
      // For simplicity, if a permanent order was active at any point in the last 7 days,
      // we'll include its full monthly price. A more accurate calculation would prorate.
      totalRevenue += fixedPriceOrders.reduce((acc, order) => acc + Number(order.fixed_monthly_price || 0), 0);

      // Revenue from hourly-based orders (time entries)
      const { data: hourlyTimeEntries, error: hourlyEntriesError } = await supabase
        .from('time_entries')
        .select('duration_minutes, orders(service_type, order_type, fixed_monthly_price)')
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString()); // Use lte for end of month

      if (hourlyEntriesError) throw hourlyEntriesError;

      hourlyTimeEntries.forEach(entry => {
        const order = Array.isArray(entry.orders) ? entry.orders[0] : entry.orders;
        // Only add revenue if it's not a fixed-price permanent order already counted
        if (order && (order.order_type !== 'permanent' || !order.fixed_monthly_price)) {
          const rate = serviceRates.get(order.service_type || '') || 24.00; // Fallback
          const hoursWorked = (entry.duration_minutes || 0) / 60; // Revenue is based on gross hours
          totalRevenue += hoursWorked * rate;
        }
      });

      financialData.push({
        month: format(monthDate, 'MMM yy', { locale: de }),
        revenue: parseFloat(totalRevenue.toFixed(2)),
        costs: parseFloat(totalCosts.toFixed(2)),
        profit: parseFloat((totalRevenue - totalCosts).toFixed(2)),
      });
    }

    return { success: true, data: financialData.reverse(), message: "Finanzdaten erfolgreich geladen." }; // Reverse to show oldest first
  } catch (error: any) {
    console.error("Fehler beim Laden der Finanzdaten für Charts:", error?.message || error);
    return { success: false, data: null, message: error.message };
  }
}

export async function getMultiMonthEmployeeWorkload(numberOfMonths: number = 6) {
  const supabase = createAdminClient();
  const workloadData = [];
  const now = new Date();

  try {
    // Get default hourly rate for employees
    const { data: defaultRateData, error: defaultRateError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'default_employee_hourly_rate')
      .single();
    if (defaultRateError) throw defaultRateError;
    const defaultEmployeeRate = Number(defaultRateData?.value) || 14.25; // Fallback

    for (let i = 0; i < numberOfMonths; i++) {
      const monthDate = addMonths(now, -i);
      const startDate = startOfMonth(monthDate);
      const endDate = endOfMonth(monthDate);

      const { data: timeEntries, error: timeEntriesError } = await supabase
        .from('time_entries')
        .select('employee_id, duration_minutes, break_minutes, employees(first_name, last_name)')
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString());

      if (timeEntriesError) throw timeEntriesError;

      const employeeHours: { [key: string]: { name: string; hours: number } } = {};

      timeEntries.forEach(entry => {
        const employee = Array.isArray(entry.employees) ? entry.employees[0] : entry.employees;
        if (employee && entry.employee_id) {
          const netMinutes = (entry.duration_minutes || 0) - (entry.break_minutes || 0);
          const hoursWorked = netMinutes / 60;
          if (!employeeHours[entry.employee_id]) {
            employeeHours[entry.employee_id] = { name: `${employee.first_name} ${employee.last_name}`, hours: 0 };
          }
          employeeHours[entry.employee_id].hours += hoursWorked;
        }
      });

      workloadData.push({
        month: format(monthDate, 'MMM yy', { locale: de }),
        employees: Object.values(employeeHours).map(emp => ({
          ...emp,
          hours: parseFloat(emp.hours.toFixed(2))
        }))
      });
    }

    return { success: true, data: workloadData.reverse(), message: "Mitarbeiter-Auslastungsdaten erfolgreich geladen." };
  } catch (error: any) {
    console.error("Fehler beim Laden der Mitarbeiter-Auslastungsdaten:", error?.message || error);
    return { success: false, data: null, message: error.message };
  }
}

export async function getRevenueLast7Days() {
  const supabase = createAdminClient();
  const today = new Date();
  const sevenDaysAgo = subDays(today, 7);
  sevenDaysAgo.setHours(0, 0, 0, 0); // Start of the day 7 days ago

  try {
    // Get all service rates
    const { data: serviceRatesData, error: ratesError } = await supabase.from('service_rates').select('*');
    if (ratesError) throw ratesError;
    const serviceRates = new Map(serviceRatesData.map(r => [r.service_type, Number(r.hourly_rate)]));

    let totalRevenue = 0;

    // Fixed monthly prices from permanent orders (prorated for the last 7 days)
    // This is a simplification. For true prorated revenue, you'd need more complex logic
    // or a dedicated invoicing system. For now, we'll just sum up fixed prices if the order was active.
    const { data: fixedPriceOrders, error: fixedPriceError } = await supabase
      .from('orders')
      .select('fixed_monthly_price, recurring_start_date, recurring_end_date')
      .eq('order_type', 'permanent')
      .not('fixed_monthly_price', 'is', null)
      .lte('recurring_start_date', today.toISOString().split('T')[0])
      .or(`recurring_end_date.gte.${sevenDaysAgo.toISOString().split('T')[0]},recurring_end_date.is.null`);

    if (fixedPriceError) throw fixedPriceError;
    // For simplicity, if a permanent order was active at any point in the last 7 days,
    // we'll include its full monthly price. A more accurate calculation would prorate.
    totalRevenue += fixedPriceOrders.reduce((acc, order) => acc + Number(order.fixed_monthly_price || 0), 0);


    // Revenue from hourly-based orders (time entries) within the last 7 days
    const { data: hourlyTimeEntries, error: hourlyEntriesError } = await supabase
      .from('time_entries')
      .select('duration_minutes, orders(service_type, order_type, fixed_monthly_price)')
      .gte('start_time', sevenDaysAgo.toISOString())
      .lte('start_time', today.toISOString());

    if (hourlyEntriesError) throw hourlyEntriesError;

    hourlyTimeEntries.forEach(entry => {
      const order = Array.isArray(entry.orders) ? entry.orders[0] : entry.orders;
      if (order && (order.order_type !== 'permanent' || !order.fixed_monthly_price)) {
        const rate = serviceRates.get(order.service_type || '') || 24.00; // Fallback
        const hoursWorked = (entry.duration_minutes || 0) / 60; // Revenue is based on gross hours
        totalRevenue += hoursWorked * rate;
      }
    });

    return { success: true, data: parseFloat(totalRevenue.toFixed(2)), message: "Umsatz der letzten 7 Tage erfolgreich geladen." };
  } catch (error: any) {
    console.error("Fehler beim Laden des Umsatzes der letzten 7 Tage:", error?.message || error);
    return { success: false, data: null, message: error.message };
  }
}

export async function getMostBookedServices(limit: number = 5) {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('service_type')
      .not('service_type', 'is', null);

    if (error) throw error;

    const serviceCounts: { [key: string]: number } = {};
    data.forEach(order => {
      if (order.service_type) {
        serviceCounts[order.service_type] = (serviceCounts[order.service_type] || 0) + 1;
      }
    });

    const sortedServices = Object.entries(serviceCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, limit)
      .map(([service, count]) => ({ service, count }));

    return { success: true, data: sortedServices, message: "Meistgebuchte Leistungen erfolgreich geladen." };
  } catch (error: any) {
    console.error("Fehler beim Laden der meistgebuchten Leistungen:", error?.message || error);
    return { success: false, data: null, message: error.message };
  }
}