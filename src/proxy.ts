import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Rutas públicas que no requieren autenticación.
 */
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/terminos",
  "/privacidad",
  "/precios",
  "/contacto",
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some(
    (p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`))
  );
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Decodificar el JWT de NextAuth (funciona con cookies httpOnly)
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;
  const role = token?.role as string | undefined;
  const isSystemAdmin = role === "SYSTEM_ADMIN";

  // Si ya está logueado y quiere entrar a login/register → redirige según rol
  if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
    const target = isSystemAdmin ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  // Si NO tiene sesión y la ruta no es pública → al login
  if (!isAuthenticated && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si es SYSTEM_ADMIN y va a /dashboard → redirige a /admin
  if (isSystemAdmin && pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|api/health|api/calendar|api/billing|_next|favicon.ico|favicon.svg|apple-touch-icon.png|web-app-manifest|site.webmanifest|brand|file-icons|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|json|xml|txt|webmanifest)).*)"
  ]
};
