import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { SessionRole } from "@/types/next-auth";

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
        maxAge: 30 * 24 * 60 * 60,
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Email y contrasena",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contrasena", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          console.error("[AUTH] 1 fail: schema invalido");
          return null;
        }

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            avatar: true,
            active: true,
          },
        });

        if (!user || !user.active) {
          console.error("[AUTH] 2 fail: user no existe o inactivo");
          return null;
        }

        const ok = await compare(password, user.passwordHash);
        if (!ok) {
          console.error("[AUTH] 3 fail: password incorrecta");
          return null;
        }

        // SYSTEM_ADMIN: sin firm, va al panel de plataforma
        if (user.role === "SYSTEM_ADMIN") {
          console.error("[AUTH] 5 OK: login SYSTEM_ADMIN", user.email);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            firmId: null,
            firmSlug: "",
            firmName: "",
            isSystemAdmin: true,
            avatar: user.avatar,
          };
        }

        // Usuario de estudio: resolver firm desde FirmUser
        const firmUser = await prisma.firmUser.findUnique({
          where: { email },
          select: {
            firmId: true,
            firm: { select: { slug: true, name: true } },
          },
        });

        if (!firmUser || !firmUser.firm) {
          console.error("[AUTH] 6 fail: firmUser no existe o no tiene firm");
          return null;
        }

        console.error("[AUTH] 7 OK: login firm", firmUser.firm.slug, user.email);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          firmId: firmUser.firmId,
          firmSlug: firmUser.firm.slug,
          firmName: firmUser.firm.name,
          isSystemAdmin: false,
          avatar: user.avatar,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.firmSlug = (user as any).firmSlug;
        token.isSystemAdmin = (user as any).isSystemAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).firmSlug = token.firmSlug;
        (session.user as any).isSystemAdmin = token.isSystemAdmin;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
