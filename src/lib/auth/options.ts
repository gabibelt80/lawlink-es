import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTenantPrisma } from "@/lib/tenant";
import { audit } from "@/server/audit";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 }, // 12h
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "Email y contraseña",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Buscar en el schema central
        const firmUser = await prisma.firmUser.findUnique({
          where: { email: parsed.data.email },
          include: { firm: true }
        });
        if (!firmUser || !firmUser.active || !firmUser.firm?.active) {
          return null;
        }

        const matches = await bcrypt.compare(parsed.data.password, firmUser.passwordHash);
        if (!matches) {
          return null;
        }

        // Actualizar último inicio de sesión
        prisma.firmUser.update({
          where: { id: firmUser.id },
          data: { lastLoginAt: new Date() }
        }).catch(() => {});

        return {
          id: firmUser.id,
          name: firmUser.name,
          email: firmUser.email,
          role: "ADMIN",
          avatar: firmUser.avatar,
          firmId: firmUser.firmId,
          firmSlug: firmUser.firm.slug,
          firmName: firmUser.firm.name,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.avatar = user.avatar;
        token.firmId = user.firmId;
        token.firmSlug = user.firmSlug;
        token.firmName = user.firmName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.avatar = token.avatar as string | null;
        session.user.firmId = token.firmId as string;
        session.user.firmSlug = token.firmSlug as string;
        session.user.firmName = token.firmName as string;
      }
      return session;
    }
  },
  events: {
    async signIn({ user }) {
      // No auditar en schema central para evitar complejidad
    },
    async signOut({ token }) {
      // No auditar en schema central
    }
  }
};