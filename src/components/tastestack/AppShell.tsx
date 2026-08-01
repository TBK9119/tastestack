import Navbar from "@/components/tastestack/Navbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>TasteStack — Track everything you love.</p>
          <div className="flex gap-4">
            <span>Anime & Manga via AniList</span>
            <span>Books via OpenLibrary</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
