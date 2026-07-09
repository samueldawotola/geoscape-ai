import { auth0 } from "@/lib/auth0";
import { redirect, notFound } from "next/navigation";
import { syncUser, getTripById } from "@/db/users";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteTripButton } from "@/components/delete-trip-button";
import { parseMarkdownSections } from "@/lib/utils";

export default async function TripDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth0.getSession();

  if (!session) {
    redirect("/auth/login");
  }
  if (!session.user.email) {
    throw new Error("No email is associated with this account");
  }

  const dbUser = await syncUser(session.user.sub, session.user.email);
  const trip = await getTripById(id, dbUser.id);

  if (!trip) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        ← Back to trips
      </Link>

      <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-2xl">{trip.destination}</CardTitle>
            <div className="flex shrink-0 items-center gap-1">
              <Badge variant="secondary">Itinerary</Badge>
              <DeleteTripButton
                tripId={trip.id}
                destination={trip.destination}
                redirectTo="/dashboard"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
            {trip.data?.destinationOverview ?? trip.content}
          </p>
        </CardContent>
      </Card>

      {trip.data && (
        <>
          <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Day by day</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {trip.data.itinerary.map((day) => (
                <div key={day.day} className="border-l-2 border-primary/30 pl-4">
                  <p className="font-medium text-sm">
                    Day {day.day} — {day.title}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="font-medium text-foreground/80">Morning: </span>
                    {day.morning}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="font-medium text-foreground/80">Afternoon: </span>
                    {day.afternoon}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="font-medium text-foreground/80">Evening: </span>
                    {day.evening}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Packing list</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {trip.data.packingList.map((group) => (
                  <div key={group.category}>
                    <p className="text-sm font-medium">{group.category}</p>
                    <p className="text-sm text-muted-foreground">{group.items.join(", ")}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Budget breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {(() => {
                  const b = trip.data.budgetBreakdown;
                  const rows: [string, number][] = [
                    ["Lodging", b.lodging],
                    ["Food", b.food],
                    ["Activities", b.activities],
                    ["Transport", b.transport],
                    ["Misc", b.misc],
                  ];
                  return (
                    <>
                      {rows.map(([label, amount]) => (
                        <div key={label} className="flex justify-between text-muted-foreground">
                          <span>{label}</span>
                          <span>
                            {b.currency} {amount}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between font-medium pt-1 border-t border-border/50">
                        <span>Total</span>
                        <span>
                          {b.currency} {b.total}
                        </span>
                      </div>
                      {b.notes && (
                        <p className="text-muted-foreground pt-2">{b.notes}</p>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {trip.data.localTips.length > 0 && (
            <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Local tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {trip.data.localTips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {trip.data.groundedMarkdown &&
            parseMarkdownSections(trip.data.groundedMarkdown).map((section) => (
              <Card key={section.title} className="border-border/50 bg-card/60 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {section.body}
                  </p>
                </CardContent>
              </Card>
            ))}
        </>
      )}
    </div>
  );
}
