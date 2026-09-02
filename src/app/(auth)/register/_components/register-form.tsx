"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Building2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerFirm } from "@/server/tenant/actions";

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
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
    startTransition(async () => {
      try {
        const result = await registerFirm({
          firmName: form.firmName,
          firmEmail: form.firmEmail,
          userName: form.userName,
          userEmail: form.userEmail,
          password: form.password,
        });
        toast.success("Estudio creado correctamente");
        router.push(`/login?email=${encodeURIComponent(form.userEmail)}`);
      } catch (err) {
        toast.error("Error al registrarse", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-high)]">
      <div className="mb-5 flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-semibold">Crear estudio jurídico</h1>
          <p className="text-xs text-muted-foreground">Registrate en Juridictas.ar</p>
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
          />
        </div>

        <div className="border-t border-border pt-4">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Administrador del estudio
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Tu nombre</Label>
          <Input
            value={form.userName}
            onChange={(e) => setForm({ ...form, userName: e.target.value })}
            placeholder="Ej.: Juan Pérez"
            required
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
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Contraseña</Label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Mínimo 8 caracteres"
            required
            minLength={8}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Confirmar contraseña</Label>
          <Input
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            placeholder="Repetí la contraseña"
            required
            minLength={8}
          />
        </div>

        <Button type="submit" disabled={isPending} className="w-full gap-1.5">
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Crear estudio
        </Button>

        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/login" className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-3 w-3" />
            Volver al login
          </Link>
        </div>
      </form>
    </div>
  );
}