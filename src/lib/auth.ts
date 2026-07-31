import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await db.user.findUnique({ where: { email: credentials.email.toLowerCase() } });
        if (!user) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.displayName = user.displayName;
      }
      // Client calls useSession().update() after a profile edit (see
      // SettingsPage) to force this branch, so username/displayName
      // changes show up immediately instead of waiting for the next login.
      // Deliberately NOT syncing avatarUrl here — it can be a sizeable
      // base64 image now, and the JWT lives in a cookie sent on every
      // request, so keep the session payload small and have anything that
      // needs to render an avatar fetch it from the DB directly instead.
      if (trigger === "update" && token.id) {
        const fresh = await db.user.findUnique({ where: { id: token.id as string } });
        if (fresh) {
          token.username = fresh.username;
          token.displayName = fresh.displayName;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.displayName = token.displayName as string;
      }
      return session;
    },
  },
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      username: string;
      displayName: string;
    };
  }
  interface User {
    id: string;
    email: string;
    username: string;
    displayName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    displayName: string;
  }
}
