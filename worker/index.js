/** Cloudflare Worker entry point used by OpenAI Sites hosting. */
const TILAWA_RELEASE_BASE = "https://github.com/yazinsai/tilawa/releases/download/v0.2.0";
const TILAWA_ASSETS = new Map([
  ["/tilawa/fastconformer_full_mixed.onnx", `${TILAWA_RELEASE_BASE}/fastconformer_full_mixed.onnx`],
  ["/tilawa/vocab.json", `${TILAWA_RELEASE_BASE}/vocab.json`],
  ["/tilawa/quran_ctc_tokens.json", `${TILAWA_RELEASE_BASE}/quran_ctc_tokens.json`],
  ["/tilawa/quran.json", `${TILAWA_RELEASE_BASE}/quran.json`],
  [
    "/tilawa/ort-wasm-simd-threaded.wasm",
    "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.2/dist/ort-wasm-simd-threaded.wasm",
  ],
]);

async function fetchTilawaAsset(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  const upstreamUrl = TILAWA_ASSETS.get(new URL(request.url).pathname);
  if (!upstreamUrl) return null;

  let upstream;
  try {
    upstream = await fetch(upstreamUrl, {
      method: request.method,
      redirect: "follow",
    });
  } catch {
    upstream = null;
  }
  if (!upstream?.ok) {
    return new Response("Tilawa model asset is temporarily unavailable", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const headers = new Headers(upstream.headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
}

// The PWA verifies its HTML against the build hash. Cloudflare's automatic
// HTML script injection would invalidate that hash and silently fail install.
// Preserve cache policy while opting this document out of transformations.
function preserveAppDocument(response) {
  if (!response.headers.get("Content-Type")?.toLowerCase().includes("text/html")) return response;
  const headers = new Headers(response.headers);
  const policy = headers.get("Cache-Control");
  if (!policy?.split(",").some(part => part.trim().toLowerCase() === "no-transform")) {
    headers.set("Cache-Control", policy ? `${policy}, no-transform` : "no-transform");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

const worker = {
  async fetch(request, env) {
    const tilawaAsset = await fetchTilawaAsset(request);
    if (tilawaAsset) return tilawaAsset;

    if (!env.ASSETS) {
      return new Response("Static asset binding is unavailable", { status: 500 });
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== "GET") return preserveAppDocument(response);

    // Vite is a client-side app. Unknown document routes should receive the
    // app shell; asset and page-data 404s remain real 404s.
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    if (!acceptsHtml) return response;

    const indexUrl = new URL("/index.html", request.url);
    return preserveAppDocument(await env.ASSETS.fetch(new Request(indexUrl, request)));
  },
};

export default worker;
