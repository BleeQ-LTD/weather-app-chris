import type { SVGProps } from "react";

// Small line icons for the interface (not the weather icons, see WeatherIcon).
// They use currentColor, so they take the colour of the text around them.
// Decorative by default: pass aria-label (and role="img") only when an icon stands alone.

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const PinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Icon>
);

export const StarIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Icon {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon strokeWidth={2.4} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

export const AlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5v.01" />
  </Icon>
);

export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.5v.01" />
  </Icon>
);

export const RefreshIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 11a8 8 0 1 0-2.3 5.7" />
    <path d="M20 4v7h-7" />
  </Icon>
);

export const LocateIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 11l18-8-8 18-2-8z" />
  </Icon>
);

export const LocateOffIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 11l18-8-8 18-2-8z" />
    <path d="M3 3l18 18" />
  </Icon>
);

export const CloudOffIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7.5 18h9a3.8 3.8 0 0 0 .4-7.6A5.5 5.5 0 0 0 6.4 9.6 4.2 4.2 0 0 0 7.5 18z" />
    <path d="M3 3l18 18" />
  </Icon>
);

export const SunIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);

export const MoonIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </Icon>
);

export const ThermometerIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 14.8V4.5a2 2 0 0 0-4 0v10.3a4 4 0 1 0 4 0z" />
  </Icon>
);

export const DropletIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z" />
  </Icon>
);

export const WindIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 8h10a2.5 2.5 0 1 0-2.5-2.5M3 12h15a3 3 0 1 1-3 3M3 16h7" />
  </Icon>
);

export const UmbrellaIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M21 12a9 9 0 0 0-18 0z" />
    <path d="M12 12v6.5a2.5 2.5 0 0 1-5 0" />
  </Icon>
);

export const SunriseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M17 18a5 5 0 0 0-10 0M12 3v6M4.2 10.2l1.4 1.4M2 18h2M20 18h2M18.4 11.6l1.4-1.4M2 22h20M9 6l3-3 3 3" />
  </Icon>
);

// The app's logo: a sun behind a cloud on a blue tile
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-[10px] bg-rain"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.69} height={size * 0.69} viewBox="0 0 24 24" focusable="false">
        <circle cx="9" cy="9" r="4" fill="#F5A524" />
        <path d="M8.5 19h8a3.5 3.5 0 0 0 .4-7A5 5 0 0 0 7.6 11a4 4 0 0 0 .9 8z" fill="#FFFFFF" />
      </svg>
    </span>
  );
}
