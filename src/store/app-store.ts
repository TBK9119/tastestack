import { create } from "zustand";
import type { MediaType, ItemStatus } from "@/lib/constants";

export type { MediaType, ItemStatus };

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
}

export interface ProfileData {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  bannerColor: string;
  isPublic: boolean;
  isOwn: boolean;
  isFollowing: boolean;
  counts: Record<string, number>;
  totalItems: number;
  favoritesCount: number;
  followersCount: number;
  followingCount: number;
}

export interface ItemData {
  id: string;
  userId: string;
  type: MediaType;
  apiId: string;
  source: string;
  title: string;
  coverUrl: string;
  year: string;
  extra: string;
  status: ItemStatus;
  rating: number;
  progressCurrent: number;
  progressTotal: number;
  review: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEntry {
  id: string;
  userId: string;
  itemId: string | null;
  item: { id: string; title: string; type: string; coverUrl: string; extra: string } | null;
  user: { username: string; displayName: string };
  action: string;
  createdAt: string;
}

// NOTE: "Which page am I on" used to live here (a `view` field persisted to
// sessionStorage) because the whole app was a single client-rendered route.
// Now that every page is a real Next.js URL (see src/app/*), the URL itself
// is the source of truth for navigation — the browser already handles that
// state for us, and it's shareable/crawlable for free. This store only
// holds the signed-in user, mirrored from NextAuth's session by AuthProvider
// so components can read it without calling useSession() everywhere.
interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  loading: true,
  setLoading: (loading) => set({ loading }),
}));
