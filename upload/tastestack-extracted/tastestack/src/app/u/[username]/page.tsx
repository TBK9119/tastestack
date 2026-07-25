import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProfileData } from "@/lib/profile";
import { MEDIA_TYPES, mediaConfig, type MediaType } from "@/lib/constants";
import Avatar from "@/components/Avatar";
import ItemActions from "@/components/ItemActions";
import FollowButton from "@/components/FollowButton";

function parseExtra(extra: string) {
  try {
    return JSON.parse(extra) as { accent?: string; cover?: string; creator?: string };
  } catch {
    return {};
  }
}

export default async function ProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const session = await getServerSession(authOptions);
  const profile = await getProfileData(params.username, session?.user?.id);
  if (!profile) notFound();

  const items = await prisma.item.findMany({
    where: { userId: profile.id },
    orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
    take: 18,
  });
  const favorites = items.filter((item) => item.isFavorite).slice(0, 6);
  const latest = items.filter((item) => !item.isFavorite).slice(0, 12);
  const collection = (type: MediaType) =>
    latest.filter((item) => item.type === type).slice(0, 4);

  return (
    <div>
      <section
        className="border-b border-ink-800"
        style={{
          background: `linear-gradient(120deg, ${profile.bannerColor}99, #14202c 55%, #0f1419)`,
        }}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-10 pb-7">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5">
            <Avatar
              displayName={profile.displayName}
              avatarUrl={profile.avatarUrl}
              bannerColor={profile.bannerColor}
              size={112}
            />
            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight">{profile.displayName}</h1>
                {profile.isOwn ? (
                  <Link
                    href="/settings"
                    className="rounded-full border border-white/25 px-3 py-1 text-xs font-semibold hover:bg-white/10"
                  >
                    Edit profile
                  </Link>
                ) : (
                  <FollowButton username={profile.username} initialFollowing={profile.isFollowing} />
                )}
              </div>
              <p className="mt-1 text-sm text-ink-300/80">@{profile.username}</p>
              {profile.bio && <p className="mt-3 max-w-xl text-sm text-ink-300">{profile.bio}</p>}
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-7 gap-y-2 text-sm text-ink-300">
            <span><b>{profile.totalItems}</b> tracked</span>
            <span><b>{profile.favoritesCount}</b> favourites</span>
            <span><b>{profile.followersCount}</b> followers</span>
            <span><b>{profile.followingCount}</b> following</span>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-9">
        {profile.totalItems === 0 ? (
          <div className="card py-16 text-center">
            <div className="text-4xl">✦</div>
            <h2 className="mt-4 text-xl font-bold">This stack is just getting started.</h2>
            <p className="mt-2 text-ink-500">Add titles from Discover to make this profile feel like home.</p>
            {profile.isOwn && (
              <Link href="/discover" className="btn-primary mt-6">Discover titles</Link>
            )}
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {MEDIA_TYPES.map((config) => (
                <div key={config.type} className="card p-3">
                  <p className="text-xl text-brand-500">
                    {config.type === "anime" ? "✦" : config.type === "manga" ? "▤" : config.type === "movie" ? "▶" : config.type === "tv" ? "▣" : config.type === "game" ? "♜" : config.type === "album" ? "♫" : "▥"}
                  </p>
                  <p className="mt-3 text-xl font-black">{profile.counts[config.type]}</p>
                  <p className="text-xs text-ink-500">{config.label}</p>
                </div>
              ))}
            </section>

            {favorites.length > 0 && (
              <section className="mt-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black">Favourite picks</h2>
                  <span className="text-xs text-ink-500">The all-timers</span>
                </div>
                <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {favorites.map((item) => {
                    const extra = parseExtra(item.extra);
                    return (
                      <div key={item.id} className="group relative">
                        {profile.isOwn && (
                          <ItemActions
                            id={item.id}
                            title={item.title}
                            status={item.status}
                            rating={item.rating}
                            progressCurrent={item.progressCurrent}
                            progressTotal={item.progressTotal}
                            review={item.review}
                            isFavorite={item.isFavorite}
                            progressLabel={mediaConfig(item.type as MediaType).progressLabel}
                          />
                        )}
                        <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10">
                          {item.coverUrl ? (
                            <Image src={item.coverUrl} alt={item.title} fill sizes="160px" className="object-cover" />
                          ) : (
                            <div
                              className="flex h-full w-full items-end p-3 text-2xl"
                              style={{ background: `linear-gradient(145deg, ${extra.accent || "#2e51a2"}, #14202c 88%)` }}
                            >
                              {extra.cover || "✦"}
                            </div>
                          )}
                        </div>
                        <p className="mt-2 truncate text-sm font-semibold">{item.title}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {MEDIA_TYPES.filter((c) => collection(c.type).length).map((config) => (
              <section className="mt-10" key={config.type}>
                <h2 className="text-xl font-black">{config.label}</h2>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {collection(config.type).map((item) => {
                    const extra = parseExtra(item.extra);
                    return (
                      <article key={item.id} className="group relative card overflow-hidden">
                        {profile.isOwn && (
                          <ItemActions
                            id={item.id}
                            title={item.title}
                            status={item.status}
                            rating={item.rating}
                            progressCurrent={item.progressCurrent}
                            progressTotal={item.progressTotal}
                            review={item.review}
                            isFavorite={item.isFavorite}
                            progressLabel={mediaConfig(item.type as MediaType).progressLabel}
                          />
                        )}
                        <div className="relative aspect-[16/10] overflow-hidden">
                          {item.coverUrl ? (
                            <Image src={item.coverUrl} alt={item.title} fill sizes="300px" className="object-cover" />
                          ) : (
                            <div
                              className="flex h-full w-full items-end p-3 text-2xl"
                              style={{ background: `linear-gradient(145deg, ${extra.accent || "#2e51a2"}, #14202c)` }}
                            >
                              {extra.cover || "✦"}
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="truncate text-sm font-bold">{item.title}</p>
                          <p className="mt-1 text-xs text-ink-500 capitalize">
                            {item.status}
                            {item.rating ? ` · ${item.rating}/10` : ""}
                            {item.progressTotal ? ` · ${item.progressCurrent}/${item.progressTotal}` : ""}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
