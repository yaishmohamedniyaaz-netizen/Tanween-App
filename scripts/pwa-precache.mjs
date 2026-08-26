import { readdir, readFile, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

export const BUILD_PRECACHE_MARKER =
  "/* __TAHQEEQ_BUILD_PRECACHE__ */ []";

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

export async function collectBuildPrecacheUrls(distDir) {
  const assetsDir = resolve(distDir, "assets");
  const assets = (await listFiles(assetsDir))
    .map((path) => `/${relative(distDir, path).split(sep).join("/")}`)
    .sort();

  if (!assets.some((url) => url.endsWith(".js"))) {
    throw new Error("The Vite build emitted no JavaScript application asset.");
  }
  if (!assets.some((url) => url.endsWith(".css"))) {
    throw new Error("The Vite build emitted no CSS application asset.");
  }

  return ["/", ...assets];
}

export async function injectBuildPrecache(distDir) {
  const workerPath = resolve(distDir, "sw.js");
  const source = await readFile(workerPath, "utf8");
  const firstMarker = source.indexOf(BUILD_PRECACHE_MARKER);
  if (firstMarker === -1 || firstMarker !== source.lastIndexOf(BUILD_PRECACHE_MARKER)) {
    throw new Error("The service worker must contain exactly one build precache marker.");
  }

  const urls = await collectBuildPrecacheUrls(distDir);
  const injected = source.replace(
    BUILD_PRECACHE_MARKER,
    JSON.stringify(urls, null, 2),
  );
  await writeFile(workerPath, injected);
  return urls;
}
