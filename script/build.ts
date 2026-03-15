import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, cp, mkdir, access } from "fs/promises";

const MUST_KEEP_EXTERNAL = [
  "@napi-rs/canvas",
];

const NAPI_CANVAS_PACKAGES = [
  "@napi-rs/canvas",
  "@napi-rs/canvas-linux-x64-gnu",
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
      logLevel: "info",
    }),
  ]);

  console.log("copying @napi-rs/canvas native binaries to dist/node_modules/...");
  for (const pkg of NAPI_CANVAS_PACKAGES) {
    const src = `node_modules/${pkg}`;
    const dest = `dist/node_modules/${pkg}`;
    try {
      await access(src);
      await mkdir(dest, { recursive: true });
      await cp(src, dest, { recursive: true });
      console.log(`  copied ${pkg}`);
    } catch {
      console.log(`  skipped ${pkg} (not installed on this platform)`);
    }
  }

  console.log("copying pdfkit AFM data files to dist/data/...");
  await mkdir("dist/data", { recursive: true });
  await cp("node_modules/pdfkit/js/data", "dist/data", { recursive: true });

  console.log("build complete");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
