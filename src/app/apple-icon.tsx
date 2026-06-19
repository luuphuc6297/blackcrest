import { ImageResponse } from "next/og";

// Apple touch icon (iOS adds its own rounded corners + gloss, so paint a full
// near-black tile + white crest, no transparency). Generated as PNG at build.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0b0d",
        }}
      >
        <svg width="118" height="118" viewBox="0 0 64 64" fill="none">
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
      </div>
    ),
    { ...size },
  );
}
