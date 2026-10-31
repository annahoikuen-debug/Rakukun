import type { NextAuthConfig } from "next-auth";

// Edge-safe base config (no Prisma/bcrypt/adapter) — used by middleware.
export const authConfig = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  useSecureCookies: true,
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token?.userId) (session as any).userId = token.userId;
      return session;
    },
  },
  pages: { signIn: "/signin" },
} satisfies NextAuthConfig;

export default authConfig;