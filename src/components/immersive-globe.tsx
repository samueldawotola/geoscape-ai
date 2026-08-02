"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Globe2, Loader2, PersonStanding, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadGoogleMaps } from "@/lib/google-maps";


type Mode = "globe" | "street";

const WORLD_VIEW = {
  center: { lat: 20, lng: 0, altitude: 0 },
  range: 20_000_000, // metres from the camera to the target — full globe
  tilt: 0,
  heading: 0,
};

const CITY_VIEW = {
  range: 1200, // close enough for photorealistic buildings to resolve
  tilt: 65,
};

export default function ImmersiveGlobe() {
  const globeContainerRef = useRef<HTMLDivElement>(null);
  const streetContainerRef = useRef<HTMLDivElement>(null);
  const map3dRef = useRef<any>(null);
  const panoramaRef = useRef<any>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("globe");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  // ---- Boot the 3D globe -------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const g = await loadGoogleMaps();
        const { Map3DElement } = (await g.maps.importLibrary("maps3d")) as any;

        if (cancelled || !globeContainerRef.current) return;

        const map3d = new Map3DElement({
          center: WORLD_VIEW.center,
          range: WORLD_VIEW.range,
          tilt: WORLD_VIEW.tilt,
          heading: WORLD_VIEW.heading,
          mode: "HYBRID", // photorealistic tiles + labels
        });

        map3d.style.width = "100%";
        map3d.style.height = "100%";

        globeContainerRef.current.replaceChildren(map3d);
        map3dRef.current = map3d;
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setStatus("error");
        setMessage(
          err instanceof Error ? err.message : "Could not start the globe.",
        );
      }
    })();

    return () => {
      cancelled = true;
      map3dRef.current = null;
      panoramaRef.current = null;
    };
  }, []);

  // ---- Search: geocode, then fly the camera there ------------------------
  const handleSearch = useCallback(async () => {
    const term = query.trim();
    if (!term || !map3dRef.current) return;

    setSearching(true);
    setMessage(null);

    try {
      const g = await loadGoogleMaps();
      const { Geocoder } = (await g.maps.importLibrary("geocoding")) as any;
      const { results } = await new Geocoder().geocode({ address: term });

      if (!results?.length) {
        setMessage(`Couldn't find "${term}".`);
        return;
      }

      const loc = results[0].geometry.location;
      const target = { lat: loc.lat(), lng: loc.lng(), altitude: 0 };

      // Drop out of Street View if we were on the ground.
      setMode("globe");

      // flyCameraTo animates the descent instead of teleporting — this is the
      // whole "immersive" moment, so give it time to breathe.
      map3dRef.current.flyCameraTo({
        endCamera: {
          center: target,
          range: CITY_VIEW.range,
          tilt: CITY_VIEW.tilt,
          heading: 0,
        },
        durationMillis: 5000,
      });
    } catch (err) {
      console.error(err);
      setMessage("Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  }, [query]);

  // ---- Drop into Street View at whatever the camera is looking at --------
  const enterStreetView = useCallback(async () => {
    const map3d = map3dRef.current;
    if (!map3d) return;

    setMessage(null);

    try {
      const g = await loadGoogleMaps();
      const { StreetViewService, StreetViewPanorama } =
        (await g.maps.importLibrary("streetView")) as any;

      const center = map3d.center;
      const location = { lat: center.lat, lng: center.lng };

      // Ask for the nearest outdoor panorama within 500m of the camera target.
      const { data } = await new StreetViewService().getPanorama({
        location,
        radius: 500,
        source: "outdoor",
      });

      setMode("street");

      if (panoramaRef.current) {
        panoramaRef.current.setPano(data.location.pano);
        panoramaRef.current.setVisible(true);
      } else if (streetContainerRef.current) {
        panoramaRef.current = new StreetViewPanorama(
          streetContainerRef.current,
          {
            pano: data.location.pano,
            pov: { heading: 0, pitch: 0 },
            zoom: 1,
            addressControl: true,
            fullscreenControl: false,
            motionTracking: false,
            motionTrackingControl: false,
          },
        );
      }
    } catch {
      setMessage(
        "No Street View coverage here. Fly closer to a road, then try again.",
      );
    }
  }, []);

  const exitStreetView = useCallback(() => {
    setMode("globe");
    panoramaRef.current?.setVisible(false);
  }, []);

  const resetToGlobe = useCallback(() => {
    exitStreetView();
    map3dRef.current?.flyCameraTo({
      endCamera: WORLD_VIEW,
      durationMillis: 3000,
    });
  }, [exitStreetView]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-black">
      {/*
        Both layers stay mounted and absolutely positioned. Street View needs
        real layout dimensions when it initialises — toggling `display: none`
        would give it a 0x0 container and render a grey box.
      */}
      <div ref={globeContainerRef} className="absolute inset-0" />

      <div
        ref={streetContainerRef}
        className={`absolute inset-0 transition-opacity duration-300 ${
          mode === "street"
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* Search bar */}
      <div className="absolute left-1/2 top-4 z-10 w-full max-w-md -translate-x-1/2 px-4">
        <div className="flex gap-2 rounded-lg bg-white/95 p-2 shadow-lg backdrop-blur">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="Fly to a place — Kyoto, Machu Picchu, Reykjavík…"
            className="border-0 shadow-none focus-visible:ring-0"
            disabled={status !== "ready"}
          />
          <Button
            onClick={handleSearch}
            disabled={status !== "ready" || searching || !query.trim()}
            size="icon"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {message && (
          <p className="mt-2 rounded-md bg-white/95 px-3 py-2 text-sm text-black shadow">
            {message}
          </p>
        )}
      </div>

      {/* Mode controls */}
      {status === "ready" && (
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {mode === "globe" ? (
            <>
              <Button onClick={enterStreetView} variant="secondary">
                <PersonStanding className="mr-2 h-4 w-4" />
                Street View
              </Button>
              <Button onClick={resetToGlobe} variant="secondary">
                <Globe2 className="mr-2 h-4 w-4" />
                Back to globe
              </Button>
            </>
          ) : (
            <Button onClick={exitStreetView} variant="secondary">
              <X className="mr-2 h-4 w-4" />
              Exit Street View
            </Button>
          )}
        </div>
      )}

      {/* Loading / error overlay */}
      {status !== "ready" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black text-white">
          {status === "loading" ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm opacity-80">Loading the planet…</p>
            </>
          ) : (
            <>
              <Globe2 className="h-8 w-8 opacity-60" />
              <p className="max-w-sm text-center text-sm opacity-80">
                {message ?? "The globe couldn't load."}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}