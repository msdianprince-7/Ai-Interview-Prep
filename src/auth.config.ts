import type { NextAuthConfig } from "next-auth"

/**
 * Edge-safe half of the auth config: session strategy, pages and callbacks,
 * but no providers. The Credentials provider pulls in Prisma and bcrypt, which
 * cannot run in the Edge runtime that middleware uses. Middleware only needs
 * to verify the JWT, so this subset is enough there, while `src/auth.ts`
 * extends it with the provider for the Node runtime.
 */
export const authConfig = {
  // Auth.js v5 renamed the v4 environment variables. Reading both keeps
  // existing deployments working; without a resolved secret the JWT cannot be
  // verified and every request is treated as anonymous.
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  // Required off Vercel: v5 rejects requests whose Host header it cannot
  // verify, which otherwise surfaces as an UntrustedHost error on every
  // session lookup behind a proxy or on a non-default port.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (token) session.user.id = token.id as string
      return session
    },
  },
} satisfies NextAuthConfig
