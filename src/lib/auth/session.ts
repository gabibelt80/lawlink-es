import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./options";
import type { Session } from "next-auth";
import type { UserRole } from "@prisma/client";

export type AppSession = Session & {
  user: {
    id: string;
    role: UserRole;
    avatar: string | null;
    firmId: string | null;
    firmSlug: string;
    firmName: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }
};

/**
 * Server Component / Server Action para leer la sesión actual.
 * Devuelve null si no hay sesión iniciada.
 */
export async function getSession(): Promise<AppSession | null> {
  return getServerSession(authOptions) as Promise<AppSession | null>;
}

/**
 * Requiere sesión iniciada. Si no hay sesión, redirige a /login.
 * Usar en Server Components / Server Actions.
 */
export async function requireSession(): Promise<AppSession> {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}