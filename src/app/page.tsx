"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AppShell from "@/components/tastestack/AppShell";
import LandingPage from "@/components/tastestack/LandingPage";

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/discover");
  }, [status, router]);

  // Signed-in visitors get bounced to /discover above — render nothing for
  // the brief moment that takes rather than flashing the landing page.
  if (status === "authenticated") return null;

  return (
    <AppShell>
      <LandingPage />
    </AppShell>
  );
}
