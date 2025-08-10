import React from "react";
import Link from "next/link";
import { LayoutDashboard, FilePlus2, User, Building } from "lucide-react"; // Building icon added
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/dashboard/actions"; // signOut action can be reused
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PortalLayout({
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
          <h2 className="text-2xl font-bold mb-6 text-sidebar-primary-foreground">ARIS Portal</h2>
          <nav className="space-y-2">
            <Link href="/portal/dashboard" passHref>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Übersicht
              </Button>
            </Link>
            <Link href="/portal/objects" passHref>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <Building className="mr-2 h-4 w-4" />
                Meine Objekte
              </Button>
            </Link>
            <Link href="/portal/requests/new" passHref>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <FilePlus2 className="mr-2 h-4 w-4" />
                Neue Anfrage
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