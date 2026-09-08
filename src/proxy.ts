import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get("next-auth.session-token");
  
  if (!sessionCookie && !request.nextUrl.pathname.startsWith("/login")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  if (sessionCookie && request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|api/health|api/calendar|_next|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)).*)"
  ]
};

