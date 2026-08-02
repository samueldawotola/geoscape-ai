import { auth0 } from "@/lib/auth0";
import Link from "next/link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth0.getSession();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl flex h-14 items-center justify-between px-4">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            Geospace<span className="text-teal-400">AI</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/dashboard" className="transition-colors hover:text-foreground">
              Trips
            </Link>
            <Link href="/globe" className="transition-colors hover:text-foreground">
              Globe
            </Link>
            <Link href="/profile" className="transition-colors hover:text-foreground">
              Profile
            </Link>
            <span>{session?.user?.name}</span>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}