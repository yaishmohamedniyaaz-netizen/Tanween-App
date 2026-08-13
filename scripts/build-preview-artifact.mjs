/**
 * Fold the production build into one self-contained HTML file that can be
 * published as an Artifact for design review.
 *
 * An Artifact is a single page behind a strict CSP: it may not fetch anything,
 * so every asset this app normally requests over HTTP has to travel inside the
 * file. That rules out shipping all 604 Mushaf pages (8.4 MB of JSON) and the
 * per-page KFGQPC fonts, which live on an external CDN. This build therefore
 * carries one range of pages — juz 30 by default — and lets the Mushaf fall
 * back to the bundled Hafs font, exactly as it already does when a page font
 * fails to load.
 *
 * It is a preview for looking at the interface, not a deployment. The real
 * build for hosting stays `npm run build`.
 *
 * Usage: node scripts/build-preview-artifact.mjs [--from 582] [--to 604]
 *        [--out docs/tahqeeq-preview.html]
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { transform } from "esbuild";

/** Escape every character above ASCII so the file cannot be misread whatever
 *  charset the host declares. A stray byte inside an Arabic string is enough to
 *  turn the whole bundle into a syntax error. */
function asciiJson(value) {
  return JSON.stringify(value).replace(/[\u007f-\uffff]/g, (character) =>
    `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

const root = resolve(import.meta.dirname, "..");
const client = resolve(root, "dist", "client");

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const from = Number(arg("from", 582));
const to = Number(arg("to", 604));
const out = resolve(root, arg("out", "docs/tahqeeq-preview.html"));

const assets = await readdir(resolve(client, "assets"));
const cssName = assets.find((name) => name.endsWith(".css"));
const jsName = assets.find((name) => name.startsWith("index-") && name.endsWith(".js"));
if (!cssName || !jsName) {
  throw new Error("Run `npm run build` before building the preview.");
}

const dataUri = async (file, type) =>
  `data:${type};base64,${(await readFile(resolve(client, file))).toString("base64")}`;

// Vite rewrites the @font-face sources to bare absolute paths, so match both
// the quoted authored form and the minified one.
const fontUri = {
  "hafs.18.woff2": await dataUri("fonts/hafs.18.woff2", "font/woff2"),
  "InterVariable.woff2": await dataUri("fonts/InterVariable.woff2", "font/woff2"),
};
const css = (await readFile(resolve(client, "assets", cssName), "utf8")).replace(
  /url\(\s*["']?\/fonts\/([\w.\-]+)["']?\s*\)/g,
  (match, file) => (fontUri[file] ? `url("${fontUri[file]}")` : match),
);

if (css.includes("/fonts/")) {
  throw new Error("A font URL was left pointing at the network.");
}

// esbuild re-emits the bundle with \u escapes instead of raw Arabic.
const { code: js } = await transform(
  await readFile(resolve(client, "assets", jsName), "utf8"),
  { charset: "ascii", format: "esm", loader: "js" },
);

const pages = {};
for (let page = from; page <= to; page += 1) {
  pages[page] = JSON.parse(await readFile(resolve(client, "pages", `p${page}.json`), "utf8"));
}
const questionIndex = JSON.parse(
  await readFile(resolve(client, "question-index.json"), "utf8"),
);

const bundle = asciiJson({ pages, questionIndex, from, to });

const html = `<title>Tahqeeq preview</title>
<style>
${css}
.preview-note {
  position: fixed;
  z-index: 999;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  max-width: min(560px, calc(100vw - 32px));
  padding: 9px 14px;
  border-radius: 10px;
  border: 1px solid var(--line-2);
  background: var(--surface);
  box-shadow: var(--shadow-float);
  font-family: var(--ui);
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--ink-2);
  display: none;
}
.preview-note.is-visible { display: block; }
.preview-note b { color: var(--ink); font-weight: 600; }
</style>

<div id="root"></div>
<div class="preview-note" id="preview-note" role="status"></div>

<script>
  // Everything this build would normally fetch is embedded below. Requests are
  // answered from that bundle so the page never reaches for the network.
  (function () {
    var BUNDLE = ${bundle};
    var note = document.getElementById("preview-note");
    var noteTimer = 0;

    function say(message) {
      note.innerHTML = message;
      note.classList.add("is-visible");
      window.clearTimeout(noteTimer);
      noteTimer = window.setTimeout(function () {
        note.classList.remove("is-visible");
      }, 6000);
    }

    function json(value) {
      return Promise.resolve(
        new Response(JSON.stringify(value), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }

    var realFetch = window.fetch ? window.fetch.bind(window) : null;
    window.fetch = function (input, init) {
      var url = String(typeof input === "string" ? input : (input && input.url) || "");
      var page = url.match(/\\/pages\\/p(\\d+)\\.json/);
      if (page) {
        var number = Number(page[1]);
        if (BUNDLE.pages[number]) return json(BUNDLE.pages[number]);
        // Neighbouring pages are preloaded, so name the range rather than a
        // page number the reader did not ask for.
        say(
          "<b>That page is not in this preview.</b> It carries pages " +
          BUNDLE.from + "&#8211;" + BUNDLE.to + " to stay small enough for a " +
          "single file. The full build has all 604.",
        );
        return Promise.reject(new Error("page " + number + " is outside this preview"));
      }
      if (/question-index\\.json/.test(url)) return json(BUNDLE.questionIndex);
      if (/^(https?:)?\\/\\//.test(url)) {
        return Promise.reject(new Error("the preview does not use the network"));
      }
      return realFetch ? realFetch(input, init) : Promise.reject(new Error("no fetch"));
    };

    // The per-page KFGQPC fonts live on a CDN the preview cannot reach, so
    // the Mushaf uses its bundled Hafs font, the same fallback the app has.
    var RealFontFace = window.FontFace;
    if (RealFontFace) {
      window.FontFace = function (family, source, descriptors) {
        if (typeof source === "string" && /^url\\("https?:/.test(source)) {
          var stub = new RealFontFace(family, "url(data:font/woff2;base64,)", descriptors);
          stub.load = function () {
            return Promise.reject(new Error("page fonts are not bundled in the preview"));
          };
          return stub;
        }
        return new RealFontFace(family, source, descriptors);
      };
      window.FontFace.prototype = RealFontFace.prototype;
    }

    // A single file has nothing to precache, so registration quietly does
    // nothing rather than logging a failure the reader would have to ignore.
    if (navigator.serviceWorker && navigator.serviceWorker.register) {
      navigator.serviceWorker.register = function () {
        return new Promise(function () {});
      };
    }
  })();
</script>

<script type="module">
${js}
</script>
`;

const stray = html.match(/[\u0080-\uffff]/);
if (stray) {
  throw new Error(`Non-ASCII character survived: ${JSON.stringify(stray[0])}`);
}

await writeFile(out, html);
const megabytes = (Buffer.byteLength(html) / 1e6).toFixed(2);
console.log(`Preview written to ${out} — ${megabytes} MB, pages ${from}-${to}.`);
