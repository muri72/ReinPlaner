import React from "react";
import Link from "next/link";
import { Home, ListTodo, User, Users } from "lucide-react"; // Users-Icon importieren
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
            <Link href="/dashboard/tasks" passHref>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <ListTodo className="mr-2 h-4 w-4" />
                Aufgaben
              </Button>
            </Link>
            <Link href="/dashboard/customers" passHref> {/* Neuer Link für Kunden */}
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <Users className="mr-2 h-4 w-4" /> {/* Users-Icon */}
                Kunden
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