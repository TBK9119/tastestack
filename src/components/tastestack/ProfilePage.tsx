"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAppStore, type ProfileData, type ItemData, type MediaType } from "@/store/app-store";
import { MEDIA_TYPES, STATUS_META, TYPE_ICONS, mediaConfig } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import CoverImage from "@/components/tastestack/CoverImage";
import { motion, AnimatePresence } from "framer-motion";

import ItemDetailModal, { type ItemDetailProps } from "@/components/tastestack/ItemDetailModal";
import EditItemModal from "@/components/tastestack/EditItemModal";
import ProfileStats from "@/components/tastestack/ProfileStats";

function parseExtra(extra: string) {
  try { return JSON.parse(extra) as { accent?: string; cover?: string; creator?: string }; } catch { return {}; }
}

function ItemCard({ item, isOwn, onEdit, progressLabel }: {
  item: ItemData; isOwn: boolean; onEdit: (item: ItemData) => void; progressLabel: string;
}) {
  const extra = parseExtra(item.extra);
  return (
    <motion.div 
      layoutId={`card-${item.id}`}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, mass: 1 }}
      whileHover={{ y: -4, transition: { type: "spring", stiffness: 300, damping: 15 } }}
      className="animate-on-scroll group relative cursor-pointer"
      onClick={() => {
        if (!isOwn) {
          onEdit(item); // hack: we use onEdit for viewing when it's not own
        }
      }}
    >
      {isOwn && (
        <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="absolute right-1 top-1 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/80 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:text-primary">
          ✎
        </button>
      )}
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg border shadow-sm transition-shadow group-hover:shadow-md">
        <CoverImage src={item.coverUrl} alt={item.title} icon={extra.cover || TYPE_ICONS[item.type as MediaType]} accent={extra.accent} fallbackClassName="p-3" sizes="(max-width: 640px) 33vw, 150px" />
      </div>
      <p className="mt-1.5 truncate text-sm font-semibold transition-colors group-hover:text-primary">{item.title}</p>
      <p className="text-xs text-muted-foreground">
        {STATUS_META[item.status as keyof typeof STATUS_META]?.shortLabel || item.status}
        {item.rating ? ` · ${item.rating}/10` : ""}
        {item.progressTotal ? ` · ${item.progressCurrent}/${item.progressTotal} ${progressLabel}` : ""}
      </p>
    </motion.div>
  );
}

function StatusSection({ title, items, isOwn, onEdit, progressLabel }: {
  title: string; items: ItemData[]; isOwn: boolean; onEdit: (item: ItemData) => void; progressLabel: string;
}) {
  if (!items.length) return null;
  return (
    <div className="mt-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title} ({items.length})</h3>
      <motion.div 
        className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
        }}
      >
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <div key={item.id} onClick={() => onEdit(item)}>
              <ItemCard item={item} isOwn={isOwn} onEdit={onEdit} progressLabel={progressLabel} />
            </div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default function ProfilePage({ username: routeUsername }: { username?: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { user } = useAppStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [items, setItems] = useState<ItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<string>("anime");
  const [editItem, setEditItem] = useState<ItemData | null>(null);
  const [viewItem, setViewItem] = useState<ItemDetailProps | null>(null);
  const { toast } = useToast();

  const fetchProfile = useCallback(async () => {
    const username = routeUsername || user?.username;
    if (!username) return;
    setLoading(true);
    try {
      const [profileRes, itemsRes] = await Promise.all([
        fetch(`/api/profile/${username}`),
        fetch(`/api/items?username=${encodeURIComponent(username)}`),
      ]);
      if (profileRes.ok) setProfile(await profileRes.json());
      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItems(data.items || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [routeUsername, user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const openEdit = (item: ItemData) => {
    if (isOwn) {
      setEditItem(item);
    } else {
      const extra = parseExtra(item.extra);
      setViewItem({
        title: item.title, coverUrl: item.coverUrl, type: item.type, apiId: item.apiId, source: item.source, year: item.year,
        creator: extra.creator, rating: item.rating, progressCurrent: item.progressCurrent, progressTotal: item.progressTotal,
        review: item.review, status: item.status, isFavorite: item.isFavorite
      });
    }
  };



  const follow = async () => {
    if (!profile) return;
    await fetch(`/api/users/${profile.username}/follow`, { method: "POST" });
    fetchProfile();
  };

  const unfollow = async () => {
    if (!profile) return;
    await fetch(`/api/users/${profile.username}/follow`, { method: "DELETE" });
    fetchProfile();
  };

  if (loading) return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="mt-8 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[3/4] w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
  if (!profile) return <div className="max-w-6xl mx-auto px-5 py-20 text-center text-muted-foreground">Profile not found.</div>;

  const isOwn = profile.isOwn || profile.username === user?.username;
  const progressLabel = (type: MediaType) => mediaConfig(type).progressLabel;
  const filteredItems = items.filter((i) => i.type === selectedTab);
  const statsTabActive = selectedTab === "stats";
  const itemsByStatus = (type: MediaType, status: string) => items.filter((i) => i.type === type && i.status === status);
  const favoritesByType = (type: MediaType) => items.filter((i) => i.type === type && i.isFavorite);

  const tabs = MEDIA_TYPES.filter(m => (profile.counts[m.type] || 0) > 0).map(m => ({ id: m.type, label: m.label, count: profile.counts[m.type] || 0 }));

  return (
    <div>
      {/* Banner */}
      <section className="border-b" style={{ background: `linear-gradient(120deg, ${profile.bannerColor}99, hsl(var(--card)) 55%, hsl(var(--background)))` }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-10 pb-7">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5">
            <Avatar className="h-28 w-28 rounded-lg border-4 border-background shadow-lg">
              {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} /> : null}
              <AvatarFallback className="text-2xl font-extrabold rounded-lg" style={{ background: `linear-gradient(135deg, ${profile.bannerColor}, #d0021b)` }}>
                {profile.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight">{profile.displayName}</h1>
                {isOwn ? (
                  <Button variant="outline" size="sm" onClick={() => router.push("/settings")}>Edit profile</Button>
                ) : session?.user ? (
                  profile.isFollowing ? (
                    <Button variant="outline" size="sm" onClick={unfollow} className="hover:text-destructive hover:border-destructive">Following</Button>
                  ) : (
                    <Button size="sm" onClick={follow}>+ Follow</Button>
                  )
                ) : (
                  <Button variant="outline" size="sm" onClick={() => router.push("/login")}>Log in to follow</Button>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
              {profile.bio && <p className="mt-3 max-w-xl text-sm">{profile.bio}</p>}
            </div>
          </div>
          <div className="mt-8 flex gap-6 border-b overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`pb-3 font-semibold whitespace-nowrap transition-colors ${selectedTab === tab.id ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {tab.label} <span className="ml-1 text-xs opacity-60">({tab.count})</span>
              </button>
            ))}
            <button
              onClick={() => setSelectedTab("stats")}
              className={`pb-3 font-semibold whitespace-nowrap transition-colors ${selectedTab === "stats" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              Stats <span className="ml-1 text-xs opacity-60">✦</span>
            </button>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-9">
        {statsTabActive ? (
          <ProfileStats profile={profile} />
        ) : filteredItems.length === 0 ? (
          <Card className="py-16 text-center shadow-sm">
            <CardContent className="flex flex-col items-center">
              <div className="text-4xl text-muted-foreground/30">{TYPE_ICONS[selectedTab as MediaType]}</div>
              <h2 className="mt-4 text-xl font-bold">No {selectedTab} titles yet.</h2>
              {isOwn && (
                <Button className="mt-6 font-bold shadow-md" onClick={() => router.push("/discover")}>Find something to add</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-12">
            {favoritesByType(selectedTab as MediaType).length > 0 && (
              <StatusSection title="♥ Favorites" items={favoritesByType(selectedTab as MediaType)} isOwn={isOwn} onEdit={openEdit} progressLabel={progressLabel(selectedTab as MediaType)} />
            )}
            <StatusSection title="Currently Watching/Playing" items={itemsByStatus(selectedTab as MediaType, "watching")} isOwn={isOwn} onEdit={openEdit} progressLabel={progressLabel(selectedTab as MediaType)} />
            <StatusSection title="Completed" items={itemsByStatus(selectedTab as MediaType, "completed")} isOwn={isOwn} onEdit={openEdit} progressLabel={progressLabel(selectedTab as MediaType)} />
            <StatusSection title="Plan to Watch/Play" items={itemsByStatus(selectedTab as MediaType, "planned")} isOwn={isOwn} onEdit={openEdit} progressLabel={progressLabel(selectedTab as MediaType)} />
            <StatusSection title="On Hold" items={itemsByStatus(selectedTab as MediaType, "onhold")} isOwn={isOwn} onEdit={openEdit} progressLabel={progressLabel(selectedTab as MediaType)} />
            <StatusSection title="Dropped" items={itemsByStatus(selectedTab as MediaType, "dropped")} isOwn={isOwn} onEdit={openEdit} progressLabel={progressLabel(selectedTab as MediaType)} />
          </div>
        )}
      </main>

      <EditItemModal 
        isOpen={!!editItem} 
        onClose={() => setEditItem(null)} 
        item={editItem} 
        onSave={fetchProfile}
      />
      
      <ItemDetailModal 
        isOpen={!!viewItem} 
        onClose={() => setViewItem(null)} 
        item={viewItem} 
      />
    </div>
  );
}
