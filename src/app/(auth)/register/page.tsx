import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { RegisterForm } from "./_components/register-form";
import { Scale } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Crear cuenta · JURIDICTAS",
  description: "Creá tu estudio jurídico en JURIDICTAS. 14 días gratis, sin tarjeta.",
};

export default async function RegisterPage() {
  const session = await getSession();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-indigo-200/30 blur-3xl" />

      {/* Nav */}
      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-500/30">
            <Scale className="h-5 w-5 text-white" strokeWidth={1.8} />
          </div>
          <span className="text-xl font-semibold tracking-tight text-slate-900">
            JURIDICTAS
          </span>
        </Link>
        <Link
          href="/login"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Iniciar sesión
        </Link>
      </nav>

      {/* Formulario */}
      <div className="relative z-10 flex min-h-[calc(100vh-88px)] items-center justify-center px-4 pb-12">
        <RegisterForm />
      </div>
    </div>
  );
}
