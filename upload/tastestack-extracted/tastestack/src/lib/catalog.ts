import type { MediaType } from "@/lib/constants";

export type CatalogItem = { apiId: string; type: MediaType; title: string; year: string; creator: string; progressTotal: number; cover: string; accent: string; description: string };

export const CATALOG: CatalogItem[] = [
  { apiId: "frieren", type: "anime", title: "Frieren: Beyond Journey's End", year: "2023", creator: "Madhouse", progressTotal: 28, cover: "✦", accent: "#7c6ee6", description: "An elf mage retraces a heroic journey and learns what time means." },
  { apiId: "dandadan", type: "anime", title: "DAN DA DAN", year: "2024", creator: "Science SARU", progressTotal: 12, cover: "◉", accent: "#ee6f87", description: "A supernatural sprint through ghosts, aliens, and first love." },
  { apiId: "vagabond", type: "manga", title: "Vagabond", year: "1998", creator: "Takehiko Inoue", progressTotal: 327, cover: "⚔", accent: "#bd8054", description: "A striking, meditative reimagining of the life of Musashi." },
  { apiId: "perfect-days", type: "movie", title: "Perfect Days", year: "2023", creator: "Wim Wenders", progressTotal: 1, cover: "☀", accent: "#e6a74b", description: "A quiet Tokyo life becomes unexpectedly luminous." },
  { apiId: "dune-two", type: "movie", title: "Dune: Part Two", year: "2024", creator: "Denis Villeneuve", progressTotal: 1, cover: "◒", accent: "#b78051", description: "Paul Atreides embraces his destiny on Arrakis." },
  { apiId: "bear", type: "tv", title: "The Bear", year: "2022", creator: "FX", progressTotal: 28, cover: "✺", accent: "#e78754", description: "A chef returns home to run his family's Chicago sandwich shop." },
  { apiId: "blue-eye", type: "tv", title: "Blue Eye Samurai", year: "2023", creator: "Netflix", progressTotal: 8, cover: "◈", accent: "#5b8ed7", description: "A fierce revenge epic set in Edo-period Japan." },
  { apiId: "hades", type: "game", title: "Hades", year: "2020", creator: "Supergiant Games", progressTotal: 25, cover: "♜", accent: "#a34f5b", description: "Battle out of the underworld in a godlike rogue-like dungeon crawler." },
  { apiId: "outer-wilds", type: "game", title: "Outer Wilds", year: "2019", creator: "Mobius Digital", progressTotal: 22, cover: "◌", accent: "#446fa7", description: "Explore a solar system trapped in an endless time loop." },
  { apiId: "brat", type: "album", title: "BRAT", year: "2024", creator: "Charli xcx", progressTotal: 1, cover: "♢", accent: "#9abe32", description: "A sharp, high-gloss pop record made for the club." },
  { apiId: "imaginal", type: "album", title: "Imaginal Disk", year: "2024", creator: "Magdalena Bay", progressTotal: 1, cover: "◎", accent: "#e86d96", description: "A meticulously imagined world of adventurous synth-pop." },
  { apiId: "piranesi", type: "book", title: "Piranesi", year: "2020", creator: "Susanna Clarke", progressTotal: 272, cover: "⌂", accent: "#7d9c8d", description: "A mysterious man wanders an infinite, statue-filled house." },
  { apiId: "project-hail-mary", type: "book", title: "Project Hail Mary", year: "2021", creator: "Andy Weir", progressTotal: 496, cover: "✺", accent: "#e4a84f", description: "A lone astronaut must save Earth with an improbable ally." },
];

export const TYPE_ICONS: Record<MediaType, string> = { anime: "✦", manga: "▤", movie: "▶", tv: "▣", game: "♜", album: "♫", book: "▥" };
