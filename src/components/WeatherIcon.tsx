import type { CSSProperties } from "react";
import type { WeatherKind } from "@/lib/conditions";

// One crisp icon set for every condition, drawn as SVG so it stays sharp at any size
// (replaces WeatherAPI's small PNGs). Cloud, rain and moon colours come from CSS
// variables in globals.css, so the icons adapt to light, dark and the hero card.

const SUN = "#F59E0B";
const RAYS = "#F5A524";

const fill = (name: string): CSSProperties => ({ fill: `var(${name})` });
const stroke = (name: string): CSSProperties => ({ stroke: `var(${name})` });

function Sun({ cx = 24, cy = 24, r = 9, halo = false }: { cx?: number; cy?: number; r?: number; halo?: boolean }) {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
    const rad = (angle * Math.PI) / 180;
    const from = r + 5;
    const to = r + 9;
    return `M${cx + from * Math.cos(rad)} ${cy + from * Math.sin(rad)}L${cx + to * Math.cos(rad)} ${cy + to * Math.sin(rad)}`;
  });
  return (
    <>
      {halo && <circle cx={cx} cy={cy} r={r + 5.5} style={{ fill: "var(--halo, transparent)", opacity: "var(--halo-opacity, 0)" }} />}
      <circle cx={cx} cy={cy} r={r} fill={SUN} />
      <path d={rays.join("")} stroke={RAYS} strokeWidth={2.8} strokeLinecap="round" />
    </>
  );
}

function SmallSun() {
  return (
    <>
      <circle cx="18" cy="18" r="7" fill={SUN} />
      <path d="M18 4.5v3M4.5 18h3M8.5 8.5l2.1 2.1M27.5 8.5l-2.1 2.1" stroke={RAYS} strokeWidth={2.6} strokeLinecap="round" />
    </>
  );
}

function Moon({ big = false }: { big?: boolean }) {
  return big ? (
    <>
      <circle cx="24" cy="24" r="15" style={{ fill: "var(--halo, transparent)", opacity: "var(--halo-opacity, 0)" }} />
      <path d="M22 9.5a14 14 0 1 0 16.5 19A11.5 11.5 0 0 1 22 9.5z" style={fill("--moon")} />
      <circle cx="36" cy="10" r="1.3" fill="#FFFFFF" />
      <circle cx="41" cy="18" r="0.9" fill="#FFFFFF" />
      <circle cx="8" cy="9" r="1" fill="#FFFFFF" />
    </>
  ) : (
    <path d="M21 6a12 12 0 1 0 13 16A10 10 0 0 1 21 6z" style={fill("--moon")} />
  );
}

// Cloud in front of a small sun or moon (bottom right)
const FRONT_CLOUD = "M17 40h17a7 7 0 0 0 .9-13.9A10 10 0 0 0 16 25.5 7.3 7.3 0 0 0 17 40z";
// A full-size cloud, raised when there's rain or snow beneath it
const CLOUD = "M15 37h19a8 8 0 0 0 1-15.9A11 11 0 0 0 13.6 21 8 8 0 0 0 15 37z";
const HIGH_CLOUD = "M15 31h19a8 8 0 0 0 1-15.9A11 11 0 0 0 13.6 15 8 8 0 0 0 15 31z";

function Cloud({ d, light = false }: { d: string; light?: boolean }) {
  return (
    <path
      d={d}
      strokeWidth={2.4}
      strokeLinejoin="round"
      style={{ ...fill(light ? "--cloud" : "--cloud-dark"), ...stroke("--cloud-stroke") }}
    />
  );
}

export default function WeatherIcon({
  kind,
  isDay = true,
  size = 32,
  label,
  hero = false,
  className,
}: {
  kind: WeatherKind;
  isDay?: boolean;
  size?: number;
  label?: string; // when set, screen readers hear it; otherwise the icon is decorative
  hero?: boolean; // the big hero version, with a soft glow behind the sun or moon
  className?: string;
}) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };

  let body;
  switch (kind) {
    case "clear":
      body = isDay ? <Sun r={hero ? 9.5 : 9} halo={hero} /> : <Moon big={hero} />;
      break;
    case "partly-cloudy":
      body = (
        <>
          {isDay ? <SmallSun /> : <Moon />}
          <Cloud d={FRONT_CLOUD} light />
        </>
      );
      break;
    case "cloudy":
      body = <Cloud d={CLOUD} />;
      break;
    case "fog":
      body = (
        <>
          <Cloud d={HIGH_CLOUD} />
          <path d="M10 36h28M14 42h20" strokeWidth={2.6} strokeLinecap="round" style={stroke("--cloud-stroke")} />
        </>
      );
      break;
    case "rain":
      body = (
        <>
          <Cloud d={HIGH_CLOUD} />
          <path d="M18 36l-2 5M26 36l-2 5M34 36l-2 5" strokeWidth={2.8} strokeLinecap="round" style={stroke("--drop")} />
        </>
      );
      break;
    case "snow":
      body = (
        <>
          <Cloud d={HIGH_CLOUD} />
          <g style={fill("--drop")}>
            <circle cx="17" cy="38" r="2" />
            <circle cx="25" cy="42" r="2" />
            <circle cx="33" cy="38" r="2" />
          </g>
        </>
      );
      break;
    case "thunder":
      body = (
        <>
          <Cloud d={HIGH_CLOUD} />
          <path d="M26 31l-5 8h5l-3 7 8-10h-5l3-5z" fill={RAYS} />
        </>
      );
      break;
  }

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" focusable="false" className={className} {...a11y}>
      {body}
    </svg>
  );
}
