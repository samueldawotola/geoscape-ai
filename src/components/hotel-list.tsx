import { Star, Phone, MapPin } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CachedHotel } from "@/lib/hotels";

function formatPriceLevel(level: string): string {
  return level
    .replace(/^PRICE_LEVEL_/, "")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function HotelList({ hotels }: { hotels: CachedHotel[] }) {
  if (hotels.length === 0) {
    return (
      <Card className="border-dashed border-border/60 bg-card/40">
        <CardContent className="py-16 text-center text-muted-foreground">
          No hotels or stays found yet for this destination.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {hotels.map((hotel) => (
        <Card
          key={hotel.id}
          className="border-border/50 bg-card/60 backdrop-blur-sm"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base leading-snug">
                {hotel.raw?.website ? (
                  <a
                    href={hotel.raw.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary hover:underline"
                  >
                    {hotel.name}
                  </a>
                ) : (
                  hotel.name
                )}
              </CardTitle>
              <Badge variant="outline" className="shrink-0 capitalize">
                {(hotel.category ?? "stay").replace(/_/g, " ")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {hotel.raw?.address && <p>{hotel.raw.address}</p>}

            <div className="flex flex-wrap items-center gap-3">
              {hotel.rating !== null && (
                <span className="flex items-center gap-1">
                  <Star className="size-3.5 fill-current text-amber-500" />
                  {hotel.rating}
                  {hotel.raw?.reviewCount ? ` (${hotel.raw.reviewCount})` : ""}
                </span>
              )}
              {hotel.price_level && (
                <span>{formatPriceLevel(hotel.price_level)}</span>
              )}
              {hotel.raw?.stars && <span>{hotel.raw.stars}★ rated</span>}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              {hotel.raw?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3" />
                  {hotel.raw.phone}
                </span>
              )}
              {hotel.lat !== null && hotel.lng !== null && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${hotel.lat},${hotel.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <MapPin className="size-3" />
                  Map
                </a>
              )}
            </div>

            <span className="inline-block pt-1 text-[11px] tracking-wide text-muted-foreground/70 uppercase">
              via {hotel.source === "osm" ? "OpenStreetMap" : "Google Places"}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
