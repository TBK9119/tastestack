import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ACTION_LABEL: Record<string, string> = {
  added: "added",
  rated: "rated",
  completed: "finished",
  favorited: "favourited",
  reviewed: "reviewed",
};

export default async function FeedPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center">
        <h1 className="text-3xl font-black">Your feed is waiting.</h1>
        <p className="mt-3 text-ink-500">Log in to see activity from people whose taste you follow.</p>
        <Link href="/login" className="btn-primary mt-6">Log in</Link>
      </div>
    );
  }

  const following = await prisma.follow.findMany({
    where: { followerId: session.user.id },
    select: { followingId: true },
  });
  const feedUserIds = [session.user.id, ...following.map((f) => f.followingId)];

  const activities = await prisma.activity.findMany({
    where: { userId: { in: feedUserIds } },
    include: {
      item: true,
      user: { select: { username: true, displayName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
      <p className="text-xs font-bold tracking-[.18em] text-brand-500">ACTIVITY</p>
      <h1 className="mt-3 text-3xl font-black">Your taste, in motion.</h1>

      {activities.length ? (
        <div className="mt-8 space-y-3">
          {activities.map((activity) => {
            const isSelf = activity.userId === session.user.id;
            return (
              <article key={activity.id} className="card flex items-center gap-4 p-4">
                <div className="h-11 w-11 rounded-xl bg-brand-500/15 text-brand-500 grid place-items-center">
                  {activity.action === "added" ? "+" : "✦"}
                </div>
                <div>
                  <p className="text-sm">
                    <Link href={`/u/${activity.user.username}`} className="font-bold hover:text-brand-500">
                      {isSelf ? "You" : activity.user.displayName}
                    </Link>{" "}
                    {ACTION_LABEL[activity.action] || activity.action}{" "}
                    {activity.item ? (
                      <span className="font-semibold text-brand-500">{activity.item.title}</span>
                    ) : (
                      "a title"
                    )}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">{activity.createdAt.toLocaleDateString()}</p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card mt-8 py-14 text-center">
          <div className="text-3xl">⌁</div>
          <h2 className="mt-4 font-bold">Nothing here yet.</h2>
          <p className="mt-2 text-sm text-ink-500">
            Titles you add, and titles people you follow add, will show up here.
          </p>
          <Link href="/discover" className="btn-primary mt-5">Find something to add</Link>
        </div>
      )}
    </div>
  );
}
