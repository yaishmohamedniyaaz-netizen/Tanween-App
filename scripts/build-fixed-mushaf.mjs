/** Build immutable runtime assets from the reviewed corpus and pinned artwork.
 * Run after fetch-fixed-mushaf.py. No network or image modification here.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildFixedPageGeometry, assertFixedPageMatches, pickFixedWord } from '../src/lib/fixedMushafGeometry.ts';
import { MUSHAF_DATA_VERSION } from '../src/lib/mushafAssets.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = relative => fs.readFileSync(path.join(root, relative));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const encode = value => Buffer.from(JSON.stringify(value));
const rawCorpus = read('outputs/mushaf-word-boundary-2026-09-09/practical-source-corpus.json');
const sources = JSON.parse(rawCorpus);
const artwork = JSON.parse(read('outputs/fixed-mushaf-source/source-manifest.json'));
if (sources.length !== 604 || artwork.pages.length !== 604) throw new Error('Incomplete source corpus');
const prepared = [];
let recitedWords = 0, markers = 0;
for (let number = 1; number <= 604; number++) {
  const source = sources[number - 1], imageInfo = artwork.pages[number - 1];
  if (source.page !== number || imageInfo.page !== number) throw new Error('Incorrect source order');
  const image = read(`outputs/fixed-mushaf-source/page${String(number).padStart(3, '0')}.png`);
  if (hash(image) !== imageInfo.sha256 || image.length !== imageInfo.bytes) throw new Error(`Artwork mismatch ${number}`);
  if (source.imageSha256 && source.imageSha256 !== imageInfo.sha256) throw new Error(`Reviewed artwork changed ${number}`);
  const semantic = read(`public/pages/p${number}.json`);
  const geometry = buildFixedPageGeometry(source);
  assertFixedPageMatches(geometry, JSON.parse(semantic));
  for (const word of geometry.words) {
    const hit = pickFixedWord(geometry, (word.body[0] + word.body[2]) / 2, (word.region[1] + word.region[3]) / 2);
    if (word.role === 'letter') {
      if (hit?.wid !== word.wid) throw new Error(`Unreachable word ${word.wid}`);
      recitedWords++;
    } else { if (hit) throw new Error(`Selectable marker ${word.wid}`); markers++; }
  }
  // Ship only the fields used by the renderer; source diagnostics remain archived.
  const page = { page: number, width: source.width, height: source.height,
    ...(source.contentBounds ? { contentBounds: source.contentBounds } : {}),
    words: geometry.words.map(({ wid, text, surah, ayah, role, line, body, band, region }) =>
      ({ wid, text, surah, ayah, role, line, body, band, region })) };
  prepared.push({ page, imageInfo, semantic, geometry: encode(page) });
}
// The package identity includes every emitted payload and the schema, not timestamps.
const fingerprint = hash(encode({ schema: 1, dataVersion: MUSHAF_DATA_VERSION,
  pages: prepared.map(p => [p.imageInfo.sha256, hash(p.geometry), hash(p.semantic)]) }));
const version = `1405-artwork-${fingerprint.slice(0, 16)}`;
const base = `/mushaf/${version}`;
const directory = path.join(root, 'public', base);
fs.mkdirSync(directory, { recursive: true });
function write(name, bytes) {
  const target = path.join(directory, name);
  if (fs.existsSync(target) && !fs.readFileSync(target).equals(bytes)) throw new Error(`Immutable asset changed: ${name}`);
  fs.writeFileSync(target, bytes);
  return { url: `${base}/${name}`, bytes: bytes.length, sha256: hash(bytes) };
}
const pages = prepared.map(({ page, imageInfo, semantic, geometry }) => ({
  page: page.page, width: page.width, height: page.height,
  image: write(`p${page.page}.png`, read(`outputs/fixed-mushaf-source/page${String(page.page).padStart(3, '0')}.png`)),
  geometry: write(`p${page.page}.json`, geometry),
  semantic: write(`p${page.page}.text.json`, semantic),
  sourceUrl: imageInfo.url,
}));
const manifest = { schema: 1, version, dataVersion: MUSHAF_DATA_VERSION,
  sourceRevision: artwork.revision, sourceCorpusSha256: hash(rawCorpus),
  totalAssetBytes: pages.reduce((sum, p) => sum + p.image.bytes + p.geometry.bytes + p.semantic.bytes, 0), pages };
const manifestAsset = write('manifest.json', encode(manifest));
const descriptor = { version, manifest: manifestAsset,
  totalBytes: manifest.totalAssetBytes + manifestAsset.bytes };
fs.writeFileSync(path.join(root, 'src/data/fixedMushafPackage.json'), JSON.stringify(descriptor, null, 2) + '\n');
const report = { ...descriptor, pages: pages.length, recitedWords, markers,
  imageBytes: artwork.imageBytes, note: 'Package assets only; app shell is additional. Local build, not published.' };
fs.writeFileSync(path.join(root, 'outputs/fixed-mushaf-source/package-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(report);
