import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EmployeeForm } from "@/components/employee-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createEmployee } from "./actions";
import { EmployeeEditDialog } from "@/components/employee-edit-dialog";
import { DeleteEmployeeButton } from "@/components/delete-employee-button";
import { Mail, Phone, CalendarDays, UserRoundCheck, UserRoundX, UserRoundMinus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function EmployeesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: employees, error } = await supabase
    .from('employees')
    .select('*')
    .eq('user_id', user.id)
    .order('last_name', { ascending: true });

  if (error) {
    console.error("Fehler beim Laden der Mitarbeiter:", error);
    return <div className="p-8">Fehler beim Laden der Mitarbeiter.</div>;
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'destructive';
      case 'on_leave':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <UserRoundCheck className="mr-2 h-4 w-4 flex-shrink-0" />;
      case 'inactive':
        return <UserRoundX className="mr-2 h-4 w-4 flex-shrink-0" />;
      case 'on_leave':
        return <UserRoundMinus className="mr-2 h-4 w-4 flex-shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Ihre Mitarbeiter</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground">Noch keine Mitarbeiter vorhanden. Fügen Sie einen hinzu!</p>
        ) : (
          employees.map((employee) => (
            <Card key={employee.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{employee.first_name} {employee.last_name}</CardTitle>
                <div className="flex items-center space-x-2">
                  <EmployeeEditDialog employee={employee} />
                  <DeleteEmployeeButton employeeId={employee.id} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {employee.email && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>{employee.email}</span>
                  </div>
                )}
                {employee.phone && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>{employee.phone}</span>
                  </div>
                )}
                {employee.hire_date && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Einstellungsdatum: {new Date(employee.hire_date).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center text-sm text-muted-foreground">
                  {getStatusIcon(employee.status)}
                  <Badge variant={getStatusBadgeVariant(employee.status)}>{employee.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <h2 className="text-2xl font-bold mt-8">Neuen Mitarbeiter hinzufügen</h2>
      <EmployeeForm onSubmit={createEmployee} submitButtonText="Mitarbeiter hinzufügen" />
    </div>
  );
}