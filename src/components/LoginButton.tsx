"use client";

export default function LoginButton() {
  return (
    <a
      href="/auth/login"
      className="w-full text-center inline-block px-6 py-3 bg-gradient-to-b from-[#2d2d42] to-[#161620] hover:opacity-90 text-white font-medium rounded-full text-[14px] transition-opacity"
    >
      Login
    </a>
  );
}
