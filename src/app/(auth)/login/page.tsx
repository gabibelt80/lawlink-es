import { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { Scale, ShieldCheck, Sparkles, Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Iniciar Sesión — LawLink",
};

export default function LoginPage() {
  return (
    <div className="grid w-full max-w-5xl grid-cols-1 gap-0 lg:grid-cols-2">
      {/* Izquierda: área de marca */}
      <div className="hidden flex-col justify-between rounded-l-lg border border-r-0 border-border bg-muted/30 p-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Scale className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight">LawLink</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              Gestión Legal
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <div className="text-xs text-primary">
              {new Date().getFullYear()}
            </div>
            <h2 className="text-2xl font-semibold leading-snug tracking-tight">
              Enfocate en los casos,
              <br />
              no en los formularios.
            </h2>
            <div className="h-[2px] w-8 bg-primary rounded-full" />
          </div>

          <ul className="space-y-3.5 text-sm text-muted-foreground">
            <Feature icon={<ShieldCheck className="h-3.5 w-3.5" />}>
              Datos auto-gestionados, cifrado opcional, sin dependencia de SaaS
              externos
            </Feature>
            <Feature icon={<Sparkles className="h-3.5 w-3.5" />}>
              Cubre todo el flujo: recepción, conflicto de intereses, múltiples
              procedimientos, finanzas y archivo
            </Feature>
            <Feature icon={<Scale className="h-3.5 w-3.5" />}>
              Base de casos estandarizada (civil/comercial, penal,
              administrativa) para eliminar ambigüedades
            </Feature>
          </ul>
        </div>

        <div className="text-[11px] text-muted-foreground/70">
          Licencia MIT · Auto-hospedado
        </div>
      </div>

      {/* Derecha: tarjeta de inicio de sesión */}
      <div className="flex flex-col justify-center rounded-lg border border-border bg-card p-10 lg:rounded-l-none">
        <div className="mb-8">
          <div className="text-xs text-muted-foreground">Iniciar Sesión</div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">
            Bienvenido
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Ingresá con tu email de trabajo
          </p>
        </div>

        <Suspense fallback={<LoginFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex h-40 items-center justify-center text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
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
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}
