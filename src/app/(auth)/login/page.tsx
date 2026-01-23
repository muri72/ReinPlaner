"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles, Building2, Zap } from "lucide-react";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          try {
            await fetch('/api/log-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
          } catch (error) {
            console.error('Failed to log login:', error);
          }

          router.push("/");
          router.refresh();
        } else if (event === "SIGNED_OUT") {
          toast.info("Sie wurden abgemeldet.");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase.auth]);

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
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Hero with Logo */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Gradient orbs matching logo colors */}
          <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] animate-pulse-slow" />
          <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-cyan-400/15 rounded-full blur-[80px] animate-pulse-slow delay-700" />
          <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[60px] animate-pulse-slow delay-300" />

          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-5"
               style={{
                 backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                   linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                 backgroundSize: '60px 60px'
               }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          {/* Large Logo Display */}
          <div className="mb-10">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-blue-500/30 blur-3xl rounded-full" />
              <div className="relative">
                <Image
                  src="/logo.png"
                  alt="ARIS Management Logo"
                  width={320}
                  height={320}
                  className="drop-shadow-2xl"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Brand Text */}
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-3 tracking-tight">
              ARIS Management
            </h1>
            <p className="text-blue-200/80 text-lg mb-8">
              Glas- und Gebäudereinigung
            </p>

            {/* Value props with icons */}
            <div className="space-y-5">
              {[
                { icon: Zap, text: "Intuitive Bedienung" },
                { icon: Building2, text: "Echtzeit-Dashboard" },
                { icon: Sparkles, text: "Umfassende Übersicht" }
              ].map(({ icon: Icon, text }, index) => (
                <div key={index} className="flex items-center justify-center gap-3 text-white/70">
                  <Icon className="w-5 h-5 text-blue-300" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="absolute bottom-8 left-0 right-0 text-center text-white/30 text-sm">
          Ihr Partner für zuverlässige Sauberkeit
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="w-full max-w-md">
          {/* Mobile Logo Header */}
          <div className="lg:hidden text-center mb-8">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
              <Image
                src="/logo.png"
                alt="ARIS Management Logo"
                width={120}
                height={120}
                className="relative"
              />
            </div>
            <h1 className="text-2xl font-bold mt-4 text-slate-800">ARIS Management</h1>
            <p className="text-blue-600 text-sm">Glas- und Gebäudereinigung</p>
          </div>

          {/* Login Card */}
          <div className="relative">
            {/* Gradient accent line */}
            <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent" />

            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/60 p-8 lg:p-10">
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  Willkommen zurück
                </h2>
                <p className="text-slate-500">
                  Melden Sie sich an, um fortzufahren
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-700 ml-1">
                    E-Mail-Adresse
                  </Label>
                  <div className={`relative transition-all duration-300 ${
                    focusedField === 'email' ? 'scale-[1.01]' : ''
                  }`}>
                    <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
                      focusedField === 'email' ? 'text-blue-500' : 'text-slate-400'
                    }`} />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@beispiel.de"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      required
                      className={`pl-12 h-12 bg-slate-50 border-slate-200 rounded-xl transition-all duration-300 ${
                        focusedField === 'email'
                          ? 'border-blue-400 bg-white ring-4 ring-blue-500/10'
                          : 'hover:bg-slate-100'
                      }`}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
                      Passwort
                    </Label>
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      Passwort vergessen?
                    </button>
                  </div>
                  <div className={`relative transition-all duration-300 ${
                    focusedField === 'password' ? 'scale-[1.01]' : ''
                  }`}>
                    <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
                      focusedField === 'password' ? 'text-blue-500' : 'text-slate-400'
                    }`} />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Ihr Passwort"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      required
                      autoComplete="off"
                      className={`pl-12 h-12 bg-slate-50 border-slate-200 rounded-xl transition-all duration-300 [::-ms-reveal]:hidden [::-webkit-appearance:none] ${
                        focusedField === 'password'
                          ? 'border-blue-400 bg-white ring-4 ring-blue-500/10'
                          : 'hover:bg-slate-100'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${
                        focusedField === 'password' ? 'text-blue-500' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Remember me */}
                <div className="flex items-center gap-2 ml-1">
                  <input
                    type="checkbox"
                    id="remember"
                    className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500/20 cursor-pointer"
                  />
                  <Label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer">
                    Angemeldet bleiben
                  </Label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-12 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Anmeldung läuft...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Anmelden
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <p className="text-sm text-slate-500">
                  Noch kein Account? <span className="text-blue-600 font-semibold cursor-pointer hover:underline">Kontaktieren Sie uns</span>
                </p>
              </div>
            </div>

            {/* Decorative glow */}
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl" />
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-cyan-400/15 rounded-full blur-2xl" />
          </div>

          {/* Mobile footer */}
          <div className="lg:hidden mt-8 text-center text-sm text-slate-400">
            <p>Ihr Partner für makellose Sauberkeit</p>
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 5s ease-in-out infinite;
        }
        .delay-300 { animation-delay: 0.3s; }
        .delay-700 { animation-delay: 0.7s; }
      `}</style>
    </div>
  );
}
