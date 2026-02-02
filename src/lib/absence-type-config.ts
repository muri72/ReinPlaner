// Centralized absence type configuration for consistent colors across all components
// Uses high-contrast, accessible colors that work well in both light and dark modes

import { Plane, Umbrella, GraduationCap, MoreHorizontal, CheckCircle2, XCircle, AlertCircle, Clock, Sun, DollarSign } from "lucide-react";
import type { ElementType } from "react";

// Absence type configuration with improved contrast for readability
export const absenceTypeConfig: Record<string, {
  label: string;
  bg: string;
  border: string;
  text: string;
  solidBg: string;
  icon: ElementType;
  chartColor: string;
}> = {
  vacation: {
    label: "Urlaub",
    bg: "bg-blue-100 dark:bg-blue-900/60",
    border: "border-blue-300 dark:border-blue-700",
    text: "text-blue-800 dark:text-blue-200",
    solidBg: "bg-blue-600",
    icon: Plane,
    chartColor: "#2563EB", // Blue-600
  },
  sick_leave: {
    label: "Krankheit",
    bg: "bg-rose-100 dark:bg-rose-900/60",
    border: "border-rose-300 dark:border-rose-700",
    text: "text-rose-800 dark:text-rose-200",
    solidBg: "bg-rose-600",
    icon: Umbrella,
    chartColor: "#E11D48", // Rose-600
  },
  training: {
    label: "Weiterbildung",
    bg: "bg-teal-100 dark:bg-teal-900/60",
    border: "border-teal-300 dark:border-teal-700",
    text: "text-teal-800 dark:text-teal-200",
    solidBg: "bg-teal-600",
    icon: GraduationCap,
    chartColor: "#0D9488", // Teal-600
  },
  unpaid_leave: {
    label: "Unbezahlter Urlaub",
    bg: "bg-violet-100 dark:bg-violet-900/60",
    border: "border-violet-300 dark:border-violet-700",
    text: "text-violet-800 dark:text-violet-200",
    solidBg: "bg-violet-600",
    icon: DollarSign,
    chartColor: "#7C3AED", // Violet-600
  },
};

// Status configuration with icons for accessibility
export const statusConfig: Record<string, {
  label: string;
  bg: string;
  border: string;
  text: string;
  icon: ElementType;
  iconColor: string;
}> = {
  pending: {
    label: "Ausstehend",
    bg: "bg-amber-100 dark:bg-amber-900/60",
    border: "border-amber-300 dark:border-amber-700",
    text: "text-amber-800 dark:text-amber-200",
    icon: AlertCircle,
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  approved: {
    label: "Genehmigt",
    bg: "bg-emerald-100 dark:bg-emerald-900/60",
    border: "border-emerald-300 dark:border-emerald-700",
    text: "text-emerald-800 dark:text-emerald-200",
    icon: CheckCircle2,
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  rejected: {
    label: "Abgelehnt",
    bg: "bg-red-100 dark:bg-red-900/60",
    border: "border-red-300 dark:border-red-700",
    text: "text-red-800 dark:text-red-200",
    icon: XCircle,
    iconColor: "text-red-600 dark:text-red-400",
  },
};

// Type translations
export const typeTranslations: Record<string, string> = {
  vacation: "Urlaub",
  sick_leave: "Krankheit",
  training: "Weiterbildung",
  unpaid_leave: "Unbezahlter Urlaub",
};

// Status translations
export const statusTranslations: Record<string, string> = {
  pending: "Ausstehend",
  approved: "Genehmigt",
  rejected: "Abgelehnt",
};
