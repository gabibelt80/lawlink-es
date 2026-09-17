"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { AppSession } from "@/lib/auth/use-app-session";

const schema = z.object({
  email: z.string().email("Ingresá un email válido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    setAuthError(null);
    const res = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (!res?.ok) {
      setAuthError("Email o contraseña incorrectos");
      return;
    }

    const session = (await getSession()) as AppSession | null;
    const isSystemAdmin = session?.user?.isSystemAdmin === true;

    if (callbackUrl && callbackUrl !== "/") {
      router.push(callbackUrl);
    } else if (isSystemAdmin) {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <form
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
      noValidate
    >
      {authError ? (
        <Alert
          variant="destructive"
          className="border-destructive/30 bg-destructive/5"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      ) : null}

      {/* Email */}
      <div className="space-y-2">
        <Label
          htmlFor="email"
          className="text-[12.5px] font-medium text-foreground"
        >
          Email
        </Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="tu@email.com"
          aria-invalid={!!errors.email}
          className={cn(
            "ll-form-control h-11 rounded-md text-[13.5px]",
            errors.email && "border-destructive"
          )}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-[12px] text-destructive">{errors.email.message}</p>
        )}
      </div>

      {/* Contraseña */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="password"
            className="text-[12.5px] font-medium text-foreground"
          >
            Contraseña
          </Label>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            className={cn(
              "ll-form-control h-11 rounded-md pr-10 text-[13.5px]",
              errors.password && "border-destructive"
            )}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-[12px] text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Botón principal */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full gap-2 rounded-md text-[13.5px] font-medium shadow-[var(--shadow-glow)] transition-all hover:shadow-[0_2px_4px_rgba(0,123,127,0.20),0_12px_28px_rgba(0,123,127,0.22)]"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? "Iniciando sesión..." : "Iniciar sesión"}
      </Button>

      {/* Footer */}
      <p className="pt-1 text-center text-[12px] text-muted-foreground">
        ¿Olvidaste tu contraseña?{" "}
        <span className="text-foreground/70">Contactá al administrador</span>
      </p>
    </form>
  );
}
