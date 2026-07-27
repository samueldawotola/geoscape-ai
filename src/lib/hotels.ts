import { supabase } from "@/lib/supabase";

export type CachedHotel = {
  id: string;
  source: string;
  destination: string;
  name: string;
  category: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  price_level: string | null;
  raw: {
    website?: string | null;
    phone?: string | null;
    stars?: string | null;
    address?: string | null;
    reviewCount?: number | null;
  } | null;
};

const HOTEL_CATEGORIES = ["hotel", "guest_house", "hostel", "lodging"];

export async function getHotelsForDestination(
  destination: string,
): Promise<CachedHotel[]> {
  const { data, error } = await supabase
    .from("place_cache")
    .select("*")
    .eq("destination", destination)
    .in("category", HOTEL_CATEGORIES)
    .order("rating", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("Failed to load hotels:", error);
    return [];
  }

  return data ?? [];
}
