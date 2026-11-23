import packageJson from "../../package.json";
import { APP_VERSION, shortVersion } from "@/lib/appVersion";
import ThemeToggle from "@/components/ThemeToggle";

// Footer on every page: data credits and the app version, out of the way.
// On phones it also holds the light / dark switch (the nav has no room for it).
// Runs on the server only, so reading package.json doesn't add it to the browser bundle.
export default function SiteFooter() {
  return (
    <footer>
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-6 pt-4 pb-7 text-center text-[13px] text-muted sm:flex-row sm:justify-between sm:border-t sm:border-line sm:px-8 sm:text-left">
        <ThemeToggle variant="segmented" className="sm:hidden" />
        <p>
          Weather data by{" "}
          <a href="https://www.weatherapi.com/" className="text-link underline">
            WeatherAPI.com
          </a>
          . Place search by{" "}
          <a href="https://www.geoapify.com/" className="text-link underline">
            Geoapify
          </a>{" "}
          (© OpenStreetMap contributors).
        </p>
        {/* The commit shows which build is running, e.g. after pressing Reload on the update prompt */}
        <p>
          Version {packageJson.version}
          {shortVersion(APP_VERSION) && <span> ({shortVersion(APP_VERSION)})</span>}
        </p>
      </div>
    </footer>
  );
}
