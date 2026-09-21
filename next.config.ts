import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'flagcdn.com' },
      { protocol: 'https', hostname: 'www.google.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Prevent clickjacking — don't allow framing
          { key: 'X-Frame-Options', value: 'DENY' },
          // Control referrer information sent with requests
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Lock down browser features — no camera, mic, geolocation
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Content Security Policy
          // - default-src 'self': only load resources from same origin by default
          // - script-src 'self' 'unsafe-inline' 'unsafe-eval': needed for Next.js
          //   (Turbopack/HMR use inline scripts; Vercel analytics uses eval)
          // - style-src 'self' 'unsafe-inline': Next.js injects inline styles
          // - img-src 'self' data: https: blob: — allow flagcdn, Google, data URIs
          // - font-src 'self' data: — Next.js font optimization
          // - connect-src 'self' https: — allow API calls + Supabase + Stripe + Sentry
          // - frame-ancestors 'none': equivalent to X-Frame-Options: DENY
          // - base-uri 'self': prevent <base> tag injection
          // - form-action 'self': prevent form submission to external sites
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join('; '),
          },
          // HSTS — force HTTPS for 1 year (only sent on HTTPS responses)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ]
  },
};

export default withNextIntl(nextConfig);
