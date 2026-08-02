import { describe, it, expect } from "vitest";
import { parseMyAnimeListXml, parseLetterboxdCsv, parseGoodreadsCsv } from "@/lib/import/parsers";

describe("parseMyAnimeListXml", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<myanimelist>
  <anime>
    <series_title>Fullmetal Alchemist: Brotherhood</series_title>
    <series_episodes>64</series_episodes>
    <my_watched_episodes>64</my_watched_episodes>
    <my_status>Completed</my_status>
    <my_score>10</my_score>
  </anime>
  <anime>
    <series_title>One Piece</series_title>
    <series_episodes>0</series_episodes>
    <my_watched_episodes>1100</my_watched_episodes>
    <my_status>Watching</my_status>
    <my_score>0</my_score>
  </anime>
  <anime>
    <series_title></series_title>
    <series_episodes>12</series_episodes>
    <my_watched_episodes>0</my_watched_episodes>
    <my_status>Plan to Watch</my_status>
    <my_score>0</my_score>
  </anime>
  <anime>
    <series_title>Overrated Show</series_title>
    <series_episodes>12</series_episodes>
    <my_watched_episodes>12</my_watched_episodes>
    <my_status>SomeUnknownStatus</my_status>
    <my_score>15</my_score>
  </anime>
  <manga>
    <series_title>Berserk</series_title>
    <series_chapters>0</series_chapters>
    <my_read_chapters>375</my_read_chapters>
    <my_status>Reading</my_status>
    <my_score>9</my_score>
  </manga>
</myanimelist>`;

  it("parses anime entries and skips ones with no title", () => {
    const { anime } = parseMyAnimeListXml(xml);
    expect(anime).toHaveLength(3);
    expect(anime[0]).toEqual({
      title: "Fullmetal Alchemist: Brotherhood",
      status: "completed",
      rating: 10,
      progressCurrent: 64,
      progressTotal: 64,
    });
  });

  it("defaults an unrecognized MAL status to planned", () => {
    const { anime } = parseMyAnimeListXml(xml);
    const overrated = anime.find((a) => a.title === "Overrated Show");
    expect(overrated?.status).toBe("planned");
  });

  it("clamps score to the 0-10 range", () => {
    const { anime } = parseMyAnimeListXml(xml);
    const overrated = anime.find((a) => a.title === "Overrated Show");
    expect(overrated?.rating).toBe(10); // my_score of 15 clamped down
  });

  it("parses manga separately from anime", () => {
    const { manga } = parseMyAnimeListXml(xml);
    expect(manga).toEqual([
      { title: "Berserk", status: "watching", rating: 9, progressCurrent: 375, progressTotal: 0 },
    ]);
  });

  it("returns empty lists instead of throwing on garbage input", () => {
    expect(parseMyAnimeListXml("this is not xml at all")).toEqual({ anime: [], manga: [] });
    expect(parseMyAnimeListXml("")).toEqual({ anime: [], manga: [] });
  });
});

describe("parseLetterboxdCsv", () => {
  const csv = `Name,Year,Rating
Parasite,2019,5
Parasite,2019,3
The Room,2003,0.5
,2020,4`;

  it("converts a 5-star scale to TasteStack's 0-10 scale", () => {
    const entries = parseLetterboxdCsv(csv);
    const parasite = entries.find((e) => e.title === "Parasite");
    expect(parasite?.rating).toBe(10);
  });

  it("keeps the higher rating when the same film appears twice", () => {
    const entries = parseLetterboxdCsv(csv);
    const parasiteEntries = entries.filter((e) => e.title === "Parasite");
    expect(parasiteEntries).toHaveLength(1);
    expect(parasiteEntries[0].rating).toBe(10); // not overwritten by the later 3-star row
  });

  it("skips rows with no film name", () => {
    const entries = parseLetterboxdCsv(csv);
    expect(entries.some((e) => e.year === "2020")).toBe(false);
    expect(entries).toHaveLength(2);
  });

  it("marks every entry as completed", () => {
    const entries = parseLetterboxdCsv(csv);
    expect(entries.every((e) => e.status === "completed")).toBe(true);
  });
});

describe("parseGoodreadsCsv", () => {
  const csv = `Title,Exclusive Shelf,My Rating,Number of Pages,Original Publication Year,Year Published
Dune,read,5,412,1965,1965
Project Hail Mary,currently-reading,0,476,2021,2021
The Silmarillion,to-read,0,365,1977,1977
Foundation,read,5,255,,1990
,read,4,300,2000,2000`;

  it("maps Goodreads shelves to TasteStack statuses", () => {
    const entries = parseGoodreadsCsv(csv);
    const byTitle = Object.fromEntries(entries.map((e) => [e.title, e]));
    expect(byTitle["Dune"].status).toBe("completed");
    expect(byTitle["Project Hail Mary"].status).toBe("watching");
    expect(byTitle["The Silmarillion"].status).toBe("planned");
  });

  it("only counts progress pages for completed books", () => {
    const entries = parseGoodreadsCsv(csv);
    const byTitle = Object.fromEntries(entries.map((e) => [e.title, e]));
    expect(byTitle["Dune"].progressCurrent).toBe(412);
    expect(byTitle["Project Hail Mary"].progressCurrent).toBe(0);
    expect(byTitle["Project Hail Mary"].progressTotal).toBe(476);
  });

  it("falls back to Year Published when Original Publication Year is blank", () => {
    const entries = parseGoodreadsCsv(csv);
    const foundation = entries.find((e) => e.title === "Foundation");
    expect(foundation?.year).toBe("1990");
  });

  it("skips rows with no title", () => {
    const entries = parseGoodreadsCsv(csv);
    expect(entries).toHaveLength(4);
  });
});
