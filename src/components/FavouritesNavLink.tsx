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
      className={`text-sm hover:text-rain ${isCurrent ? "font-medium text-ink underline" : "text-muted"}`}
    >
      Favourites
    </Link>
  );
}