"use client";

import { useProfile } from "@/components/ProfileProvider";
import { timeOfDayGreeting, weatherAdvice } from "@/lib/advice";
import type { WeatherData } from "@/lib/weather";

// The first thing people see with the weather: a greeting and one line of advice,
// e.g. "Good afternoon, Christopher" / "There's a 70% chance of rain today, so take an umbrella."
export default function Greeting({ data }: { data: WeatherData }) {
  const profileState = useProfile();
  // Signed-in users are greeted by first name (from their Firestore profile); guests aren't
  const firstName = profileState.status === "ready" ? profileState.profile.name.split(" ")[0] : "";
  const hello = timeOfDayGreeting(data.location.localTime);

  return (
    <div className="mb-8 rounded-lg border border-line bg-surface p-4 sm:p-5">
      <p className="text-xl font-semibold tracking-tight sm:text-2xl">
        {firstName ? `${hello}, ${firstName}` : hello}
      </p>
      <p className="mt-1 text-muted">{weatherAdvice(data)}</p>
    </div>
  );
}