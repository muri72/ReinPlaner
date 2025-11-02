import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldX, ArrowLeft } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4 sm:p-8">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-4">
          <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 bg-destructive/10 rounded-full flex items-center justify-center">
            <ShieldX className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">403</h1>
            <h2 className="text-xl sm:text-2xl font-semibold">Zugriff verweigert</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Sie haben keine Berechtigung, auf diese Ressource zuzugreifen.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Wenn Sie der Meinung sind, dass dies ein Fehler ist, wenden Sie sich an Ihren Administrator.
          </p>

          <div className="space-y-2">
            <Button asChild className="w-full h-11 text-base">
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück zum Dashboard
              </Link>
            </Button>

            <Button variant="outline" asChild className="w-full h-11 text-base">
              <Link href="/login">
                Als anderer Benutzer anmelden
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
