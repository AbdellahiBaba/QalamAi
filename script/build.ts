import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, cp, mkdir, readdir } from "fs/promises";

const MUST_KEEP_EXTERNAL = [
  "@napi-rs/canvas",
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

  console.log("copying pdfkit AFM data files to dist/data/...");
  await mkdir("dist/data", { recursive: true });
  await cp("node_modules/pdfkit/js/data", "dist/data", { recursive: true });

  console.log("copying @napi-rs/canvas binaries to dist/node_modules/...");
  await cp(
    "node_modules/@napi-rs/canvas",
    "dist/node_modules/@napi-rs/canvas",
    { recursive: true }
  );
  const entries = await readdir("node_modules/@napi-rs");
  for (const entry of entries) {
    if (entry === "canvas-linux-x64-gnu") {
      await cp(
        `node_modules/@napi-rs/${entry}`,
        `dist/node_modules/@napi-rs/${entry}`,
        { recursive: true }
      );
      console.log(`  copied @napi-rs/${entry}`);
    } else if (entry.startsWith("canvas-")) {
      console.log(`  skipped @napi-rs/${entry}`);
    }
  }

  console.log("build complete — dist/ is self-contained");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
