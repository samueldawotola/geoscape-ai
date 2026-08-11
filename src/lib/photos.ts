import type { StickyScrollCardItem } from "@/components/ui/sticky-scroll-cards";

const EXCLUDE_PATTERN = /flag_of|coat_of_arms|locator_map|_map_|\.svg$|icon/i;

function cleanPhotoTitle(rawTitle: string): string {
  return rawTitle
    .replace(/\.[a-zA-Z0-9]+$/, "") // strip file extension
    .replace(/_/g, " ")
    .replace(/\([^)]*\d[^)]*\)/g, " ") // drop parenthetical IDs, e.g. (44050138950)
    .replace(/\d+/g, " ") // drop remaining numbers, e.g. dates, index suffixes
    .replace(/\s*,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/[,-]\s*$/, "")
    .trim();
}

export async function getDestinationPhotos(
  destination: string,
  limit = 6,
): Promise<StickyScrollCardItem[]> {
  try {
    // Search on just the locality (e.g. "Miami" out of "Miami, FL, USA") —
    // state/country suffixes throw off Wikipedia's relevance ranking and can
    // match an unrelated article with few or no usable photos.
    const searchTerm = destination.split(",")[0].trim() || destination;

    const searchUrl = `https://en.wikipedia.org/w/api.php?${new URLSearchParams(
      {
        action: "query",
        list: "search",
        srsearch: searchTerm,
        srlimit: "1",
        format: "json",
        origin: "*",
      },
    )}`;

    const searchRes = await fetch(searchUrl, { next: { revalidate: 86400 } });
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const title = searchData?.query?.search?.[0]?.title;
    if (!title) return [];

    const mediaRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(title)}`,
      { next: { revalidate: 86400 } },
    );
    if (!mediaRes.ok) return [];
    const mediaData = await mediaRes.json();

    const items = (mediaData?.items ?? []) as Array<{
      title?: string;
      type?: string;
      srcset?: Array<{ src?: string; scale?: string }>;
    }>;

    const photos: StickyScrollCardItem[] = [];
    for (const item of items) {
      if (item.type !== "image") continue;
      const rawTitle = item.title?.replace(/^File:/, "") ?? "";
      const rawSrc = item.srcset?.at(-1)?.src;
      if (!rawTitle || !rawSrc || EXCLUDE_PATTERN.test(rawTitle)) continue;

      const title = cleanPhotoTitle(rawTitle);
      if (!title) continue;

      const src = rawSrc.startsWith("//") ? `https:${rawSrc}` : rawSrc;
      photos.push({ title, src });
      if (photos.length >= limit) break;
    }

    return photos;
  } catch (err) {
    console.error("Failed to fetch destination photos:", err);
    return [];
  }
}
