import type { Metadata } from "next";
import AppShell from "@/components/tastestack/AppShell";
import ProfilePage from "@/components/tastestack/ProfilePage";

const siteUrl = "https://tastestack.vercel.app";
// Falls back to the production URL, but calls whatever host is actually
// serving this request first (local dev, a Vercel preview, prod) so
// metadata previews are correct everywhere, not just in production.
const apiBase = process.env.NEXTAUTH_URL || siteUrl;

type Props = { params: Promise<{ username: string }> };

interface PublicProfile {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  isPublic: boolean;
  totalItems: number;
}

async function getProfile(username: string): Promise<PublicProfile | null> {
  try {
    const res = await fetch(`${apiBase}/api/profile/${encodeURIComponent(username)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(username);

  if (!profile || !profile.isPublic) {
    return { title: `@${username}`, description: `View @${username}'s taste profile on TasteStack.` };
  }

  const title = `${profile.displayName} (@${profile.username})`;
  const description = profile.bio
    ? profile.bio
    : `${profile.displayName} is tracking ${profile.totalItems} titles on TasteStack — anime, manga, movies, TV, games, music and books.`;
  const url = `${siteUrl}/profile/${profile.username}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      url,
      siteName: "TasteStack",
      title,
      description,
      images: profile.avatarUrl ? [{ url: profile.avatarUrl, width: 256, height: 256, alt: profile.displayName }] : undefined,
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: profile.avatarUrl ? [profile.avatarUrl] : undefined,
    },
  };
}

export default async function Page({ params }: Props) {
  const { username } = await params;
  return (
    <AppShell>
      <ProfilePage username={username} />
    </AppShell>
  );
}
