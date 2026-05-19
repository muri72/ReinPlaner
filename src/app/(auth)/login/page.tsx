"use client";

import { signIn } from "@/lib/auth/session";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles, Building2, Zap, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useTheme } from "next-themes";

export default function LoginPage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  // next-themes: resolvedTheme is "system" until mounted, defaultTheme is "dark"
  // so on server/SSR resolvedTheme is "dark" — matches defaultTheme="dark"
  const isDark = resolvedTheme === "dark";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    // NextAuth handles session automatically
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Anmeldung fehlgeschlagen: ' + (result.error.message || 'Unbekannter Fehler'));
      } else {
        toast.success('Erfolgreich angemeldet!');
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error) {
      toast.error('Anmeldung fehlgeschlagen');
    }
    setLoading(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Bitte geben Sie Ihre E-Mail-Adresse ein.");
      return;
    }

    setResetLoading(true);

    // Password reset via NextAuth - for now show info
    // TODO: Implement NextAuth email provider with Resend
    toast.info("Passwort-Zurücksetzen kommt bald. Bitte kontaktieren Sie Ihren Administrator.");
    setResetSent(true);
    setResetLoading(false);
  };

  const inputCls = (field: string) => `
    pl-12 h-12 bg-background dark:bg-slate-800 border border-border dark:border-slate-600
    rounded-xl transition-all duration-200 text-foreground dark:text-slate-100
    placeholder:text-muted-foreground dark:placeholder:text-slate-400
    ${focusedField === field
      ? 'border-primary dark:border-blue-500 ring-2 ring-primary/20 dark:ring-blue-500/20'
      : 'hover:border-slate-300 dark:hover:border-slate-500'
    }
  `;

  const iconCls = (field: string) =>
    `absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200 ${
      focusedField === field
        ? 'text-primary dark:text-blue-400'
        : 'text-muted-foreground dark:text-slate-400'
    }`;

  return (
    <div className="min-h-screen flex">

      {/* ── Left Hero Panel ── */}
      <div className={`
        hidden lg:flex lg:w-1/2 relative overflow-hidden
        ${isDark
          ? 'bg-[#0D1117]'
          : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
        }
      `}>
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-5 dark:opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />

        {/* Decorative blobs — dark only */}
        {isDark && (
          <>
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl" />
          </>
        )}

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">

          {/* Logo */}
          <div className="mb-10">
            <div className="relative">
              <img
                src="/tenant-logos/aris.png"
                alt="ARIS Logo"
                width={260}
                height={260}
                className="drop-shadow-2xl"
                style={{ filter: isDark ? 'brightness(0.9)' : 'none' }}
              />
            </div>
          </div>

          {/* Brand */}
          <div className="text-center mb-12">
            <h1 className={`
              text-4xl font-bold mb-3 tracking-tight
              ${isDark ? 'text-white' : 'text-slate-900'}
            `}>
              ReinPlaner
            </h1>
            <p className={`
              text-lg mb-10
              ${isDark ? 'text-slate-400' : 'text-slate-500'}
            `}>
              Glas- und Gebäudereinigung
            </p>

            {/* Value props */}
            <div className="space-y-4">
              {[
                { icon: Zap, text: "Intuitive Bedienung" },
                { icon: Building2, text: "Echtzeit-Dashboard" },
                { icon: Sparkles, text: "Umfassende Übersicht" }
              ].map(({ icon: Icon, text }, index) => (
                <div key={index} className={`
                  flex items-center justify-center gap-3
                  ${isDark ? 'text-slate-400' : 'text-slate-500'}
                `}>
                  <Icon className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trust badges */}
          <div className={`
            inline-flex items-center gap-6 px-6 py-3 rounded-full border
            ${isDark
              ? 'bg-slate-800/60 border-slate-700 text-slate-400'
              : 'bg-white/70 border-slate-200 text-slate-500'
            }
          `}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-sm">SSL-verschlüsselt</span>
            </div>
            <div className={`w-px h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-sm">DSGVO-konform</span>
            </div>
          </div>
        </div>

        {/* Bottom tagline */}
        <div className={`
          absolute bottom-8 left-0 right-0 text-center text-sm
          ${isDark ? 'text-slate-600' : 'text-slate-400'}
        `}>
          Für Reinigungsfirmen jeder Größe
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className={`
        w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12
        ${isDark ? 'bg-[#0F172A]' : 'bg-white'}
      `}>
        <div className="w-full max-w-md">

          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <img
              src="/tenant-logos/aris.png"
              alt="ARIS Logo"
              width={80}
              height={80}
              className="mx-auto mb-4"
            />
            <h1 className={`
              text-2xl font-bold
              ${isDark ? 'text-white' : 'text-slate-900'}
            `}>
              ReinPlaner
            </h1>
            <p className={`
              text-sm mt-1
              ${isDark ? 'text-slate-400' : 'text-slate-500'}
            `}>
              Software für Gebäudereinigung
            </p>
          </div>

          {/* Card */}
          <div className="page-enter stagger-3">

            {/* Accent line */}
            <div className={`
              absolute -top-px left-8 right-8 h-px
              ${isDark
                ? 'bg-gradient-to-r from-transparent via-blue-500 to-transparent'
                : 'bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-400'
              }
            `} />

            <div className={`
              relative rounded-2xl shadow-xl border p-8 lg:p-10 page-enter stagger-4
              ${isDark
                ? 'bg-[#161B22] border-slate-700/80 shadow-slate-950/40'
                : 'bg-white border-slate-200 shadow-slate-200/60'
              }
            `}>

              {/* Header */}
              <div className="text-center mb-8 page-enter stagger-4">
                {isResetMode ? (
                  resetSent ? (
                    <>
                      <div className={`
                        mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center
                        ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}
                      `}>
                        <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                      </div>
                      <h2 className={`
                        text-2xl font-bold mb-2
                        ${isDark ? 'text-white' : 'text-slate-900'}
                      `}>
                        E-Mail gesendet!
                      </h2>
                      <p className={`
                        text-sm leading-relaxed
                        ${isDark ? 'text-slate-400' : 'text-slate-500'}
                      `}>
                        Wir haben eine E-Mail mit einem Link zum Zurücksetzen Ihres Passworts an
                        <span className="font-semibold text-foreground mx-1">{email}</span>
                        gesendet. Bitte prüfen Sie Ihr Postfach.
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className={`
                        text-2xl font-bold mb-2
                        ${isDark ? 'text-white' : 'text-slate-900'}
                      `}>
                        Passwort zurücksetzen
                      </h2>
                      <p className={`
                        text-sm leading-relaxed
                        ${isDark ? 'text-slate-400' : 'text-slate-500'}
                      `}>
                        Geben Sie Ihre E-Mail-Adresse ein, um einen Link zum Zurücksetzen Ihres Passworts zu erhalten.
                      </p>
                    </>
                  )
                ) : (
                  <>
                    <h2 className={`
                      text-2xl font-bold mb-2
                      ${isDark ? 'text-white' : 'text-slate-900'}
                    `}>
                      Willkommen zurück
                    </h2>
                    <p className={`
                      text-sm
                      ${isDark ? 'text-slate-400' : 'text-slate-500'}
                    `}>
                      Melden Sie sich an, um fortzufahren
                    </p>
                  </>
                )}
              </div>

              {/* Form */}
              {isResetMode && !resetSent ? (
                <form onSubmit={handlePasswordReset} className="space-y-5 page-enter stagger-5">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className={`
                      text-sm font-semibold ml-1
                      ${isDark ? 'text-slate-300' : 'text-slate-700'}
                    `}>
                      E-Mail-Adresse
                    </Label>
                    <div className="relative">
                      <Mail className={iconCls('reset-email')} />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="name@beispiel.de"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField('reset-email')}
                        onBlur={() => setFocusedField(null)}
                        required
                        className={inputCls('reset-email')}
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { setIsResetMode(false); setResetSent(false); }}
                    className={`
                      w-full h-12 font-medium
                      ${isDark
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }
                    `}
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Zurück zur Anmeldung
                  </Button>

                  <Button
                    type="submit"
                    className={`
                      w-full h-12 font-semibold rounded-xl transition-all duration-200 group
                      bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl
                    `}
                    disabled={resetLoading}
                  >
                    {resetLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Wird gesendet…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Link senden
                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </Button>
                </form>
              ) : isResetMode && resetSent ? (
                <div className="space-y-5 page-enter stagger-5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { setIsResetMode(false); setResetSent(false); setEmail(''); }}
                    className={`
                      w-full h-12 font-medium
                      ${isDark
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }
                    `}
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Zurück zur Anmeldung
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleLogin} className="space-y-5 page-enter stagger-5">
                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className={`
                      text-sm font-semibold ml-1
                      ${isDark ? 'text-slate-300' : 'text-slate-700'}
                    `}>
                      E-Mail-Adresse
                    </Label>
                    <div className="relative">
                      <Mail className={iconCls('email')} />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@beispiel.de"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        required
                        className={inputCls('email')}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                      <Label htmlFor="password" className={`
                        text-sm font-semibold
                        ${isDark ? 'text-slate-300' : 'text-slate-700'}
                      `}>
                        Passwort
                      </Label>
                      <button
                        type="button"
                        onClick={() => setIsResetMode(true)}
                        className={`
                          text-sm font-medium transition-colors
                          ${isDark
                            ? 'text-blue-400 hover:text-blue-300'
                            : 'text-blue-600 hover:text-blue-700'
                          }
                        `}
                      >
                        Vergessen?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className={iconCls('password')} />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Ihr Passwort"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        required
                        autoComplete="current-password"
                        className={`${inputCls('password')} [::-ms-reveal]:hidden [::-webkit-appearance:none]`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`
                          absolute right-4 top-1/2 -translate-y-1/2 transition-colors
                          ${focusedField === 'password'
                            ? isDark ? 'text-blue-400' : 'text-blue-600'
                            : isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                          }
                        `}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember me */}
                  <div className="flex items-center gap-2.5 ml-1">
                    <input
                      type="checkbox"
                      id="remember"
                      className={`
                        w-4 h-4 rounded border cursor-pointer
                        ${isDark
                          ? 'border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/30'
                          : 'border-slate-300 bg-slate-50 text-blue-600 focus:ring-blue-500/20'
                        }
                        focus:ring-2 focus:ring-offset-1
                      `}
                    />
                    <Label htmlFor="remember" className={`
                      text-sm cursor-pointer
                      ${isDark ? 'text-slate-400' : 'text-slate-600'}
                    `}>
                      Angemeldet bleiben
                    </Label>
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    className={`
                      w-full h-12 font-semibold rounded-xl transition-all duration-200 group
                      bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl
                    `}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Anmeldung läuft…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Anmelden
                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className={`
              text-sm
              ${isDark ? 'text-slate-500' : 'text-slate-400'}
            `}>
              Noch kein Konto?{" "}
              <a
                href="/register"
                className={`
                  font-medium transition-colors
                  ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}
                `}
              >
                Registrieren
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
