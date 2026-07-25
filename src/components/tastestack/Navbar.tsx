"use client";

import { useAppStore, type View } from "@/store/app-store";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const { view, setView, setViewProfileUsername } = useAppStore();
  const { data: session, status } = useSession();

  const navLink = (target: View, label: string) => (
    <button
      onClick={() => setView(target)}
      className={`text-sm font-medium transition-colors ${view === target ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
    >
      {label}
    </button>
  );

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
        <button onClick={() => setView("landing")} className="text-xl font-extrabold tracking-tight text-primary">
          Taste<span className="text-foreground">Stack</span>
        </button>

        <div className="hidden md:flex items-center gap-5">
          {navLink("discover", "Discover")}
          {session && navLink("feed", "Feed")}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {status === "loading" ? (
            <span className="text-muted-foreground text-sm">…</span>
          ) : session?.user ? (
            <>
              <button
                onClick={() => { setViewProfileUsername(session.user.username); setView("public-profile"); }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                @{session.user.username}
              </button>
              {navLink("settings", "Settings")}
              <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setView("login")}>Login</Button>
              <Button size="sm" onClick={() => setView("signup")}>Sign up</Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
