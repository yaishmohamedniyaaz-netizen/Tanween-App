// Read-only release gate: reproduce the installer's actual byte checks on HTTPS.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const origin = process.argv[2];
if (!origin || new URL(origin).protocol !== 'https:') throw new Error('Supply the HTTPS site origin');
const swResponse = await fetch(new URL('/sw.js', origin), { cache: 'no-store' });
assert.equal(swResponse.status, 200);
const sw = await swResponse.text();
const metadata = JSON.parse(sw.match(/const FIXED_PACKAGE = (\{[^\n]+\});/)[1]);
const entries = [...Object.entries(metadata.shellHashes).map(([url, sha256]) => ({url, sha256})), ...metadata.core];
let failed = false;
for (const entry of entries) {
  const deliveryUrl = entry.url === '/' && metadata.shellUrl ? metadata.shellUrl : entry.url;
  const response = await fetch(new URL(deliveryUrl, origin), { cache: 'reload' });
  const bytes = Buffer.from(await response.arrayBuffer());
  const valid = response.ok && createHash('sha256').update(bytes).digest('hex') === entry.sha256
    && (entry.bytes === undefined || bytes.length === entry.bytes);
  console.log(`${valid ? 'PASS' : 'FAIL'} ${entry.url} via ${deliveryUrl} (${response.status}, ${bytes.length} bytes)`);
  if (!valid) failed = true;
  if (entry.url === '/') {
    console.log('HTML cache policy:', response.headers.get('cache-control'));
    if (!metadata.shellUrl && !response.headers.get('cache-control')?.split(',').some(value => value.trim().toLowerCase() === 'no-transform')) failed = true;
  }
}
if (failed) throw new Error('Live PWA installation delivery gate failed');
console.log('Live application shell and core Mushaf bytes match the published worker.');
