import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, cp, mkdir, writeFile, readFile } from "fs/promises";
import path from "path";

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
      alias: {
        "stripe-replit-sync": path.resolve("node_modules/stripe-replit-sync/dist/index.cjs"),
      },
      logLevel: "info",
    }),
  ]);

  // Write a minimal package.json so the deployment run command can do
  // `npm install --prefix dist` to install only the native addon at startup.
  // This keeps dist/node_modules/ out of the deployment snapshot entirely.
  const rootPkg = JSON.parse(await readFile("package.json", "utf8"));
  const canvasVersion = rootPkg.dependencies["@napi-rs/canvas"] ?? "^0.1.96";
  await writeFile("dist/package.json", JSON.stringify({
    name: "qalamai-server",
    version: "1.0.0",
    private: true,
    dependencies: {
      "@napi-rs/canvas": canvasVersion,
    },
  }, null, 2));
  console.log("wrote dist/package.json with @napi-rs/canvas", canvasVersion);

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
