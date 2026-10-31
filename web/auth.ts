import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma";
import { rateLimit, clearAttempts } from "./lib/rate-limit";
import { verifySecondFactor } from "./lib/mfa-login";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token?.userId) (session as any).userId = token.userId;
      return session;
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mfaToken: { label: "MFA code", type: "text" },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;
        if (!(await rateLimit(`login:${email}`, 5, 60_000))) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        // MFA gate: for enabled accounts a valid second factor is required
        // before a session can be created.
        if (user.mfaEnabled) {
          const token = String(creds?.mfaToken ?? "");
          const secondOk = await verifySecondFactor(user.id, user.mfaSecret, token);
          if (!secondOk) return null;
        }
        await clearAttempts(`login:${email}`);
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});