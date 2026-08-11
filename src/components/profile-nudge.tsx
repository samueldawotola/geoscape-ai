"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const DISMISS_EVENT = "profile-nudge-change";

function subscribe(callback: () => void) {
  window.addEventListener(DISMISS_EVENT, callback);
  return () => window.removeEventListener(DISMISS_EVENT, callback);
}

export function ProfileNudge({ userId }: { userId: string }) {
  const storageKey = `profile-nudge-dismissed:${userId}`;
  const dismissed = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(storageKey) === "1",
    () => false,
  );

  if (dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
      <p>
        Your traveler profile is incomplete — add a few details for sharper itineraries.{" "}
        <Link href="/profile" className="font-medium text-primary underline">
          Update profile
        </Link>
      </p>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem(storageKey, "1");
          window.dispatchEvent(new Event(DISMISS_EVENT));
        }}
        aria-label="Dismiss"
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
