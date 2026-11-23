import type { WeatherData } from "@/lib/weather";

// "Good morning" / "Good afternoon" / "Good evening", from a WeatherAPI local time
// such as "2026-11-05 13:42" (the place's own time, so it matches the clock shown)
export function timeOfDayGreeting(localTime: string): string {
  const hour = Number(localTime.split(" ")[1]?.split(":")[0]);
  if (!Number.isFinite(hour)) return "Hello";
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

// One short, practical line, so people can glance and go without reading the numbers.
// Checked in order of what matters most.
export function weatherAdvice(data: WeatherData): string {
  const { current, forecast } = data;
  const condition = current.condition.toLowerCase();
  const today = forecast[0];

  if (condition.includes("thunder")) return "There's thunder about, so stay indoors if you can.";
  if (/rain|drizzle|shower/.test(condition)) return "It's raining, so take an umbrella if you're heading out.";
  if (today && today.chanceOfRain >= 50) {
    return `There's a ${today.chanceOfRain}% chance of rain today, so take an umbrella.`;
  }
  if (current.temperature >= 33) return "It's hot out, so drink plenty of water and find some shade.";
  // Only when it's daytime: WeatherAPI can report the day's UV after dark
  if (current.uv !== undefined && current.uv >= 8 && current.isDay !== false) {
    return "UV is very high, so wear sunscreen and find shade around midday.";
  }
  if (current.temperature <= 10) return "It's cold, so wear a warm jacket.";
  if (current.windSpeed >= 35) return "It's windy, so hold on to anything light.";
  if (/fog|mist|haze/.test(condition)) return "Visibility is low, so take care on the roads.";
  return "Looks like a good day to be out.";
}