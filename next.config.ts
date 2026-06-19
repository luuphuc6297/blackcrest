import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy (blueprint §6). Everything is same-origin: the PDF is
 * rendered/streamed from our own endpoints and there is NO external CDN (data
 * localization). Dev needs 'unsafe-eval' + ws: for React Fast Refresh; prod
 * drops them. 'unsafe-inline' on script/style is the pragmatic compromise Next's
 * inline bootstrap currently requires — nonce-based hardening is a follow-up.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // pdf.js worker is self-hosted (/pdf.worker.min.mjs); blob: covers its
  // fallback-worker path. Explicit so it doesn't rely on script-src fallback.
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

// `output: "standalone"` is for the Docker/VPS image. It must NOT be used on
// Vercel: it breaks @vercel/nft tracing of next-intl's dynamic
// `import("../../messages/${locale}.json")`, so the message bundles aren't shipped
// into the serverless function. Any RUNTIME-rendered page then throws at request
// time — e.g. /[locale]/login (dynamic because it reads searchParams) → 500, while
// prerendered pages (landing, register) are fine. Vercel sets VERCEL=1 and builds
// its own functions, so leave output unset there.
const standaloneOutput: NextConfig["output"] = process.env.VERCEL
  ? undefined
  : "standalone";

const nextConfig: NextConfig = {
  output: standaloneOutput,
  // Belt-and-suspenders: always trace the i18n message JSON into the server
  // bundle (the template-literal dynamic import isn't statically analyzable).
  outputFileTracingIncludes: {
    "/**": ["./messages/**"],
  },
  // PDF streaming + Prisma + argon2 must run on the Node runtime.
  serverExternalPackages: ["@node-rs/argon2", "pdf-lib", "@pdf-lib/fontkit"],
  experimental: {
    // Server Actions are used for writes; keep the body limit tight (PDFs go
    // through a streaming Route Handler, not Server Actions — blueprint §9).
    serverActions: {
      bodySizeLimit: "1mb",
    },
    // Tree-shake lucide-react icon imports to barrel-import only what's used.
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
