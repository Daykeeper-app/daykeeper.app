import type { NextConfig } from "next"

const isDev = process.env.NODE_ENV === "development"

const imgSrc = isDev
  ? "img-src 'self' data: blob: https: http://localhost:* http://127.0.0.1:*"
  : "img-src 'self' data: blob: https:"

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Keep inline script allowed because theme bootstrap in app/layout.tsx is inline.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      imgSrc,
      "font-src 'self' data:",
      "connect-src 'self' https://daykeeper-api.onrender.com http://localhost:3001 http://127.0.0.1:3001",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
]

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "daykeeper.s3.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "media.daykeeper.app",
        pathname: "/**",
      },
      // Allow localhost image URLs when developing with local file storage
      ...(isDev
        ? [
            {
              protocol: "http" as const,
              hostname: "localhost",
              pathname: "/uploads/**",
            },
            {
              protocol: "http" as const,
              hostname: "127.0.0.1",
              pathname: "/uploads/**",
            },
          ]
        : []),
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
