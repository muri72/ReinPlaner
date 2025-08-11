import React from "react";
import Link from "next/link";
import { LayoutDashboard, FilePlus2, User, Building } from "lucide-react";
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

  return (
    <div className="min-h-screen flex">
      {/* Simplified Sidebar for Customers */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-4 flex flex-col">
        <div className="flex-grow">
          <h2 className="text-xl font-bold mb-6 text-sidebar-primary-foreground tracking-tight">ARIS Portal</h2>
          <nav className="space-y-2">
            <Link href="/portal/dashboard" passHref>
              <Button variant="ghost" className="w-full justify-start text-base text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <LayoutDashboard className="mr-2 h-5 w-5" />
                Übersicht
              </Button>
            </Link>
            <Link href="/portal/objects" passHref>
              <Button variant="ghost" className="w-full justify-start text-base text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <Building className="mr-2 h-5 w-5" />
                Meine Objekte
              </Button>
            </Link>
            <Link href="/portal/requests/new" passHref>
              <Button variant="ghost" className="w-full justify-start text-base text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <FilePlus2 className="mr-2 h-5 w-5" />
                Neue Anfrage
              </Button>
            </Link>
            <Link href="/portal/profile" passHref>
              <Button variant="ghost" className="w-full justify-start text-base text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <User className="mr-2 h-5 w-5" />
                Profil
              </Button>
            </Link>
          </nav>
        </div>
        <form action={signOut} className="mt-auto">
          <Button type="submit" variant="destructive" className="w-full">
            Abmelden
          </Button>
        </form>
      </aside>

      <main className="flex-grow bg-muted/40">
        {children}
      </main>
    </div>
  );
}