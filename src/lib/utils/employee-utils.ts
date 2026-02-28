/**
 * Employee utility functions for consistent data manipulation across the application.
 */

import { Employee } from "@/hooks/use-user-form-data";

/**
 * Formats an employee name in the standard format: "Nachname, Vorname".
 * This ensures consistent display across all employee lists in the dashboard.
 *
 * @param employee - An employee object with first_name and last_name properties
 * @returns Formatted name string (e.g., "Müller, Hans")
 *
 * @example
 * ```ts
 * const formatted = formatEmployeeName({ first_name: 'Hans', last_name: 'Müller' });
 * // Returns: "Müller, Hans"
 * ```
 */
export function formatEmployeeName(employee: { first_name: string | null; last_name: string | null }): string {
  if (!employee.last_name && !employee.first_name) return 'Unbekannt';
  if (!employee.last_name) return employee.first_name || 'Unbekannt';
  if (!employee.first_name) return employee.last_name;
  return `${employee.last_name}, ${employee.first_name}`;
}

/**
 * Sorts an array of employees by last name, then first name, using German locale.
 * This ensures consistent alphabetical ordering across all employee lists in the dashboard.
 *
 * @param employees - Array of employees with first_name and last_name properties
 * @returns A new array with employees sorted by last_name, then first_name
 *
 * @example
 * ```ts
 * const sorted = sortEmployeesByName(employees);
 * ```
 */
export function sortEmployeesByName<T extends { first_name: string; last_name: string }>(
  employees: T[]
): T[] {
  return [...employees].sort((a, b) => {
    const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
    const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
    return nameA.localeCompare(nameB, 'de');
  });
}
