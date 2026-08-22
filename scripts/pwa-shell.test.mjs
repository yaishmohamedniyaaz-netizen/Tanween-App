import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("public/manifest.webmanifest", root), "utf8"));
const indexSource = readFileSync(new URL("index.html", root), "utf8");
const installSource = readFileSync(new URL("src/lib/pwaInstall.ts", root), "utf8");
const mainSource = readFileSync(new URL("src/main.tsx", root), "utf8");
const moreSource = readFileSync(
  new URL("src/components/MoreActionsPopover.tsx", root),
  "utf8",
);
const workerSource = readFileSync(new URL("public/sw.js", root), "utf8");
const registerSource = readFileSync(new URL("src/lib/sw-register.ts", root), "utf8");
const globalStyles = readFileSync(new URL("src/styles/global.css", root), "utf8");

function pngDimensions(path) {
  const bytes = readFileSync(new URL(path, root));
  assert.deepEqual(
    [...bytes.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
    `${path} must be a PNG`,
  );
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

test("the production manifest supplies a complete standalone Tahqeeq identity", () => {
  assert.equal(manifest.id, "/");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.short_name, "Tahqeeq");
  assert.equal(manifest.prefer_related_applications, false);

  const iconByPurpose = new Map(manifest.icons.map((icon) => [icon.purpose, icon]));
  assert.equal(iconByPurpose.get("any")?.sizes, "512x512");
  assert.equal(iconByPurpose.get("maskable")?.sizes, "512x512");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
});

test("the app icons are real PNGs at every declared platform size", () => {
  assert.deepEqual(pngDimensions("public/icons/tahqeeq-192.png"), {
    width: 192,
    height: 192,
  });
  assert.deepEqual(pngDimensions("public/icons/tahqeeq-512.png"), {
    width: 512,
    height: 512,
  });
  assert.deepEqual(pngDimensions("public/icons/tahqeeq-maskable-512.png"), {
    width: 512,
    height: 512,
  });
  assert.deepEqual(pngDimensions("public/icons/tahqeeq-apple-touch-180.png"), {
    width: 180,
    height: 180,
  });
});

test("the document exposes manifest, theme and platform icon metadata", () => {
  assert.match(indexSource, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(indexSource, /id="theme-color-meta" name="theme-color"/);
  assert.match(indexSource, /rel="apple-touch-icon"/);
  assert.match(indexSource, /rel="icon" href="\/icons\/tahqeeq-192\.png"/);
});

test("install capture is one-shot, actionable, and hidden in standalone display", () => {
  assert.match(mainSource, /initializePwaInstall\(\);[\s\S]*?createRoot/);
  assert.match(installSource, /beforeinstallprompt/);
  assert.match(installSource, /event\.preventDefault\(\)/);
  assert.match(installSource, /\(display-mode: standalone\)/);
  assert.match(installSource, /await promptEvent\.prompt\(\)/);
  assert.match(installSource, /await promptEvent\.userChoice/);
  assert.match(moreSource, /installAvailable && !standalone/);
  assert.match(moreSource, /Install Tahqeeq/);
  assert.match(moreSource, /requestInstall\(\)/);
  assert.match(
    globalStyles,
    /\.overflow-menu\s*\{[\s\S]*?max-height:\s*calc\(100dvh - 58px\);[\s\S]*?overflow-y:\s*auto;/,
  );
});

test("the captured browser prompt is consumed once and standalone mode retires it", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const standaloneMedia = new EventTarget();
  standaloneMedia.matches = false;
  const fakeWindow = new EventTarget();
  fakeWindow.matchMedia = () => standaloneMedia;
  const fakeNavigator = { standalone: false };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: fakeWindow,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: fakeNavigator,
  });

  try {
    const installModule = await import(
      new URL("src/lib/pwaInstall.ts?behavior-test", root)
    );
    installModule.initializePwaInstall();

    let promptCalls = 0;
    const promptEvent = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperties(promptEvent, {
      prompt: {
        value: async () => {
          promptCalls += 1;
        },
      },
      userChoice: {
        value: Promise.resolve({ outcome: "accepted", platform: "web" }),
      },
    });

    assert.equal(fakeWindow.dispatchEvent(promptEvent), false);
    assert.deepEqual(installModule.getPwaInstallState(), {
      installAvailable: true,
      installing: false,
      standalone: false,
    });
    assert.equal(await installModule.requestPwaInstall(), "accepted");
    assert.equal(promptCalls, 1);
    assert.equal(await installModule.requestPwaInstall(), "unavailable");
    assert.equal(promptCalls, 1);

    fakeNavigator.standalone = true;
    standaloneMedia.dispatchEvent(new Event("change"));
    assert.deepEqual(installModule.getPwaInstallState(), {
      installAvailable: false,
      installing: false,
      standalone: true,
    });
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else delete globalThis.window;
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    } else {
      delete globalThis.navigator;
    }
  }
});

test("service-worker updates never reload an active recitation automatically", () => {
  assert.match(registerSource, /controllerchange/);
  assert.match(registerSource, /updateReady: true/);
  assert.match(registerSource, /updateViaCache: "none"/);
  assert.match(moreSource, /serviceWorker\.updateReady && state\.sessionActive/);
  assert.match(moreSource, /Available after this recitation\./);
  assert.match(moreSource, /serviceWorker\.updateReady && !state\.sessionActive/);
  assert.match(moreSource, /reloadForServiceWorkerUpdate/);
  assert.doesNotMatch(registerSource, /controllerchange[\s\S]{0,240}location\.reload/);
});

test("the worker precaches app identity and the initial compact Mushaf page", () => {
  assert.match(workerSource, /const APP_CACHE_VERSION = "app-v28"/);
  assert.match(workerSource, /"\/manifest\.webmanifest"/);
  assert.match(workerSource, /"\/icons\/tahqeeq-maskable-512\.png"/);
  assert.match(workerSource, /"\/madani-coordinates\/p604\.json/);
  assert.match(workerSource, /files\.quran\.app.*page604\.png/);
  assert.match(workerSource, /key\.startsWith\("tahqeeq-"\)/);
  assert.doesNotMatch(workerSource, /for \(const page of .*604/);
});
