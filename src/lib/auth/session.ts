import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./options";
import type { Session } from "next-auth";
import type { UserRole } from "@prisma/client";

export type AppSessionUser = {
  id: string;
  role: UserRole;
  avatar: string | null;
  firmId: string | null;
  firmSlug: string;
  firmName: string;
  isSystemAdmin: boolean;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export type AppSession = Session & {
  user: AppSessionUser;
};

export async function getSession(): Promise<AppSession | null> {
  const s = await getServerSession(authOptions);
  return s as AppSession | null;
}

export async function requireSession(): Promise<AppSession> {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}
