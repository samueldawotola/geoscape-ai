"use client";

import { useUser } from "@auth0/nextjs-auth0/client";

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "U";
}

export default function Profile() {
  const { user, isLoading } = useUser();

  if (isLoading) return <p className="text-xs text-gray-500">Loading...</p>;
  if (!user) return null;

  return (
    <>
      <div className="flex items-center gap-2 text-green-500 text-[13px] font-medium">
        <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shrink-0">
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        Successfully authenticated
      </div>
      <div className="flex items-center gap-2 bg-gray-100 rounded-full py-1.5 pl-1.5 pr-4 text-[12px] text-gray-700 max-w-full">
        <span className="w-7 h-7 bg-gradient-to-b from-[#2d2d42] to-[#161620] rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
          {getInitials(user.name, user.email)}
        </span>
        <span className="truncate">{user.email}</span>
      </div>
    </>
  );
}