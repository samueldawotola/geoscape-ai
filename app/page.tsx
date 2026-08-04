import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { syncUser, getUserTrips } from "@/db/users";
import { generateTrip } from "@/lib/actions";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenerateForm } from "@/components/generate-form";
import { ProfileNudge } from "@/components/profile-nudge";

const SUGGESTED_DESTINATIONS = ["Kyoto", "Lisbon", "Reykjavík"];

function firstName(displayName: string | null, authName: string | null | undefined, email: string) {
  const fromDisplay = displayName?.trim().split(/\s+/)[0];
  if (fromDisplay) return fromDisplay;

  const fromAuth = authName?.trim().split(/\s+/)[0];
  if (fromAuth) return fromAuth;

  const local = email.split("@")[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function isProfileIncomplete(user: {
  displayName: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  travelStyle: string | null;
  budget: string | null;
}) {
  return (
    !user.displayName ||
    !user.dateOfBirth ||
    !user.nationality ||
    !user.travelStyle ||
    !user.budget
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ destination?: string }>;
}) {
  const session = await auth0.getSession();

  if (!session) {
    redirect("/auth/login");
  }
  if (!session.user.email) {
    throw new Error("No email is associated with this account");
  }

  const dbUser = await syncUser(session.user.sub, session.user.email);
  const trips = await getUserTrips(dbUser.id);
  const { destination } = await searchParams;

  async function createTrip(formData: FormData) {
    "use server";
    const dest = formData.get("destination") as string;
    if (!dest?.trim()) return;
    const result = await generateTrip(dest);
    if (result.trip) {
      redirect(`/dashboard/trips/${result.trip.id}`);
    }
  }

  const name = firstName(
    dbUser.displayName,
    session.user.given_name ?? session.user.name,
    session.user.email,
  );
  const recentTrips = trips.slice(0, 6);

  return (
    <div className="space-y-8">
      <div className="mx-auto max-w-xl text-center py-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          See the world before it changes.
        </h1>
        <p className="text-muted-foreground mt-2">Welcome back, {name}.</p>
        <div className="mt-6">
          <GenerateForm
            key={destination ?? ""}
            action={createTrip}
            defaultValue={destination}
          />
        </div>
      </div>

      {isProfileIncomplete(dbUser) && <ProfileNudge userId={dbUser.id} />}

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Recent trips</h2>

        {recentTrips.length === 0 ? (
          <Card className="border-dashed border-border/60 bg-card/40">
            <CardContent className="py-12 text-center space-y-4">
              <p className="text-muted-foreground">
                No trips yet — try Kyoto, Lisbon, or Reykjavík.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED_DESTINATIONS.map((city) => (
                  <Link
                    key={city}
                    href={`/?destination=${encodeURIComponent(city)}`}
                    className="rounded-4xl border border-border/60 bg-input/30 px-3 py-1.5 text-sm
                               hover:bg-input/50 transition-colors"
                  >
                    {city}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentTrips.map((trip) => (
              <Link key={trip.id} href={`/dashboard/trips/${trip.id}`}>
                <Card
                  className="h-full border-border/50 bg-card/60 backdrop-blur-sm transition-all
                             hover:border-primary/40 hover:bg-card/80"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{trip.destination}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {new Date(trip.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {trip.content}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
