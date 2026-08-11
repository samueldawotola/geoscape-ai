import { supabase } from "@/lib/supabase";

const OSM_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

type PlaceCacheRow = {
  id: string;
  source: string;
  destination: string;
  name: string;
  category: string;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  price_level: string | null;
  raw: Record<string, unknown>;
};

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    name?: string;
    tourism?: string;
    website?: string;
    phone?: string;
    "contact:phone"?: string;
    stars?: string;
  };
};

type GooglePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  photos?: Array<{ name?: string }>;
};

async function saveToCache(rows: PlaceCacheRow[]) {
  if (rows.length === 0) return;
  const { error, data } = await supabase
    .from("place_cache")
    .upsert(rows)
    .select();
  if (error) {
    console.error("Supabase save error:", error);
  } else {
    console.log("Places save successful, rows written:", data?.length);
  }
}

export async function geocodeDestination(
  destination: string,
): Promise<{
  lat: number;
  lng: number;
  bbox: { south: number; west: number; north: number; east: number };
} | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(destination)}`,
    { headers: { "User-Agent": "GeospaceAI/1.0 (https://geospace-ai.com)" } },
  );
  if (!res.ok) return null;

  const data = await res.json();
  const first = data?.[0];
  if (!first?.boundingbox) return null;

  const [south, north, west, east] = first.boundingbox.map(Number);
  return {
    lat: Number(first.lat),
    lng: Number(first.lon),
    bbox: { south, west, north, east },
  };
}

export async function searchOsmHotels(
  bbox: { south: number; west: number; north: number; east: number },
  destination?: string,
) {
  const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;

  const query = `
    [out:json][timeout:25];
    (
      node["tourism"~"hotel|guest_house|hostel"](${bboxStr});
      way["tourism"~"hotel|guest_house|hostel"](${bboxStr});
    );
    out center tags;
  `;

  async function tryMirror(mirror: string): Promise<Response> {
    let res: Response;
    try {
      res = await fetch(mirror, {
        method: "POST",
        headers: { "User-Agent": "GeospaceAI/1.0 (https://geospace-ai.com)" },
        body: query,
        signal: AbortSignal.timeout(12000),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`${mirror} failed: ${message}`);
    }
    if (!res.ok) {
      throw new Error(`${mirror} returned ${res.status}`);
    }
    return res;
  }

  const res = await Promise.any(OSM_MIRRORS.map(tryMirror));
  const data: { elements: OverpassElement[] } = await res.json();

  const results = data.elements.map((el) => ({
    id: `${el.type}-${el.id}`,
    name: el.tags?.name ?? "Unnamed",
    lat: el.lat ?? el.center?.lat ?? null,
    lng: el.lon ?? el.center?.lon ?? null,
    tags: el.tags,
  }));

  const rows: PlaceCacheRow[] = results.map((r) => ({
    id: `osm-${r.id}`,
    source: "osm",
    destination: destination ?? "unknown",
    name: r.name,
    category: r.tags?.tourism ?? "unknown",
    lat: r.lat,
    lng: r.lng,
    rating: null,
    price_level: null,
    raw: {
      website: r.tags?.website ?? null,
      phone: r.tags?.phone ?? r.tags?.["contact:phone"] ?? null,
      stars: r.tags?.stars ?? null,
    },
  }));

  console.log("OSM rows built:", rows.length);
  await saveToCache(rows);

  return results;
}

export async function searchGooglePlacesHotels(
  lat: number,
  lng: number,
  destination?: string,
  type: string = "lodging",
) {
  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchNearby",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.photos",
      },
      body: JSON.stringify({
        includedTypes: [type],
        maxResultCount: 20,
        locationRestriction: {
          circle: { center: { latitude: lat, longitude: lng }, radius: 15000 },
        },
      }),
    },
  );

  const data: { places?: GooglePlace[] } = await res.json();
  const places = data.places ?? [];

  const rows: PlaceCacheRow[] = places.map((p) => ({
    id: p.id,
    source: "google",
    destination: destination ?? "unknown",
    name: p.displayName?.text ?? "Unnamed",
    category: type,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    rating: p.rating ?? null,
    price_level: p.priceLevel ?? null,
    raw: {
      address: p.formattedAddress ?? null,
      photoRef: p.photos?.[0]?.name ?? null,
      reviewCount: p.userRatingCount ?? null,
    },
  }));

  console.log("Places rows built:", rows.length);
  await saveToCache(rows);

  return places;
}

export async function searchHotelsForDestination(destination: string) {
  const location = await geocodeDestination(destination);
  if (!location) {
    console.error(
      "Could not geocode destination for hotel search:",
      destination,
    );
    return;
  }

  const [osm, google] = await Promise.allSettled([
    searchOsmHotels(location.bbox, destination),
    searchGooglePlacesHotels(
      location.lat,
      location.lng,
      destination,
      "lodging",
    ),
  ]);

  if (osm.status === "rejected") {
    console.error("OSM hotel search failed:", osm.reason);
  }
  if (google.status === "rejected") {
    console.error("Google Places hotel search failed:", google.reason);
  }
}
