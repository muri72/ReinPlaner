import React from "react";
import Link from "next/link";
import { Home, ListTodo, User, Users, Briefcase, UsersRound, Building, ContactRound, Settings, Clock, FileText, CalendarOff, CalendarCheck, Star, TrendingUp, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/dashboard/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NotificationBell } from "@/components/notification-bell";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; // Import Sheet components

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

  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = userProfile?.role === 'admin';
  const isManager = userProfile?.role === 'manager';

  const navLinks = (
    <>
      <Link href="/dashboard" passHref>
        <Button variant="ghost" className="w-full justify-start text-base text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200">
          <Home className="mr-2 h-5 w-5" />
          Dashboard
        </Button>
      </Link>
      <Link href="/dashboard/orders" passHref>
        <Button variant="ghost" className="w-full justify-start text-base text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200">
          <Briefcase className="mr-2 h-5 w-5" />
          Aufträge
        </Button>
      </Link>
      <Link href="/dashboard/customers" passHref>
        <Button variant="ghost" className="w-full justify-start text-base text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200">
          <Users className="mr-2 h-5 w-5" />
          Kunden
        </Button>
      </Link>
      <Link href="/dashboard/customer-contacts" passHref>
        <Button variant="ghost" className="w-full justify-start text-base text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200">
          <ContactRound className="mr-2 h-5 w-5" />
          Kundenkontakte
        </Button>
      </Link>
      <Link href="/dashboard/objects" passHref>
        <Button variant="ghost" className="w-full justify-start text-base text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200">
          <Building className="mr-2 h-5 w-5" />
          Objekte
        </Button>
      </Link>
      <Link href="/dashboard/employees" passHref>
        <Button variant="ghost" className="w-full justify-start text-base text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200">
          <UsersRound className="mr-2 h-5 w-5" />
          Mitarbeiter
        </Button>
      </Link>
      <Link href="/dashboard/time-tracking" passHref>
        <Button variant="ghost" className="w-full justify-start text-base text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200">
          <Clock className="mr-2 h-5 w-5" />
          Zeiterfassung
        </Button>
      </Link>
      <Link href="/dashboard/absence-requests" passHref>
        <Button variant="ghost" className="w-full justify-start text-base text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200">
          <CalendarOff className="mr-2 h-5 w-5" />
          Abwesenheiten
        </Button>
      </Link>
      {(isAdmin || isManager) && (
        <>
          <Link href="/dashboard/planning" passHref>
            <Button variant="ghost" className="w-full justify-start text-base text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200">
              <CalendarCheck className="mr-2 h-5 w-5" />
              Ressourcenplanung
            </Button>
          </Link>
          <Link href="/dashboard/finances" passHref>
            <Button variant="ghost" className="w-full justify-start text-base text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200">
              <TrendingUp className="mr-2 h-5 w-5" />
              Finanzen
            </Button>
          </Link>
          <Link href="/dashboard/reports" passHref>
            <Button variant="ghost" className="w-full justify-start text-base text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200">
              <FileText className="mr-2 h-5 w-5" />
              Arbeitszeitnachweise
            </Button>
          </Link>
        </>
      )}
      <Link href="/dashboard/feedback" passHref>
        <Button variant="ghost" className="w-full justify-start text-base text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200">
          <Star className="mr-2 h-5 w-5" />
          Feedback
        </Button>
      </Link>
      {isAdmin && (
        <Link href="/dashboard/users" passHref>
          <Button variant="ghost" className="w-full justify-start text-base text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200">
            <Settings className="mr-2 h-5 w-5" />
            Benutzer
          </Button>
        </Link>
      )}
      <Link href="/dashboard/profile" passHref>
        <Button variant="ghost" className="w-full justify-start text-base text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200">
          <User className="mr-2 h-5 w-5" />
          Profil
        </Button>
      </Link>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Header and Navigation */}
      <header className="md:hidden w-full bg-sidebar text-sidebar-foreground border-b border-sidebar-border p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-4 flex flex-col bg-gradient-to-br from-sidebar-background to-sidebar-accent/20">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-sidebar-primary-foreground tracking-tight">ARIS</h2>
                <NotificationBell />
              </div>
              <nav className="flex-grow space-y-2">
                {navLinks}
              </nav>
              <form action={signOut} className="mt-auto">
                <Button type="submit" variant="destructive" className="w-full">
                  Abmelden
                </Button>
              </form>
            </SheetContent>
          </Sheet>
          <h2 className="text-xl font-bold text-sidebar-primary-foreground tracking-tight ml-4">ARIS</h2>
        </div>
        <NotificationBell />
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-4 flex-col bg-gradient-to-br from-sidebar-background to-sidebar-accent/20">
        <div className="flex-grow">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-sidebar-primary-foreground tracking-tight">ARIS</h2>
            <NotificationBell />
          </div>
          <nav className="space-y-2">
            {navLinks}
          </nav>
        </div>
        <form action={signOut} className="mt-auto">
          <Button type="submit" variant="destructive" className="w-full">
            Abmelden
          </Button>
        </form>
      </aside>
      <main className="flex-grow p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}