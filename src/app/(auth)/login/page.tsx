"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Image from "next/image"; // Importiere Next.js Image Komponente

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN") {
          // On sign-in, push to the root and let the middleware handle the redirect.
          router.push("/"); 
          router.refresh(); // Ensure the page reloads to trigger middleware correctly.
        } else if (event === "SIGNED_OUT") {
          toast.info("Sie wurden abgemeldet.");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase.auth]);

  const handleDemoLogin = async () => {
    setLoading(true);
    const demoEmail = "admin@reinigung-aris.de";
    const demoPassword = "admin123";

    const { error } = await supabase.auth.signInWithPassword({
      email: demoEmail,
      password: demoPassword,
    });

    if (error) {
      toast.error(`Anmeldung fehlgeschlagen: ${error.message}. Bitte stellen Sie sicher, dass der Demo-Benutzer in Supabase existiert.`);
    } else {
      toast.success("Erfolgreich als Demo-Benutzer angemeldet!");
      // The onAuthStateChange handler will now manage the redirect.
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(`Anmeldung fehlgeschlagen: ${error.message}`);
    } else {
      toast.success("Erfolgreich angemeldet!");
      // The onAuthStateChange handler will now manage the redirect.
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background bg-none">
      <div className="relative z-10 w-full max-w-4xl flex flex-col md:flex-row rounded-xl shadow-neumorphic border border-border overflow-hidden glassmorphism-card">
        {/* Left Side: Login Form */}
        <div className="w-full md:w-1/2 p-8 space-y-6 bg-background/70 backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-center text-foreground">
            Anmelden
          </h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="Ihre E-Mail-Adresse"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                placeholder="Ihr Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Anmelden..." : "Anmelden"}
            </Button>
          </form>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background/70 px-2 text-muted-foreground">
              Oder
            </span>
          </div>
          <Button
            onClick={handleDemoLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={loading}
          >
            {loading ? "Demo-Anmeldung..." : "Als Demo-Benutzer anmelden"}
          </Button>
        </div>

        {/* Right Side: Logo and Description */}
        <div className="hidden md:flex w-full md:w-1/2 bg-primary/90 text-primary-foreground p-8 flex-col items-center justify-center text-center">
          <Image
            src="/home.png" // Pfad zum Logo
            alt="ARIS Management Logo"
            width={200} // Angepasste Größe
            height={200} // Angepasste Größe
            className="mb-6"
          />
          <h3 className="text-2xl font-bold mb-2">ARIS Management</h3>
          <p className="text-sm opacity-90">
            Ihre effiziente Lösung für Gebäudereinigung.
            Alles an einem Ort.
          </p>
        </div>
      </div>
    </div>
  );
}