import React from "react";
import Link from "next/link";
import { Home, ListTodo, User, Users, Briefcase, UsersRound, Building, ContactRound, Settings, Clock, FileText, CalendarOff, CalendarCheck, Star } from "lucide-react"; // Star hinzugefügt
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/dashboard/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the current user's role to conditionally show the "Benutzer" and "Arbeitszeitnachweise" link
  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = userProfile?.role === 'admin';
  const isManager = userProfile?.role === 'manager';

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-4 flex flex-col">
        <div className="flex-grow">
          <h2 className="text-2xl font-bold mb-6 text-sidebar-primary-foreground">ARIS</h2>
          <nav className="space-y-2">
            <Link href="/dashboard" passHref>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/dashboard/orders" passHref>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <Briefcase className="mr-2 h-4 w-4" />
                Aufträge
              </Button>
            </Link>
            <Link href="/dashboard/customers" passHref>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <Users className="mr-2 h-4 w-4" />
                Kunden
              </Button>
            </Link>
            <Link href="/dashboard/customer-contacts" passHref>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <ContactRound className="mr-2 h-4 w-4" />
                Kundenkontakte
              </Button>
            </Link>
            <Link href="/dashboard/objects" passHref>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <Building className="mr-2 h-4 w-4" />
                Objekte
              </Button>
            </Link>
            <Link href="/dashboard/employees" passHref>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <UsersRound className="mr-2 h-4 w-4" />
                Mitarbeiter
              </Button>
            </Link>
            <Link href="/dashboard/time-tracking" passHref>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <Clock className="mr-2 h-4 w-4" />
                Zeiterfassung
              </Button>
            </Link>
            <Link href="/dashboard/absence-requests" passHref>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <CalendarOff className="mr-2 h-4 w-4" />
                Abwesenheiten
              </Button>
            </Link>
            {(isAdmin || isManager) && (
              <Link href="/dashboard/planning" passHref>
                <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  Ressourcenplanung
                </Button>
              </Link>
            )}
            <Link href="/dashboard/feedback" passHref>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <Star className="mr-2 h-4 w-4" />
                Feedback
              </Button>
            </Link>
            {(isAdmin || isManager) && ( // Only show for admins and managers
              <Link href="/dashboard/reports" passHref>
                <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                  <FileText className="mr-2 h-4 w-4" />
                  Arbeitszeitnachweise
                </Button>
              </Link>
            )}
            {isAdmin && ( // Only show for admins
              <Link href="/dashboard/users" passHref>
                <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                  <Settings className="mr-2 h-4 w-4" />
                  Benutzer
                </Button>
              </Link>
            )}
            <Link href="/dashboard/profile" passHref>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <User className="mr-2 h-4 w-4" />
                Profil
              </Button>
            </Link>
          </nav>
        </div>
        {/* Sign Out Button am unteren Rand der Sidebar */}
        <form action={signOut} className="mt-auto">
          <Button type="submit" variant="destructive" className="w-full">
            Abmelden
          </Button>
        </form>
      </aside>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
}