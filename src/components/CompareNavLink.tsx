"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// "Compare" in the top nav, for everyone (comparing needs no account)
export default function CompareNavLink() {
  const isCurrent = usePathname() === "/compare";
  return (
    <Link
      href="/compare"
      aria-current={isCurrent ? "page" : undefined}
      className={`flex min-h-11 items-center rounded-xl px-2.5 text-[15px] sm:px-3 sm:text-base ${
        isCurrent ? "bg-accent-soft font-semibold text-link" : "font-medium text-ink hover:bg-accent-soft"
      }`}
    >
      Compare
    </Link>
  );
}
