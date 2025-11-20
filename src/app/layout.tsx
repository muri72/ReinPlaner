import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ImpersonationProviderWrapper } from "@/components/impersonation-provider-wrapper";
import { UserProfileProvider } from "@/components/user-profile-provider";
import { UnsavedChangesProvider } from "@/components/ui/unsaved-changes-context";
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ARIS"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3B82F6" },
    { media: "(prefers-color-scheme: dark)", color: "#1E40AF" }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
          <ImpersonationProviderWrapper>
            <UserProfileProvider>
              <UnsavedChangesProvider>
                {children}
              </UnsavedChangesProvider>
            </UserProfileProvider>
          </ImpersonationProviderWrapper>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}