import { readdir, readFile, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { createHash } from "node:crypto";

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
  let injected = source.replace(
    BUILD_PRECACHE_MARKER,
    JSON.stringify(urls, null, 2),
  );
  if (source.includes("/* __TAHQEEQ_FIXED_PACKAGE__ */ null")) {
    const descriptor = JSON.parse(await readFile(new URL('../src/data/fixedMushafPackage.json', import.meta.url), 'utf8'));
    const manifest = JSON.parse(await readFile(resolve(distDir, descriptor.manifest.url.slice(1)), 'utf8'));
    const core = manifest.pages.find(page => page.page === 604);
    if (!core) throw new Error('Missing core artwork page');
    const shellHashes = {};
    for (const url of urls) {
      const bytes = await readFile(resolve(distDir, url === '/' ? 'index.html' : url.slice(1)));
      shellHashes[url] = createHash('sha256').update(bytes).digest('hex');
    }
    // Static delivery may transform HTML even when the Worker sets no-transform.
    // The SW verifies this pinned opaque copy before serving it as local HTML.
    const shellUrl = `/app-shell-${shellHashes['/'].slice(0, 20)}.bin`;
    await writeFile(resolve(distDir, shellUrl.slice(1)), await readFile(resolve(distDir, 'index.html')));
    injected = injected.replace("/* __TAHQEEQ_FIXED_PACKAGE__ */ null", JSON.stringify({
      version: descriptor.version, shellUrl, shellHashes, core: [descriptor.manifest, core.image, core.geometry, core.semantic],
    }));
    const buildId = createHash('sha256').update(source).update(JSON.stringify(urls)).update(descriptor.version)
      .update(await readFile(resolve(distDir, 'index.html'))).digest('hex').slice(0, 12);
    injected = injected.replace('const APP_CACHE_VERSION = "app-v30";', `const APP_CACHE_VERSION = "app-v30-${buildId}";`);
  }
  await writeFile(workerPath, injected);
  return urls;
}
