import { ImageResponse } from "next/og";

// Site-wide social share card (cascades to every route; the landing's title +
// description fill og:title/og:description). Monochrome crest + wordmark on the
// brand near-black — deliberately locale-NEUTRAL (no tagline text) so the one
// shared image is correct for vi/en/zh. No custom font fetch (self-contained
// build, inside the data-localization rule).
export const alt = "Blackcrest";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0b0d",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <svg width="150" height="150" viewBox="0 0 64 64" fill="none">
          <path
            d="M16 39 L32 21 L48 39"
            stroke="#ffffff"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20.5 46.5 L32 33.5 L43.5 46.5"
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.62"
          />
        </svg>
        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 88,
            fontWeight: 600,
            letterSpacing: -2,
          }}
        >
          Blackcrest
        </div>
      </div>
    ),
    { ...size },
  );
}
