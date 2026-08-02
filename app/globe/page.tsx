import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { syncUser } from "@/db/users";
import ImmersiveGlobe from "@/components/immersive-globe";

export const metadata = {
  title: "Immersive Globe · Geospace AI",
  description: "See the world before it changes.",
};

export default async function GlobePage() {
  const session = await auth0.getSession();

  if (!session) {
    redirect("/auth/login");
  }
  if (!session.user.email) {
    throw new Error("No email is associated with this account");
  }

  await syncUser(session.user.sub, session.user.email);

  return (
    <div className="p-4">
      <h1 className="mb-3 text-2xl font-semibold">Immersive Globe</h1>
      {/* Subtract your nav shell height here if 4rem isn't right */}
      <div className="h-[calc(100vh-9rem)] w-full">
        <ImmersiveGlobe />
      </div>
    </div>
  );
}