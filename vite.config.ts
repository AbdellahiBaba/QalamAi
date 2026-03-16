import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "favicon.png"],
      manifest: false,
      showMaximumFileSizeToCacheInBytesWarning: true,
      workbox: {
        maximumFileSizeToCacheInBytes: 250_000,
        globPatterns: ["**/*.html", "**/*.css", "**/vendor-*.js"],
        // Never let the service worker intercept auth routes — they involve cross-origin
        // redirects (Replit OIDC) that fetch() inside a SW cannot handle, producing
        // a "no-response" error and silently breaking login.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "gstatic-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            // Pass non-navigation /api/* requests straight to the network with no caching.
            // Navigation requests to /api/* (e.g. /api/login → cross-origin Replit redirect)
            // must NOT be matched here — they need to fall through to the browser unintercepted.
            urlPattern: ({ request, url }: { request: Request; url: URL }) =>
              url.pathname.startsWith("/api/") && request.destination !== "document",
            handler: "NetworkOnly",
          },
          {
            urlPattern: /\.(js|css|png|jpg|jpeg|svg|gif|webp|woff2?)$/i,
            handler: "CacheFirst",
            options: { cacheName: "static-assets-cache", expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
        ],
      },
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "wouter"],
          "vendor-ui": ["class-variance-authority", "tailwind-merge", "lucide-react", "clsx"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-form": ["react-hook-form", "@hookform/resolvers", "zod"],
          "vendor-charts": ["recharts"],
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
