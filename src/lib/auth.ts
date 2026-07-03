import { type AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { hashForAudit } from "./crypto";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "2FA Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        const logFail = async (reason: string) => {
          await prisma.auditLog.create({ data: { userId: user?.id ?? null, action: "LOGIN_FAILED", metadata: { reason } } });
        };
        if (!user || !user.passwordHash) { await logFail("invalid_credentials"); return null; }
        if (user.status === "DISABLED") { await logFail("account_disabled"); return null; }
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) { await logFail("invalid_credentials"); return null; }
        if (user.twoFactorEnabled) {
          if (!credentials.totpCode) throw new Error("2FA_REQUIRED");
          const { authenticator } = await import("otplib/preset-default");
          if (!authenticator.verify({ token: credentials.totpCode, secret: user.twoFactorSecret || "" })) {
            await logFail("invalid_2fa_code"); return null;
          }
        }
        await prisma.auditLog.create({ data: { userId: user.id, action: "LOGIN_SUCCESS" } });
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.id = (user as any).id; token.role = (user as any).role; }
      // Always refresh role from DB so SQL updates take effect without re-login
      if (token.id) {
        const fresh = await prisma.user.findUnique({ where: { id: token.id as string }, select: { role: true, status: true } });
        if (fresh) token.role = fresh.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      await prisma.auditLog.create({ data: { userId: token?.id as string, action: "LOGOUT" } }).catch(() => {});
    },
  },
};

export function auditIpHash(ip: string | null | undefined): string | null {
  return ip ? hashForAudit(ip) : null;
}
