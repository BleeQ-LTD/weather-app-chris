import { ImageResponse } from "next/og";

// The picture WhatsApp, X, Telegram and others show under a shared link
export const alt = "Weather: live conditions and a 3-day forecast for any city";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "white",
          background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 45%, #0ea5e9 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 999, background: "#f59e0b" }} />
          </div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>Weather</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 760 }}>
            <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>What&apos;s the weather like?</div>
            <div style={{ fontSize: 36, opacity: 0.9 }}>Tap to see the live forecast for any city, hour by hour.</div>
          </div>
          {/* A sun behind a cloud, drawn with shapes so no emoji font is needed */}
          <div style={{ position: "relative", width: 300, height: 240, display: "flex" }}>
            <div style={{ position: "absolute", top: 0, right: 10, width: 150, height: 150, borderRadius: 999, background: "#fbbf24" }} />
            <div style={{ position: "absolute", bottom: 20, left: 0, width: 260, height: 110, borderRadius: 999, background: "white" }} />
            <div style={{ position: "absolute", bottom: 70, left: 50, width: 130, height: 130, borderRadius: 999, background: "white" }} />
          </div>
        </div>
      </div>
    ),
    size
  );
}
