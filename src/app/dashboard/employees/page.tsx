import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EmployeeForm } from "@/components/employee-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createEmployee } from "./actions";
import { EmployeeEditDialog } from "@/components/employee-edit-dialog";
import { DeleteEmployeeButton } from "@/components/delete-employee-button";
import { Mail, Phone, CalendarDays, UserRoundCheck, UserRoundX, UserRoundMinus, Briefcase, DollarSign, Tag, Building2, FileText } from "lucide-react"; // Neue Icons
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/search-input"; // Importiere die SearchInput Komponente

export default async function EmployeesPage({
  searchParams,
}: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const query = typeof searchParams?.query === 'string' ? searchParams.query : '';

  let employeesQuery = supabase
    .from('employees')
    .select('*')
    .eq('user_id', user.id)
    .order('last_name', { ascending: true });

  if (query) {
    // Suche nach Vorname, Nachname, E-Mail, Telefonnummer, Berufsbezeichnung oder Abteilung
    employeesQuery = employeesQuery.or(
      `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,job_title.ilike.%${query}%,department.ilike.%${query}%`
    );
  }

  const { data: employees, error } = await employeesQuery;

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

      <div className="mb-4">
        <SearchInput placeholder="Mitarbeiter suchen..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground">
            {query ? "Keine Mitarbeiter gefunden, die Ihrer Suche entsprechen." : "Noch keine Mitarbeiter vorhanden. Fügen Sie einen hinzu!"}
          </p>
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
                {employee.job_title && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Tag className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Position: {employee.job_title}</span>
                  </div>
                )}
                {employee.department && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Building2 className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Abteilung: {employee.department}</span>
                  </div>
                )}
                {employee.hire_date && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Einstellungsdatum: {new Date(employee.hire_date).toLocaleDateString()}</span>
                  </div>
                )}
                {employee.start_date && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Vertragsstart: {new Date(employee.start_date).toLocaleDateString()}</span>
                  </div>
                )}
                {employee.contract_type && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Briefcase className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Vertragsart: <Badge variant="secondary">{employee.contract_type}</Badge></span>
                  </div>
                )}
                {employee.hourly_rate !== null && employee.hourly_rate !== undefined && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <DollarSign className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Stundenlohn: {employee.hourly_rate.toFixed(2)} €</span>
                  </div>
                )}
                {employee.notes && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Notizen: {employee.notes}</span>
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