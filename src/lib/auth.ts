// src/lib/auth.ts
import { type AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { hashForAudit } from "./crypto";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
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
        // Submitted only on the second step of login if 2FA is enabled
        totpCode: { label: "2FA Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        // Audit every login attempt without leaking whether the email exists
        const logFailure = async (reason: string) => {
          await prisma.auditLog.create({
            data: {
              userId: user?.id ?? null,
              action: "LOGIN_FAILED",
              metadata: { reason },
            },
          });
        };

        if (!user || !user.passwordHash) {
          await logFailure("invalid_credentials");
          return null;
        }

        if (user.status === "DISABLED") {
          await logFailure("account_disabled");
          return null;
        }

        const passwordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!passwordValid) {
          await logFailure("invalid_credentials");
          return null;
        }

        if (user.twoFactorEnabled) {
          // Caller must supply a valid TOTP code; verification happens in
          // /api/auth/2fa/verify before this provider is invoked a second
          // time with a short-lived verified flag. Here we defensively
          // re-check via the totpCode field if provided.
          if (!credentials.totpCode) {
            // Signal to the frontend that 2FA is required without
            // authenticating the session yet.
            throw new Error("2FA_REQUIRED");
          }

          const { authenticator } = await import("otplib");
          const isValidToken = authenticator.verify({
            token: credentials.totpCode,
            secret: user.twoFactorSecret || "",
          });

          if (!isValidToken) {
            await logFailure("invalid_2fa_code");
            return null;
          }
        }

        await prisma.auditLog.create({
          data: { userId: user.id, action: "LOGIN_SUCCESS" },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = (user as any).id;
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
      await prisma.auditLog.create({
        data: { userId: token?.id as string, action: "LOGOUT" },
      });
    },
  },
};

// Helper used by API routes to hash request IPs before storing in audit logs
export function auditIpHash(ip: string | null | undefined): string | null {
  return ip ? hashForAudit(ip) : null;
}
