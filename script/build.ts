import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// Packages that CANNOT be bundled into a single file:
//
// - canvas:     native C++ addon (.node binary) — must remain in node_modules
// - geoip-lite: reads 150 MB of binary .dat data files at runtime via
//               __dirname-relative paths that break inside a bundle
// - pdfkit:     reads .afm font files from __dirname/data/ at runtime;
//               bundling replaces __dirname with the build-time path
//
// Everything else is inlined into dist/index.cjs so the deployment image
// doesn't need to carry a large node_modules directory.
// Node.js built-ins (fs, path, crypto, …) are automatically externalised
// when esbuild's platform is set to "node".
const MUST_KEEP_EXTERNAL = [
  "canvas",
  "geoip-lite",
  "pdfkit",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");

  await esbuild({
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
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
