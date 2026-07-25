"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
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
import { useToast } from "@/hooks/use-toast";

function parseExtra(extra: string) {
  try { return JSON.parse(extra) as { accent?: string; cover?: string; creator?: string }; } catch { return {}; }
}

function ItemCard({ item, isOwn, onEdit, progressLabel }: {
  item: ItemData; isOwn: boolean; onEdit: (item: ItemData) => void; progressLabel: string;
}) {
  const extra = parseExtra(item.extra);
  return (
    <div className="group relative">
      {isOwn && (
        <button onClick={() => onEdit(item)} className="absolute right-1 top-1 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/80 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:text-primary">
          ✎
        </button>
      )}
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg border">
        {item.coverUrl ? (
          <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="flex h-full w-full items-end p-3 text-2xl" style={{ background: `linear-gradient(145deg, ${extra.accent || "#2e51a2"}, hsl(var(--card)) 88%)` }}>
            {extra.cover || TYPE_ICONS[item.type as MediaType] || "✦"}
          </div>
        )}
      </div>
      <p className="mt-1.5 truncate text-sm font-semibold">{item.title}</p>
      <p className="text-xs text-muted-foreground">
        {STATUS_META[item.status as keyof typeof STATUS_META]?.shortLabel || item.status}
        {item.rating ? ` · ${item.rating}/10` : ""}
        {item.progressTotal ? ` · ${item.progressCurrent}/${item.progressTotal} ${progressLabel}` : ""}
      </p>
    </div>
  );
}

function StatusSection({ title, items, isOwn, onEdit, progressLabel }: {
  title: string; items: ItemData[]; isOwn: boolean; onEdit: (item: ItemData) => void; progressLabel: string;
}) {
  if (!items.length) return null;
  return (
    <div className="mt-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title} ({items.length})</h3>
      <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {items.map((item) => <ItemCard key={item.id} item={item} isOwn={isOwn} onEdit={onEdit} progressLabel={progressLabel} />)}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const { viewProfileUsername, setView, user } = useAppStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [items, setItems] = useState<ItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<ItemData | null>(null);
  const [editForm, setEditForm] = useState({ status: "", rating: 0, progressCurrent: 0, progressTotal: 0, review: "", isFavorite: false });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchProfile = useCallback(async () => {
    const username = viewProfileUsername || user?.username;
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
  }, [viewProfileUsername, user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const openEdit = (item: ItemData) => {
    setEditItem(item);
    setEditForm({ status: item.status, rating: item.rating, progressCurrent: item.progressCurrent, progressTotal: item.progressTotal, review: item.review, isFavorite: item.isFavorite });
  };

  const saveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    const res = await fetch(`/api/items/${editItem.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
    setSaving(false);
    if (res.ok) { toast({ title: "Saved!" }); setEditItem(null); fetchProfile(); }
    else { const d = await res.json().catch(() => ({})); toast({ title: "Error", description: d.error, variant: "destructive" }); }
  };

  const removeItem = async () => {
    if (!editItem) return;
    setSaving(true);
    const res = await fetch(`/api/items/${editItem.id}`, { method: "DELETE" });
    setSaving(false);
    if (res.ok) { toast({ title: "Removed from stack" }); setEditItem(null); fetchProfile(); }
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

  if (loading) return <div className="max-w-6xl mx-auto px-5 py-20 text-center text-muted-foreground">Loading profile…</div>;
  if (!profile) return <div className="max-w-6xl mx-auto px-5 py-20 text-center text-muted-foreground">Profile not found.</div>;

  const isOwn = profile.isOwn || profile.username === user?.username;
  const progressLabel = (type: MediaType) => mediaConfig(type).progressLabel;

  const itemsByType = (type: MediaType) => items.filter((i) => i.type === type);
  const itemsByStatus = (type: MediaType, status: string) => itemsByType(type).filter((i) => i.status === status);
  const favoritesByType = (type: MediaType) => items.filter((i) => i.type === type && i.isFavorite);

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
                  <Button variant="outline" size="sm" onClick={() => setView("settings")}>Edit profile</Button>
                ) : session?.user ? (
                  profile.isFollowing ? (
                    <Button variant="outline" size="sm" onClick={unfollow} className="hover:text-destructive hover:border-destructive">Following</Button>
                  ) : (
                    <Button size="sm" onClick={follow}>+ Follow</Button>
                  )
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setView("login")}>Log in to follow</Button>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
              {profile.bio && <p className="mt-3 max-w-xl text-sm">{profile.bio}</p>}
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-7 gap-y-2 text-sm">
            <span><b>{profile.totalItems}</b> tracked</span>
            <span><b>{profile.favoritesCount}</b> favourites</span>
            <span><b>{profile.followersCount}</b> followers</span>
            <span><b>{profile.followingCount}</b> following</span>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-9">
        {profile.totalItems === 0 ? (
          <Card className="py-16 text-center">
            <CardContent className="flex flex-col items-center">
              <div className="text-4xl">✦</div>
              <h2 className="mt-4 text-xl font-bold">This stack is just getting started.</h2>
              <p className="mt-2 text-muted-foreground">Add titles from Discover to build your profile.</p>
              {isOwn && <Button className="mt-6" onClick={() => setView("discover")}>Discover titles</Button>}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {MEDIA_TYPES.map((config) => (
                <Card key={config.type} className="p-3 text-center">
                  <CardContent className="p-0">
                    <p className="text-xl text-primary">{TYPE_ICONS[config.type]}</p>
                    <p className="mt-2 text-xl font-black">{profile.counts[config.type] || 0}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tabs per media type */}
            <Tabs defaultValue={MEDIA_TYPES.find((c) => (profile.counts[c.type] || 0) > 0)?.type || "anime"} className="mt-10">
              <TabsList className="flex-wrap h-auto gap-1">
                {MEDIA_TYPES.map((config) => (profile.counts[config.type] || 0) > 0 && (
                  <TabsTrigger key={config.type} value={config.type} className="gap-1.5">
                    <span>{TYPE_ICONS[config.type]}</span>{config.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {MEDIA_TYPES.map((config) => {
                const typeItems = itemsByType(config.type);
                if (!typeItems.length && (profile.counts[config.type] || 0) === 0) return null;
                return (
                  <TabsContent key={config.type} value={config.type} className="mt-6">
                    {favoritesByType(config.type).length > 0 && (
                      <StatusSection title="♥ Favorites" items={favoritesByType(config.type)} isOwn={isOwn} onEdit={openEdit} progressLabel={progressLabel(config.type)} />
                    )}
                    <StatusSection title="Currently Watching/Playing" items={itemsByStatus(config.type, "watching")} isOwn={isOwn} onEdit={openEdit} progressLabel={progressLabel(config.type)} />
                    <StatusSection title="Completed" items={itemsByStatus(config.type, "completed")} isOwn={isOwn} onEdit={openEdit} progressLabel={progressLabel(config.type)} />
                    <StatusSection title="Plan to Watch/Play" items={itemsByStatus(config.type, "planned")} isOwn={isOwn} onEdit={openEdit} progressLabel={progressLabel(config.type)} />
                    <StatusSection title="On Hold" items={itemsByStatus(config.type, "onhold")} isOwn={isOwn} onEdit={openEdit} progressLabel={progressLabel(config.type)} />
                    <StatusSection title="Dropped" items={itemsByStatus(config.type, "dropped")} isOwn={isOwn} onEdit={openEdit} progressLabel={progressLabel(config.type)} />
                    {!typeItems.length && <p className="text-muted-foreground text-sm mt-4">No items in this category yet.</p>}
                  </TabsContent>
                );
              })}
            </Tabs>
          </>
        )}
      </main>

      {/* Edit Item Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editItem?.title}</DialogTitle>
            <DialogDescription>Edit status, rating, progress, and review.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                {Object.entries(STATUS_META).map(([val, meta]) => <option key={val} value={val}>{meta.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Rating {editForm.rating ? `— ${editForm.rating}/10` : "— unrated"}</Label>
              <Slider className="mt-2" min={0} max={10} step={1} value={[editForm.rating]} onValueChange={([v]) => setEditForm({ ...editForm, rating: v })} />
            </div>
            {progressLabel(editItem?.type as MediaType) && (
              <div className="flex items-end gap-2">
                <div><Label>Progress</Label><Input type="number" min={0} className="mt-1 w-24" value={editForm.progressCurrent} onChange={(e) => setEditForm({ ...editForm, progressCurrent: Number(e.target.value) })} /></div>
                <span className="pb-2">/</span>
                <div><Label>Total</Label><Input type="number" min={0} className="mt-1 w-24" value={editForm.progressTotal} onChange={(e) => setEditForm({ ...editForm, progressTotal: Number(e.target.value) })} /></div>
              </div>
            )}
            <div>
              <Label>Review ({editForm.review.length}/500)</Label>
              <Textarea className="mt-1 min-h-20" maxLength={500} value={editForm.review} onChange={(e) => setEditForm({ ...editForm, review: e.target.value })} placeholder="What did you think?" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={editForm.isFavorite} onCheckedChange={(c) => setEditForm({ ...editForm, isFavorite: !!c })} />
              <Label>Favourite</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={removeItem} disabled={saving}>Remove</Button>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
