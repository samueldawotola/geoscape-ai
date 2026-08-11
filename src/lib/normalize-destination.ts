function fallbackTitleCase(input: string): string {
  return input
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Resolves free-text destination input (e.g. "kyoto japan") to its proper
 * place name (e.g. "Kyoto, Japan") via Google Places Text Search. Falls back
 * to simple title-casing if the lookup fails or finds no match.
 */
export async function normalizeDestination(input: string): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  try {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
          "X-Goog-FieldMask": "places.formattedAddress",
        },
        body: JSON.stringify({ textQuery: trimmed }),
      },
    );

    if (!res.ok) return fallbackTitleCase(trimmed);

    const data = await res.json();
    const formatted = data?.places?.[0]?.formattedAddress;
    return typeof formatted === "string" && formatted.length > 0
      ? formatted
      : fallbackTitleCase(trimmed);
  } catch (err) {
    console.error("normalizeDestination failed:", err);
    return fallbackTitleCase(trimmed);
  }
}
