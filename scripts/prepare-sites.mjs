import { copyFile, mkdir, readdir, rename, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { injectBuildPrecache } from "./pwa-precache.mjs";

const root = resolve(import.meta.dirname, "..");
const distDir = resolve(root, "dist");
const clientDir = resolve(distDir, "client");
const serverDir = resolve(root, "dist", "server");

// The local prototype keeps large model files under public/tilawa for offline
// development. Production serves the same pinned files through the Worker, so
// do not copy the 116 MB local asset set into the Sites archive or precache.
await rm(resolve(distDir, "tilawa"), { recursive: true, force: true });

// Vite knows the final hashed asset names only after it builds. Bind those
// exact files to the service worker before Sites relocates the client output.
await injectBuildPrecache(distDir);

// Sites binds static assets from dist/client. Vite emits them at dist/ by
// default, so place the complete client build where the hosting runtime reads.
await mkdir(clientDir, { recursive: true });
for (const entry of await readdir(distDir, { withFileTypes: true })) {
  if (entry.name === "client" || entry.name === "server" || entry.name === ".openai") {
    continue;
  }
  await rename(resolve(distDir, entry.name), resolve(clientDir, entry.name));
}

await mkdir(serverDir, { recursive: true });
await copyFile(resolve(root, "worker", "index.js"), resolve(serverDir, "index.js"));
