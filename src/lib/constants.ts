export type MediaType = "anime" | "manga" | "movie" | "tv" | "game" | "album" | "book";
export type ItemStatus = "watching" | "completed" | "planned" | "dropped" | "onhold";
export type ApiSource = "anilist" | "tmdb" | "rawg" | "lastfm" | "openlibrary";

export interface MediaConfig {
  type: MediaType;
  label: string;
  source: ApiSource;
  requiresKey: boolean;
  keyEnvVar?: string;
  progressLabel: string;
}

export const MEDIA_TYPES: MediaConfig[] = [
  { type: "anime", label: "Anime", source: "anilist", requiresKey: false, progressLabel: "Ep" },
  { type: "manga", label: "Manga", source: "anilist", requiresKey: false, progressLabel: "Ch" },
  { type: "movie", label: "Movies", source: "tmdb", requiresKey: true, keyEnvVar: "TMDB_API_KEY", progressLabel: "" },
  { type: "tv", label: "TV Shows", source: "tmdb", requiresKey: true, keyEnvVar: "TMDB_API_KEY", progressLabel: "Ep" },
  { type: "game", label: "Games", source: "rawg", requiresKey: true, keyEnvVar: "RAWG_API_KEY", progressLabel: "Hrs" },
  { type: "album", label: "Music", source: "lastfm", requiresKey: true, keyEnvVar: "LASTFM_API_KEY", progressLabel: "" },
  { type: "book", label: "Books", source: "openlibrary", requiresKey: false, progressLabel: "Page" },
];

export const STATUS_META: Record<ItemStatus, { label: string; shortLabel: string }> = {
  watching: { label: "Currently Watching", shortLabel: "Watching" },
  completed: { label: "Completed", shortLabel: "Done" },
  planned: { label: "Plan to Watch", shortLabel: "Planned" },
  onhold: { label: "On Hold", shortLabel: "On Hold" },
  dropped: { label: "Dropped", shortLabel: "Dropped" },
};

export const TYPE_ICONS: Record<MediaType, string> = {
  anime: "✦", manga: "▤", movie: "▶", tv: "▣", game: "♜", album: "♫", book: "▥",
};

export function mediaConfig(type: MediaType): MediaConfig {
  const c = MEDIA_TYPES.find((m) => m.type === type);
  return c || { type, label: type, source: "anilist", requiresKey: false, progressLabel: "" };
}
