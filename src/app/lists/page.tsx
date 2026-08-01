import type { Metadata } from "next";
import AppShell from "@/components/tastestack/AppShell";
import ListsPage from "@/components/tastestack/ListsPage";

export const metadata: Metadata = {
  title: "Lists",
  description: "Curated collections of anime, manga, movies, TV, games, music and books.",
};

export default function Page() {
  return (
    <AppShell>
      <ListsPage />
    </AppShell>
  );
}
