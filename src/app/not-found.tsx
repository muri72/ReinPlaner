"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileX, Home, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4 sm:p-8">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-4">
          <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 bg-muted rounded-full flex items-center justify-center">
            <FileX className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">404</h1>
            <h2 className="text-xl sm:text-2xl font-semibold">Seite nicht gefunden</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Die angeforderte Seite konnte nicht gefunden werden.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Überprüfen Sie die URL oder navigieren Sie zu einem anderen Bereich.
          </p>

          <div className="space-y-2">
            <Button asChild className="w-full h-11 text-base">
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                Zur Startseite
              </Link>
            </Button>

            <Button variant="outline" onClick={() => router.back()} className="w-full h-11 text-base">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
