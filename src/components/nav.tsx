"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Plan" },
  { href: "/profile", label: "Profile" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-black/10 bg-[#1C5A7D]">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold text-black">
          GeospaceAI
        </Link>

        <div className="flex gap-1">
          {links.map(({ href, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm text-black transition-colors ${
                  active ? "bg-[#D4A24A]/30" : "hover:bg-black/10"
                }`}
              >
                {label}
              </Link>
            );
          })}

          <a
            href="/auth/logout"
            className="ml-2 rounded-md px-3 py-1.5 text-sm text-black hover:bg-black/10"
          >
            Log out
          </a>
        </div>
      </nav>
    </header>
  );
}