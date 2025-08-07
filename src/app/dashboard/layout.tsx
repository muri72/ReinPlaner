import React from "react";
import Link from "next/link";
import { Home, ListTodo, User, Users, Briefcase, UsersRound, Building, ContactRound, Settings } from "lucide-react"; // Settings-Icon für Benutzerverwaltung
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/dashboard/actions";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
            <Link href="/dashboard/customer-contacts" passHref> {/* Neuer Link für Kundenkontakte */}
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <ContactRound className="mr-2 h-4 w-4" /> {/* Icon für Kundenkontakte */}
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
            <Link href="/dashboard/users" passHref> {/* Neuer Link für Benutzerverwaltung */}
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <Settings className="mr-2 h-4 w-4" />
                Benutzer
              </Button>
            </Link>
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