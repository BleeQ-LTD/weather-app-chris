// Helpers for safely reading what WeatherAPI sends back.
// WeatherAPI (or something between us and it) can return HTML, truncated
// JSON, or JSON in an unexpected shape, so nothing here trusts the body.

export type JsonBodyResult =
  | { ok: true; data: unknown }
  | { ok: false; reason: "timeout" | "network" | "malformed" };

// Reads the body as text, then parses it. Never throws.
// The timeout set on the original fetch also covers reading the body, so a
// body that stalls partway rejects with a "TimeoutError".
export async function readJsonBody(response: Response): Promise<JsonBodyResult> {
  let text: string;
  try {
    text = await response.text();
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    return { ok: false, reason: name === "TimeoutError" ? "timeout" : "network" };
  }

  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

// Finite numbers only: rejects NaN, Infinity and numeric strings
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
