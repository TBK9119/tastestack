"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const { setView } = useAppStore();
  const [form, setForm] = useState({ email: "", username: "", displayName: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");

      const result = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      if (result?.error) throw new Error("Account created, please log in");
      toast({ title: "Welcome to TasteStack!", description: "Your profile is ready." });
      setView("discover");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
            </div>
            <div>
              <Label htmlFor="username">Username (your profile URL)</Label>
              <div className="flex">
                <span className="px-3 py-2 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">/u/</span>
                <Input id="username" type="text" required pattern="[a-zA-Z0-9_]{3,20}" title="3-20 chars: letters, numbers, underscore" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="yourusername" className="rounded-l-none" />
              </div>
            </div>
            <div>
              <Label htmlFor="displayName">Display name</Label>
              <Input id="displayName" type="text" required value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Your Name" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">{loading ? "Creating…" : "Sign up"}</Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <button onClick={() => setView("login")} className="text-primary hover:underline font-medium">Log in</button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
