"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function NavBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const linkClass = (href: string) =>
    `text-sm font-medium ${
      pathname === href
        ? "text-brand-500"
        : "text-ink-500 hover:text-ink-300"
    }`;

  return (
    <header className="sticky top-0 z-50 bg-ink-900/95 backdrop-blur border-b border-ink-800">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-[60px] flex items-center gap-6">
        <Link
          href="/"
          className="text-xl font-extrabold tracking-tight text-brand-500"
        >
          Taste<span className="text-ink-300">Stack</span>
        </Link>

        <div className="hidden md:flex items-center gap-5">
          <Link href="/discover" className={linkClass("/discover")}>
            Discover
          </Link>
          {session && (
            <Link href="/dashboard" className={linkClass("/dashboard")}>
              Dashboard
            </Link>
          )}
          {session && (
            <Link href="/feed" className={linkClass("/feed")}>
              Feed
            </Link>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {status === "loading" ? (
            <span className="text-ink-600 text-sm">…</span>
          ) : session?.user ? (
            <>
              <Link
                href={`/u/${session.user.username}`}
                className="text-sm text-ink-400 hover:text-ink-300"
              >
                @{session.user.username}
              </Link>
              <Link href="/settings" className={linkClass("/settings")}>
                Settings
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="btn-secondary"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary">
                Login
              </Link>
              <Link href="/signup" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
