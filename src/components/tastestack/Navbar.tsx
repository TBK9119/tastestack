"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileSearch from "@/components/tastestack/ProfileSearch";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Server has no concept of the person's theme preference, so render a
  // blank placeholder until mounted client-side to avoid a hydration mismatch.
  if (!mounted) return <div className="h-9 w-9" />;
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} title="Toggle theme">
      {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors ${pathname === href ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
        <Link href={session ? "/discover" : "/"} className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-primary">
          <img src="/logo.svg" alt="" width={24} height={24} className="shrink-0" />
          Taste<span className="text-foreground">Stack</span>
        </Link>

        <div className="hidden md:flex items-center gap-5">
          {navLink("/discover", "Discover")}
          {session && navLink("/feed", "Feed")}
          {session && navLink("/lists", "Lists")}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <ProfileSearch />
          <ThemeToggle />
          {status === "loading" ? (
            <span className="text-muted-foreground text-sm">…</span>
          ) : session?.user ? (
            <>
              <Link href={`/profile/${session.user.username}`} className="text-sm text-muted-foreground hover:text-foreground">
                @{session.user.username}
              </Link>
              {navLink("/settings", "Settings")}
              <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" asChild><Link href="/login">Login</Link></Button>
              <Button size="sm" asChild><Link href="/signup">Sign up</Link></Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
