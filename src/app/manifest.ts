import type { MetadataRoute } from "next";

/**
 * Web app manifest — modest values for a gated portal. Auto-linked by Next via
 * <link rel="manifest"> on every route. Single root route (can't be per-locale),
 * so copy is Vietnamese to match `lang: "vi"` and the Vietnamese-first audience.
 * Icons point at the stable public crest asset (not the hashed icon URL).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Blackcrest — Cổng tài liệu đầu tư",
    short_name: "Blackcrest",
    description:
      "Cổng tài liệu đầu tư tư nhân của Blackcrest — phát hành, phê duyệt và phân phối báo cáo bảo mật với kiểm soát truy cập đến từng trang.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f6f8",
    theme_color: "#0a0b0d",
    lang: "vi",
    dir: "ltr",
    icons: [
      {
        src: "/logos/logo-mark.svg",
        type: "image/svg+xml",
        sizes: "any",
        purpose: "any",
      },
    ],
  };
}
