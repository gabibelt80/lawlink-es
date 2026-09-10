import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  Scale,
  FolderOpen,
  Users,
  Wallet,
  Calendar,
  Bot,
  BookOpen,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export default async function LandingPage() {
  const session = await getSession();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50" />
      <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-indigo-200/30 blur-3xl" />

      <div className="relative z-10">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-500/30">
              <Scale className="h-5 w-5 text-white" strokeWidth={1.8} />
            </div>
            <span className="text-xl font-semibold tracking-tight text-slate-900">
              JURIDICTAS
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 sm:block"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Crear cuenta
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </nav>

        <section className="mx-auto max-w-6xl px-6 pb-16 pt-12 sm:pt-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                <Sparkles className="h-3.5 w-3.5" />
                Diseñado para abogados argentinos
              </div>
              <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Tu estudio jurídico,{" "}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  organizado.
                </span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600">
                Casos, clientes, finanzas, plazos, jurisprudencia e inteligencia artificial. Todo en un solo lugar, con la potencia que tu estudio necesita.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-blue-500/30 transition-transform hover:scale-[1.02]"
                >
                  Empezar gratis 14 días
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Ya tengo cuenta
                </Link>
              </div>

              <div className="mt-6 flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Sin tarjeta
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Cancelá cuando quieras
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10">
                <div className="flex items-center gap-1.5 px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                </div>
                <div className="space-y-3 rounded-xl bg-slate-50 p-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-white p-3 shadow-sm">
                      <div className="text-[10px] text-slate-500">Casos activos</div>
                      <div className="mt-1 text-xl font-bold text-slate-900">127</div>
                    </div>
                    <div className="rounded-lg bg-white p-3 shadow-sm">
                      <div className="text-[10px] text-slate-500">Audiencias</div>
                      <div className="mt-1 text-xl font-bold text-blue-600">8</div>
                    </div>
                    <div className="rounded-lg bg-white p-3 shadow-sm">
                      <div className="text-[10px] text-slate-500">Por cobrar</div>
                      <div className="mt-1 text-xl font-bold text-emerald-600">$2.4M</div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <div className="h-2 w-24 rounded bg-slate-200" />
                    <div className="mt-2 space-y-1.5">
                      <div className="h-1.5 w-full rounded bg-slate-100" />
                      <div className="h-1.5 w-4/5 rounded bg-slate-100" />
                      <div className="h-1.5 w-3/5 rounded bg-slate-100" />
                    </div>
                  </div>
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <div className="h-2 w-32 rounded bg-slate-200" />
                    <div className="mt-2 flex gap-1">
                      <div className="h-12 w-1/6 rounded bg-blue-200" />
                      <div className="h-8 w-1/6 rounded bg-blue-300" />
                      <div className="h-16 w-1/6 rounded bg-blue-400" />
                      <div className="h-10 w-1/6 rounded bg-blue-300" />
                      <div className="h-14 w-1/6 rounded bg-blue-500" />
                      <div className="h-12 w-1/6 rounded bg-blue-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Todo lo que tu estudio necesita
            </h2>
            <p className="mt-3 text-slate-600">
              Herramientas pensadas por y para abogados argentinos.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<FolderOpen className="h-5 w-5" />}
              title="Gestión de casos"
              description="Expedientes completos con etapas, plazos, audiencias, documentos y equipo."
            />
            <FeatureCard
              icon={<Users className="h-5 w-5" />}
              title="Clientes y contactos"
              description="Base de clientes con historial, conflictos, contratos y comunicaciones."
            />
            <FeatureCard
              icon={<Wallet className="h-5 w-5" />}
              title="Finanzas integradas"
              description="Honorarios, cobros, facturación, gastos y liquidaciones por caso."
            />
            <FeatureCard
              icon={<Calendar className="h-5 w-5" />}
              title="Agenda inteligente"
              description="Sincronizá con Google Calendar y no te pierdas ninguna audiencia."
            />
            <FeatureCard
              icon={<Bot className="h-5 w-5" />}
              title="IA jurídica"
              description="Análisis de escritos, resúmenes de expedientes y asistente legal."
            />
            <FeatureCard
              icon={<BookOpen className="h-5 w-5" />}
              title="Jurisprudencia"
              description="Base de fallos con búsqueda semántica y agentes de investigación."
            />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 sm:p-12">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-white">
                  Menos tiempo en papeles.
                  <br />
                  Más tiempo en estrategia.
                </h2>
                <p className="mt-4 text-slate-300">
                  Automatizá las tareas repetitivas y enfocate en lo que realmente importa: ganar casos.
                </p>
              </div>
              <ul className="space-y-4">
                <BenefitItem>Multi-sucursal y multi-usuario</BenefitItem>
                <BenefitItem>Backups automáticos diarios</BenefitItem>
                <BenefitItem>Cifrado de documentos sensibles</BenefitItem>
                <BenefitItem>Soporte en español</BenefitItem>
                <BenefitItem>Datos alojados en Argentina</BenefitItem>
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Empezá hoy, gratis.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-600">
            14 días de prueba sin tarjeta de crédito. Configurá tu estudio en menos de 5 minutos.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-3.5 text-sm font-medium text-white shadow-lg shadow-blue-500/30 transition-transform hover:scale-[1.02]"
            >
              Crear mi cuenta gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <footer className="border-t border-slate-200 bg-white/50">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Scale className="h-4 w-4" />
              <span>© 2026 JURIDICTAS. Todos los derechos reservados.</span>
            </div>
            <div className="flex gap-6 text-sm text-slate-500">
              <a href="mailto:contacto@juridictas.ar" className="hover:text-slate-900">
                Contacto
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 transition-transform group-hover:scale-110">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </div>
  );
}

function BenefitItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-slate-200">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
      </span>
      <span className="text-sm">{children}</span>
    </li>
  );
}
