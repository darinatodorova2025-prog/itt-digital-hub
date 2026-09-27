import { NextRequest, NextResponse } from "next/server";
import { elevationGrid, TERRAIN_SOURCE, type ElevationSample } from "@/settlement-analyzer/water/metrics";
import { assertSameOrigin } from "@/settlement-analyzer/server/security";

export const runtime = "nodejs";

const CACHE_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; samples: ElevationSample[] }>();

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
      return NextResponse.json({ ...TERRAIN_SOURCE, fetchedAt: new Date(cached.at).toISOString(), samples: cached.samples });
    }
    const grid = elevationGrid(west, south, east, north, 64);
    const url = new URL("https://api.open-meteo.com/v1/elevation");
    url.searchParams.set("latitude", grid.map((cell) => cell.lat.toFixed(5)).join(","));
    url.searchParams.set("longitude", grid.map((cell) => cell.lon.toFixed(5)).join(","));
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "ITT-Digital-Hub-Settlement-Analyzer/1.0 (https://ittdigitalhub.org; terrain)" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return NextResponse.json({ error: "terrain-unavailable" }, { status: 503 });
    const payload = await response.json() as { elevation?: number[] };
    if (!Array.isArray(payload.elevation) || payload.elevation.length !== grid.length) {
      return NextResponse.json({ error: "terrain-unavailable" }, { status: 503 });
    }
    const samples = grid.flatMap((cell, index) => {
      const elevationM = payload.elevation?.[index];
      if (elevationM == null || !Number.isFinite(elevationM)) return [];
      return [{ lat: cell.lat, lon: cell.lon, elevationM, dLat: cell.dLat, dLon: cell.dLon }];
    });
    cache.set(key, { at: Date.now(), samples });
    return NextResponse.json({ ...TERRAIN_SOURCE, fetchedAt: new Date().toISOString(), samples });
  } catch {
    return NextResponse.json({ error: "terrain-unavailable" }, { status: 503 });
  }
}
