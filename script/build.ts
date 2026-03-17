import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, cp, mkdir, access } from "fs/promises";
import path from "path";

// @napi-rs/canvas-* platform packages are kept external (not bundled) because only
// the platform-specific binary for the host is needed. Both the main JS package and the
// linux-x64-gnu platform package are copied to dist/node_modules/ so the deployed
// container can resolve them (root node_modules/ is excluded by .dockerignore).
const MUST_KEEP_EXTERNAL = [
  "@napi-rs/canvas-*",
];

// Platform binary candidates, in priority order for this Linux x64 env
const NAPI_BINARY_CANDIDATES = [
  { pkg: "@napi-rs/canvas-linux-x64-gnu", file: "skia.linux-x64-gnu.node" },
  { pkg: "@napi-rs/canvas-linux-x64-musl", file: "skia.linux-x64-musl.node" },
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client + server in parallel...");

  await Promise.all([
    viteBuild(),
    esbuild({
      entryPoints: ["server/index.ts"],
      platform: "node",
      bundle: true,
      format: "cjs",
      outfile: "dist/index.cjs",
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      minify: true,
      external: MUST_KEEP_EXTERNAL,
      alias: {
        "stripe-replit-sync": path.resolve("node_modules/stripe-replit-sync/dist/index.cjs"),
      },
      logLevel: "info",
    }),
  ]);

  // Copy @napi-rs/canvas packages to dist/node_modules/ so they can be resolved
  // at runtime in the deployed container (root node_modules/ is excluded by .dockerignore).
  console.log("copying @napi-rs/canvas packages to dist/node_modules/...");
  await mkdir("dist/node_modules/@napi-rs", { recursive: true });

  // Always copy the main @napi-rs/canvas JS package
  try {
    await access("node_modules/@napi-rs/canvas");
    await cp("node_modules/@napi-rs/canvas", "dist/node_modules/@napi-rs/canvas", { recursive: true });
    console.log("  copied @napi-rs/canvas");
  } catch {
    console.warn("  WARNING: node_modules/@napi-rs/canvas not found");
  }

  // Copy the linux-x64-gnu platform package (skip musl — not used on this host)
  let nativeCopied = false;
  for (const { pkg } of NAPI_BINARY_CANDIDATES) {
    if (pkg.includes("musl")) {
      console.log(`  skipped ${pkg} (musl not needed)`);
      continue;
    }
    try {
      await access(`node_modules/${pkg}`);
      await cp(`node_modules/${pkg}`, `dist/node_modules/${pkg}`, { recursive: true });
      console.log(`  copied ${pkg}`);
      nativeCopied = true;
      break;
    } catch {
      console.log(`  skipped ${pkg} (not installed on this platform)`);
    }
  }
  if (!nativeCopied) {
    console.warn("  WARNING: no @napi-rs/canvas-linux-x64-gnu binary found — canvas features will be unavailable");
  }

  console.log("copying stripe-replit-sync migrations to dist/migrations/...");
  await mkdir("dist/migrations", { recursive: true });
  await cp("node_modules/stripe-replit-sync/dist/migrations", "dist/migrations", { recursive: true });

  console.log("copying pdfkit AFM data files to dist/data/...");
  await mkdir("dist/data", { recursive: true });
  await cp("node_modules/pdfkit/js/data", "dist/data", { recursive: true });

  console.log("build complete");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
