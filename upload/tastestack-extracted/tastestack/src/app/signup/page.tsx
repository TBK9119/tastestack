"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    username: "",
    displayName: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");

      // Auto-login after signup
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (result?.error) throw new Error("Account created, please log in");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold mb-6 text-center">Create your account</h1>
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-400 mb-1">
            Email
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-400 mb-1">
            Username (your profile URL)
          </label>
          <div className="flex items-center">
            <span className="px-2 py-2 bg-ink-850 border border-ink-700 border-r-0 rounded-l-md text-ink-600 text-sm">
              /u/
            </span>
            <input
              type="text"
              required
              pattern="[a-zA-Z0-9_]{3,20}"
              title="3-20 chars: letters, numbers, underscore"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="input rounded-l-none"
              placeholder="thava"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-400 mb-1">
            Display name
          </label>
          <input
            type="text"
            required
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            className="input"
            placeholder="Thava"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-400 mb-1">
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="input"
            placeholder="At least 6 characters"
          />
        </div>

        {error && <div className="text-danger text-sm">{error}</div>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Creating…" : "Sign up"}
        </button>
      </form>
      <p className="text-center text-ink-500 text-sm mt-4">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-500">
          Log in
        </Link>
      </p>
    </div>
  );
}
