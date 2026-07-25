"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = [
  { value: "planned", label: "Plan to try" },
  { value: "watching", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "onhold", label: "On hold" },
  { value: "dropped", label: "Dropped" },
];

export default function ItemActions({
  id,
  title,
  status,
  rating,
  progressCurrent,
  progressTotal,
  review,
  isFavorite,
  progressLabel,
}: {
  id: string;
  title: string;
  status: string;
  rating: number;
  progressCurrent: number;
  progressTotal: number;
  review: string;
  isFavorite: boolean;
  progressLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    status,
    rating,
    progressCurrent,
    progressTotal,
    review,
    isFavorite,
  });

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not save changes.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function removeItem() {
    if (!confirm(`Remove "${title}" from your stack?`)) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
    setSaving(false);
    if (!res.ok) {
      setError("Could not remove this title.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Edit ${title}`}
        className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-ink-950/80 text-ink-300 opacity-0 backdrop-blur transition group-hover:opacity-100 hover:text-brand-500 focus:opacity-100"
      >
        ✎
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-ink-300">{title}</h3>

            <label className="mt-4 block text-xs font-semibold text-ink-500">
              Status
            </label>
            <select
              className="input mt-1"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <label className="mt-4 block text-xs font-semibold text-ink-500">
              Rating {form.rating ? `— ${form.rating}/10` : "— unrated"}
            </label>
            <input
              type="range"
              min={0}
              max={10}
              value={form.rating}
              onChange={(e) =>
                setForm({ ...form, rating: Number(e.target.value) })
              }
              className="mt-2 w-full accent-[#3db4f2]"
            />

            {progressLabel && (
              <div className="mt-4">
                <label className="block text-xs font-semibold text-ink-500">
                  Progress ({progressLabel})
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    className="input w-20"
                    value={form.progressCurrent}
                    onChange={(e) =>
                      setForm({ ...form, progressCurrent: Number(e.target.value) })
                    }
                  />
                  <span className="text-ink-600">/</span>
                  <input
                    type="number"
                    min={0}
                    className="input w-20"
                    value={form.progressTotal}
                    onChange={(e) =>
                      setForm({ ...form, progressTotal: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            )}

            <label className="mt-4 block text-xs font-semibold text-ink-500">
              Review{" "}
              <span className="font-normal text-ink-600">
                ({form.review.length}/500)
              </span>
            </label>
            <textarea
              className="input mt-1 min-h-20 resize-y"
              maxLength={500}
              value={form.review}
              onChange={(e) => setForm({ ...form, review: e.target.value })}
              placeholder="What did you think?"
            />

            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-[#3db4f2]"
                checked={form.isFavorite}
                onChange={(e) =>
                  setForm({ ...form, isFavorite: e.target.checked })
                }
              />
              Favourite
            </label>

            {error && <p className="mt-3 text-sm text-danger">{error}</p>}

            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="btn-primary grow"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={removeItem}
                className="btn-secondary text-danger hover:border-danger"
              >
                Remove
              </button>
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
