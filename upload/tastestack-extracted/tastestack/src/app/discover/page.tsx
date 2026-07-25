import { MEDIA_TYPES, mediaConfig, isKeyAvailable, type MediaType } from "@/lib/constants";
import DiscoverClient from "./DiscoverClient";

// Server component: works out server-side which media types have a live
// search provider ready (no key needed, or a key configured in .env.local)
// versus which ones are still showing the curated demo catalog.
export default function DiscoverPage() {
  const availability = Object.fromEntries(
    MEDIA_TYPES.map((config) => [config.type, isKeyAvailable(mediaConfig(config.type))])
  ) as Record<MediaType, boolean>;

  return <DiscoverClient availability={availability} />;
}
