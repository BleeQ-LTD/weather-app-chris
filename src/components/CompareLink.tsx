import Link from "next/link";
import type { WeatherData } from "@/lib/weather";

// "Compare" next to Save in the hero card: opens /compare with this place
// already filled in on the left. Hidden when we don't know the place's coordinates.
export default function CompareLink({ location }: { location: WeatherData["location"] }) {
  if (location.lat === null || location.lon === null) return null;
  const params = new URLSearchParams({
    name: location.name,
    region: location.region,
    country: location.country,
    lat: String(location.lat),
    lon: String(location.lon),
  });
  return (
    <Link
      href={`/compare?${params}`}
      className="inline-flex h-11 items-center gap-2 rounded-full border border-hero-save-line bg-hero-save pr-[18px] pl-3.5 text-[15px] font-semibold whitespace-nowrap text-hero-ink hover:brightness-95"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />
      </svg>
      Compare
      <span className="sr-only"> {location.name} with another place</span>
    </Link>
  );
}
