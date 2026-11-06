"use client";

import { useEffect, useState, type ReactNode } from "react";
import { WeatherData, formatDay, formatTemp, splitLocalDateTime } from "@/lib/weather";

const TICK_MS = 30_000; // move the local clock on every 30 seconds
// WeatherAPI publishes new current conditions about every 15 minutes, so refreshing
// more often than that would usually just return the same numbers
const AUTO_REFRESH_MS = 15 * 60_000;

// The time and date right now in the place's own time zone, e.g. { time: "13:42", date: "2026-11-05" }
function clockIn(timeZone: string, at: number) {
  try {
    const time = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone,
    }).format(at);
    // en-CA formats dates as YYYY-MM-DD
    const date = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    }).format(at);
    return { time, date };
  } catch {
    return null; // unknown time zone: fall back to the time WeatherAPI gave us
  }
}

export default function WeatherResults({
  data,
  fetchedAt,
  action,
  onRefresh,
}: {
  data: WeatherData;
  fetchedAt: number; // when our app received this data (Date.now() on arrival)
  action?: ReactNode; // e.g. the Save to favourites button
  onRefresh?: () => void; // called quietly every 15 minutes to keep the numbers fresh
}) {
  const { location, current, forecast, units } = data;

  // "now" starts at the moment the data arrived and ticks forward
  const [now, setNow] = useState(fetchedAt);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // Quietly get new numbers 15 minutes after this data arrived, if the page is being
  // looked at. Nothing is shown for it: the weather just stays up to date.
  useEffect(() => {
    if (!onRefresh) return;
    const timer = setTimeout(() => {
      if (document.visibilityState === "visible") onRefresh();
    }, AUTO_REFRESH_MS);
    return () => clearTimeout(timer);
  }, [fetchedAt, onRefresh]);

  // Live local time in the place's time zone (falls back to WeatherAPI's time)
  const fallback = splitLocalDateTime(location.localTime);
  const local = clockIn(location.timezone, now) ?? fallback;

  // Skip the region when it's empty or just repeats the city name
  const place = [location.region, location.country]
    .filter((part) => part && part !== location.name)
    .join(", ");

  // Shared scale so every day's temperature bar is comparable
  const weekLow = Math.min(...forecast.map((day) => day.low));
  const weekHigh = Math.max(...forecast.map((day) => day.high));
  const range = weekHigh - weekLow || 1;

  return (
    <article aria-labelledby="place-heading">
      <div className="flex items-start justify-between gap-4">
        <h2 id="place-heading" className="-ml-[0.05em] min-w-0 text-3xl font-semibold tracking-tight">
          {location.name}
        </h2>
        {action}
      </div>
      {place && <p className="text-muted">{place}</p>}
      <p className="mt-1 text-sm text-muted">
        Local time {local.time},{" "}
        <time dateTime={local.date}>{formatDay(local.date)}</time>
      </p>

      {/* Current conditions */}
      <div className="mt-6 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- small external icons; next/image would need remotePatterns config */}
        <img src={current.icon} alt="" width={72} height={72} />
        <div>
          <p className="text-6xl font-semibold leading-none tracking-tight sm:text-7xl">
            {formatTemp(current.temperature)}
          </p>
          <p className="mt-1 text-lg">{current.condition}</p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-4 border-y border-line py-4">
        <div>
          <dt className="text-sm text-muted">Feels like</dt>
          <dd className="text-lg font-medium">{formatTemp(current.feelsLike)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Humidity</dt>
          <dd className="text-lg font-medium">
            {current.humidity}
            {units.humidity}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Wind</dt>
          <dd className="text-lg font-medium">
            {Math.round(current.windSpeed)} {units.windSpeed}
          </dd>
        </div>
      </dl>

      {/* Forecast */}
      <h3 className="mt-10 text-xl font-semibold">{forecast.length}-day forecast</h3>
      <ul className="mt-2">
        {forecast.map((day) => {
          const isToday = day.date === local.date;
          const barStart = ((day.low - weekLow) / range) * 100;
          const barWidth = Math.max(((day.high - day.low) / range) * 100, 4);

          return (
            <li
              key={day.date}
              className="grid grid-cols-[5.5rem_2.5rem_1fr] items-center gap-x-3 gap-y-2 border-b border-line py-3 sm:grid-cols-[6rem_2.5rem_1fr_11rem]"
            >
              <p className="font-medium">
                <time dateTime={day.date}>{isToday ? "Today" : formatDay(day.date)}</time>
              </p>

              {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
              <img src={day.icon} alt="" width={40} height={40} />

              <div>
                <p>{day.condition}</p>
                <p className="text-sm text-muted">
                  {day.chanceOfRain}
                  {units.chanceOfRain} chance of rain
                </p>
              </div>

              <div className="col-span-3 flex items-center gap-2 sm:col-span-1">
                <span className="w-10 text-right text-sm text-muted">
                  <span className="sr-only">Low </span>
                  {formatTemp(day.low)}
                </span>
                <div aria-hidden="true" className="relative h-1.5 flex-1 rounded-full bg-line">
                  <div
                    className="absolute inset-y-0 rounded-full bg-linear-to-r from-rain to-sun"
                    style={{ left: `${barStart}%`, width: `${barWidth}%` }}
                  />
                </div>
                <span className="w-10 text-sm font-medium">
                  <span className="sr-only">High </span>
                  {formatTemp(day.high)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}