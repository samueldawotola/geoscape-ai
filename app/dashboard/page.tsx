import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { syncUser, getUserTrips } from "@/db/users";
import { generateTrip } from "@/lib/actions";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GenerateForm } from "@/components/generate-form";

export default async function Dashboard() {
  const session = await auth0.getSession();

  if (!session) {
    redirect("/auth/login");
  }
  if (!session.user.email) {
    throw new Error("No email is associated with this account");
  }

  const dbUser = await syncUser(session.user.sub, session.user.email);
  const userTrips = await getUserTrips(dbUser.id);

  async function createTrip(formData: FormData) {
    "use server";
    const dest = formData.get("destination") as string;
    if (!dest?.trim()) return;
    await generateTrip(dest);
  }

  return (
    <div className="space-y-10">
      <div className="relative mx-auto max-w-xl text-center py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Where to next?</h1>
        <p className="text-muted-foreground mt-2">
          Tell us a destination — we'll build an itinerary tuned to your profile.
        </p>
        <div className="mt-6">
          <GenerateForm action={createTrip} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-medium">Your trips</h2>
          {userTrips.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {userTrips.length} saved
            </span>
          )}
        </div>

        {userTrips.length === 0 ? (
          <Card className="border-dashed border-border/60 bg-card/40">
            <CardContent className="py-16 text-center text-muted-foreground">
              No trips yet — generate your first one above.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {userTrips.map((trip) => (
              <Card
                key={trip.id}
                className="group relative overflow-hidden border-border/50
                           bg-card/60 backdrop-blur-sm transition-all
                           hover:border-primary/40 hover:bg-card/80
                           hover:shadow-lg hover:shadow-primary/5"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base group-hover:text-primary transition-colors">
                      {trip.destination}
                    </CardTitle>
                    <Badge variant="secondary" className="shrink-0">Itinerary</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed line-clamp-4">
                    {trip.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}