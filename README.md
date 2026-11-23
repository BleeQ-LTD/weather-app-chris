A weather app where a user enters or selects a location and sees current conditions and a 3-day forecast, with clear dates and units. It handles empty, loading, success, invalid-location, ambiguous-location and error states, works on mobile, and is keyboard accessible.
The browser never talks to WeatherAPI directly. It calls two server routes in the app, which hold the API key:
• /api/weather returns current weather and forecast for a place name or a place ID.
• /api/search returns matching places, used for typing suggestions and the "did you mean" list.
Stack: Next.js (App Router), TypeScript, Tailwind CSS v4, WeatherAPI.com, Firebase App Hosting.
Local setup
1. Install Node.js 20 or later.
2. Clone the repository and install dependencies:
git clone https://github.com/BleeQ-LTD/weather-app-chris.git
cd weather-app-chris
npm install
Environment variables
Variable
Required
Where it is used
WEATHER_API_KEY
Yes
Server routes only (/api/weather, /api/search)
Setup: copy .env.example to .env.local (cp .env.example .env.local) and replace the placeholder with your own key from weatherapi.com. .env.local is ignored by Git, so your key is never committed; only the placeholder file .env.example is tracked. The variable has no NEXT_PUBLIC_ prefix, so it is never sent to the browser.
Run the application
npm run dev
Open http://localhost:3000. Restart the server after changing .env
Test the application
npx tsc --noEmit
npm run lint
npm run build
Manual test cases are listed in the test record. The routes can also be checked directly, for example /api/weather?q=Lagos and /api/search?q=la.
Update prompt (new version available)
When a new version is deployed, people who already have the app open see a small banner: "A new version is available" with Reload and Later. It never reloads by itself, so nobody loses what they were doing.
How it works:
- Each build knows its own version: the git commit it was built from (next.config.ts, NEXT_PUBLIC_APP_VERSION; shown in the footer as e.g. "Version 0.1.0 (ac8e549)").
- Firebase Remote Config (weather-app-6c101) holds latest_version: the commit of the latest production deploy.
- The app checks on load, when the tab becomes visible or focused again, and every 30 minutes. Remote Config only asks the server at most every 30 minutes (minimumFetchInterval); checks in between reuse the last answer.
- If Remote Config can't be reached, the app carries on as normal and logs the reason to the console.
- The check is off in local development (npm run dev), when using the Firebase emulators, and on Vercel preview deploys, so they never show a false banner.
Keeping latest_version up to date:
- The "Publish latest version" workflow (.github/workflows/publish-latest-version.yml) runs when Vercel reports a successful Production deploy, and sets latest_version to that commit with scripts/publish-latest-version.mjs. It never publishes a commit older than the one already there (e.g. a re-deploy of an old commit).
- It can also be run by hand from the Actions tab (Run workflow, with the full commit hash).
One-time setup (a project owner does this once):
1. In Google Cloud console for weather-app-6c101, IAM & Admin > Service Accounts: create a service account, e.g. "github-remote-config".
2. Give it only the role Firebase Remote Config Admin.
3. Create a JSON key for it (Keys > Add key > JSON). Do not save it in the repository.
4. In GitHub, BleeQ-LTD/weather-app-chris > Settings > Secrets and variables > Actions, add a repository secret FIREBASE_REMOTE_CONFIG_KEY with the whole JSON as its value, then delete the downloaded file.
5. Make sure the Firebase Remote Config API and Firebase Installations API are enabled for the project (Firebase console > Remote Config opens without asking to enable it). If the web API key has API restrictions in Google Cloud > Credentials, allow both of these APIs too, or the check fails quietly with "API key not valid" in the console.
6. Run the workflow once by hand with the current production commit, and check Firebase console > Remote Config shows latest_version.
Trade-offs:
- Commits can't be put in order on their own, so the app treats "a different commit" as "newer". That's safe because only successful production deploys of main are published, and older commits are refused.
- Vercel and App Hosting deploy separately. latest_version follows Vercel (chris-weather.bleeq.app), because Vercel reports its deploys to GitHub. App Hosting doesn't, and its build may not know its commit; if it doesn't, the check is simply off there (no banner, no false prompts). To include App Hosting, set NEXT_PUBLIC_APP_VERSION at build time there.
- A 30-minute fetch interval means someone may hear about a new version up to 30 minutes late. Shorter would use more of Firebase's fetch allowance for little benefit; Remote Config's real-time updates (onConfigUpdate) could make it instant later if needed.
- If the key isn't set up, the workflow fails with a clear message and the app just never shows the banner.
Manual fallback (if the workflow can't be used): Firebase console > Remote Config > add or edit the parameter latest_version (String), set it to the full commit hash that is live on chris-weather.bleeq.app (Vercel > Deployments > Production), and Publish changes.
