import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ReinPlaner Dashboard",
  description: "ReinPlaner - Auftragsverwaltung und Ressourcenplanung",
};

export default async function HomePage() {
  // This page is now just a trigger for the middleware.
  // The middleware will inspect the user's session and role,
  // and redirect them to the appropriate dashboard (/dashboard or /portal/dashboard).
  // If not logged in, the middleware will redirect to /login.
  // We redirect to a path that is handled by the middleware's matcher.
  redirect("/dashboard");
}

// Disable static optimization for this page to avoid prerender errors
export const dynamic = 'force-dynamic';
