"use client";

import * as React from "react";
import { getAllEmployeesWithTimeAccounts, adjustTimeAccountBalance, getEmployeesTimeAccountUpdates } from "@/app/dashboard/time-accounts/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, AlertCircle, Search, CalendarDays, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  formatHours,
  getBalanceWarningLevel,
  timeAccountStatusConfig,
  calculateProRatedTargetHours,
  isCurrentMonth,
  getMonthName
} from "@/lib/time-account-config";

interface TimeAccountsAdminTableProps {
  year?: number;
  month?: number;
}

interface EmployeeWithTimeAccount {
  id?: string;
  employee_id?: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    contract_hours_per_week: number | null;
    status?: string;
  };
  year?: number;
  month?: number;
  target_hours?: number;
  actual_hours?: number;
  monthly_delta?: number;
  balance_before?: number;
  balance_after?: number;
  time_account?: null;
  [key: string]: any; // Index signature for flexibility
}

// Helper to calculate effective values for current month
function calculateEffectiveValues(
  row: EmployeeWithTimeAccount,
  updates: Record<string, { actual_hours?: number; balance_after?: number }>
) {
  // hasData is true if we have a time_account OR if we have balance_before (for employees without entries but with previous balance)
  const hasData = row.time_account !== null || row.target_hours !== undefined || row.balance_before !== undefined;
  const isCurrent = isCurrentMonth(row.year ?? new Date().getFullYear(), row.month ?? new Date().getMonth() + 1);
  const contractHours = row.employee?.contract_hours_per_week ?? 40;

  if (!hasData) {
    return {
      effectiveSoll: 0,
      effectiveDelta: 0,
      effectiveSaldo: 0,
      hasData: false,
    };
  }

  // Verwende optimistische Updates wenn verfügbar
  const employeeId = row.employee?.id;
  const actualHours = (employeeId ? (updates[employeeId]?.actual_hours ?? row.actual_hours) : row.actual_hours) ?? 0;
  const balanceAfter = (employeeId ? (updates[employeeId]?.balance_after ?? row.balance_after) : row.balance_after) ?? 0;

  if (!isCurrent) {
    return {
      effectiveSoll: row.target_hours ?? 0,
      effectiveDelta: row.monthly_delta ?? 0,
      effectiveSaldo: balanceAfter ?? 0,
      hasData: true,
    };
  }

  const proRatedTarget = calculateProRatedTargetHours(contractHours, row.year ?? new Date().getFullYear(), row.month ?? new Date().getMonth() + 1);
  const proRatedDelta = actualHours - proRatedTarget.targetSoFar;
  const effectiveSaldo = (row.balance_before ?? 0) + proRatedDelta;

  return {
    effectiveSoll: proRatedTarget.targetSoFar,
    effectiveDelta: proRatedDelta,
    effectiveSaldo,
    workingDaysSoFar: proRatedTarget.workingDaysSoFar,
    totalWorkingDays: proRatedTarget.totalWorkingDays,
    hasData: true,
  };
}

type StatusFilter = 'all' | 'critical' | 'warning' | 'neutral' | 'positive' | 'no-data';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function TimeAccountsAdminTable({ year: initialYear, month: initialMonth }: TimeAccountsAdminTableProps) {
  const [data, setData] = React.useState<EmployeeWithTimeAccount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedYear, setSelectedYear] = React.useState(initialYear ?? new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = React.useState(initialMonth ?? new Date().getMonth() + 1);

  // Search and filter state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  // Auto-Refresh state
  const [lastRefresh, setLastRefresh] = React.useState(new Date());
  // Optimistic updates for smooth refresh
  const [optimisticUpdates, setOptimisticUpdates] = React.useState<Record<string, { actual_hours?: number; balance_after?: number }>>({});
  // Track which cells were updated for animation
  const [updatedCells, setUpdatedCells] = React.useState<Set<string>>(new Set());

  // Inline-Edit states
  const [editingEmployee, setEditingEmployee] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [pendingAdjustment, setPendingAdjustment] = React.useState<{ employeeId: string; newValue: number; oldValue: number } | null>(null);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const isCurrentMonthSelected = isCurrentMonth(selectedYear, selectedMonth);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    const result = await getAllEmployeesWithTimeAccounts(selectedYear, selectedMonth);
    if (result.success && result.data) {
      setData(result.data);
      // Clear optimistic updates after full refresh
      setOptimisticUpdates({});
    }

    // Also trigger time account updates to persist calculated values
    // This ensures that after page reload, the correct values are shown
    await getEmployeesTimeAccountUpdates(selectedYear, selectedMonth);

    setLoading(false);
  }, [selectedYear, selectedMonth]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [searchQuery, statusFilter, pageSize]);

  // Auto-Refresh für aktuellen Monat (inkrementell ohne Flackern)
  React.useEffect(() => {
    if (!isCurrentMonthSelected) return; // Nur für aktuellen Monat

    const interval = setInterval(async () => {
      // Nur Updates abrufen (kein komplettes Neuladen)
      const result = await getEmployeesTimeAccountUpdates(selectedYear, selectedMonth);

      if (result.success && result.data) {
        // Update State ohne komplettes Neuladen
        setOptimisticUpdates(result.data);
        setLastRefresh(new Date());

        // Zellen kurz markieren für Animation
        const newKeys = Object.keys(result.data);
        setUpdatedCells(new Set(newKeys));
        setTimeout(() => setUpdatedCells(new Set()), 500);
      }
    }, 60000); // Alle 60 Sekunden

    return () => clearInterval(interval); // Cleanup
  }, [selectedYear, selectedMonth, isCurrentMonthSelected]);

  // Inline-Edit Handler
  const startEdit = (employeeId: string, currentSaldo: number) => {
    // Zukünftige Monate nicht bearbeitbar, aktueller Monat schon
    if (selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth)) return;
    setEditingEmployee(employeeId);
    setEditValue(currentSaldo.toFixed(2).replace('.', ','));
  };

  const cancelEdit = () => {
    setEditingEmployee(null);
    setEditValue('');
  };

  const submitEdit = async (employeeId: string, currentSaldo: number) => {
    const newValue = parseFloat(editValue.replace(',', '.'));
    if (isNaN(newValue)) {
      toast.error("Ungültiger Wert", { description: "Bitte geben Sie eine gültige Zahl ein." });
      return;
    }

    const difference = newValue - currentSaldo;
    setPendingAdjustment({ employeeId, newValue, oldValue: currentSaldo });
    setShowConfirmDialog(true);
  };

  const confirmAdjustment = async () => {
    if (!pendingAdjustment) return;

    setSaving(true);
    const result = await adjustTimeAccountBalance(
      pendingAdjustment.employeeId,
      selectedYear,
      selectedMonth,
      pendingAdjustment.newValue - pendingAdjustment.oldValue,
      "Manuelle Korrektur durch Admin"
    );

    setSaving(false);
    setShowConfirmDialog(false);
    setEditingEmployee(null);
    setPendingAdjustment(null);

    if (result.success) {
      toast.success("Zeitkonto wurde aktualisiert.");
      fetchData();
    } else {
      toast.error(result.error || "Fehler beim Aktualisieren des Zeitkontos.");
    }
  };

  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleToday = () => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
  };

  const isCurrentOrFuture = selectedYear > currentYear || (selectedYear === currentYear && selectedMonth >= currentMonth);

  // Calculate effective values for all rows
  const dataWithEffective = React.useMemo(() => {
    return data.map(row => ({
      ...row,
      effective: calculateEffectiveValues(row, optimisticUpdates),
    }));
  }, [data, optimisticUpdates]);

  // Filter and search
  const filteredData = React.useMemo(() => {
    return dataWithEffective.filter(row => {
      if (!row.employee) return false;

      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        row.employee.first_name.toLowerCase().includes(searchLower) ||
        row.employee.last_name.toLowerCase().includes(searchLower) ||
        `${row.employee.first_name} ${row.employee.last_name}`.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Status filter
      const effective = row.effective;
      const warningLevel = effective.hasData ? getBalanceWarningLevel(effective.effectiveSaldo) : null;

      switch (statusFilter) {
        case 'all':
          return true;
        case 'critical':
          return warningLevel === 'critical';
        case 'warning':
          return warningLevel === 'warning';
        case 'neutral':
          return warningLevel === 'none' && Math.abs(effective.effectiveSaldo) < 0.1;
        case 'positive':
          return effective.effectiveSaldo > 0.1;
        case 'no-data':
          return !effective.hasData;
        default:
          return true;
      }
    });
  }, [dataWithEffective, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Sort by effective balance (most critical first = most negative, then most positive)
  const sortedData = React.useMemo(() => {
    return [...paginatedData].sort((a, b) => {
      const aSaldo = a.effective.effectiveSaldo;
      const bSaldo = b.effective.effectiveSaldo;
      // Most negative first (critical), then positive
      if (aSaldo < 0 && bSaldo < 0) return aSaldo - bSaldo;
      if (aSaldo < 0) return -1;
      if (bSaldo < 0) return 1;
      return bSaldo - aSaldo; // Positive descending
    });
  }, [paginatedData]);

  // Calculate summary stats using effective values for current month
  const summaryStats = React.useMemo(() => {
    const withData = dataWithEffective.filter(d => d.effective.hasData);
    const totalPositive = withData
      .filter(d => d.effective.effectiveSaldo > 0)
      .reduce((sum, d) => sum + d.effective.effectiveSaldo, 0);
    const totalNegative = withData
      .filter(d => d.effective.effectiveSaldo < 0)
      .reduce((sum, d) => sum + d.effective.effectiveSaldo, 0);
    const criticalCount = withData
      .filter(d => getBalanceWarningLevel(d.effective.effectiveSaldo) === 'critical')
      .length;
    const noDataCount = dataWithEffective.filter(d => !d.effective.hasData).length;
    return { totalPositive, totalNegative, criticalCount, noDataCount, totalCount: data.length };
  }, [dataWithEffective]);

  if (loading) {
    return (
      <Card className="glassmorphism-card">
        <CardHeader>
          <Skeleton className="h-5 w-60" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glassmorphism-card">
      <CardHeader>
        <div className="space-y-4">
          {/* Navigation */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Zeitkonto-Übersicht
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3"
                  onClick={handlePreviousMonth}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Vorheriger
                </Button>
                <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-lg min-w-[140px] justify-center">
                  <span className="text-sm font-semibold">
                    {getMonthName(selectedMonth)} {selectedYear}
                  </span>
                  {isCurrentMonthSelected && (
                    <Badge variant="secondary" className="text-xs">Aktuell</Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3"
                  onClick={handleNextMonth}
                  disabled={isCurrentOrFuture}
                >
                  Nächster
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              {!isCurrentMonthSelected && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-muted-foreground"
                  onClick={handleToday}
                >
                  Heute
                </Button>
              )}
            </div>
            {isCurrentMonthSelected && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Zuletzt aktualisiert:</span>
                <span className="font-medium">{lastRefresh.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Mitarbeiter:</span>
              <Badge variant="outline">{summaryStats.totalCount}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Gesamt Überstunden:</span>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs">
                {formatHours(summaryStats.totalPositive)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Gesamt Minusstunden:</span>
              <Badge className="bg-rose-500/10 text-rose-600 border-rose-200 text-xs">
                {formatHours(Math.abs(summaryStats.totalNegative))}
              </Badge>
            </div>
            {summaryStats.criticalCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Kritisch:</span>
                <Badge variant="destructive" className="gap-1 text-xs">
                  <AlertCircle className="h-3 w-3" />
                  {summaryStats.criticalCount}
                </Badge>
              </div>
            )}
            {summaryStats.noDataCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Keine Daten:</span>
                <Badge variant="outline" className="text-xs">
                  {summaryStats.noDataCount}
                </Badge>
              </div>
            )}
            {isCurrentMonthSelected && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs text-blue-600">
                  Tagesaktuell ({new Date().getDate()}. {getMonthName(currentMonth)})
                </span>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border/50 pt-2">
            <span>Saldo = Vormonat + Delta</span>
            <span className="text-emerald-600">Positiv = Überstunden</span>
            <span className="text-rose-600">Negativ = Minusstunden</span>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Mitarbeiter suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Status Filters */}
            <div className="flex flex-wrap gap-1">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                className="h-9 text-xs"
                onClick={() => setStatusFilter('all')}
              >
                Alle ({filteredData.length})
              </Button>
              <Button
                variant={statusFilter === 'critical' ? 'default' : 'outline'}
                size="sm"
                className="h-9 text-xs"
                onClick={() => setStatusFilter('critical')}
              >
                Kritisch
              </Button>
              <Button
                variant={statusFilter === 'warning' ? 'default' : 'outline'}
                size="sm"
                className="h-9 text-xs"
                onClick={() => setStatusFilter('warning')}
              >
                Achtung
              </Button>
              <Button
                variant={statusFilter === 'positive' ? 'default' : 'outline'}
                size="sm"
                className="h-9 text-xs"
                onClick={() => setStatusFilter('positive')}
              >
                Positiv
              </Button>
              <Button
                variant={statusFilter === 'neutral' ? 'default' : 'outline'}
                size="sm"
                className="h-9 text-xs"
                onClick={() => setStatusFilter('neutral')}
              >
                Ausgeglichen
              </Button>
              <Button
                variant={statusFilter === 'no-data' ? 'default' : 'outline'}
                size="sm"
                className="h-9 text-xs"
                onClick={() => setStatusFilter('no-data')}
              >
                Keine Daten
              </Button>
            </div>

            {/* Page Size Selector */}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-9 px-2 text-xs border rounded-md bg-background"
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size} pro Seite</option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {sortedData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Keine Ergebnisse für die aktuellen Filter.</p>
            {searchQuery || statusFilter !== 'all' ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              >
                Filter zurücksetzen
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            {/* Compact Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Mitarbeiter</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Vormonat</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">
                      Soll {isCurrentMonthSelected && <span className="text-xs text-blue-600">(bisher)</span>}
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Ist</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">
                      Delta {isCurrentMonthSelected && <span className="text-xs text-blue-600">(bisher)</span>}
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Saldo</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((row) => {
                    const effective = row.effective;
                    const warningLevel = effective.hasData ? getBalanceWarningLevel(effective.effectiveSaldo) : null;
                    const isPositive = effective.effectiveSaldo >= 0;
                    const isNeutral = Math.abs(effective.effectiveSaldo) < 0.1;

                    if (!row.employee) return null;

                    const employeeId = row.employee.id;

                    return (
                      <tr
                        key={employeeId}
                        className="border-b border-border hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-2 px-3">
                          <div>
                            <div className="font-medium text-sm">
                              {row.employee.last_name}, {row.employee.first_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {row.employee.contract_hours_per_week ?? 40}h/Woche
                            </div>
                          </div>
                        </td>
                        <td className={`text-right py-2 px-3 text-sm ${updatedCells.has(employeeId) ? 'value-updated' : ''}`}>
                          {row.balance_before !== undefined && row.balance_before !== null ? (
                            <span className={row.balance_before >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                              {row.balance_before > 0 ? '+' : ''}{formatHours(row.balance_before)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="text-right py-2 px-3 text-sm">
                          {effective.hasData ? (
                            <>
                              {formatHours(effective.effectiveSoll)}
                              {isCurrentMonthSelected && effective.workingDaysSoFar !== undefined && (
                                <div className="text-xs text-muted-foreground">
                                  ({effective.workingDaysSoFar}/{effective.totalWorkingDays}T)
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className={`text-right py-2 px-3 text-sm ${updatedCells.has(employeeId) ? 'value-updated' : ''}`}>
                          {effective.hasData ? formatHours(optimisticUpdates[employeeId]?.actual_hours ?? row.actual_hours ?? 0) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className={`text-right py-2 px-3 text-sm font-medium ${effective.effectiveDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'} ${updatedCells.has(employeeId) ? 'value-updated' : ''}`}>
                          {effective.hasData ? (
                            <>
                              {effective.effectiveDelta >= 0 ? '+' : ''}{formatHours(effective.effectiveDelta)}
                            </>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className={`text-right py-2 px-3 text-sm font-semibold ${isNeutral ? 'text-muted-foreground' : isPositive ? 'text-emerald-600' : 'text-rose-600'} relative`}>
                          {editingEmployee === row.employee.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-20 h-7 text-right text-xs"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') submitEdit(employeeId, effective.effectiveSaldo);
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                              />
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => submitEdit(employeeId, effective.effectiveSaldo)}>
                                <Check className="h-3 w-3 text-emerald-600" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={cancelEdit}>
                                <X className="h-3 w-3 text-rose-600" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className={updatedCells.has(employeeId) ? 'value-updated inline-block' : ''}>
                                {effective.hasData ? (
                                  isNeutral ? '0,00h' : (isPositive ? '+' : '-') + formatHours(Math.abs(effective.effectiveSaldo))
                                ) : (
                                  <span className="text-muted-foreground text-xs">Keine Daten</span>
                                )}
                              </span>
                              {effective.hasData && !(selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth)) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity absolute right-1 top-1/2 -translate-y-1/2"
                                  onClick={() => startEdit(employeeId, effective.effectiveSaldo)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              )}
                            </>
                          )}
                        </td>
                        <td className="text-center py-2 px-3">
                          {!effective.hasData ? (
                            <Badge variant="outline" className="text-xs">Keine Daten</Badge>
                          ) : warningLevel === 'critical' ? (
                            <Badge variant="destructive" className="gap-1 text-xs">
                              <AlertCircle className="h-3 w-3" />
                              {isPositive ? 'Hoch' : 'Kritisch'}
                            </Badge>
                          ) : warningLevel === 'warning' ? (
                            <Badge variant="outline" className={`${isPositive ? 'bg-amber-500/10 text-amber-600 border-amber-200' : 'bg-orange-500/10 text-orange-600 border-orange-200'} text-xs`}>
                              Achtung
                            </Badge>
                          ) : (
                            <Badge className={`${
                              isNeutral
                                ? timeAccountStatusConfig.neutral.bg + ' ' + timeAccountStatusConfig.neutral.text + ' ' + timeAccountStatusConfig.neutral.border
                                : isPositive
                                ? timeAccountStatusConfig.positive.solidBg + ' text-white hover:bg-emerald-700'
                                : timeAccountStatusConfig.negative.bg + ' ' + timeAccountStatusConfig.negative.text + ' ' + timeAccountStatusConfig.negative.border
                            } text-xs`}>
                              {isNeutral ? 'Ausgeglichen' : isPositive ? 'Positiv' : 'Negativ'}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  Zeige {(currentPage - 1) * pageSize + 1} bis {Math.min(currentPage * pageSize, filteredData.length)} von {filteredData.length} Mitarbeitern
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    ←
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Vorherige
                  </Button>
                  <span className="text-sm px-2">
                    Seite {currentPage} von {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Nächste
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Confirmation Dialog for Manual Adjustment */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zeitkonto anpassen?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAdjustment && (
                <div className="space-y-2">
                  <p>Änderung wird protokolliert und kann nicht rückgängig gemacht werden.</p>
                  <div className="bg-muted p-3 rounded space-y-1 text-sm">
                    <div>Alter Wert: <span className="font-semibold">{pendingAdjustment.oldValue.toFixed(2)}h</span></div>
                    <div>Neuer Wert: <span className="font-semibold">{pendingAdjustment.newValue.toFixed(2)}h</span></div>
                    <div>Differenz: <span className={`font-semibold ${(pendingAdjustment.newValue - pendingAdjustment.oldValue) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {(pendingAdjustment.newValue - pendingAdjustment.oldValue) >= 0 ? '+' : ''}{(pendingAdjustment.newValue - pendingAdjustment.oldValue).toFixed(2)}h
                    </span></div>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAdjustment} disabled={saving}>
              {saving ? 'Wird gespeichert...' : 'Bestätigen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
