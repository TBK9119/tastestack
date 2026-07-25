"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const COLORS = ["#2e51a2", "#7c3aed", "#be185d", "#0f766e", "#b45309"];

export default function SettingsPage() {
  const { data: session } = useSession();
  const { user, setView } = useAppStore();
  const [form, setForm] = useState({ displayName: "", bio: "", bannerColor: "#2e51a2", isPublic: true });
  const [state, setState] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (session) fetch("/api/profile").then((r) => r.json()).then((data) => setForm(data)).catch(() => {});
  }, [session]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("Saving…");
    const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (res.ok) { toast({ title: "Profile updated!" }); setState("Saved — your profile is up to date."); }
    else { setState(data.error || "Could not save."); toast({ title: "Error", description: data.error, variant: "destructive" }); }
  }

  if (!session) return (
    <div className="max-w-lg mx-auto px-5 py-16 text-center">
      <h1 className="text-3xl font-black">Make it yours.</h1>
      <p className="mt-3 text-muted-foreground">Log in to edit your TasteStack profile.</p>
      <Button className="mt-6" onClick={() => setView("login")}>Log in</Button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 py-10">
      <p className="text-xs font-bold tracking-[.18em] text-primary">SETTINGS</p>
      <h1 className="mt-3 text-3xl font-black">Shape your profile.</h1>
      <p className="mt-2 text-muted-foreground">This is how the rest of TasteStack sees you.</p>

      <form onSubmit={save} className="mt-8 space-y-6">
        <Card><CardContent className="p-5 sm:p-7 space-y-6">
          <div>
            <Label>Display name</Label>
            <Input className="mt-2" value={form.displayName} maxLength={40} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </div>
          <div>
            <Label>Bio <span className="font-normal text-muted-foreground">({form.bio?.length || 0}/240)</span></Label>
            <Textarea className="mt-2 min-h-28" value={form.bio || ""} maxLength={240} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell people what you keep coming back to." />
          </div>
          <div>
            <Label>Profile colour</Label>
            <div className="mt-3 flex gap-3">
              {COLORS.map((colour) => (
                <button key={colour} type="button" onClick={() => setForm({ ...form, bannerColor: colour })}
                  className={`h-9 w-9 rounded-full ring-offset-2 ring-offset-background ${form.bannerColor === colour ? "ring-2 ring-foreground" : ""}`}
                  style={{ background: colour }} />
              ))}
            </div>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox className="mt-0.5" checked={form.isPublic} onCheckedChange={(c) => setForm({ ...form, isPublic: !!c })} />
            <span><span className="block text-sm font-semibold">Public profile</span><span className="block mt-1 text-sm text-muted-foreground">Let people visit your TasteStack profile and see your lists.</span></span>
          </label>
          {state && <p className="rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary">{state}</p>}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button type="submit">Save changes</Button>
            <Button type="button" variant="outline" onClick={() => { useAppStore.getState().setViewProfileUsername(user?.username || ""); setView("public-profile"); }}>View profile</Button>
          </div>
        </CardContent></Card>
      </form>
    </div>
  );
}
