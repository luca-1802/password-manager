import * as esbuild from "esbuild";
import { cpSync, mkdirSync, existsSync } from "fs";

const isWatch = process.argv.includes("--watch");

if (!existsSync("dist")) mkdirSync("dist", { recursive: true });

cpSync("static", "dist", { recursive: true });
cpSync("src/popup/popup.html", "dist/popup.html");
cpSync("src/popup/popup.css", "dist/popup.css");
cpSync("src/content/content.css", "dist/content.css");

const commonOptions = {
  bundle: true,
  minify: !isWatch,
  sourcemap: isWatch,
  target: "chrome120",
};

async function build() {
  const contexts = await Promise.all([
    esbuild.context({
      ...commonOptions,
      entryPoints: ["src/background/service-worker.ts"],
      outfile: "dist/service-worker.js",
      format: "esm",
    }),
    esbuild.context({
      ...commonOptions,
      entryPoints: ["src/popup/popup.ts"],
      outfile: "dist/popup.js",
      format: "iife",
    }),
    esbuild.context({
      ...commonOptions,
      entryPoints: ["src/content/content.ts"],
      outfile: "dist/content.js",
      format: "iife",
    }),
  ]);

  if (isWatch) {
    await Promise.all(contexts.map((ctx) => ctx.watch()));
    console.log("Watching for changes...");
  } else {
    await Promise.all(contexts.map((ctx) => ctx.rebuild()));
    await Promise.all(contexts.map((ctx) => ctx.dispose()));
    console.log("Build complete.");
  }
}

build();