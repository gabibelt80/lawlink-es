"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, Building2, ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerFirm } from "@/server/tenant/actions";

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [form, setForm] = useState({
    firmName: "",
    firmEmail: "",
    userName: "",
    userEmail: "",
    password: "",
    confirmPassword: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (form.password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (!acceptedTerms) {
      toast.error("Debés aceptar los términos y condiciones");
      return;
    }

    startTransition(async () => {
      try {
        await registerFirm({
          firmName: form.firmName,
          firmEmail: form.firmEmail,
          userName: form.userName,
          userEmail: form.userEmail,
          password: form.password,
        });

        toast.success("¡Estudio creado! Iniciando sesión...");

        // Auto-login después del registro
        const res = await signIn("credentials", {
          email: form.userEmail,
          password: form.password,
          redirect: false,
        });

        if (res?.ok) {
          router.push("/dashboard");
          router.refresh();
        } else {
          // Si falla el auto-login, redirigir al login manual
          router.push(`/login?email=${encodeURIComponent(form.userEmail)}`);
        }
      } catch (err) {
        toast.error("Error al registrarse", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <div className="w-full max-w-lg">
      {/* Badge trial */}
      <div className="mb-5 flex items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          <Sparkles className="h-3.5 w-3.5" />
          14 días gratis · Sin tarjeta
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-500/20">
            <Building2 className="h-5 w-5 text-white" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Crear tu estudio jurídico
            </h1>
            <p className="text-xs text-muted-foreground">
              Configurá tu cuenta en menos de 2 minutos
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre del estudio</Label>
            <Input
              value={form.firmName}
              onChange={(e) => setForm({ ...form, firmName: e.target.value })}
              placeholder="Ej.: Estudio Pérez & Asociados"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Email del estudio</Label>
            <Input
              type="email"
              value={form.firmEmail}
              onChange={(e) => setForm({ ...form, firmEmail: e.target.value })}
              placeholder="contacto@estudio.com"
              required
              disabled={isPending}
            />
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Tu cuenta de administrador
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Tu nombre</Label>
              <Input
                value={form.userName}
                onChange={(e) => setForm({ ...form, userName: e.target.value })}
                placeholder="Ej.: Juan Pérez"
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tu email</Label>
              <Input
                type="email"
                value={form.userEmail}
                onChange={(e) => setForm({ ...form, userEmail: e.target.value })}
                placeholder="juan@estudio.com"
                required
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Contraseña</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Confirmar contraseña</Label>
              <Input
                type="password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
                placeholder="Repetí la contraseña"
                required
                minLength={8}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="flex items-start gap-2 pt-2">
            <input
              type="checkbox"
              id="terms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border"
              disabled={isPending}
            />
            <label htmlFor="terms" className="text-xs text-muted-foreground">
              Acepto los{" "}
              <Link href="/terminos" className="text-primary hover:underline">
                Términos de servicio
              </Link>{" "}
              y la{" "}
              <Link href="/privacidad" className="text-primary hover:underline">
                Política de privacidad
              </Link>
            </label>
          </div>

          <Button
            type="submit"
            disabled={isPending || !acceptedTerms}
            className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-800"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? "Creando tu estudio..." : "Crear estudio gratis"}
          </Button>

          <ul className="space-y-1.5 pt-2">
            <Benefit>14 días sin costo</Benefit>
            <Benefit>Configuración inicial automática</Benefit>
            <Benefit>Soporte en español</Benefit>
          </ul>

          <div className="flex items-center justify-center pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Ya tengo cuenta, iniciar sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function Benefit({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-xs text-muted-foreground">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      {children}
    </li>
  );
}
