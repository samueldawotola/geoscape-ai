import { searchGooglePlacesHotels } from "@/lib/hotel-sources";

export async function POST(req: Request) {
  const { lat, lng, type, destination } = await req.json();
  const places = await searchGooglePlacesHotels(lat, lng, destination, type);
  return Response.json(places);
}
