"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4 sm:p-8">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="space-y-4">
              <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Fehler</h1>
                <h2 className="text-xl sm:text-2xl font-semibold">Etwas ist schiefgelaufen</h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Ein unerwarteter Fehler ist aufgetreten.
                </p>
              </div>

              {process.env.NODE_ENV === "development" && (
                <div className="text-left p-3 sm:p-4 bg-muted rounded-lg text-xs sm:text-sm font-mono overflow-auto max-h-48">
                  <p className="font-semibold mb-2">Error details:</p>
                  <pre className="text-destructive whitespace-pre-wrap break-words">{error.message}</pre>
                  {error.digest && (
                    <p className="text-muted-foreground mt-2">
                      Digest: {error.digest}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Button onClick={reset} className="w-full h-11 text-base">
                <RefreshCw className="mr-2 h-4 w-4" />
                Erneut versuchen
              </Button>

              <Button
                variant="outline"
                onClick={() => window.location.href = "/dashboard"}
                className="w-full h-11 text-base"
              >
                Zum Dashboard
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
