import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Email y contraseña",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const firmUser = await prisma.firmUser.findUnique({
          where: { email },
          include: { firm: true },
        });

        if (!firmUser || !firmUser.active) return null;

        const ok = await compare(password, firmUser.passwordHash);
        if (!ok) return null;

    const isSystemAdmin = firmUser.firmId === null;

    // Buscar el rol real en el User del tenant (schema del firm)
    let role: string = isSystemAdmin ? "SYSTEM_ADMIN" : "LAWYER";
    if (!isSystemAdmin && firmUser.firm) {
      const { getTenantPrismaSync } = await import("@/lib/tenant-prisma");
      try {
        const tenantPrisma = getTenantPrismaSync(firmUser.firm.slug);
        const tenantUser = await tenantPrisma.user.findUnique({
          where: { email: firmUser.email },
          select: { role: true },
        });
        if (tenantUser?.role) role = tenantUser.role;
      } catch {
        // Si falla, cae al default LAWYER
      }
    }

    return {
      id: firmUser.id,
      email: firmUser.email,
      name: firmUser.name,
      role,
      firmId: firmUser.firmId,
      firmSlug: firmUser.firm?.slug ?? "",
      firmName: firmUser.firm?.name ?? "",
      isSystemAdmin,
      avatar: firmUser.avatar,
    };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.firmId = (user as any).firmId;
        token.firmSlug = (user as any).firmSlug;
        token.firmName = (user as any).firmName;
        token.isSystemAdmin = (user as any).isSystemAdmin;
        token.avatar = (user as any).avatar;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).firmId = token.firmId;
        (session.user as any).firmSlug = token.firmSlug;
        (session.user as any).firmName = token.firmName;
        (session.user as any).isSystemAdmin = token.isSystemAdmin;
        (session.user as any).avatar = token.avatar;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
