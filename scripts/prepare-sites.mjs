import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const serverDir = resolve(root, "dist", "server");

await mkdir(serverDir, { recursive: true });
await copyFile(resolve(root, "worker", "index.js"), resolve(serverDir, "index.js"));
