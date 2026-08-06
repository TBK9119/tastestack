import { describe, it, expect } from "vitest";
import { getCatalogItem, catalogSourceForType } from "./catalog";

describe("catalog", () => {
  describe("getCatalogItem", () => {
    it("should return the correct item for a valid apiId", () => {
      const item = getCatalogItem("frieren");
      expect(item).toBeDefined();
      expect(item?.title).toBe("Frieren: Beyond Journey's End");
      expect(item?.type).toBe("anime");
    });

    it("should return undefined for an invalid apiId", () => {
      const item = getCatalogItem("invalid-id-that-does-not-exist");
      expect(item).toBeUndefined();
    });
  });

  describe("catalogSourceForType", () => {
    it("should return anilist for anime and manga", () => {
      expect(catalogSourceForType("anime")).toBe("anilist");
      expect(catalogSourceForType("manga")).toBe("anilist");
    });

    it("should return openlibrary for book", () => {
      expect(catalogSourceForType("book")).toBe("openlibrary");
    });

    it("should return rawg for game", () => {
      expect(catalogSourceForType("game")).toBe("rawg");
    });

    it("should return lastfm for album", () => {
      expect(catalogSourceForType("album")).toBe("lastfm");
    });

    it("should return tmdb for movie and tv", () => {
      expect(catalogSourceForType("movie")).toBe("tmdb");
      expect(catalogSourceForType("tv")).toBe("tmdb");
    });
  });
});
