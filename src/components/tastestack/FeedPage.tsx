"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ActivityEntry } from "@/store/app-store";
import { TYPE_ICONS, type MediaType } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CoverImage from "@/components/tastestack/CoverImage";

const ACTION_LABEL: Record<string, string> = { added: "added", rated: "rated", completed: "finished", favorited: "favourited", reviewed: "reviewed" };

function parseExtra(extra: string) {
  try { return JSON.parse(extra) as { accent?: string; cover?: string }; } catch { return {}; }
}

function ActivitySkeletonRow() {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="h-11 w-11 rounded-xl bg-muted shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-3.5 w-2/3 rounded bg-muted" />
          <div className="h-3 w-1/4 rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function FeedPage({ initialActivities = [], initialCursor = null, loggedIn = false }: {
  initialActivities?: ActivityEntry[];
  initialCursor?: string | null;
  loggedIn?: boolean;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityEntry[]>(initialActivities);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [done, setDone] = useState(initialCursor === null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || done || !cursor) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/activity?cursor=${encodeURIComponent(cursor)}`);
      const data = await res.json();
      setActivities((prev) => [...prev, ...(Array.isArray(data.activities) ? data.activities : [])]);
      setCursor(data.nextCursor || null);
      if (!data.nextCursor) setDone(true);
    } catch { /* ignore, sentinel stays in view so the next scroll retries */ }
    finally { loadingRef.current = false; setLoadingMore(false); }
  }, [cursor, done]);

  // Infinite scroll: observe a sentinel just past the last card, fetch the
  // next page once it's ~400px from entering the viewport.
  useEffect(() => {
    if (done || !sentinelRef.current) return;
    const el = sentinelRef.current;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    }, { rootMargin: "400px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, done]);

  if (!loggedIn) return (
    <div className="max-w-3xl mx-auto px-5 py-16 text-center">
      <h1 className="text-3xl font-black">Your feed is waiting.</h1>
      <p className="mt-3 text-muted-foreground">Log in to see activity from people whose taste you follow.</p>
      <Button className="mt-6" onClick={() => router.push("/login")}>Log in</Button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
      <p className="text-xs font-bold tracking-[.18em] text-primary">ACTIVITY</p>
      <h1 className="mt-3 text-3xl font-black">Your taste, in motion.</h1>

      {activities.length ? (
        <div className="mt-8 space-y-3">
          {activities.map((activity) => {
            const isSelf = activity.userId === session?.user?.id;
            const extra = activity.item ? parseExtra(activity.item.extra) : {};
            return (
              <Card key={activity.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  {activity.item ? (
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border">
                      <CoverImage
                        src={activity.item.coverUrl}
                        alt={activity.item.title}
                        icon={extra.cover || TYPE_ICONS[activity.item.type as MediaType]}
                        accent={extra.accent}
                        sizes="44px"
                        fallbackClassName="p-1.5 text-base"
                      />
                    </div>
                  ) : (
                    <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
                      {activity.action === "added" ? "+" : "✦"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm">
                      <Link href={`/profile/${activity.user.username}`}
                        className="font-bold hover:text-primary">{isSelf ? "You" : activity.user.displayName}</Link>{" "}
                      {ACTION_LABEL[activity.action] || activity.action}{" "}
                      {activity.item ? <span className="font-semibold text-primary">{activity.item.title}</span> : "a title"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(activity.createdAt).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {!done && (
            <div ref={sentinelRef} className="space-y-3 pt-1">
              {loadingMore && Array.from({ length: 3 }).map((_, i) => <ActivitySkeletonRow key={i} />)}
            </div>
          )}
          {done && activities.length > 0 && (
            <p className="pt-4 text-center text-xs text-muted-foreground">You&apos;re all caught up.</p>
          )}
        </div>
      ) : (
        <Card className="mt-8 py-14 text-center">
          <CardContent className="flex flex-col items-center">
            <div className="text-3xl">⌁</div>
            <h2 className="mt-4 font-bold">Nothing here yet.</h2>
            <p className="mt-2 text-sm text-muted-foreground">Titles you add, and titles people you follow add, will show up here.</p>
            <Button className="mt-5" onClick={() => router.push("/discover")}>Find something to add</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
