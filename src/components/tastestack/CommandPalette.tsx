"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import { TYPE_ICONS } from "@/lib/constants";
import { SearchIcon, UserIcon, ArrowRightIcon } from "lucide-react";
import CoverImage from "@/components/tastestack/CoverImage";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mediaResults, setMediaResults] = useState<any[]>([]);
  const [userResults, setUserResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Keyboard shortcut listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!open) {
      setQuery("");
      setMediaResults([]);
      setUserResults([]);
      return;
    }

    const q = query.trim();
    if (q.length < 2) {
      setMediaResults([]);
      setUserResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const [mediaRes, usersRes] = await Promise.all([
          fetch(`/api/search?type=all&q=${encodeURIComponent(q)}`),
          fetch(`/api/search/users?q=${encodeURIComponent(q)}`)
        ]);
        
        if (mediaRes.ok) {
          const data = await mediaRes.json();
          setMediaResults(data.results?.slice(0, 5) || []);
        }
        
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUserResults(data.users?.slice(0, 3) || []);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, open]);

  const navigate = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Search for movies, anime, books, or users..." 
        value={query} 
        onValueChange={setQuery} 
      />
      <CommandList className="relative">
        <CommandEmpty>
          {loading ? "Searching..." : query.length < 2 ? "Type at least 2 characters to search." : "No results found."}
        </CommandEmpty>

        {userResults.length > 0 && (
          <CommandGroup heading="Users">
            {userResults.map((user) => (
              <CommandItem 
                key={user.id} 
                onSelect={() => navigate(`/profile/${user.username}`)}
                className="flex items-center gap-3 py-2 cursor-pointer"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.username} className="w-8 h-8 rounded-full border bg-muted" />
                ) : (
                  <div className="w-8 h-8 rounded-full border bg-muted flex items-center justify-center">
                    <UserIcon size={14} className="text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-semibold">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {mediaResults.length > 0 && (
          <CommandGroup heading="Titles">
            {mediaResults.map((media) => (
              <CommandItem 
                key={`${media.type}-${media.apiId}`} 
                onSelect={() => {
                  // Wait for navigation, we push to discover page with query to open it
                  // Actually, we can just push to discover with query
                  navigate(`/discover?q=${encodeURIComponent(media.title)}`);
                }}
                className="flex items-center gap-3 py-2 cursor-pointer"
              >
                <div className="w-8 h-10 relative overflow-hidden rounded border shrink-0">
                  <CoverImage src={media.coverUrl} alt={media.title} icon={TYPE_ICONS[media.type as keyof typeof TYPE_ICONS]} sizes="32px" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{media.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{media.creator} • {media.year}</p>
                </div>
                <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-primary opacity-60">
                  <span>{TYPE_ICONS[media.type as keyof typeof TYPE_ICONS]}</span>
                  <span className="uppercase">{media.type}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        
        {query.length === 0 && (
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => navigate("/")} className="cursor-pointer py-2">
              <ArrowRightIcon className="mr-2 h-4 w-4 text-muted-foreground" /> Feed
            </CommandItem>
            <CommandItem onSelect={() => navigate("/discover")} className="cursor-pointer py-2">
              <SearchIcon className="mr-2 h-4 w-4 text-muted-foreground" /> Discover
            </CommandItem>
            <CommandItem onSelect={() => navigate("/lists")} className="cursor-pointer py-2">
              <ArrowRightIcon className="mr-2 h-4 w-4 text-muted-foreground" /> My Lists
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
