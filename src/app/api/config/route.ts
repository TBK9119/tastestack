import { NextResponse } from "next/server";

// Reports which media types currently have live search available, based on
// which optional API keys are set — never exposes the key values themselves.
export async function GET() {
  const liveTypes = ["anime", "manga", "book"]; // always free, no key needed
  if (process.env.TMDB_API_KEY) liveTypes.push("movie", "tv");
  if (process.env.RAWG_API_KEY) liveTypes.push("game");
  if (process.env.LASTFM_API_KEY) liveTypes.push("album");
  return NextResponse.json({ liveTypes });
}
