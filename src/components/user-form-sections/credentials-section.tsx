"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

interface CredentialsSectionProps {
  form: any;
}

export function CredentialsSection({ form }: CredentialsSectionProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <Label htmlFor="password" className="after:content-['*'] after:ml-0.5 after:text-destructive">Passwort</Label>
      <div className="relative">
        <Input
          id="password"
          type={showPassword ? "text" : "password"}
          {...form.register("password")}
          placeholder="Passwort"
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {form.formState.errors.password && (
        <p className="text-red-500 text-sm mt-1">{form.formState.errors.password.message}</p>
      )}
    </div>
  );
}
