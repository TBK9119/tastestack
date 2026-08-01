import type { Metadata } from "next";
import AppShell from "@/components/tastestack/AppShell";
import DiscoverPage from "@/components/tastestack/DiscoverPage";

export const metadata: Metadata = {
  title: "Discover",
  description: "Find your next favourite anime, manga, movie, show, game, album, or book.",
};

export default function Page() {
  return (
    <AppShell>
      <DiscoverPage />
    </AppShell>
  );
}
