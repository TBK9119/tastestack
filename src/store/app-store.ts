import { create } from "zustand";
import type { MediaType, ItemStatus } from "@/lib/constants";

export type View = "landing" | "login" | "signup" | "discover" | "profile" | "public-profile" | "feed" | "settings";

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
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

interface AppState {
  // Navigation
  view: View;
  setView: (view: View) => void;
  viewProfileUsername: string | null;
  setViewProfileUsername: (username: string | null) => void;

  // Auth
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "landing",
  setView: (view) => set({ view }),
  viewProfileUsername: null,
  setViewProfileUsername: (username) => set({ viewProfileUsername: username }),
  user: null,
  setUser: (user) => set({ user }),
  loading: true,
  setLoading: (loading) => set({ loading }),
}));
