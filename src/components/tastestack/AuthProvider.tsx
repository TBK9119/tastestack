"use client";

import { useSession, SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";

export const SESSION_STATUS = { current: "loading" as string };

export function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { setUser, setLoading } = useAppStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    SESSION_STATUS.current = status;
    if (status === "authenticated" && session?.user) {
      setUser({
        id: session.user.id,
        email: session.user.email,
        username: session.user.username,
        displayName: session.user.displayName,
      });
      // Signed-in visitors landing on the marketing homepage go straight to
      // their Discover feed instead — same behaviour as before, just driven
      // by the real URL now instead of an in-memory "view" flag.
      if (pathname === "/") router.replace("/discover");
    } else if (status === "unauthenticated") {
      setUser(null);
    }
    if (status !== "loading") setLoading(false);
  }, [session, status, setUser, setLoading, pathname, router]);

  return <>{children}</>;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  );
}
