"use server";

import { format, startOfMonth, endOfMonth, addMonths, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { db } from "@/lib/db";
import { 
  timeEntries, 
  employees, 
  orders, 
  orderEmployeeAssignments,
  serviceRates,
  appSettings
} from "@/lib/db/schema";
import { eq, and, gte, lte, isNull, or, ne } from "drizzle-orm";

export async function getMultiMonthFinancialData(numberOfMonths: number = 6) {
  const financialData = [];
  const now = new Date();

  try {
    // Get default hourly rate from app_settings JSON
    const settingsRecord = await db.query.appSettings.findFirst();
    let defaultEmployeeRate = 14.25; // Fallback
    if (settingsRecord?.settings && typeof settingsRecord.settings === 'object') {
      const settings = settingsRecord.settings as Record<string, any>;
      if (settings.default_employee_hourly_rate) {
        defaultEmployeeRate = Number(settings.default_employee_hourly_rate);
      }
    }

    // Get all service rates (service_type -> hourly_rate mapping)
    const allServiceRates = (await db.query.serviceRates.findMany({
      with: { service: true }
    })) as any[];
    const serviceRatesMap = new Map<string, number>();
    allServiceRates.forEach(sr => {
      if (sr.service?.serviceType) {
        // hourlyRate is stored in cents, convert to euros
        serviceRatesMap.set(sr.service.serviceType, Number(sr.hourlyRate) / 100);
      }
    });

    for (let i = 0; i < numberOfMonths; i++) {
      const monthDate = addMonths(now, -i);
      const startDate = startOfMonth(monthDate);
      const endDate = endOfMonth(monthDate);

      // Calculate total costs for the month (based on net hours)
      const costTimeEntries = (await db.query.timeEntries.findMany({
        where: and(
          isNull(timeEntries.employeeId),
          gte(timeEntries.date, startDate),
          lte(timeEntries.date, endDate)
        ),
        with: {
          employee: true
        }
      })) as any[];

      const totalCosts = costTimeEntries.reduce((acc, entry) => {
        const hourlyRate = entry.employee?.hourlyRate ? Number(entry.employee.hourlyRate) / 100 : defaultEmployeeRate;
        const netMinutes = (entry.hoursWorked || 0) - (entry.breakMinutes || 0);
        const hoursWorked = netMinutes / 60;
        return acc + (hoursWorked * hourlyRate);
      }, 0);

      // Calculate total revenue for the month
      let totalRevenue = 0;

      // Fixed monthly prices from permanent orders (only count if the month is within their recurring period)
      const permanentOrders = (await db.query.orders.findMany({
        where: and(
          eq(orders.orderType, 'permanent'),
          isNull(orders.fixedMonthlyPrice),
          lte(orders.startDate, endDate),
          or(gte(orders.recurringEndDate, startDate), isNull(orders.recurringEndDate))
        ),
        with: {
          assignments: true
        }
      })) as any[];

      totalRevenue += permanentOrders.reduce((acc, order) => acc + (Number(order.fixedMonthlyPrice) || 0), 0);

      // Revenue from hourly-based orders (time entries)
      const hourlyTimeEntries = (await db.query.timeEntries.findMany({
        where: and(
          gte(timeEntries.date, startDate),
          lte(timeEntries.date, endDate)
        ),
        with: {
          shift: {
            with: {
              order: true
            }
          }
        }
      })) as any[];

      for (const entry of hourlyTimeEntries) {
        const order = entry.shift?.order;
        // Only add revenue if it's not a fixed-price permanent order already counted
        if (order && (order.orderType !== 'permanent' || !order.fixedMonthlyPrice)) {
          const rate = serviceRatesMap.get(order.serviceType || '') || 24.00;
          const hoursWorked = (entry.hoursWorked || 0) / 60; // Revenue is based on gross hours
          totalRevenue += hoursWorked * rate;
        }
      }

      financialData.push({
        month: format(monthDate, 'MMM yy', { locale: de }),
        revenue: parseFloat(totalRevenue.toFixed(2)),
        costs: parseFloat(totalCosts.toFixed(2)),
        profit: parseFloat((totalRevenue - totalCosts).toFixed(2)),
      });
    }

    return { success: true, data: financialData.reverse(), message: "Finanzdaten erfolgreich geladen." };
  } catch (error: any) {
    console.error("Fehler beim Laden der Finanzdaten für Charts:", error?.message || error);
    return { success: false, data: null, message: error.message };
  }
}

export async function getMultiMonthEmployeeWorkload(numberOfMonths: number = 6) {
  const workloadData = [];
  const now = new Date();

  try {
    // Get default hourly rate from app_settings JSON
    const settingsRecord = await db.query.appSettings.findFirst();
    let defaultEmployeeRate = 14.25; // Fallback
    if (settingsRecord?.settings && typeof settingsRecord.settings === 'object') {
      const settings = settingsRecord.settings as Record<string, any>;
      if (settings.default_employee_hourly_rate) {
        defaultEmployeeRate = Number(settings.default_employee_hourly_rate);
      }
    }

    for (let i = 0; i < numberOfMonths; i++) {
      const monthDate = addMonths(now, -i);
      const startDate = startOfMonth(monthDate);
      const endDate = endOfMonth(monthDate);

      const monthlyTimeEntries = (await db.query.timeEntries.findMany({
        where: and(
          gte(timeEntries.date, startDate),
          lte(timeEntries.date, endDate)
        ),
        with: {
          employee: {
            with: {
              profile: true
            }
          }
        }
      })) as any[];

      const employeeHours: { [key: string]: { name: string; hours: number } } = {};

      monthlyTimeEntries.forEach(entry => {
        if (entry.employee && entry.id) {
          const netMinutes = (entry.hoursWorked || 0) - (entry.breakMinutes || 0);
          const hoursWorked = netMinutes / 60;
          const emp = entry.employee;
          const fullName = emp.profile ? `${emp.profile.fullName || ''}` : '';
          if (!employeeHours[entry.id]) {
            employeeHours[entry.id] = { name: fullName.trim() || 'Unknown', hours: 0 };
          }
          employeeHours[entry.id].hours += hoursWorked;
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
  const today = new Date();
  const sevenDaysAgo = subDays(today, 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  try {
    // Get all service rates
    const allServiceRates = (await db.query.serviceRates.findMany({
      with: { service: true }
    })) as any[];
    const serviceRatesMap = new Map<string, number>();
    allServiceRates.forEach(sr => {
      if (sr.service?.serviceType) {
        serviceRatesMap.set(sr.service.serviceType, Number(sr.hourlyRate) / 100);
      }
    });

    let totalRevenue = 0;

    // Fixed monthly prices from permanent orders (prorated for the last 7 days)
    const fixedPriceOrders = (await db.query.orders.findMany({
      where: and(
        eq(orders.orderType, 'permanent'),
        isNull(orders.fixedMonthlyPrice),
        lte(orders.startDate, today),
        or(gte(orders.recurringEndDate, sevenDaysAgo), isNull(orders.recurringEndDate))
      ),
      with: {
        assignments: true
      }
    })) as any[];

    totalRevenue += fixedPriceOrders.reduce((acc, order) => acc + Number(order.fixedMonthlyPrice || 0), 0);

    // Revenue from hourly-based orders (time entries) within the last 7 days
    const hourlyTimeEntries = (await db.query.timeEntries.findMany({
      where: and(
        gte(timeEntries.date, sevenDaysAgo),
        lte(timeEntries.date, today)
      ),
      with: {
        shift: {
          with: {
            order: true
          }
        }
      }
    })) as any[];

    for (const entry of hourlyTimeEntries) {
      const order = entry.shift?.order;
      if (order && (order.orderType !== 'permanent' || !order.fixedMonthlyPrice)) {
        const rate = serviceRatesMap.get(order.serviceType || '') || 24.00;
        const hoursWorked = (entry.hoursWorked || 0) / 60;
        totalRevenue += hoursWorked * rate;
      }
    }

    return { success: true, data: parseFloat(totalRevenue.toFixed(2)), message: "Umsatz der letzten 7 Tage erfolgreich geladen." };
  } catch (error: any) {
    console.error("Fehler beim Laden des Umsatzes der letzten 7 Tage:", error?.message || error);
    return { success: false, data: null, message: error.message };
  }
}

export async function getMostBookedServices(limit: number = 5) {
  try {
    const allOrders = (await db.query.orders.findMany({
      where: ne(orders.serviceType, null),
      with: {
        assignments: true
      }
    })) as any[];

    const serviceCounts: { [key: string]: number } = {};
    allOrders.forEach(order => {
      if (order.serviceType) {
        serviceCounts[order.serviceType] = (serviceCounts[order.serviceType] || 0) + 1;
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