"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

interface UserResult {
  username: string;
  displayName: string;
  avatarUrl: string;
  bannerColor: string;
  _count: { items: number; followers: number };
}

export default function ProfileSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Cmd/Ctrl+K opens the search from anywhere, matching the pattern people
  // expect from Linear/Vercel/Raycast-style command palettes.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const handle = setTimeout(() => {
      fetch(`/api/search/users?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => setResults(Array.isArray(data.users) ? data.users : []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const goToProfile = useCallback((username: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/profile/${username}`);
  }, [router]);

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title="Search profiles (Ctrl+K)">
        <Search className="h-4 w-4" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search profiles" description="Find people on TasteStack by username or display name.">
        <CommandInput placeholder="Search by username or name…" value={query} onValueChange={setQuery} />
        <CommandList>
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <CommandEmpty>No profiles found for &quot;{query}&quot;.</CommandEmpty>
          )}
          {!searching && query.trim().length < 2 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Type at least 2 characters…</p>
          )}
          {searching && <p className="py-6 text-center text-sm text-muted-foreground">Searching…</p>}
          {!searching && results.length > 0 && (
            <CommandGroup heading="Profiles">
              {results.map((u) => (
                <CommandItem key={u.username} value={`${u.username}-${u.displayName}`} onSelect={() => goToProfile(u.username)} className="gap-3">
                  <Avatar className="h-7 w-7 rounded-md shrink-0">
                    {u.avatarUrl ? <AvatarImage src={u.avatarUrl} /> : null}
                    <AvatarFallback className="rounded-md text-xs font-bold" style={{ background: `linear-gradient(135deg, ${u.bannerColor}, #d0021b)` }}>
                      {u.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight">{u.displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{u._count.items} tracked</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
