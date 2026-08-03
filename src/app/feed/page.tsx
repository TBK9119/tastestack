import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActivityPage } from "@/lib/activity";
import AppShell from "@/components/tastestack/AppShell";
import FeedPage from "@/components/tastestack/FeedPage";

export const metadata: Metadata = {
  title: "Feed",
  description: "Activity from people whose taste you follow on TasteStack.",
  robots: { index: false, follow: true },
};

// Rendered on the server so the first screenful of activity is already in
// the HTML response — no client-side loading spinner, no waterfall where
// the browser has to load JS before it even knows what to fetch. Further
// pages are still fetched client-side (see FeedPage) as the person scrolls.
export default async function Page() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <AppShell>
        <FeedPage initialActivities={[]} initialCursor={null} loggedIn={false} />
      </AppShell>
    );
  }

  const { activities, nextCursor } = await getActivityPage(session.user.id);
  // Dates aren't serializable across the server/client component boundary —
  // the client already expects ISO strings (same shape the old client-side
  // fetch received, since JSON.stringify does this same conversion).
  const serialized = activities.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }));

  return (
    <AppShell>
      <FeedPage initialActivities={serialized} initialCursor={nextCursor} loggedIn={true} />
    </AppShell>
  );
}
