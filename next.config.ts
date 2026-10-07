import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components (Next 16) is deliberately left off: every byte of booking data
  // flows through client-side React Query against the Route Handlers, so there is no
  // server-rendered data to cache. Enabling it would only add prerender-time strictness
  // and a risk of serving a prerendered snapshot of the in-memory store.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
