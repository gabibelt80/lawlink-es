import Link from "next/link";
import { Scale } from "lucide-react";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-200">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700">
              <Scale className="h-4 w-4 text-white" strokeWidth={1.8} />
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              JURIDICTAS
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Volver al inicio
          </Link>
        </div>
      </nav>

      {/* Content */}
      <article className="prose prose-slate mx-auto max-w-3xl px-6 py-12 prose-headings:tracking-tight prose-headings:text-slate-900 prose-p:text-slate-600 prose-strong:text-slate-900 prose-li:text-slate-600">
        {children}
      </article>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 px-6 py-6 sm:flex-row">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} JURIDICTAS. Todos los derechos reservados.
          </p>
          <div className="flex gap-4 text-xs text-slate-500">
            <Link href="/terminos" className="hover:text-slate-900">
              Términos
            </Link>
            <Link href="/privacidad" className="hover:text-slate-900">
              Privacidad
            </Link>
            <a href="mailto:contacto@juridictas.ar" className="hover:text-slate-900">
              Contacto
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
