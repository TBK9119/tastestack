import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { STATUS_META, mediaConfig, type MediaType } from "@/lib/constants";
import type { ItemData } from "@/store/app-store";

export interface EditItemModalProps {
  item: ItemData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void; // Called after successful save/remove
}

export default function EditItemModal({ item, isOpen, onClose, onSave }: EditItemModalProps) {
  const [editForm, setEditForm] = useState({ status: "", rating: 0, progressCurrent: 0, progressTotal: 0, review: "", isFavorite: false });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (item && isOpen) {
      setEditForm({
        status: item.status || "planned",
        rating: item.rating || 0,
        progressCurrent: item.progressCurrent || 0,
        progressTotal: item.progressTotal || 0,
        review: item.review || "",
        isFavorite: item.isFavorite || false
      });
    }
  }, [item, isOpen]);

  const saveEdit = async () => {
    if (!item) return;
    setSaving(true);
    const res = await fetch(`/api/items/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
    setSaving(false);
    if (res.ok) { 
      toast({ title: "Saved!" }); 
      onClose();
      if (onSave) onSave();
    } else { 
      const d = await res.json().catch(() => ({})); 
      toast({ title: "Error", description: d.error, variant: "destructive" }); 
    }
  };

  const removeItem = async () => {
    if (!item) return;
    setSaving(true);
    const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
    setSaving(false);
    if (res.ok) { 
      toast({ title: "Removed from stack" }); 
      onClose();
      if (onSave) onSave();
    } else {
      toast({ title: "Error", description: "Could not remove item", variant: "destructive" }); 
    }
  };

  if (!item) return null;

  const progressLabel = mediaConfig(item.type as MediaType)?.progressLabel;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{item.title}</DialogTitle>
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
          {progressLabel && (
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={saveEdit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
