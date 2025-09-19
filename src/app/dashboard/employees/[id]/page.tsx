import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EmployeeSummaryCard } from "@/components/employee-summary-card";
import { EmployeeDetailTabs } from "@/components/employee-detail-tabs";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { JSX } from "react";

export default async function EmployeeDetailPage({ params, searchParams }: { params: { id: string }; searchParams: { [key: string]: string | string[] | undefined } }): Promise<JSX.Element> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: employee, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !employee) {
    console.error("Fehler beim Laden des Mitarbeiters:", error?.message || "Mitarbeiter nicht gefunden");
    redirect("/dashboard/employees");
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <PageHeader title={`${employee.first_name} ${employee.last_name}`}>
        <Button variant="outline" asChild>
          <Link href="/dashboard/employees">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Zurück zur Übersicht
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <EmployeeSummaryCard employee={employee} />
        </div>
        <div className="lg:col-span-2">
          <EmployeeDetailTabs employee={employee} />
        </div>
      </div>
    </div>
  );
}