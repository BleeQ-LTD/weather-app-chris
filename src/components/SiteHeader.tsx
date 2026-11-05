import Link from "next/link";
import AccountBar from "@/components/AccountBar";

// Top nav on every page: the app name always links home, so pages like
// sign-in and sign-up are never a dead end. Sign in / account on the right.
export default function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight hover:text-rain">
          Weather
        </Link>
        <AccountBar />
      </div>
    </header>
  );
}