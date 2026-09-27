import { NextRequest, NextResponse } from "next/server";
import { readElevationGrid } from "@/settlement-analyzer/water/elevation-source";
import { assertSameOrigin } from "@/settlement-analyzer/server/security";

export const runtime = "nodejs";

const CACHE_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; body: { sourceName: string; resolutionM: number; samples: unknown[] } }>();

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function spanKm(west: number, south: number, east: number, north: number) {
  const height = Math.abs(north - south) * 111.32;
  const width = Math.abs(east - west) * 111.32 * Math.cos((((south + north) / 2) * Math.PI) / 180);
  return Math.max(height, width);
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await request.json() as Record<string, unknown>;
    const { west, south, east, north } = body;
    if (!finite(west) || !finite(south) || !finite(east) || !finite(north) || east <= west || north <= south || spanKm(west, south, east, north) > 30) {
      return NextResponse.json({ error: "bbox-out-of-range" }, { status: 400 });
    }
    const key = [west, south, east, north].map((value) => value.toFixed(3)).join(":");
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_MS) {
      return NextResponse.json({ ...cached.body, fetchedAt: new Date(cached.at).toISOString() });
    }
    const read = await readElevationGrid(west, south, east, north);
    if (!read) return NextResponse.json({ error: "terrain-unavailable" }, { status: 503 });
    cache.set(key, { at: Date.now(), body: read });
    return NextResponse.json({ ...read, fetchedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "terrain-unavailable" }, { status: 503 });
  }
}
