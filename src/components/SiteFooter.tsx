import packageJson from "../../package.json";

// Footer on every page: data credits and the app version, out of the way.
// Runs on the server only, so reading package.json doesn't add it to the browser bundle.
export default function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto w-full max-w-xl px-5 py-6 text-xs text-muted">
        <p>
          Weather data by{" "}
          <a href="https://www.weatherapi.com/" className="underline hover:text-ink">
            WeatherAPI.com
          </a>
          . Place search by{" "}
          <a href="https://www.geoapify.com/" className="underline hover:text-ink">
            Geoapify
          </a>{" "}
          (© OpenStreetMap contributors).
        </p>
        <p className="mt-1">Version {packageJson.version}</p>
      </div>
    </footer>
  );
}