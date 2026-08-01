import type { Metadata } from "next";
import AppShell from "@/components/tastestack/AppShell";
import FeedPage from "@/components/tastestack/FeedPage";

export const metadata: Metadata = {
  title: "Feed",
  description: "Activity from people whose taste you follow on TasteStack.",
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <AppShell>
      <FeedPage />
    </AppShell>
  );
}
