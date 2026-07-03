import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { syncUser } from "@/db/users";
import Link from "next/link";

export default async function Home() {
  const session = await auth0.getSession();

  if (!session) {
    redirect("/auth/login");
  }
  if (!session.user.email) {
    throw new Error("No email is associated with this account");
  }

  await syncUser(session.user.sub, session.user.email);

  return (
    <div className="space-y-8 text-black">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">
          See the world before it changes.
        </h1>
        <p>Welcome back, {session.user.email}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard"
          className="rounded-xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <h2 className="font-medium">Plan a trip</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Generate an itinerary for any destination.
          </p>
        </Link>

        <Link
          href="/profile"
          className="rounded-xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <h2 className="font-medium">Your profile</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Set preferences to tailor your itineraries.
          </p>
        </Link>
      </div>
    </div>
  );
}