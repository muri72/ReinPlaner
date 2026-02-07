"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logDataChange } from "@/lib/audit-log";
import { transactionTypes } from "@/lib/time-account-config";

// Type definitions
export interface TimeAccount {
  id: string;
  employee_id: string;
  year: number;
  month: number;
  target_hours: number;
  actual_hours: number;
  monthly_delta: number;
  balance_before: number;
  balance_after: number;
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

export interface TimeAccountWithEmployee extends TimeAccount {
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    contract_hours_per_week: number | null;
  };
}

export interface TimeAccountTransaction {
  id: string;
  time_account_id: string;
  transaction_type: string;
  hours: number;
  balance_before: number;
  balance_after: number;
  reason: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_by: string | null;
  created_at: string;
}

export interface YearSummary {
  year: number;
  total_overtime_earned: number;
  total_minus_hours: number;
  opening_balance: number;
  closing_balance: number;
  monthly_data: TimeAccount[];
}

/**
 * Get time account for a specific employee and month
 * If not exists, calculates it on the fly
 */
export async function getTimeAccountForMonth(
  employeeId: string,
  year: number,
  month: number
): Promise<{ success: boolean; data?: TimeAccount; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Benutzer nicht authentifiziert." };
  }

  // Try to get existing time account
  const { data: existingAccount, error: fetchError } = await supabase
    .from('time_accounts')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    return { success: false, error: fetchError.message };
  }

  if (existingAccount) {
    return { success: true, data: existingAccount };
  }

  // Calculate and create new time account
  return await calculateTimeAccountForMonth(employeeId, year, month);
}

/**
 * Calculate time account for a specific month from time_entries
 * Creates or updates the time_accounts record
 */
export async function calculateTimeAccountForMonth(
  employeeId: string,
  year: number,
  month: number
): Promise<{ success: boolean; data?: TimeAccount; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Benutzer nicht authentifiziert." };
  }

  // Get employee data for contract hours
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('contract_hours_per_week')
    .eq('id', employeeId)
    .single();

  if (employeeError || !employee) {
    return { success: false, error: "Mitarbeiter nicht gefunden." };
  }

  // Calculate target hours (pro-rated for part-time)
  const contractHoursPerWeek = employee.contract_hours_per_week ?? 40;
  const targetHours = (contractHoursPerWeek / 40) * 160;

  // Calculate actual hours from time_entries
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const { data: timeEntries, error: entriesError } = await supabase
    .from('time_entries')
    .select('duration_minutes, break_minutes')
    .eq('employee_id', employeeId)
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())
    .not('end_time', 'is', null);

  let actualHours = 0;
  if (!entriesError && timeEntries) {
    actualHours = timeEntries.reduce((sum, entry) => {
      const duration = entry.duration_minutes ?? 0;
      const breakTime = entry.break_minutes ?? 0;
      return sum + (duration - breakTime) / 60;
    }, 0);
  }

  // Calculate monthly delta
  const monthlyDelta = actualHours - targetHours;

  // Get previous month's ending balance
  const { data: previousAccount } = await supabase
    .from('time_accounts')
    .select('balance_after')
    .eq('employee_id', employeeId)
    .or(`and(year.lt.${year},and(year.eq.${year},month.lt.${month}))`)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(1)
    .maybeSingle();

  const balanceBefore = previousAccount?.balance_after ?? 0;
  const balanceAfter = balanceBefore + monthlyDelta;

  // Check if time account exists and update or insert
  const { data: existingAccount } = await supabase
    .from('time_accounts')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  let result: TimeAccount;

  if (existingAccount) {
    // Update existing
    const { data, error } = await supabase
      .from('time_accounts')
      .update({
        target_hours: targetHours,
        actual_hours: actualHours,
        monthly_delta: monthlyDelta,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        calculated_at: new Date().toISOString(),
      })
      .eq('id', existingAccount.id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    result = data;
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('time_accounts')
      .insert({
        employee_id: employeeId,
        year,
        month,
        target_hours: targetHours,
        actual_hours: actualHours,
        monthly_delta: monthlyDelta,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    result = data;
  }

  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/reports");
  return { success: true, data: result };
}

/**
 * Get year summary for an employee
 */
export async function getTimeAccountYearSummary(
  employeeId: string,
  year: number
): Promise<{ success: boolean; data?: YearSummary; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Benutzer nicht authentifiziert." };
  }

  const { data: monthlyData, error } = await supabase
    .from('time_accounts')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('year', year)
    .order('month', { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  const totalOvertimeEarned = monthlyData?.filter(m => m.monthly_delta > 0)
    .reduce((sum, m) => sum + m.monthly_delta, 0) ?? 0;

  const totalMinusHours = monthlyData?.filter(m => m.monthly_delta < 0)
    .reduce((sum, m) => sum + Math.abs(m.monthly_delta), 0) ?? 0;

  const openingBalance = monthlyData?.[0]?.balance_before ?? 0;
  const closingBalance = monthlyData?.[monthlyData.length - 1]?.balance_after ?? 0;

  return {
    success: true,
    data: {
      year,
      total_overtime_earned: totalOvertimeEarned,
      total_minus_hours: totalMinusHours,
      opening_balance: openingBalance,
      closing_balance: closingBalance,
      monthly_data: monthlyData ?? [],
    },
  };
}

/**
 * Get all time accounts for a specific month (admin only)
 */
export async function getAllTimeAccountsForMonth(
  year: number,
  month: number
): Promise<{ success: boolean; data?: TimeAccountWithEmployee[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Benutzer nicht authentifiziert." };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { success: false, error: "Nur Administratoren können diese Aktion ausführen." };
  }

  const { data, error } = await supabase
    .from('time_accounts')
    .select(`
      *,
      employee:employees!inner(
        id,
        first_name,
        last_name,
        contract_hours_per_week
      )
    `)
    .eq('year', year)
    .eq('month', month)
    .order('balance_after', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as TimeAccountWithEmployee[] };
}

/**
 * Get all employees with their time account data for a specific month (admin only)
 * Includes employees without time account entries
 */
export async function getAllEmployeesWithTimeAccounts(
  year: number,
  month: number
): Promise<{ success: boolean; data?: (TimeAccountWithEmployee | { employee: any; time_account: null })[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Benutzer nicht authentifiziert." };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { success: false, error: "Nur Administratoren können diese Aktion ausführen." };
  }

  // Get all active employees
  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id, first_name, last_name, contract_hours_per_week, status')
    .in('status', ['active', 'on_leave'])
    .order('last_name', { ascending: true });

  if (employeesError) {
    return { success: false, error: employeesError.message };
  }

  if (!employees) {
    return { success: true, data: [] };
  }

  // Get time accounts for this month
  const { data: timeAccounts, error: timeAccountsError } = await supabase
    .from('time_accounts')
    .select('*')
    .eq('year', year)
    .eq('month', month);

  if (timeAccountsError) {
    return { success: false, error: timeAccountsError.message };
  }

  // Merge employees with their time accounts
  const mergedData = employees.map(emp => {
    const timeAccount = timeAccounts?.find(ta => ta.employee_id === emp.id);
    if (timeAccount) {
      return {
        ...timeAccount,
        employee: emp,
      };
    }
    return {
      employee: emp,
      time_account: null,
    };
  });

  return { success: true, data: mergedData as any };
}

/**
 * Manually adjust time account balance (admin only)
 * Creates a transaction record for audit trail
 */
export async function adjustTimeAccountBalance(
  employeeId: string,
  year: number,
  month: number,
  hours: number,
  reason: string
): Promise<{ success: boolean; data?: TimeAccount; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Benutzer nicht authentifiziert." };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { success: false, error: "Nur Administratoren können diese Aktion ausführen." };
  }

  // Get current time account
  const { data: currentAccount, error: accountError } = await supabase
    .from('time_accounts')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('year', year)
    .eq('month', month)
    .single();

  let accountData = currentAccount;

  if (accountError || !currentAccount) {
    // Try to calculate first
    const calcResult = await calculateTimeAccountForMonth(employeeId, year, month);
    if (!calcResult.success || !calcResult.data) {
      return { success: false, error: "Zeitkonto konnte nicht gefunden werden." };
    }
    accountData = calcResult.data as any;
  }

  const balanceBefore = accountData.balance_after;
  const balanceAfter = balanceBefore + hours;

  // Update time account
  const { data: updatedAccount, error: updateError } = await supabase
    .from('time_accounts')
    .update({
      balance_after: balanceAfter,
      updated_at: new Date().toISOString(),
    })
    .eq('id', currentAccount.id)
    .select()
    .single();

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Create transaction record
  const { error: transactionError } = await supabase
    .from('time_account_transactions')
    .insert({
      time_account_id: accountData.id,
      transaction_type: transactionTypes.manual_adjustment,
      hours: hours,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reason: reason,
      created_by: user.id,
    });

  if (transactionError) {
    console.error("Failed to create transaction record:", transactionError);
  }

  // Log audit
  await logDataChange(
    user.id,
    "UPDATE",
    "time_accounts",
    accountData.id,
    { balance_after: balanceBefore },
    { balance_after: balanceAfter }
  );

  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/reports");
  return { success: true, data: updatedAccount };
}

/**
 * Consume time account hours for an absence (admin only)
 * Automatically reduces overtime balance when taking paid absence
 */
export async function consumeTimeAccountForAbsence(
  employeeId: string,
  absenceRequestId: string,
  hours: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Benutzer nicht authentifiziert." };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { success: false, error: "Nur Administratoren können diese Aktion ausführen." };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Get or calculate current time account
  const accountResult = await getTimeAccountForMonth(employeeId, year, month);
  if (!accountResult.success || !accountResult.data) {
    return { success: false, error: "Zeitkonto konnte nicht gefunden werden." };
  }

  const currentAccount = accountResult.data;
  const balanceBefore = currentAccount.balance_after;
  const balanceAfter = balanceBefore - hours;

  // Update time account
  const { error: updateError } = await supabase
    .from('time_accounts')
    .update({
      balance_after: balanceAfter,
      updated_at: new Date().toISOString(),
    })
    .eq('id', currentAccount.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Create transaction record
  const { error: transactionError } = await supabase
    .from('time_account_transactions')
    .insert({
      time_account_id: currentAccount.id,
      transaction_type: transactionTypes.absence_consumption,
      hours: -hours,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reason: `Überstundenabbau für Abwesenheit #${absenceRequestId}`,
      reference_id: absenceRequestId,
      reference_type: 'absence_request',
      created_by: user.id,
    });

  if (transactionError) {
    console.error("Failed to create transaction record:", transactionError);
  }

  // Log audit
  await logDataChange(
    user.id,
    "UPDATE",
    "time_accounts",
    currentAccount.id,
    { balance_after: balanceBefore },
    { balance_after: balanceAfter }
  );

  revalidatePath("/dashboard/employees");
  return { success: true };
}

/**
 * Perform year-end carry-over for all employees (admin only)
 * Positive balance: max 50h carried over, rest forfeited
 * Negative balance: reset to 0
 */
export async function performYearEndCarryOver(
  year: number
): Promise<{ success: boolean; processed?: number; error?: string }> {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Benutzer nicht authentifiziert." };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { success: false, error: "Nur Administratoren können diese Aktion ausführen." };
  }

  // Call database function
  const { data, error } = await supabaseAdmin.rpc('perform_year_end_carry_over', {
    p_year: year,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const processed = Array.isArray(data) ? data.length : 0;

  // Log audit
  await logUserAction(
    user.id,
    `YEAR_END_CARRY_OVER: Processed ${processed} employees for year ${year}`,
    "success"
  );

  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/reports");
  return { success: true, processed };
}

/**
 * Get time account transactions for an employee
 */
export async function getTimeAccountTransactions(
  employeeId: string,
  limit: number = 50
): Promise<{ success: boolean; data?: TimeAccountTransaction[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Benutzer nicht authentifiziert." };
  }

  const { data, error } = await supabase
    .from('time_account_transactions')
    .select(`
      *,
      time_account:time_accounts!inner(
        employee_id,
        year,
        month
      )
    `)
    .eq('time_account.employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Recalculate all time accounts for a specific month (admin only)
 */
export async function recalculateAllTimeAccountsForMonth(
  year: number,
  month: number
): Promise<{ success: boolean; processed?: number; error?: string }> {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Benutzer nicht authentifiziert." };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { success: false, error: "Nur Administratoren können diese Aktion ausführen." };
  }

  // Call database function
  const { data, error } = await supabaseAdmin.rpc('recalculate_monthly_time_accounts', {
    p_year: year,
    p_month: month,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const processed = Array.isArray(data) ? data.length : 0;

  // Log audit
  await logUserAction(
    user.id,
    `RECALCULATE_TIME_ACCOUNTS: Recalculated ${processed} accounts for ${year}-${month}`,
    "success"
  );

  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/reports");
  return { success: true, processed };
}

// Import logUserAction for audit logging
async function logUserAction(userId: string, action: string, status: "success" | "error" | "warning") {
  const supabase = await createClient();
  await supabase.from("audit_logs").insert({
    user_id: userId,
    action,
    status,
    created_at: new Date().toISOString(),
  });
}
