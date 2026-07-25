import type { NormalizedResult } from "./anilist";

const SEARCH_ENDPOINT = "https://openlibrary.org/search.json";

export async function searchOpenLibrary(query: string): Promise<NormalizedResult[]> {
  if (!query.trim()) return [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const url = new URL(SEARCH_ENDPOINT);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "20");
    url.searchParams.set("fields", "key,title,author_name,first_publish_year,cover_i,number_of_pages_median");
    const res = await fetch(url.toString(), { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const json = await res.json();
    const docs = json?.docs;
    if (!Array.isArray(docs)) return [];
    return docs
      .filter((d: any) => d?.title && d?.key)
      .map((d: any) => ({
        type: "book" as const,
        apiId: String(d.key).replace("/works/", ""),
        source: "openlibrary",
        title: d.title,
        creator: d.author_name?.[0] || "Unknown",
        year: d.first_publish_year ? String(d.first_publish_year) : "—",
        coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : "",
        description: "",
        progressTotal: Number(d.number_of_pages_median || 0) || 0,
      }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
