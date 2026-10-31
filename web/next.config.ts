import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app so Next doesn't infer the parent dir
  // (which contains Gophish's own yarn.lock) as the project root.
  outputFileTracingRoot: path.join(__dirname),
  turbopack: { root: __dirname },
  serverExternalPackages: ["@react-pdf/renderer"],
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          {
            key: "Content-Security-Policy",
            // Note: 'unsafe-inline' for scripts is required by Next.js 16 inline
            // bootstrap scripts. Template preview uses dangerouslySetInnerHTML for
            // admin-authored HTML (self-XSS only). Re-evaluate nonce-based CSP
            // when Next.js supports strict-dynamic without inline scripts.
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://api.stripe.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;