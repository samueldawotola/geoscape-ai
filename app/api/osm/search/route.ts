import { searchOsmHotels } from "@/lib/hotel-sources";

export async function POST(req: Request) {
  const { south, west, north, east, destination } = await req.json();

  try {
    const results = await searchOsmHotels(
      { south, west, north, east },
      destination,
    );
    return Response.json(results);
  } catch (err) {
    const details =
      err instanceof AggregateError
        ? err.errors
            .map((e: unknown) => (e instanceof Error ? e.message : String(e)))
            .join(" | ")
        : String(err);
    console.error("All Overpass mirrors failed:", details);
    return Response.json(
      { error: "All Overpass mirrors failed", details },
      { status: 502 },
    );
  }
}
