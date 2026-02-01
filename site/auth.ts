import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const railBaseUrl =
  process.env.NEXT_PUBLIC_RAIL_BASE?.trim() || "https://go.suqram.com";
const syncSecret = process.env.SYNC_USER_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const path = nextUrl.pathname;
      const isApp = path === "/app" || path.startsWith("/app/");
      if (isApp && !auth) return false;
      return true;
    },
    async signIn({ user, account }) {
      if (!user?.email) return true;
      if (!syncSecret || !syncSecret.trim()) return true;
      try {
        const res = await fetch(`${railBaseUrl.replace(/\/$/, "")}/app/sync-user`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${syncSecret.trim()}`,
          },
          body: JSON.stringify({
            email: user.email,
            name: user.name ?? null,
            provider: account?.provider ?? "google",
          }),
        });
        if (!res.ok) {
          console.error("[auth] sync-user failed", res.status, await res.text());
        }
      } catch (e) {
        console.error("[auth] sync-user error", e);
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl + "/app";
    },
  },
  trustHost: true,
});
