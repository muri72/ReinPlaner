"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, ChevronDown, ChevronUp, Users, Calendar, Briefcase,
  Sun, Pill, BookOpen, Edit, Plane, Umbrella, GraduationCap, MoreHorizontal, DollarSign
} from "lucide-react";
import { EmployeeEditDialog } from "@/components/employee-edit-dialog";
import { cn } from "@/lib/utils";
import { absenceTypeConfig } from "@/lib/absence-type-config";
import { calculateWorkingDays } from "@/lib/utils/date-utils";

interface AbsenceRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  type: string;
  status: string;
}

interface EmployeeWithBalance {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  status: "active" | "inactive" | "on_leave";
  contract_type: "full_time" | "part_time" | "minijob" | "freelancer" | null;
  working_days_per_week: number | null;
  contract_hours_per_week: number | null;
  vacation_balance: number | null;
  department: string | null;
  phone: string | null;
  hire_date: string | null;
  hourly_rate: number | null;
  start_date: string | null;
  job_title: string | null;
  notes: string | null;
  address: string | null;
  date_of_birth: string | null;
  social_security_number: string | null;
  tax_id_number: string | null;
  health_insurance_provider: string | null;
  contract_end_date: string | null;
  can_work_holidays: boolean;
  default_daily_schedules: any[];
  default_recurrence_interval_weeks: number;
  default_start_week_offset: number;
}

interface CurrentAbsenceInfo {
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
}

interface EmployeeStats {
  vacationTotal: number;
  vacationUsed: number;
  vacationRemaining: number;
  sickDaysThisYear: number;
  trainingDaysThisYear: number;
  unpaidLeaveDaysThisYear: number;
  totalAbsences: number;
}

interface AdminEmployeeOverviewProps {
  onEmployeeSelect?: (employeeId: string | null) => void;
  selectedEmployeeId?: string | null;
  onActionSuccess?: () => void;
}

const ITEMS_PER_PAGE = 8;

function isTodayAbsent(absence: AbsenceRequest): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(absence.start_date);
  const endDate = new Date(absence.end_date);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  return absence.status === "approved" && startDate <= today && endDate >= today;
}

function getYearFromDate(dateStr: string): number {
  return new Date(dateStr).getFullYear();
}

function filterByYear(absences: AbsenceRequest[], year: number): AbsenceRequest[] {
  return absences.filter(a => {
    const absenceYear = getYearFromDate(a.start_date);
    return absenceYear === year && a.status === 'approved';
  });
}

export function AdminEmployeeOverview({ onEmployeeSelect, selectedEmployeeId, onActionSuccess }: AdminEmployeeOverviewProps) {
  const supabase = createClient();
  const [employees, setEmployees] = React.useState<EmployeeWithBalance[]>([]);
  const [allAbsences, setAllAbsences] = React.useState<AbsenceRequest[]>([]);
  const [currentAbsences, setCurrentAbsences] = React.useState<CurrentAbsenceInfo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [expandedEmployee, setExpandedEmployee] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showOnlyAbsent, setShowOnlyAbsent] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data: employeesData } = await supabase
        .from('employees')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          hire_date,
          status,
          contract_type,
          hourly_rate,
          start_date,
          job_title,
          department,
          notes,
          address,
          date_of_birth,
          social_security_number,
          tax_id_number,
          health_insurance_provider,
          contract_end_date,
          can_work_holidays,
          working_days_per_week,
          contract_hours_per_week,
          vacation_balance,
          default_daily_schedules,
          default_recurrence_interval_weeks,
          default_start_week_offset
        `)
        .eq('status', 'active')
        .order('last_name', { ascending: true });

      const { data: absencesData } = await supabase
        .from('absence_requests')
        .select('id, employee_id, start_date, end_date, type, status');

      if (employeesData) {
        setEmployees(employeesData as EmployeeWithBalance[]);
      }

      if (absencesData) {
        const absences = absencesData as AbsenceRequest[];
        setAllAbsences(absences);

        const todayAbsences = absences
          .filter(isTodayAbsent)
          .map(a => ({
            employeeId: a.employee_id,
            type: a.type,
            startDate: a.start_date,
            endDate: a.end_date
          }));
        setCurrentAbsences(todayAbsences);
      }

      setLoading(false);
    };
    fetchData();
  }, [refreshKey]);

  const getEmployeeStats = (employeeId: string, vacationBalance: number | null): EmployeeStats => {
    const employee = employees.find(e => e.id === employeeId);
    const workingDaysPerWeek = employee?.working_days_per_week || 5;

    const employeeAbsences = allAbsences.filter(a => a.employee_id === employeeId);
    const currentYear = new Date().getFullYear();
    const yearAbsences = filterByYear(employeeAbsences, currentYear);

    const totalVacationDays = employeeAbsences
      .filter(a => a.type === 'vacation' && a.status === 'approved')
      .reduce((sum, a) => sum + calculateWorkingDays(new Date(a.start_date), new Date(a.end_date), workingDaysPerWeek), 0);

    const sickDays = yearAbsences
      .filter(a => a.type === 'sick_leave')
      .reduce((sum, a) => sum + calculateWorkingDays(new Date(a.start_date), new Date(a.end_date), workingDaysPerWeek), 0);

    const trainingDays = yearAbsences
      .filter(a => a.type === 'training')
      .reduce((sum, a) => sum + calculateWorkingDays(new Date(a.start_date), new Date(a.end_date), workingDaysPerWeek), 0);

    const unpaidLeaveDays = yearAbsences
      .filter(a => a.type === 'unpaid_leave')
      .reduce((sum, a) => sum + calculateWorkingDays(new Date(a.start_date), new Date(a.end_date), workingDaysPerWeek), 0);

    const total = vacationBalance ?? 30;
    const remaining = Math.max(0, total - totalVacationDays);

    return {
      vacationTotal: total,
      vacationUsed: totalVacationDays,
      vacationRemaining: remaining,
      sickDaysThisYear: sickDays,
      trainingDaysThisYear: trainingDays,
      unpaidLeaveDaysThisYear: unpaidLeaveDays,
      totalAbsences: employeeAbsences.filter(a => a.status === 'approved').length,
    };
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = searchQuery === "" ||
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.department?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const isAbsent = currentAbsences.some(a => a.employeeId === emp.id);
    const matchesAbsentFilter = !showOnlyAbsent || isAbsent;

    return matchesSearch && matchesAbsentFilter;
  });

  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const currentEmployees = filteredEmployees.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  const activeEmployeesCount = employees.length;
  const absentCount = currentAbsences.length;

  const absencesByType = currentAbsences.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getVacationBar = (balance: number | null, used: number) => {
    const total = balance ?? 30;
    const remaining = Math.max(0, total - used);
    const percentUsed = Math.min(100, (used / total) * 100);

    let barColor = "bg-emerald-500";
    let barBg = "bg-emerald-100 dark:bg-emerald-900/30";
    let textColor = "text-emerald-700 dark:text-emerald-300";

    if (remaining <= 3) {
      barColor = "bg-red-500";
      barBg = "bg-red-100 dark:bg-red-900/30";
      textColor = "text-red-700 dark:text-red-300";
    } else if (percentUsed >= 90) {
      barColor = "bg-orange-400";
      barBg = "bg-orange-100 dark:bg-orange-900/30";
      textColor = "text-orange-700 dark:text-orange-300";
    } else if (percentUsed >= 75) {
      barColor = "bg-yellow-500";
      barBg = "bg-yellow-100 dark:bg-yellow-900/30";
      textColor = "text-yellow-700 dark:text-yellow-300";
    }

    return { percentUsed, remaining, barColor, barBg, textColor };
  };

  const handleEmployeeClick = (employeeId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newExpanded = expandedEmployee === employeeId ? null : employeeId;
    setExpandedEmployee(newExpanded);
    onEmployeeSelect?.(newExpanded);
  };

  // Get absence config helper
  const getAbsenceConfig = (type: string) => {
    const normalizedType = type.toLowerCase() === 'sick' ? 'sick_leave' : type.toLowerCase();
    return absenceTypeConfig[normalizedType] || absenceTypeConfig.other;
  };

  const getContractTypeLabel = (type: string | null) => {
    switch (type) {
      case 'full_time': return 'Vollzeit';
      case 'part_time': return 'Teilzeit';
      case 'minijob': return 'Minijob';
      case 'freelancer': return 'Freiberufler';
      default: return 'Vollzeit';
    }
  };

  if (loading) {
    return (
      <Card className="h-fit">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-1">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (employees.length === 0) {
    return (
      <Card className="h-fit">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Mitarbeiter
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4 text-center text-sm text-muted-foreground">
          Keine aktiven Mitarbeiter
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit">
      <CardHeader className="pb-2 border-b space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Mitarbeiter
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground">{activeEmployeesCount}</span>
            {absentCount > 0 && (
              <Button
                variant={showOnlyAbsent ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-6 text-xs px-2 gap-1.5",
                  !showOnlyAbsent && "border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                )}
                onClick={() => {
                  setShowOnlyAbsent(!showOnlyAbsent);
                  setCurrentPage(0);
                }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {absentCount} abwesend
              </Button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Mitarbeiter suchen..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(0);
            }}
            className="h-9 text-sm pl-9"
          />
        </div>

        {absentCount > 0 && Object.keys(absencesByType).length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {Object.entries(absencesByType).map(([type, count]) => {
              const config = getAbsenceConfig(type);
              const Icon = config.icon;
              return (
                <Badge
                  key={type}
                  variant="secondary"
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium",
                    config.bg,
                    config.text
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {count} {config.label}
                </Badge>
              );
            })}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {filteredEmployees.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Keine Mitarbeiter gefunden
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {currentEmployees.map((employee) => {
              const stats = getEmployeeStats(employee.id, employee.vacation_balance);
              const { percentUsed, remaining, barColor, barBg, textColor } = getVacationBar(employee.vacation_balance, stats.vacationUsed);
              const isExpanded = expandedEmployee === employee.id;

              const absenceInfo = currentAbsences.find(a => a.employeeId === employee.id);
              const absenceConfig = absenceInfo ? getAbsenceConfig(absenceInfo.type) : null;
              const AbsenceIcon = absenceConfig?.icon;

              return (
                <div key={employee.id} className="relative">
                  {/* Compact Row */}
                  <div
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-all duration-200",
                      "hover:bg-muted/60",
                      selectedEmployeeId === employee.id && "bg-muted/80",
                      isExpanded && "bg-muted/40 border-b border-border/40"
                    )}
                    onClick={(e) => handleEmployeeClick(employee.id, e)}
                  >
                    {/* Avatar with Absence Indicator */}
                    <div className="relative shrink-0">
                      <div className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shadow-sm",
                        "bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/20"
                      )}>
                        {employee.first_name?.[0]}{employee.last_name?.[0]}
                      </div>
                      {absenceInfo && AbsenceIcon && (
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center border-2 border-card dark:border-card shadow-sm",
                          absenceConfig.bg
                        )}>
                          <AbsenceIcon className={cn("h-2.5 w-2.5", absenceConfig.text.replace('text-', ''))} />
                        </div>
                      )}
                    </div>

                    {/* Name & Department */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">
                          {employee.first_name} {employee.last_name}
                        </span>
                      </div>
                      {employee.department && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Briefcase className="h-2.5 w-2.5" />
                          {employee.department}
                        </span>
                      )}
                    </div>

                    {/* Vacation Balance - Modern Progress */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={cn("text-xs font-semibold", textColor)}>{remaining}</span>
                          <span className="text-[10px] text-muted-foreground">/{employee.vacation_balance ?? 30}</span>
                        </div>
                        <div className={cn("h-1.5 w-full rounded-full overflow-hidden", barBg)}>
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", barColor)}
                            style={{ width: `${percentUsed}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Expand Indicator */}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </div>

                  {/* Expanded Details - Full Statistics */}
                  {isExpanded && (
                    <div className="bg-muted/20 border-t border-border/40 px-3 py-3">
                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Urlaub Remaining */}
                        <div className={cn(
                          "flex items-center gap-2.5 p-2.5 rounded-lg border",
                          remaining <= 5
                            ? "bg-amber-100 dark:bg-amber-900/60 border-amber-300 dark:border-amber-700"
                            : "bg-emerald-100 dark:bg-emerald-900/60 border-emerald-300 dark:border-emerald-700"
                        )}>
                          <div className={cn(
                            "p-1.5 rounded-md",
                            remaining <= 5
                              ? "bg-amber-300 dark:bg-amber-800"
                              : "bg-emerald-300 dark:bg-emerald-800"
                          )}>
                            <Sun className={cn(
                              "h-3.5 w-3.5",
                              remaining <= 5
                                ? "text-amber-900 dark:text-amber-200"
                                : "text-emerald-900 dark:text-emerald-200"
                            )} />
                          </div>
                          <div>
                            <p className={cn(
                              "text-[10px] uppercase tracking-wide font-bold",
                              remaining <= 5
                                ? "text-amber-900 dark:text-amber-200"
                                : "text-emerald-900 dark:text-emerald-200"
                            )}>Urlaub verbleibend</p>
                            <p className={cn(
                              "text-lg font-bold",
                              remaining <= 5
                                ? "text-amber-950 dark:text-amber-100"
                                : "text-emerald-950 dark:text-emerald-100"
                            )}>
                              {remaining} <span className="text-xs font-normal opacity-60">Tage</span>
                            </p>
                          </div>
                        </div>

                        {/* Krankheitstage Total */}
                        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-rose-100 dark:bg-rose-900/60 border border-rose-300 dark:border-rose-700">
                          <div className="p-1.5 rounded-md bg-rose-300 dark:bg-rose-800">
                            <Pill className="h-3.5 w-3.5 text-rose-900 dark:text-rose-200" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide font-bold text-rose-900 dark:text-rose-200">Krankheitstage</p>
                            <p className="text-lg font-bold text-rose-950 dark:text-rose-100">
                              {stats.sickDaysThisYear} <span className="text-xs font-normal opacity-60">Tage</span>
                            </p>
                          </div>
                        </div>

                        {/* Weiterbildungstage */}
                        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-teal-100 dark:bg-teal-900/60 border border-teal-300 dark:border-teal-700">
                          <div className="p-1.5 rounded-md bg-teal-300 dark:bg-teal-800">
                            <BookOpen className="h-3.5 w-3.5 text-teal-900 dark:text-teal-200" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide font-bold text-teal-900 dark:text-teal-200">Weiterbildung</p>
                            <p className="text-lg font-bold text-teal-950 dark:text-teal-100">
                              {stats.trainingDaysThisYear} <span className="text-xs font-normal opacity-60">Tage</span>
                            </p>
                          </div>
                        </div>

                        {/* Unbezahlter Urlaub */}
                        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-violet-100 dark:bg-violet-900/60 border border-violet-300 dark:border-violet-700">
                          <div className="p-1.5 rounded-md bg-violet-300 dark:bg-violet-800">
                            <DollarSign className="h-3.5 w-3.5 text-violet-900 dark:text-violet-200" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide font-bold text-violet-900 dark:text-violet-200">Unbezahlter Urlaub</p>
                            <p className="text-lg font-bold text-violet-950 dark:text-violet-100">
                              {stats.unpaidLeaveDaysThisYear} <span className="text-xs font-normal opacity-60">Tage</span>
                            </p>
                          </div>
                        </div>

                        {/* Genehmigte Abwesenheiten Total */}
                        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-300 dark:bg-slate-800/60 border border-slate-500 dark:border-slate-600">
                          <div className="p-1.5 rounded-md bg-slate-500 dark:bg-slate-700">
                            <Calendar className="h-3.5 w-3.5 text-white dark:text-slate-200" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide font-bold text-slate-950 dark:text-slate-200">Genehmigt</p>
                            <p className="text-lg font-bold text-slate-950 dark:text-slate-100">
                              {stats.totalAbsences} <span className="text-xs font-normal opacity-60">Anträge</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Additional Info Row */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Vertrag: <strong className="text-foreground">{getContractTypeLabel(employee.contract_type)}</strong></span>
                          <span>Verwendet: <strong className="text-foreground">{stats.vacationUsed}</strong></span>
                        </div>
                        <EmployeeEditDialog
                          employee={employee}
                          onActionSuccess={() => {
                            setRefreshKey(k => k + 1);
                            onActionSuccess?.();
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-2 border-t border-border/40 bg-muted/10">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              Vorherige
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              Nächste
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
