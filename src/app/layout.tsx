import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionContextProvider } from "@/components/supabase-session-provider";
import { createClient } from "@/lib/supabase/server";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ARIS Management", // Geändert von CleanPro Management
  description: "Management-Plattform für Reinigungsunternehmen",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  console.log("RootLayout: Initializing..."); // NEUER LOG
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  console.log("RootLayout: Supabase session fetched.", session ? "Session exists." : "No session."); // NEUER LOG

  return (
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionContextProvider initialSession={session}>
          {children}
        </SessionContextProvider>
        <Toaster />
      </body>
    </html>
  );
}