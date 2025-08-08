"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  console.log("LoginPage: Component rendered."); // NEUER LOG
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("LoginPage useEffect: Setting up auth state listener."); // NEUER LOG
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth State Change Event:", event, "Session:", session); // NEUER LOG
        if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          if (session) {
            console.log("User signed in, redirecting to /dashboard."); // NEUER LOG
            router.push("/dashboard"); // Authentifizierte Benutzer zum Dashboard umleiten
          }
        } else if (event === "SIGNED_OUT") {
          toast.info("Sie wurden abgemeldet.");
          console.log("User signed out."); // NEUER LOG
        }
      }
    );

    return () => {
      console.log("LoginPage useEffect: Cleaning up auth state listener."); // NEUER LOG
      subscription.unsubscribe();
    };
  }, [router, supabase.auth]);

  const handleDemoLogin = async () => {
    setLoading(true);
    const demoEmail = "admin@reinigung-aris.de";
    const demoPassword = "admin123";
    console.log("Attempting demo login..."); // NEUER LOG

    const { error } = await supabase.auth.signInWithPassword({
      email: demoEmail,
      password: demoPassword,
    });

    if (error) {
      toast.error(`Anmeldung fehlgeschlagen: ${error.message}. Bitte stellen Sie sicher, dass der Demo-Benutzer in Supabase existiert.`);
      console.error("Demo login failed:", error.message); // NEUER LOG
    } else {
      toast.success("Erfolgreich als Demo-Benutzer angemeldet!");
      console.log("Demo login successful."); // NEUER LOG
      // Die Weiterleitung wird durch onAuthStateChange gehandhabt
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log("Attempting regular login for email:", email); // NEUER LOG

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(`Anmeldung fehlgeschlagen: ${error.message}`);
      console.error("Regular login failed:", error.message); // NEUER LOG
    } else {
      toast.success("Erfolgreich angemeldet!");
      console.log("Regular login successful."); // NEUER LOG
      // Die Weiterleitung wird durch onAuthStateChange gehandhabt
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
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
          <span className="bg-white dark:bg-gray-800 px-2 text-muted-foreground">
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
    </div>
  );
}