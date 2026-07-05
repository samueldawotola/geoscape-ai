import { auth0 } from "@/lib/auth0";
import { redirect, notFound } from "next/navigation";
import { syncUser, getTripById } from "@/db/users";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
            <Badge variant="secondary" className="shrink-0">Itinerary</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
            {trip.content}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
