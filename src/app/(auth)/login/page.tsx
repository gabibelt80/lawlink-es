import { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { Scale, ShieldCheck, Sparkles, Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Iniciar Sesión — Juridictas",
};

export default function LoginPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-100">
      {/* Decoración de fondo */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-12">
        <div className="grid w-full grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl lg:grid-cols-2">
          {/* Izquierda: marca y beneficios */}
          <div className="hidden flex-col justify-between bg-gradient-to-br from-blue-600 to-indigo-700 p-10 lg:flex">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                <Scale className="h-5 w-5 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-xl font-semibold tracking-tight text-white">
                  Juridictas
                </div>
                <div className="text-xs text-white/70">
                  Gestión legal inteligente
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <h2 className="text-3xl font-semibold leading-snug tracking-tight text-white">
                  Tu estudio jurídico,
                  <br />
                  organizado.
                </h2>
                <p className="text-sm text-white/70">
                  Casos, clientes, finanzas y plazos. Todo en un solo lugar.
                </p>
              </div>

              <ul className="space-y-4">
                <Feature icon={<ShieldCheck className="h-4 w-4" />}>
                  Seguro y confidencial
                </Feature>
                <Feature icon={<Sparkles className="h-4 w-4" />}>
                  Automatizá tu flujo de trabajo
                </Feature>
                <Feature icon={<Scale className="h-4 w-4" />}>
                  Diseñado para abogados argentinos
                </Feature>
              </ul>
            </div>

            <div className="text-xs text-white/50">
              © {new Date().getFullYear()} Juridictas
            </div>
          </div>

          {/* Derecha: formulario */}
          <div className="flex flex-col justify-center p-8 sm:p-10">
            <div className="mb-6 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                  <Scale className="h-4 w-4 text-blue-600" strokeWidth={1.5} />
                </div>
                <div className="text-lg font-semibold tracking-tight text-slate-900">
                  Juridictas
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Bienvenido
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Ingresá con tu email de trabajo
              </p>
            </div>

            <Suspense fallback={<LoginFallback />}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex h-40 items-center justify-center text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

function Feature({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white">
        {icon}
      </span>
      <span className="text-sm text-white/90">{children}</span>
    </li>
  );
}