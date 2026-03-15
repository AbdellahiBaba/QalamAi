import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, cp, mkdir, access } from "fs/promises";
import path from "path";

// @napi-rs/canvas JS code is bundled directly into the output.
// The platform-specific packages are kept external because:
//  - only one platform binary is used at runtime (selected via NAPI_RS_NATIVE_LIBRARY_PATH)
//  - we copy the correct .node binary directly into dist/ so no node_modules are needed
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

  // Copy the native .node binary directly into dist/ so the server can load it
  // via NAPI_RS_NATIVE_LIBRARY_PATH without needing any node_modules directory.
  console.log("copying @napi-rs/canvas native binary to dist/...");
  let copied = false;
  for (const { pkg, file } of NAPI_BINARY_CANDIDATES) {
    const src = `node_modules/${pkg}/${file}`;
    try {
      await access(src);
      await cp(src, `dist/${file}`);
      console.log(`  copied ${file} (from ${pkg})`);
      copied = true;
      break;
    } catch {
      console.log(`  skipped ${pkg} (not installed on this platform)`);
    }
  }
  if (!copied) {
    console.warn("  WARNING: no @napi-rs/canvas binary found — canvas features will be unavailable");
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
