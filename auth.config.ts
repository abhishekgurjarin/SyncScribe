import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible auth configuration.
 * This file is imported by proxy.ts (Next.js 16's middleware replacement)
 * and must NOT import any Node.js-only modules (like bcryptjs or Drizzle).
 */
export default {
  providers: [],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/editor");
      const isAuthPage = nextUrl.pathname.startsWith("/auth");

      if (isProtected && !isLoggedIn) {
        return Response.redirect(new URL("/auth/signin", nextUrl));
      }

      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
