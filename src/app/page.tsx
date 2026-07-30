"use client";

import dynamic from "next/dynamic";
import { useAppStore } from "@/store/app-store";
import AuthProvider from "@/components/tastestack/AuthProvider";
import Navbar from "@/components/tastestack/Navbar";

const LandingPage = dynamic(() => import("@/components/tastestack/LandingPage"), { ssr: false });
const LoginPage = dynamic(() => import("@/components/tastestack/LoginPage"), { ssr: false });
const SignupPage = dynamic(() => import("@/components/tastestack/SignupPage"), { ssr: false });
const DiscoverPage = dynamic(() => import("@/components/tastestack/DiscoverPage"), { ssr: false });
const ProfilePage = dynamic(() => import("@/components/tastestack/ProfilePage"), { ssr: false });
const FeedPage = dynamic(() => import("@/components/tastestack/FeedPage"), { ssr: false });
const SettingsPage = dynamic(() => import("@/components/tastestack/SettingsPage"), { ssr: false });
const ListsPage = dynamic(() => import("@/components/tastestack/ListsPage"), { ssr: false });

function AppContent() {
  const { view } = useAppStore();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">
        {view === "landing" && <LandingPage />}
        {view === "login" && <LoginPage />}
        {view === "signup" && <SignupPage />}
        {view === "discover" && <DiscoverPage />}
        {(view === "profile" || view === "public-profile") && <ProfilePage />}
        {view === "feed" && <FeedPage />}
        {view === "settings" && <SettingsPage />}
        {view === "lists" && <ListsPage />}
      </main>
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

export default function HomePage() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
