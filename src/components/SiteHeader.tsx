import Link from "next/link";
import AccountBar from "@/components/AccountBar";
import FavouritesNavLink from "@/components/FavouritesNavLink";
import ThemeToggle from "@/components/ThemeToggle";
import { LogoMark } from "@/components/icons";

// Top nav on every page: the app name always links home, so pages like
// sign-in and sign-up are never a dead end. Favourites (signed-in users),
// the light / dark switch (wider screens; phones have it in the footer)
// and sign in / account on the right.
export default function SiteHeader() {
  return (
    <header>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 py-2.5 pr-3 pl-4 sm:px-8 sm:py-4">
        <div className="flex items-center gap-1 sm:gap-4">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-2 rounded-xl text-xl font-bold tracking-tight sm:gap-2.5 sm:text-[22px]"
          >
            <LogoMark size={32} />
            Weather
          </Link>
          <FavouritesNavLink />
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle variant="icon" className="hidden sm:flex" />
          <AccountBar />
        </div>
      </div>
    </header>
  );
}
