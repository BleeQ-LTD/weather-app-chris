"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

// "Favourites" in the top nav, only for signed-in users (guests have none)
export default function FavouritesNavLink() {
  const authState = useAuth();
  const pathname = usePathname();
  if (authState.status !== "signed-in") return null;

  const isCurrent = pathname === "/favourites";
  return (
    <Link
      href="/favourites"
      aria-current={isCurrent ? "page" : undefined}
      className={`flex min-h-11 items-center rounded-xl px-2.5 text-[15px] sm:px-3 sm:text-base ${
        isCurrent ? "bg-accent-soft font-semibold text-link" : "font-medium text-ink hover:bg-accent-soft"
      }`}
    >
      Favourites
    </Link>
  );
}