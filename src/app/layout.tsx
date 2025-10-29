import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionContextProvider } from "@/components/supabase-session-provider";
import { createClient } from "@/lib/supabase/server";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import React from 'react'; // Hinzugefügt: Expliziter Import von React

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ARIS Management",
  description: "Management-Plattform für Reinigungsunternehmen",
  manifest: "/manifest.json",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: "cover"
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3B82F6" },
    { media: "(prefers-color-scheme: dark)", color: "#1E40AF" }
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ARIS"
  },
  formatDetection: {
    telephone: false
  }
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  let userProfile = null;
  if (session?.user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url, role')
      .eq('id', session.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error("Fehler beim Laden des Benutzerprofils im RootLayout:", profileError?.message || profileError);
    }
    userProfile = profile;
  }

  return (
    <html lang="de" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionContextProvider initialSession={session}>
            {/* Der userProfile wird bereits in den spezifischen Layouts (dashboard/layout.tsx, etc.)
                an das DashboardClientLayout übergeben. Dieser React.Children.map-Block ist unnötig
                und verursacht Typfehler, da er versucht, eine Prop an ein unbekanntes Kind zu klonen. */}
            {children}
          </SessionContextProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}