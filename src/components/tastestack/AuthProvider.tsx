"use client";

import { useSession, SessionProvider } from "next-auth/react";
import { useEffect, useState } from "react";
import { useAppStore } from "@/store/app-store";

export const SESSION_STATUS = { current: "loading" as string };

export function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { setUser, setLoading, view, setView } = useAppStore();

  useEffect(() => {
    SESSION_STATUS.current = status;
    if (status === "authenticated" && session?.user) {
      setUser({
        id: session.user.id,
        email: session.user.email,
        username: session.user.username,
        displayName: session.user.displayName,
        avatarUrl: session.user.avatarUrl,
      });
      if (view === "landing") setView("discover");
    } else if (status === "unauthenticated") {
      setUser(null);
      if (["settings", "lists", "feed", "profile"].includes(view)) setView("landing");
    }
    if (status !== "loading") setLoading(false);
  }, [session, status, setUser, setLoading, view, setView]);

  return <>{children}</>;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider><AuthProviderInner>{children}</AuthProviderInner></SessionProvider>;
}
