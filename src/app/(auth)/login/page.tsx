import { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "./login-form";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Iniciar Sesión — Juridictas",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background">
      {/* Fondo atmosférico: gradiente teal + blobs suaves */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 600px at 20% 0%, hsl(var(--primary-soft)) 0%, transparent 55%), radial-gradient(1000px 500px at 90% 100%, hsl(var(--primary-soft)) 0%, transparent 50%)",
        }}
      />

      {/* Blob decorativo superior derecho */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.20), transparent 65%)",
        }}
      />

      {/* Blob decorativo inferior izquierdo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-40 h-[24rem] w-[24rem] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.14), transparent 65%)",
        }}
      />

      {/* Grilla sutil de fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border) / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.5) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      {/* Card central */}
      <main className="login-fade-in relative z-10 mx-4 w-full max-w-[420px]">
        <div className="ll-form-card overflow-hidden p-8 sm:p-10">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div className="relative h-16 w-[220px]">
              <Image
                src="/brand/juridictas-logo-con-letras.jpg"
                alt="Juridictas"
                fill
                priority
                sizes="220px"
                className="object-contain"
              />
            </div>
          </div>

          {/* Encabezado */}
          <div className="mb-8 text-center">
            <h1 className="text-[22px] font-semibold leading-tight text-foreground">
              Bienvenido de nuevo
            </h1>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              Ingresá con tus credenciales para continuar
            </p>
          </div>

          {/* Formulario */}
          <Suspense fallback={<LoginFallback />}>
            <LoginForm />
          </Suspense>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[11.5px] text-muted-foreground">
          © {new Date().getFullYear()} Juridictas · Gestión legal inteligente
        </p>
      </main>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex h-40 items-center justify-center text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}
