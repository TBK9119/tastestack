"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ActivityEntry } from "@/store/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ACTION_LABEL: Record<string, string> = { added: "added", rated: "rated", completed: "finished", favorited: "favourited", reviewed: "reviewed" };

export default function FeedPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!session || hasFetched.current) return;
    hasFetched.current = true;
    fetch("/api/activity").then((r) => r.json()).then((data) => setActivities(data.activities || [])).catch(() => {}).finally(() => setLoading(false));
  }, [session]);

  if (!session) return (
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

      {loading ? (
        <div className="mt-8 space-y-3 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-11 w-11 rounded-xl bg-muted shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 w-2/3 rounded bg-muted" />
                  <div className="h-3 w-1/4 rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : activities.length ? (
        <div className="mt-8 space-y-3">
          {activities.map((activity) => {
            const isSelf = activity.userId === session.user?.id;
            return (
              <Card key={activity.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
                    {activity.action === "added" ? "+" : "✦"}
                  </div>
                  <div>
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
