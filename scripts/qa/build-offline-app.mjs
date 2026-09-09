import { copyFile } from 'node:fs/promises';
import { injectBuildPrecache } from '../pwa-precache.mjs';
const target = 'outputs/offline-validation/build';
await copyFile(`${target}/scripts/qa/offline-app.html`, `${target}/index.html`);
await injectBuildPrecache(target);
