// Cloudflare Workers Builds runs `npm clean-install` and then the deploy
// command directly -- it never runs a build step. Wrangler only auto-builds
// when it detects a framework, and this project ships a committed
// wrangler.jsonc, so nothing would generate dist/ before `wrangler deploy` or
// `wrangler versions upload` looks for dist/server/index.js.
//
// npm runs `prepare` after install, so build there. Set
// TAHQEEQ_SKIP_PREPARE_BUILD=1 to skip it during local installs.
import { spawnSync } from "node:child_process";

if (process.env.TAHQEEQ_SKIP_PREPARE_BUILD === "1") {
  process.exit(0);
}

const result = spawnSync("npm", ["run", "build"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
