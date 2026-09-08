"use client";

import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import type { UserRole } from "@prisma/client";

export type AppSessionUser = {
  id: string;
  role: UserRole;
  avatar: string | null;
  firmId: string | null;
  firmSlug: string;
  firmName: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export type AppSession = Session & {
  user: AppSessionUser;
};

export function useAppSession() {
  const { data: session, status } = useSession();
  return {
    session: session as AppSession | null,
    status,
  };
}