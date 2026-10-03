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
Copy .env.example to .env.local and add your key from weatherapi.com. Never commit .env.local; it is ignored by Git. The variable has no NEXT_PUBLIC_ prefix, so it is never sent to the browser.
Run the application
npm run dev
Open http://localhost:3000. Restart the server after changing .env
Test the application
npx tsc --noEmit
npm run lint
npm run build
Manual test cases are listed in the test record. The routes can also be checked directly, for example /api/weather?q=Lagos and /api/search?q=la.