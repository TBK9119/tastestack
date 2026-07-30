"use client";

import Image from "next/image";

type CoverImageProps = {
  src?: string;
  alt: string;
  icon?: string;
  accent?: string;
  fallbackClassName?: string;
  sizes?: string;
};

// Shared cover-art renderer for item cards across Discover/Profile/Lists.
// Uses next/image for real cover art (lazy-loaded, resized, blur-free but
// optimized) and falls back to a gradient + icon tile when there's no cover
// URL — curated catalog entries, or a source that didn't return artwork.
// The parent element must be `relative` (and usually `overflow-hidden`) since
// this renders with `fill`.
export default function CoverImage({ src, alt, icon, accent, fallbackClassName, sizes }: CoverImageProps) {
  if (!src) {
    return (
      <div
        className={`flex h-full w-full items-end text-2xl ${fallbackClassName || "p-2"}`}
        style={{ background: `linear-gradient(145deg, ${accent || "#2e51a2"}, hsl(var(--card)) 90%)` }}
      >
        {icon || "✦"}
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes || "(max-width: 640px) 33vw, 160px"}
      className="object-cover"
      referrerPolicy="no-referrer"
    />
  );
}
