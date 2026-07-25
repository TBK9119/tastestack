"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function FollowButton({
  username,
  initialFollowing,
}: {
  username: string;
  initialFollowing: boolean;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  if (!session) {
    return (
      <Link
        href="/login"
        className="rounded-full border border-white/25 px-4 py-1.5 text-xs font-semibold hover:bg-white/10"
      >
        Log in to follow
      </Link>
    );
  }

  async function toggle() {
    setLoading(true);
    const res = await fetch(`/api/users/${username}/follow`, {
      method: following ? "DELETE" : "POST",
    });
    setLoading(false);
    if (res.ok) {
      setFollowing(!following);
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={
        following
          ? "rounded-full border border-white/25 px-4 py-1.5 text-xs font-semibold text-ink-300 hover:border-danger hover:text-danger"
          : "rounded-full bg-brand-500 px-4 py-1.5 text-xs font-semibold text-ink-950 hover:bg-brand-400"
      }
    >
      {loading ? "…" : following ? "Following" : "+ Follow"}
    </button>
  );
}
