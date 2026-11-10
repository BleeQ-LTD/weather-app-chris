"use client";

import { useProfile } from "@/components/ProfileProvider";
import { timeOfDayGreeting } from "@/lib/advice";
import type { WeatherData } from "@/lib/weather";

// The first line of the hero card, e.g. "Good afternoon, Christopher".
// The advice line now sits inside the hero card too (WeatherResults).
export default function Greeting({ data }: { data: WeatherData }) {
  const profileState = useProfile();
  // Signed-in users are greeted by first name (from their Firestore profile); guests aren't
  const firstName = profileState.status === "ready" ? profileState.profile.name.split(" ")[0] : "";
  const hello = timeOfDayGreeting(data.location.localTime);

  return (
    <p className="text-[15px] font-medium text-hero-muted sm:text-base">
      {firstName ? `${hello}, ${firstName}` : hello}
    </p>
  );
}
