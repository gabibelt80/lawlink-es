import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTenantPrismaSync } from "@/lib/tenant-prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "Email y contrasena",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contrasena", type: "password" }
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const firmUser = await prisma.firmUser.findUnique({
          where: { email: parsed.data.email },
        });

        if (!firmUser || !firmUser.active) return null;

        const matches = await bcrypt.compare(parsed.data.password, firmUser.passwordHash);
        if (!matches) return null;

        // SYSTEM_ADMIN: firmId es null
        if (firmUser.firmId === null) {
          await prisma.firmUser.update({
            where: { id: firmUser.id },
            data: { lastLoginAt: new Date() }
          }).catch(() => {});

          return {
            id: firmUser.id,
            name: firmUser.name,
            email: firmUser.email,
            role: "SYSTEM_ADMIN" as const,
            avatar: firmUser.avatar,
            firmId: null as string | null,
            firmSlug: "",
            firmName: "Sistema",
          };
        }

        // Tenant admin: buscar el firm
        const firm = await prisma.firm.findUnique({
          where: { id: firmUser.firmId },
        });

        if (!firm || !firm.active) return null;

        await prisma.firmUser.update({
          where: { id: firmUser.id },
          data: { lastLoginAt: new Date() }
        }).catch(() => {});

        return {
          id: firmUser.id,
          name: firmUser.name,
          email: firmUser.email,
          role: "ADMIN" as const,
          avatar: firmUser.avatar,
          firmId: firmUser.firmId as string,
          firmSlug: firm.slug,
          firmName: firm.name,
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
        session.user.firmId = token.firmId as string | null;
        session.user.firmSlug = token.firmSlug as string;
        session.user.firmName = token.firmName as string;
      }
      return session;
    }
  }
};