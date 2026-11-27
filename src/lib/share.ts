import { formatTemp, type Suggestion, type WeatherData } from "@/lib/weather";
import type { TempUnit } from "@/lib/units";

// Sharing a place's weather: the link back to the app, and the friendly message
// people send on WhatsApp and other apps.

export type SharedPlace = Pick<Suggestion, "name" | "region" | "country" | "lat" | "lon">;

// In:  the site's address (e.g. "https://chris-weather.bleeq.app") and the place.
// Out: a link that opens this place's live weather, or null without coordinates.
export function shareLink(origin: string, location: WeatherData["location"]): string | null {
  if (location.lat === null || location.lon === null) return null;
  const params = new URLSearchParams({
    place: location.name,
    region: location.region,
    country: location.country,
    lat: location.lat.toFixed(4),
    lon: location.lon.toFixed(4),
  });
  return `${origin}/?${params}`;
}

// In:  the query string of a shared link ("?place=Lagos&...&lat=6.45&lon=3.39").
// Out: the place to open, or null if the link is missing parts or has impossible coordinates.
export function placeFromLink(search: string): SharedPlace | null {
  const params = new URLSearchParams(search);
  const name = params.get("place")?.trim().slice(0, 100);
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  if (!name || params.get("lat") === null || params.get("lon") === null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return {
    name,
    region: (params.get("region") ?? "").slice(0, 100),
    country: (params.get("country") ?? "").slice(0, 100),
    lat,
    lon,
  };
}

// The emoji that starts the message, from the current conditions
function weatherEmoji(condition: string, isDay = true): string {
  const text = condition.toLowerCase();
  if (/thunder/.test(text)) return "⛈️";
  if (/snow|sleet|ice|blizzard/.test(text)) return "❄️";
  if (/rain|drizzle|shower/.test(text)) return "🌧️";
  if (/fog|mist|haze/.test(text)) return "🌫️";
  if (/overcast|cloud/.test(text)) return isDay ? "⛅" : "☁️";
  return isDay ? "☀️" : "🌙";
}

// In:  the weather on screen, the user's unit, and the link from shareLink.
// Out: the message to send, e.g.
//   🌧️ Hey! Here's the weather in Lagos, Nigeria right now:
//   31°C and patchy light drizzle (feels like 36°C).
//   There's a 57% chance of rain today, so maybe take an umbrella ☂️
//
//   Tap the link to see the full forecast for Lagos 👇
//   https://...
export function shareMessage(data: WeatherData, unit: TempUnit, link: string | null): string {
  const { location, current, forecast } = data;
  const place = [location.name, location.region && location.region !== location.name ? location.region : "", location.country]
    .filter(Boolean)
    .join(", ");
  const temp = formatTemp(current.temperature, unit);
  const feels = formatTemp(current.feelsLike, unit);
  const condition = current.condition.toLowerCase();
  const rain = forecast[0]?.chanceOfRain;

  const lines = [
    `${weatherEmoji(current.condition, current.isDay)} Hey! Here's the weather in ${place} right now:`,
    feels === temp ? `${temp} and ${condition}.` : `${temp} and ${condition} (feels like ${feels}).`,
  ];
  if (typeof rain === "number") {
    lines.push(
      rain >= 50
        ? `There's a ${rain}% chance of rain today, so maybe take an umbrella ☂️`
        : rain >= 20
          ? `There's a ${rain}% chance of rain today.`
          : "Little chance of rain today 😎"
    );
  }
  if (link) {
    lines.push("", `Tap the link to see the full forecast for ${location.name} 👇`, link);
  } else {
    lines.push("", "Check the full forecast on Weather.");
  }
  return lines.join("\n");
}

// Where each "Share on…" option sends people, with the message filled in
export function shareTargets(message: string, link: string | null, subject: string) {
  const text = encodeURIComponent(message);
  // X and Telegram add the link themselves, so leave it out of their text
  const withoutLink = encodeURIComponent(link ? message.replace(`\n${link}`, "").trimEnd() : message);
  return {
    whatsapp: `https://wa.me/?text=${text}`,
    telegram: link
      ? `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${withoutLink}`
      : `https://t.me/share/url?text=${text}`,
    x: link
      ? `https://twitter.com/intent/tweet?text=${withoutLink}&url=${encodeURIComponent(link)}`
      : `https://twitter.com/intent/tweet?text=${text}`,
    email: `mailto:?subject=${encodeURIComponent(subject)}&body=${text}`,
  };
}
