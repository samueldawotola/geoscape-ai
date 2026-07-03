"use client";

export default function LogoutButton() {
  return (
    <a
      href="/auth/logout"
      className="w-full text-center inline-block px-6 py-3 bg-[#f0f0f0] hover:bg-gray-200 text-gray-600 font-medium rounded-full text-[14px] transition-colors"
    >
      Logout
    </a>
  );
}
