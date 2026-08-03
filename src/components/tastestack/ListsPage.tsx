"use client";

import { useEffect, useState, useCallback, type MouseEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { TYPE_ICONS, type MediaType } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import CoverImage from "@/components/tastestack/CoverImage";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Heart, Star, Bookmark } from "lucide-react";

interface ListEntryData {
  id: string; type: MediaType; apiId: string; source: string;
  title: string; coverUrl: string; year: string; extra: string; note: string; position: number;
}
interface InteractionCounts { LIKE: number; FAVORITE: number; BOOKMARK: number }
interface InteractionState { LIKE: boolean; FAVORITE: boolean; BOOKMARK: boolean }
interface ListSummary {
  id: string; name: string; description: string; isPublic: boolean; updatedAt: string;
  entries: ListEntryData[]; _count: { entries: number };
  counts: InteractionCounts; viewerState: InteractionState;
}
interface ListDetail extends ListSummary {
  user: { username: string; displayName: string }; isOwn: boolean;
}

// Shared like/favourite/bookmark control used on both the list grid cards
// and the list detail header. Updates optimistically, then reconciles with
// the server's authoritative counts (and reverts on failure).
function InteractionBar({ listId, counts, viewerState, onChange, size = "sm" }: {
  listId: string; counts: InteractionCounts; viewerState: InteractionState;
  onChange: (counts: InteractionCounts, viewerState: InteractionState) => void;
  size?: "sm" | "md";
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const toggle = async (type: keyof InteractionCounts, e: MouseEvent) => {
    e.stopPropagation();
    if (!session) { router.push("/login"); return; }
    if (pending) return;
    setPending(type);
    const wasActive = viewerState[type];
    const optimisticCounts = { ...counts, [type]: Math.max(0, counts[type] + (wasActive ? -1 : 1)) };
    const optimisticViewer = { ...viewerState, [type]: !wasActive };
    onChange(optimisticCounts, optimisticViewer);
    try {
      const res = await fetch(`/api/lists/${listId}/interactions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) });
      if (res.ok) {
        const data = await res.json();
        onChange(data.counts, { ...optimisticViewer, [type]: data.active });
      } else {
        onChange(counts, viewerState);
      }
    } catch {
      onChange(counts, viewerState);
    } finally {
      setPending(null);
    }
  };

  const iconSize = size === "sm" ? 14 : 17;
  const gap = size === "sm" ? "gap-3" : "gap-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className={`flex items-center ${gap}`}>
      <button onClick={(e) => toggle("LIKE", e)} title="Like" className={`flex items-center gap-1 ${textSize} font-medium transition ${viewerState.LIKE ? "text-red-500" : "text-muted-foreground hover:text-foreground"}`}>
        <Heart size={iconSize} fill={viewerState.LIKE ? "currentColor" : "none"} /> {counts.LIKE}
      </button>
      <button onClick={(e) => toggle("FAVORITE", e)} title="Favourite" className={`flex items-center gap-1 ${textSize} font-medium transition ${viewerState.FAVORITE ? "text-yellow-500" : "text-muted-foreground hover:text-foreground"}`}>
        <Star size={iconSize} fill={viewerState.FAVORITE ? "currentColor" : "none"} /> {counts.FAVORITE}
      </button>
      <button onClick={(e) => toggle("BOOKMARK", e)} title="Bookmark" className={`flex items-center gap-1 ${textSize} font-medium transition ${viewerState.BOOKMARK ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
        <Bookmark size={iconSize} fill={viewerState.BOOKMARK ? "currentColor" : "none"} /> {counts.BOOKMARK}
      </button>
    </div>
  );
}

function parseExtra(extra: string) {
  try { return JSON.parse(extra) as { accent?: string; cover?: string; creator?: string }; } catch { return {}; }
}

interface SearchResult {
  type: MediaType; apiId: string; source: string; title: string; creator: string; year: string; coverUrl: string;
}

function SortableEntry({ entry, isOwn, onRemove }: { entry: ListEntryData; isOwn: boolean; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const extra = parseExtra(entry.extra);
  return (
    <div ref={setNodeRef} style={style} className="group relative">
      {isOwn && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(entry.id); }} className="absolute right-1 top-1 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/80 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:text-destructive">
          ×
        </button>
      )}
      <div {...attributes} {...listeners} className={`relative aspect-[3/4] overflow-hidden rounded-lg border ${isOwn ? "cursor-grab active:cursor-grabbing" : ""}`}>
        <CoverImage src={entry.coverUrl} alt={entry.title} icon={extra.cover || TYPE_ICONS[entry.type]} accent={extra.accent} fallbackClassName="p-3" sizes="(max-width: 640px) 33vw, 150px" />
      </div>
      <p className="mt-1.5 truncate text-sm font-semibold">{entry.title}</p>
      <p className="text-xs text-muted-foreground">{entry.year}</p>
    </div>
  );
}

export default function ListsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openList, setOpenList] = useState<ListDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", isPublic: true });
  const [creating, setCreating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", isPublic: true });
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<SearchResult[]>([]);
  const [addSearching, setAddSearching] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const fetchLists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lists");
      const data = await res.json();
      setLists(Array.isArray(data.lists) ? data.lists : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (session) fetchLists(); else setLoading(false); }, [session, fetchLists]);

  const openDetail = async (id: string) => {
    if (detailLoading) return;
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/lists/${id}`);
      const data = await res.json();
      if (res.ok) setOpenList(data.list);
    } catch { /* ignore */ }
    finally { setDetailLoading(false); }
  };

  const createList = async () => {
    if (!createForm.name.trim()) return;
    setCreating(true);
    const res = await fetch("/api/lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(createForm) });
    setCreating(false);
    if (res.ok) {
      toast({ title: "List created!" });
      setCreateOpen(false);
      setCreateForm({ name: "", description: "", isPublic: true });
      fetchLists();
    } else {
      const d = await res.json().catch(() => ({}));
      toast({ title: "Could not create list", description: d.error, variant: "destructive" });
    }
  };

  const openEdit = () => {
    if (!openList) return;
    setEditForm({ name: openList.name, description: openList.description, isPublic: openList.isPublic });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!openList) return;
    setSaving(true);
    const res = await fetch(`/api/lists/${openList.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
    setSaving(false);
    if (res.ok) {
      const d = await res.json();
      setOpenList({ ...openList, ...d.list });
      setEditOpen(false);
      toast({ title: "Saved!" });
      fetchLists();
    }
  };

  const deleteList = async () => {
    if (!openList) return;
    setSaving(true);
    const res = await fetch(`/api/lists/${openList.id}`, { method: "DELETE" });
    setSaving(false);
    if (res.ok) {
      toast({ title: "List deleted" });
      setEditOpen(false);
      setOpenList(null);
      fetchLists();
    }
  };

  const removeEntry = async (entryId: string) => {
    if (!openList) return;
    setOpenList({ ...openList, entries: openList.entries.filter((e) => e.id !== entryId) });
    await fetch(`/api/lists/${openList.id}/entries/${entryId}`, { method: "DELETE" });
  };

  useEffect(() => {
    if (!addOpen) return;
    const q = addQuery.trim();
    if (!q) { setAddResults([]); setAddSearching(false); return; }
    setAddSearching(true);
    const handle = setTimeout(() => {
      fetch(`/api/search?type=all&q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => setAddResults(Array.isArray(data.results) ? data.results : []))
        .catch(() => {})
        .finally(() => setAddSearching(false));
    }, 350);
    return () => clearTimeout(handle);
  }, [addQuery, addOpen]);

  const addTitleToOpenList = async (result: SearchResult) => {
    if (!openList) return;
    const payload = { type: result.type, apiId: result.apiId, source: result.source, title: result.title, creator: result.creator, year: result.year, coverUrl: result.coverUrl };
    const res = await fetch(`/api/lists/${openList.id}/entries`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      const data = await res.json();
      setOpenList((prev) => prev ? { ...prev, entries: [...prev.entries, data.entry] } : prev);
      toast({ title: `Added "${result.title}"` });
    } else {
      const d = await res.json().catch(() => ({}));
      const already = d.error === "Already in this list.";
      toast({ title: already ? "Already in this list" : "Could not add", description: already ? undefined : d.error, variant: already ? "default" : "destructive" });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!openList) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = openList.entries.findIndex((e) => e.id === active.id);
    const newIndex = openList.entries.findIndex((e) => e.id === over.id);
    const reordered = arrayMove(openList.entries, oldIndex, newIndex);
    setOpenList({ ...openList, entries: reordered });
    fetch(`/api/lists/${openList.id}/entries`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: reordered.map((e) => e.id) }) });
  };

  if (!session) return (
    <div className="max-w-lg mx-auto px-5 py-16 text-center">
      <h1 className="text-3xl font-black">Curate your own lists.</h1>
      <p className="mt-3 text-muted-foreground">Log in to build collections like &quot;Best sci-fi of the decade&quot; or &quot;Comfort rewatches.&quot;</p>
      <Button className="mt-6" onClick={() => router.push("/login")}>Log in</Button>
    </div>
  );

  if (openList) {
    return (
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
        <button onClick={() => setOpenList(null)} className="text-sm text-muted-foreground hover:text-foreground">← All lists</button>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black tracking-tight">{openList.name}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${openList.isPublic ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground"}`}>
                {openList.isPublic ? "Public" : "Private"}
              </span>
            </div>
            {openList.description && <p className="mt-2 max-w-xl text-muted-foreground">{openList.description}</p>}
            <p className="mt-1 text-xs text-muted-foreground">by @{openList.user.username} · {openList.entries.length} title{openList.entries.length === 1 ? "" : "s"}</p>
            <div className="mt-3">
              <InteractionBar
                listId={openList.id}
                counts={openList.counts}
                viewerState={openList.viewerState}
                size="md"
                onChange={(counts, viewerState) => setOpenList((prev) => prev ? { ...prev, counts, viewerState } : prev)}
              />
            </div>
          </div>
          {openList.isOwn && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setAddOpen(true)}>+ Add titles</Button>
              <Button variant="outline" size="sm" onClick={openEdit}>Edit list</Button>
            </div>
          )}
        </div>

        {openList.entries.length === 0 ? (
          <Card className="mt-8 py-14 text-center text-muted-foreground">
            <CardContent className="flex flex-col items-center">
              <p>Nothing here yet.</p>
              {openList.isOwn && <Button className="mt-4" size="sm" onClick={() => setAddOpen(true)}>+ Add titles</Button>}
            </CardContent>
          </Card>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={openList.entries.map((e) => e.id)} strategy={rectSortingStrategy}>
              <div className="mt-8 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {openList.entries.map((entry) => <SortableEntry key={entry.id} entry={entry} isOwn={openList.isOwn} onRemove={removeEntry} />)}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) { setAddQuery(""); setAddResults([]); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add titles to &quot;{openList.name}&quot;</DialogTitle>
              <DialogDescription>Search anime, manga, books, movies, TV, games, or music.</DialogDescription>
            </DialogHeader>
            <Input autoFocus placeholder="Search titles…" value={addQuery} onChange={(e) => setAddQuery(e.target.value)} />
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {addSearching && <p className="py-6 text-center text-sm text-muted-foreground">Searching…</p>}
              {!addSearching && addQuery.trim() && addResults.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No results.</p>}
              {!addSearching && addResults.map((r) => {
                const already = openList.entries.some((e) => e.type === r.type && e.apiId === r.apiId && e.source === r.source);
                return (
                  <div key={`${r.type}-${r.source}-${r.apiId}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent">
                    <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded border">
                      <CoverImage src={r.coverUrl} alt={r.title} icon={TYPE_ICONS[r.type]} sizes="40px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{r.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.creator} · {r.year}</p>
                    </div>
                    <Button size="sm" variant={already ? "outline" : "default"} disabled={already} onClick={() => addTitleToOpenList(r)} className="shrink-0">
                      {already ? "Added" : "+ Add"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit list</DialogTitle>
              <DialogDescription>Rename, redescribe, or change who can see this list.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input className="mt-1" maxLength={80} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea className="mt-1" maxLength={240} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Checkbox checked={editForm.isPublic} onCheckedChange={(c) => setEditForm({ ...editForm, isPublic: !!c })} /><Label>Public</Label></div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="destructive" onClick={deleteList} disabled={saving}>Delete list</Button>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={saveEdit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-bold tracking-[.18em] text-primary">LISTS</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Your own collections.</h1>
          <p className="mt-3 text-muted-foreground">Curate anything from Discover into a themed list — ranked, ongoing, or just for you.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ New list</Button>
      </div>

      {loading ? (
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 rounded-xl bg-muted" />)}
        </div>
      ) : lists.length === 0 ? (
        <Card className="mt-8 py-16 text-center">
          <CardContent className="flex flex-col items-center">
            <div className="text-4xl">☰</div>
            <h2 className="mt-4 text-xl font-bold">No lists yet.</h2>
            <p className="mt-2 text-muted-foreground">Start one — &quot;Comfort rewatches,&quot; &quot;2026 favourites,&quot; anything.</p>
            <Button className="mt-6" onClick={() => setCreateOpen(true)}>+ New list</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => (
            <Card key={list.id} className="cursor-pointer overflow-hidden transition hover:border-primary/50" onClick={() => openDetail(list.id)}>
              <CardContent className="p-0">
                <div className="grid grid-cols-4 h-24">
                  {Array.from({ length: 4 }).map((_, i) => {
                    const entry = list.entries[i];
                    const extra = entry ? parseExtra(entry.extra) : {};
                    return (
                      <div key={i} className="relative overflow-hidden border-r last:border-r-0">
                        {entry ? (
                          <CoverImage src={entry.coverUrl} alt={entry.title} icon={extra.cover || TYPE_ICONS[entry.type]} accent={extra.accent} sizes="100px" />
                        ) : <div className="h-full w-full bg-muted" />}
                      </div>
                    );
                  })}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold truncate">{list.name}</h3>
                    {!list.isPublic && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Private</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{list._count.entries} title{list._count.entries === 1 ? "" : "s"}</p>
                  {list.description && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{list.description}</p>}
                  <div className="mt-3 pt-3 border-t">
                    <InteractionBar
                      listId={list.id}
                      counts={list.counts}
                      viewerState={list.viewerState}
                      onChange={(counts, viewerState) => setLists((prev) => prev.map((l) => (l.id === list.id ? { ...l, counts, viewerState } : l)))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New list</DialogTitle>
            <DialogDescription>Give it a name — you can add titles from Discover right after.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input className="mt-1" maxLength={80} placeholder="e.g. Comfort rewatches" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} /></div>
            <div><Label>Description (optional)</Label><Textarea className="mt-1" maxLength={240} value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Checkbox checked={createForm.isPublic} onCheckedChange={(c) => setCreateForm({ ...createForm, isPublic: !!c })} /><Label>Public</Label></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createList} disabled={creating || !createForm.name.trim()}>{creating ? "Creating…" : "Create list"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
