"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  WeatherData,
  convertTemp,
  formatAstroTime,
  formatClock,
  formatDay,
  formatHour,
  formatTemp,
  splitLocalDateTime,
} from "@/lib/weather";
import { setTemperatureUnit, useTemperatureUnit, type TempUnit } from "@/lib/units";
import { weatherAdvice } from "@/lib/advice";
import { heroTone, isDaytime, uvLevel, weatherKind, windFrom } from "@/lib/conditions";
import WeatherIcon from "@/components/WeatherIcon";
import {
  DropletIcon,
  SunIcon,
  SunriseIcon,
  ThermometerIcon,
  UmbrellaIcon,
  WindIcon,
} from "@/components/icons";

const UNITS: TempUnit[] = ["C", "F"];
const HOURS_SHOWN = 12;
const RAIN_WORTH_SHOWING = 20; // % chance; below this the hourly strip leaves it out

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
  greeting,
  onRefresh,
}: {
  data: WeatherData;
  fetchedAt: number; // when our app received this data (Date.now() on arrival)
  action?: ReactNode; // e.g. the Save to favourites button
  greeting?: ReactNode; // e.g. "Good afternoon, Chris", shown at the top of the hero card
  onRefresh?: () => void; // called quietly every 15 minutes to keep the numbers fresh
}) {
  const { location, current, forecast, units } = data;
  const unit = useTemperatureUnit(); // °C or °F, remembered in this browser
  const temp = (celsius: number) => formatTemp(celsius, unit);

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

  const isDay = isDaytime(current.isDay, `${local.date} ${local.time}`);
  const kind = weatherKind(current.code, current.condition);
  const tone = heroTone(kind, isDay);
  const today = forecast.find((day) => day.date === local.date) ?? forecast[0];

  // Hours from the current one onwards (the list can be up to 15 minutes old)
  const currentHour = `${local.date} ${local.time.slice(0, 2)}:00`;
  const upcoming = (data.hourly ?? []).filter((hour) => hour.time >= currentHour);
  const hours = upcoming.slice(0, HOURS_SHOWN);

  return (
    <article
      aria-labelledby="place-heading"
      className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-6"
    >
      <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
        {/* ---- Hero card: the most important things first ---- */}
        <div className={`hero hero-${tone} flex flex-col gap-4 rounded-[28px] p-5 sm:gap-5 sm:rounded-[32px] sm:p-8`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              {greeting}
              <h2
                id="place-heading"
                className="-ml-[0.03em] text-3xl leading-tight font-bold tracking-tight sm:text-4xl"
              >
                {location.name}
              </h2>
              {place && <p className="text-[15px] text-hero-muted sm:text-base">{place}</p>}
              <p className="text-[15px] text-hero-muted sm:text-base">
                <span className="sr-only">Local time </span>
                <time dateTime={local.date}>{formatDay(local.date)}</time>, {formatClock(local.time)}
              </p>
            </div>

            {/* °C / °F switch; the choice is remembered for next time */}
            <div role="group" aria-label="Temperature unit" className="flex shrink-0 rounded-full bg-hero-toggle">
              {UNITS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={unit === option}
                  onClick={() => setTemperatureUnit(option)}
                  className={`h-11 min-w-12 rounded-full px-3 text-[15px] font-semibold ${
                    unit === option ? "bg-hero-on text-hero-on-ink" : "text-hero-muted hover:text-hero-ink"
                  }`}
                >
                  °{option}
                </button>
              ))}
            </div>
          </div>

          {/* Temperature and illustration side by side, condition underneath */}
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-start leading-[0.9]">
              <span className="text-[104px] font-semibold tracking-[-0.05em] min-[400px]:text-[112px] sm:text-[132px]">
                {convertTemp(current.temperature, unit)}
              </span>
              <span className="mt-2 ml-1 text-3xl font-semibold sm:mt-2.5 sm:text-[34px]">°{unit}</span>
            </p>
            <WeatherIcon
              kind={kind}
              isDay={isDay}
              hero
              size={120}
              label={current.condition}
              className="shrink-0 sm:h-44 sm:w-44"
            />
          </div>
          <div>
            <p className="text-[22px] font-semibold sm:text-2xl">{current.condition}</p>
            <p className="mt-1 text-[15px] text-hero-muted sm:text-base">
              Feels like {temp(current.feelsLike)}
              {today && (
                <>
                  {" "}
                  · High {temp(today.high)} · Low {temp(today.low)}
                </>
              )}
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-[18px] bg-hero-panel px-4 py-3.5">
            <AdviceIcon kind={kind} isDay={isDay} />
            <p className="text-base leading-snug font-medium sm:text-[17px]">{weatherAdvice(data)}</p>
          </div>

          {action && <div className="flex flex-col items-start">{action}</div>}
        </div>

        {/* ---- Today's details ---- */}
        <section aria-labelledby="details-heading" className="flex flex-col gap-3">
          <h3 id="details-heading" className="px-1 text-lg font-semibold sm:text-xl">
            Today&apos;s details
          </h3>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]">
            <DetailCard icon={<ThermometerIcon size={18} />} label="Feels like" value={temp(current.feelsLike)}>
              {current.feelsLike - current.temperature >= 2
                ? "Humid air makes it feel hotter"
                : current.temperature - current.feelsLike >= 2
                  ? "Wind makes it feel colder"
                  : "Close to the real temperature"}
            </DetailCard>

            <DetailCard
              icon={<DropletIcon size={18} />}
              label="Humidity"
              value={`${current.humidity}${units.humidity}`}
            >
              {current.humidity >= 70 ? "High, feels sticky" : current.humidity <= 30 ? "Dry air" : "Comfortable"}
            </DetailCard>

            <DetailCard
              icon={<WindIcon size={18} />}
              label="Wind"
              value={
                <>
                  {Math.round(current.windSpeed)} <span className="text-base font-medium">{units.windSpeed}</span>
                </>
              }
            >
              {windFrom(current.windDirection) ? `From the ${windFrom(current.windDirection)}` : null}
            </DetailCard>

            {today && (
              <DetailCard
                icon={<UmbrellaIcon size={18} />}
                label="Chance of rain"
                value={`${today.chanceOfRain}${units.chanceOfRain}`}
              >
                {rainTiming(upcoming.filter((hour) => hour.time.startsWith(local.date)))}
              </DetailCard>
            )}

            {current.uv !== undefined && (
              <DetailCard
                tone="sun"
                icon={<SunIcon size={18} />}
                label="UV index"
                value={
                  <>
                    {Math.round(current.uv)}{" "}
                    <span className="text-base font-semibold text-sun-ink">{uvLevel(current.uv)}</span>
                  </>
                }
              >
                <span
                  aria-hidden="true"
                  className="relative mt-1 block h-1.5 rounded-full"
                  style={{
                    background: "linear-gradient(90deg, #4CAF7A 0%, #E8C547 30%, #F28C28 55%, #D9452B 80%, #8E3BA8 100%)",
                  }}
                >
                  <span
                    className="absolute -top-[3px] -ml-1.5 h-3 w-3 rounded-full border-2 border-ink bg-surface"
                    style={{ left: `${Math.min(current.uv / 11, 1) * 100}%` }}
                  />
                </span>
              </DetailCard>
            )}

            {today?.sunrise && today.sunset && (
              <DetailCard
                tone="sun"
                icon={<SunriseIcon size={18} />}
                label="Sunrise / Sunset"
                value={<span className="text-[22px] sm:text-2xl">{formatAstroTime(today.sunrise)}</span>}
              >
                Sunset {formatAstroTime(today.sunset)}
              </DetailCard>
            )}
          </dl>
          {(current.visibility !== undefined || current.pressure !== undefined) && (
            <p className="px-1 text-sm text-muted">
              {[
                current.visibility !== undefined ? `Visibility ${Math.round(current.visibility)} km` : null,
                current.pressure !== undefined ? `Pressure ${Math.round(current.pressure)} hPa` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </section>
      </div>

      <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
        {/* ---- Next 12 hours: scrolls sideways ---- */}
        {hours.length > 0 && (
          <section aria-labelledby="hourly-heading" className="rounded-3xl bg-surface pt-4 pb-3 sm:pt-5">
            <div className="flex items-baseline justify-between px-5 pb-2 sm:px-6">
              <h3 id="hourly-heading" className="text-lg font-semibold sm:text-xl">
                Next {hours.length} hours
              </h3>
              <span className="hidden text-sm text-muted sm:inline" aria-hidden="true">
                Scroll for more
              </span>
            </div>
            {/* Focusable so keyboard users can scroll it with the arrow keys */}
            <ol
              tabIndex={0}
              aria-label="Hourly forecast"
              // relative: keeps the sr-only labels inside the scroller, so they can't widen the page
              className="thin-scroll relative flex snap-x gap-1 overflow-x-auto px-3 pt-1 pb-2 sm:px-4"
            >
              {hours.map((hour, index) => {
                const isNow = index === 0;
                const hourKind = weatherKind(hour.code, hour.condition);
                const hourIsDay = isDaytime(hour.isDay, hour.time);
                return (
                  <li
                    key={hour.time}
                    className={`flex w-16 shrink-0 snap-start flex-col items-center gap-2 rounded-[18px] py-3 sm:w-[68px] ${
                      isNow ? "bg-accent-soft" : ""
                    }`}
                  >
                    <span className={`text-sm ${isNow ? "font-bold text-ink" : "font-medium text-muted"}`}>
                      <time dateTime={hour.time.replace(" ", "T")}>{isNow ? "Now" : formatHour(hour.time)}</time>
                    </span>
                    <WeatherIcon kind={hourKind} isDay={hourIsDay} size={32} label={hour.condition || undefined} />
                    <span className="text-[17px] font-semibold">{temp(hour.temperature)}</span>
                    <span className="flex h-[18px] items-center gap-0.5 text-[13px] font-semibold text-link">
                      {hour.chanceOfRain >= RAIN_WORTH_SHOWING && (
                        <>
                          <DropletIcon size={11} strokeWidth={3} />
                          {hour.chanceOfRain}%<span className="sr-only"> chance of rain</span>
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* ---- Forecast ---- */}
        <section aria-labelledby="daily-heading" className="rounded-3xl bg-surface px-5 pt-4 pb-2 sm:px-6 sm:pt-5">
          <h3 id="daily-heading" className="mb-1 text-lg font-semibold sm:text-xl">
            {forecast.length}-day forecast
          </h3>
          <DailyList forecast={forecast} todayDate={local.date} temp={temp} rainUnit={units.chanceOfRain} />
        </section>
      </div>
    </article>
  );
}

// "Most likely around 10 pm", from the rest of today's hours
function rainTiming(todayHours: NonNullable<WeatherData["hourly"]>): string | null {
  if (todayHours.length === 0) return null;
  const wettest = todayHours.reduce((best, hour) => (hour.chanceOfRain > best.chanceOfRain ? hour : best));
  if (wettest.chanceOfRain < RAIN_WORTH_SHOWING) return "Low for the rest of today";
  return `Most likely around ${formatHour(wettest.time)}`;
}

function AdviceIcon({ kind, isDay }: { kind: string; isDay: boolean }) {
  const Icon = kind === "rain" || kind === "thunder" ? UmbrellaIcon : isDay ? SunIcon : null;
  return (
    <span className="mt-0.5 shrink-0 text-hero-icon">
      {Icon ? (
        <Icon size={22} />
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
        </svg>
      )}
    </span>
  );
}

function DetailCard({
  icon,
  label,
  value,
  children,
  tone = "rain",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  children?: ReactNode; // a short explanation under the number
  tone?: "rain" | "sun";
}) {
  return (
    <div className="flex min-h-31 flex-col gap-2.5 rounded-[20px] bg-surface p-4 sm:p-[18px]">
      <dt className="flex items-center gap-2 text-sm font-medium text-muted">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${
            tone === "sun" ? "bg-sun-soft text-sun-ink" : "bg-accent-soft text-link"
          }`}
        >
          {icon}
        </span>
        {label}
      </dt>
      <dd className="text-[26px] leading-none font-semibold sm:text-[28px]">{value}</dd>
      {children && <dd className="text-[13px] text-muted">{children}</dd>}
    </div>
  );
}

function DailyList({
  forecast,
  todayDate,
  temp,
  rainUnit,
}: {
  forecast: WeatherData["forecast"];
  todayDate: string;
  temp: (celsius: number) => string;
  rainUnit: string;
}) {
  // Shared scale so every day's temperature bar is comparable
  const weekLow = Math.min(...forecast.map((day) => day.low));
  const weekHigh = Math.max(...forecast.map((day) => day.high));
  const range = weekHigh - weekLow || 1;

  return (
    <ul>
      {forecast.map((day, index) => {
        const isToday = day.date === todayDate;
        const barStart = ((day.low - weekLow) / range) * 100;
        const barWidth = Math.max(((day.high - day.low) / range) * 100, 4);
        return (
          <li
            key={day.date}
            className={`flex flex-wrap items-center gap-x-3 gap-y-2.5 py-3.5 sm:gap-x-4 sm:py-4 ${index > 0 ? "border-t border-line" : ""}`}
          >
            <p className="w-[5.5rem] shrink-0 font-semibold">
              <time dateTime={day.date}>{isToday ? "Today" : formatDay(day.date)}</time>
            </p>
            <WeatherIcon kind={weatherKind(day.code, day.condition)} size={36} className="shrink-0 sm:h-10 sm:w-10" />
            <div className="min-w-0 flex-1 basis-32">
              <p className="font-medium">{day.condition}</p>
              <p className="text-sm font-medium text-link">
                {day.chanceOfRain}
                {rainUnit} chance of rain
              </p>
            </div>
            {/* Second line, lined up under the icon, so the bar has room at every width */}
            <div className="flex w-full items-center gap-2.5 pl-[calc(5.5rem+0.75rem)] sm:pl-[calc(5.5rem+1rem)]">
              <span className="w-12 text-right text-[15px] text-muted">
                <span className="sr-only">Low </span>
                {temp(day.low)}
              </span>
              <div aria-hidden="true" className="relative h-1.5 flex-1 rounded-full bg-track">
                <div
                  className="absolute inset-y-0 rounded-full"
                  style={{
                    left: `${barStart}%`,
                    width: `${barWidth}%`,
                    background: "linear-gradient(90deg, var(--bar-cool), var(--sun))",
                  }}
                />
              </div>
              <span className="w-12 text-[15px] font-semibold">
                <span className="sr-only">High </span>
                {temp(day.high)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
