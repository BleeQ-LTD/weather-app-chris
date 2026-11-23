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
Deploying Firestore rules
Rules in firestore.rules go live only through GitHub Actions, never from a laptop. The "Deploy Firestore rules" workflow (.github/workflows/deploy-firestore-rules.yml) runs when a merge to main changes the rules or their tests: it runs the 29 rules tests against the emulator first, and deploys only if they all pass. It can also be run by hand from the Actions tab (Run workflow).
One-time setup (a project owner does this once):
1. In Google Cloud console for the weather-app-6c101 project, go to IAM & Admin > Service Accounts and create a service account, e.g. "github-rules-deploy".
2. Give it only these roles: Firebase Rules Admin, and Service Usage Consumer. (If a deploy ever fails with a permission error about the Firestore database, also add Cloud Datastore Viewer, which is read-only.)
3. Create a JSON key for it (Keys > Add key > JSON). Do not save it in the repository.
4. In GitHub, BleeQ-LTD/weather-app-chris > Settings > Secrets and variables > Actions, add a repository secret named FIREBASE_RULES_DEPLOY_KEY and paste the whole JSON file as its value. Then delete the downloaded file.
5. Run the workflow once from the Actions tab and check it finishes green.
Check it worked: Firebase console > Firestore Database > Rules shows the new rules and the time they were published.
