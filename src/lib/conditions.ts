// Turns WeatherAPI's condition codes into the few kinds of weather the app draws,
// and picks the hero card's background. Codes: https://www.weatherapi.com/docs/weather_conditions.json

export type WeatherKind = "clear" | "partly-cloudy" | "cloudy" | "fog" | "rain" | "snow" | "thunder";

const FOG = [1030, 1135, 1147];
const THUNDER = [1087, 1273, 1276, 1279, 1282];
const SNOW = [1066, 1069, 1114, 1117, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1249, 1252, 1255, 1258, 1261, 1264];
const RAIN = [1063, 1072, 1150, 1153, 1168, 1171, 1180, 1183, 1186, 1189, 1192, 1195, 1198, 1201, 1240, 1243, 1246];

// Uses the code when there is one, otherwise the condition text ("Patchy rain nearby")
export function weatherKind(code: number | undefined, text = ""): WeatherKind {
  if (code !== undefined) {
    if (code === 1000) return "clear";
    if (code === 1003) return "partly-cloudy";
    if (code === 1006 || code === 1009) return "cloudy";
    if (FOG.includes(code)) return "fog";
    if (THUNDER.includes(code)) return "thunder";
    if (SNOW.includes(code)) return "snow";
    if (RAIN.includes(code)) return "rain";
  }
  const words = text.toLowerCase();
  if (/thunder/.test(words)) return "thunder";
  if (/snow|sleet|ice|blizzard/.test(words)) return "snow";
  if (/rain|drizzle|shower/.test(words)) return "rain";
  if (/fog|mist|haze/.test(words)) return "fog";
  if (/partly/.test(words)) return "partly-cloudy";
  if (/cloud|overcast/.test(words)) return "cloudy";
  return "clear";
}

// Day or night at the place. WeatherAPI says so directly; if it didn't,
// guess from the local hour ("2026-11-10 19:30" -> night).
export function isDaytime(isDay: boolean | undefined, localTime: string): boolean {
  if (isDay !== undefined) return isDay;
  const hour = Number(localTime.split(" ")[1]?.split(":")[0]);
  return !Number.isFinite(hour) || (hour >= 6 && hour < 18);
}

// The hero card's background: warm for sun, cool blue-grey for rain or cloud, navy at night
export type HeroTone = "sun" | "rain" | "night";

export function heroTone(kind: WeatherKind, isDay: boolean): HeroTone {
  if (!isDay) return "night";
  return kind === "clear" || kind === "partly-cloudy" ? "sun" : "rain";
}

// "SW" -> "south-west", "NNE" -> "north-north-east"
export function windFrom(direction: string | undefined): string {
  if (!direction) return "";
  const words: Record<string, string> = { N: "north", E: "east", S: "south", W: "west" };
  const letters = direction.toUpperCase().split("");
  if (letters.length === 0 || letters.some((letter) => !words[letter])) return "";
  return letters.map((letter) => words[letter]).join("-");
}

// UV index bands from the WHO scale
export function uvLevel(uv: number): string {
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very high";
  return "Extreme";
}
