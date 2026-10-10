import {
  WeatherData,
  formatDay,
  formatTemp,
  splitLocalDateTime,
} from "@/lib/weather";

export default function WeatherResults({ data }: { data: WeatherData }) {
  const { location, current, forecast, units } = data;
  const local = splitLocalDateTime(location.localTime);
  const updated = splitLocalDateTime(current.updatedAt);

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
<h2 id="place-heading" className="-ml-[0.05em] text-3xl font-semibold tracking-tight">
          {location.name}
      </h2>
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
      <p className="mt-2 text-xs text-muted">
        Updated {updated.time} local time. Temperatures in degrees Celsius.
      </p>

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
                <time dateTime={day.date}>
                  {isToday ? "Today" : formatDay(day.date)}
                </time>
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
                <div
                  aria-hidden="true"
                  className="relative h-1.5 flex-1 rounded-full bg-line"
                >
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