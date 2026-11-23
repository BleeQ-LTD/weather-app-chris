// Shared by the server layout (which inlines THEME_SCRIPT in <head>) and the
// client theme store in theme.ts. Kept out of the "use client" file so the
// server gets the real string, not a client reference.

export const THEME_STORAGE_KEY = "weather-app:theme";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

// Runs before the first paint: the saved choice, or the device setting
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark")t=window.matchMedia("${DARK_QUERY}").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
