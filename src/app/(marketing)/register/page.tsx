"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MarketingFooter } from "@/components/marketing-footer";
import {
  Building2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Loader2,
  Zap,
  Shield,
  Globe,
  Headphones,
} from "lucide-react";

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "€29",
    description: "Bis 5 Benutzer, 1.000 Aufträge/Monat",
    highlighted: false,
    features: ["Einsatzplanung", "Zeiterfassung", "E-Mail Support"],
  },
  {
    id: "professional",
    name: "Professional",
    price: "€79",
    description: "Bis 25 Benutzer, API, Priority Support",
    highlighted: true,
    features: ["Alles von Starter", "API-Zugang", "Erweiterte Berichte", "Multi-Standort"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "€199",
    description: "Unbegrenzt, SSO, Dedizierter Support",
    highlighted: false,
    features: ["Alles von Professional", "SSO-Integration", "Dedizierter Support", "SLA-Garantie"],
  },
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

function RegisterForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = searchParams.get("plan") || "professional";

  const [formData, setFormData] = useState({
    companyName: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    plan: initialPlan,
    agbAccepted: false,
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [step, setStep] = useState<"plan" | "account">("plan");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          router.push("/dashboard");
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [router, supabase.auth]);

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePlanSelect = (planId: string) => {
    updateField("plan", planId);
    setStep("account");
  };

  const validateForm = (): string | null => {
    if (!formData.companyName.trim()) {
      return "Bitte geben Sie Ihren Firmennamen ein.";
    }
    if (!formData.firstName.trim()) {
      return "Bitte geben Sie Ihren Vornamen ein.";
    }
    if (!formData.lastName.trim()) {
      return "Bitte geben Sie Ihren Nachnamen ein.";
    }
    if (!formData.email.trim()) {
      return "Bitte geben Sie Ihre E-Mail-Adresse ein.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return "Bitte geben Sie eine gültige E-Mail-Adresse ein.";
    }
    if (formData.password.length < 8) {
      return "Das Passwort muss mindestens 8 Zeichen lang sein.";
    }
    if (formData.password !== formData.confirmPassword) {
      return "Die Passwörter stimmen nicht überein.";
    }
    if (!formData.agbAccepted) {
      return "Bitte akzeptieren Sie die AGB und Datenschutzerklärung.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            company_name: formData.companyName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error("User creation failed");
      }

      const slug = generateSlug(formData.companyName);
      const tenantResponse = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name: formData.companyName,
          plan: formData.plan,
          settings: {
            limits: {
              max_users: formData.plan === "starter" ? 5 : formData.plan === "professional" ? 25 : 999,
              max_orders_per_month: formData.plan === "starter" ? 1000 : -1,
            },
          },
        }),
      });

      if (!tenantResponse.ok) {
        const tenantError = await tenantResponse.json();
        console.error("Tenant creation error:", tenantError);
      }

      toast.success("Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail-Adresse.");
      router.push(`/register/confirmation?email=${encodeURIComponent(formData.email)}`);
    } catch (error: unknown) {
      console.error("Registration error:", error);
      const errorMessage = error instanceof Error ? error.message : "Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (fieldName: string) =>
    `h-12 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white ${
      focusedField === fieldName
        ? "border-blue-500 ring-4 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20"
        : "hover:border-slate-400 dark:hover:border-slate-600"
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900">
      {/* Header */}
      <header className="relative p-4 sm:p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Zurück zur Startseite</span>
        </Link>
      </header>

      {/* Main Content */}
      <div className="relative flex-1 flex items-center justify-center px-4 pb-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-3">
              <Image src="/logo.png" alt="ReinPlaner" width={48} height={48} className="rounded-xl" />
              <span className="text-2xl font-bold text-slate-900 dark:text-white">ReinPlaner</span>
            </Link>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className={`flex items-center gap-2 ${step === "plan" ? "text-[var(--accent-blue)] dark:text-[var(--accent-blue)]" : "text-emerald-600 dark:text-[var(--success)]"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === "account" ? "bg-[var(--success)] text-white" : "bg-[var(--accent-blue)] text-white"
              }`}>
                {step === "account" ? <CheckCircle2 className="w-5 h-5" /> : "1"}
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Plan wählen</span>
            </div>
            <div className="w-16 h-px bg-slate-300 dark:bg-slate-700" />
            <div className={`flex items-center gap-2 ${step === "account" ? "text-[var(--accent-blue)] dark:text-[var(--accent-blue)]" : "text-slate-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === "account" ? "bg-[var(--accent-blue)] text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
              }`}>
                2
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Konto erstellen</span>
            </div>
          </div>

          {/* Step 1: Plan Selection */}
          {step === "plan" && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-h1 text-slate-900 dark:text-white mb-2">WÄHLEN SIE IHREEN PLAN</h1>
                <p className="text-slate-600 dark:text-slate-200">Alle Pläne mit 14 Tage kostenlos testen</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handlePlanSelect(plan.id)}
                  className={`relative p-6 rounded-2xl text-left transition-all duration-300 ${
                    plan.highlighted
                      ? "bg-white dark:bg-slate-800 border-2 border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/30 dark:ring-2 dark:ring-blue-500/30 scale-105"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  } ${formData.plan === plan.id ? "ring-2 ring-blue-500" : ""}`}
                  >
                    {plan.highlighted && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--accent-blue)] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
                        Beliebt
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        plan.highlighted
                          ? "bg-[var(--accent-blue)] text-white"
                          : "bg-[var(--bg-muted)] dark:bg-slate-700 text-slate-600 dark:text-slate-200"
                      }` }>
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white text-lg">{plan.name}</h3>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{plan.price}<span className="text-sm font-normal text-slate-500 dark:text-slate-400">/Monat</span></p>
                      </div>
                    </div>

                    <p className="text-sm text-slate-500 dark:text-slate-300 mb-4">{plan.description}</p>

                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-[var(--success)] dark:text-[var(--success)] shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <div className="flex items-center text-sm font-medium text-[var(--accent-blue)] dark:text-[var(--accent-blue)]">
                      Auswählen <Sparkles className="w-4 h-4 ml-1" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Account Details */}
          {step === "account" && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-2xl">
              <div className="text-center mb-8">
                <h1 className="text-h2 text-slate-900 dark:text-white mb-2">KONTO ERSTELLEN</h1>
                <p className="text-slate-600 dark:text-slate-300">Geben Sie Ihre Firmen- und Kontodaten ein</p>
              </div>

              {/* Why ReinPlaner Benefits */}
              <div className="grid grid-cols-3 gap-4 mb-8 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-2">
                    <Zap className="w-5 h-5 text-[var(--accent-blue)] dark:text-blue-400" />
                  </div>
                  <p className="text-xs font-medium text-slate-900 dark:text-white">5 Min. Setup</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Sofort einsatzbereit</p>
                </div>
                <div className="text-center border-x border-slate-200 dark:border-slate-600">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-2">
                    <Shield className="w-5 h-5 text-emerald-600 dark:text-[var(--success)]" />
                  </div>
                  <p className="text-xs font-medium text-slate-900 dark:text-white">DSGVO-konform</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Daten in Deutschland</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center mx-auto mb-2">
                    <Headphones className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <p className="text-xs font-medium text-slate-900 dark:text-white">Persönlicher Support</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Antwort in &lt;4 Std.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Selected Plan Badge */}
                <div className="flex items-center justify-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-blue-500/30">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-[var(--accent-blue)] text-[var(--accent-blue)] dark:text-white flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {plans.find((p) => p.id === formData.plan)?.name} Plan
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-200">
                      {plans.find((p) => p.id === formData.plan)?.price}/Monat
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep("plan")}
                    className="ml-auto text-sm text-[var(--accent-blue)] dark:text-[var(--accent-blue)] hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                  >
                    Ändern
                  </button>
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-sm font-semibold text-slate-700 dark:text-slate-200 ml-1">
                    Firmenname
                  </Label>
                  <div className="relative">
                    <Building2 className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
                      focusedField === "companyName" ? "text-blue-500 dark:text-[var(--accent-blue)]" : "text-slate-400 dark:text-slate-500"
                    }`} />
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="Müller Gebäudereinigung GmbH"
                      value={formData.companyName}
                      onChange={(e) => updateField("companyName", e.target.value)}
                      onFocus={() => setFocusedField("companyName")}
                      onBlur={() => setFocusedField(null)}
                      required
                      className={`pl-12 ${inputClass("companyName")}`}
                    />
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-semibold text-slate-700 dark:text-slate-200 ml-1">
                      Vorname
                    </Label>
                    <div className="relative">
                      <User className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
                        focusedField === "firstName" ? "text-blue-500 dark:text-[var(--accent-blue)]" : "text-slate-400 dark:text-slate-500"
                      }`} />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="Max"
                        value={formData.firstName}
                        onChange={(e) => updateField("firstName", e.target.value)}
                        onFocus={() => setFocusedField("firstName")}
                        onBlur={() => setFocusedField(null)}
                        required
                        className={`pl-12 ${inputClass("firstName")}`}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-semibold text-slate-700 dark:text-slate-200 ml-1">
                      Nachname
                    </Label>
                    <div className="relative">
                      <User className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
                        focusedField === "lastName" ? "text-blue-500 dark:text-[var(--accent-blue)]" : "text-slate-400 dark:text-slate-500"
                      }`} />
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Mustermann"
                        value={formData.lastName}
                        onChange={(e) => updateField("lastName", e.target.value)}
                        onFocus={() => setFocusedField("lastName")}
                        onBlur={() => setFocusedField(null)}
                        required
                        className={`pl-12 ${inputClass("lastName")}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-700 dark:text-slate-200 ml-1">
                    E-Mail-Adresse
                  </Label>
                  <div className="relative">
                    <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
                      focusedField === "email" ? "text-blue-500 dark:text-[var(--accent-blue)]" : "text-slate-400 dark:text-slate-500"
                    }`} />
                    <Input
                      id="email"
                      type="email"
                      placeholder="max@mueller-reinigung.de"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      required
                      className={`pl-12 ${inputClass("email")}`}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-semibold text-slate-700 dark:text-slate-200 ml-1">
                      Passwort
                    </Label>
                    <div className="relative">
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
                        focusedField === "password" ? "text-blue-500 dark:text-[var(--accent-blue)]" : "text-slate-400 dark:text-slate-500"
                      }`} />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 8 Zeichen"
                        value={formData.password}
                        onChange={(e) => updateField("password", e.target.value)}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => setFocusedField(null)}
                        required
                        minLength={8}
                        className={`pl-12 pr-12 ${inputClass("password")}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${
                          focusedField === "password" ? "text-blue-500 dark:text-[var(--accent-blue)]" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
                        }`}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700 dark:text-slate-200 ml-1">
                      Passwort bestätigen
                    </Label>
                    <div className="relative">
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
                        focusedField === "confirmPassword" ? "text-blue-500 dark:text-[var(--accent-blue)]" : "text-slate-400 dark:text-slate-500"
                      }`} />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Passwort wiederholen"
                        value={formData.confirmPassword}
                        onChange={(e) => updateField("confirmPassword", e.target.value)}
                        onFocus={() => setFocusedField("confirmPassword")}
                        onBlur={() => setFocusedField(null)}
                        required
                        minLength={8}
                        className={`pl-12 pr-12 ${inputClass("confirmPassword")}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${
                          focusedField === "confirmPassword" ? "text-blue-500 dark:text-[var(--accent-blue)]" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
                        }`}
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* AGB Checkbox */}
                <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Checkbox
                    id="agb"
                    checked={formData.agbAccepted}
                    onCheckedChange={(checked) => updateField("agbAccepted", checked as boolean)}
                    className="mt-0.5 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                  />
                  <Label htmlFor="agb" className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed cursor-pointer">
                    Ich akzeptiere die{" "}
                    <Link href="/agb" className="text-[var(--accent-blue)] dark:text-[var(--accent-blue)] hover:underline">AGB</Link>{" "}
                    und die{" "}
                    <Link href="/datenschutz" className="text-[var(--accent-blue)] dark:text-[var(--accent-blue)] hover:underline">Datenschutzerklärung</Link>.
                  </Label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-14 font-semibold rounded-xl btn-primary text-base btn-pulse"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Konto wird erstellt…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      14 Tage kostenlos testen
                    </span>
                  )}
                </Button>

                {/* Login Link */}
                <p className="text-center text-sm text-slate-600 dark:text-slate-200">
                  Bereits ein Konto?{" "}
                  <Link href="/login" className="text-[var(--accent-blue)] dark:text-[var(--accent-blue)] hover:underline font-medium">Jetzt anmelden</Link>
                </p>
              </form>
            </div>
          )}

          {/* Trust Badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-200">
              <Shield className="w-4 h-4 text-[var(--success)] dark:text-[var(--success)]" />
              <span>DSGVO-konform</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-200">
              <Globe className="w-4 h-4 text-blue-500 dark:text-[var(--accent-blue)]" />
              <span>Made in Germany</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-[var(--success)] dark:text-[var(--success)]" />
              <span>Keine Kreditkarte nötig</span>
            </div>
          </div>
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}

function RegisterLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-slate-600 dark:text-slate-200">Laden...</p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterLoading />}>
      <RegisterForm />
    </Suspense>
  );
}
