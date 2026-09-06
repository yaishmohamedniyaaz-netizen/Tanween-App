/// <reference types="vite/client" />
// Isolated geometry proof. Does not import or write to judging/device stores.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MushafPageSurface, MushafWord } from '../../src/components/MushafPageSurface';
import type { MushafPage, PageWord } from '../../src/lib/page';
import { loadQcfPageFont } from '../../src/lib/qcfFont';
import '../../src/styles/global.css';
import './proof.css';

export const CANONICAL_WIDTH = 532;
export const CANONICAL_HEIGHT = CANONICAL_WIDTH / .68;
const FIXTURES = [1, 2, 3, 255, 589, 590, 604];
type Mode = 'fixed' | 'current';
const query = new URLSearchParams(location.search);
const audit = query.has('audit');
const initialPage = Number(query.get('page') || 589);
const widthOption = Number(query.get('width') || 0);

function Paper({ page, width, mode, selected, onSelect, zoom = 1 }: {
  page: MushafPage; width: number; mode: Mode; selected?: string;
  onSelect?: (word: PageWord) => void; zoom?: number;
}) {
  const fixed = mode === 'fixed';
  const scale = width / CANONICAL_WIDTH * zoom;
  const renderWord = (word: PageWord) => <MushafWord key={word.wid}
    word={word} qcfReady
    className={selected === word.wid ? 'proof-selected' : ''}
    role={onSelect && word.role === 'letter' ? 'button' : undefined}
    tabIndex={onSelect && word.role === 'letter' ? 0 : undefined}
    aria-pressed={onSelect && word.role === 'letter' ? selected === word.wid : undefined}
    onClick={onSelect && word.role === 'letter' ? () => onSelect(word) : undefined}
    onKeyDown={onSelect && word.role === 'letter' ? event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(word); }
    } : undefined} />;
  return <div className={`proof-paper-host proof-${mode}`} data-proof-mode={mode}
    data-proof-width={width} data-proof-zoom={zoom}
    style={{ width: width * zoom, height: width / .68 * zoom }}>
    <div className="proof-paper-canvas" style={fixed ? {
      width: CANONICAL_WIDTH, height: CANONICAL_HEIGHT,
      transform: `scale(${scale})`,
    } : { width, height: width / .68, zoom }}>
      <div className="mushaf-composition mushaf-single">
        <MushafPageSurface data={page} qcfReady renderWord={renderWord} />
      </div>
    </div>
  </div>;
}

function GeometryAudit({ pages }: { pages: MushafPage[] }) {
  const [result, setResult] = useState<object | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const cases = [
    { width: 300, zoom: 1 }, { width: 360, zoom: 1 },
    { width: 532, zoom: 1 }, { width: 760, zoom: 1 },
    { width: 360, zoom: 1.25 }, { width: 532, zoom: 1.5 },
  ];
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      const rows = [...root.current!.querySelectorAll<HTMLElement>('.proof-paper-host')].map(host => {
        const page = host.querySelector<HTMLElement>('.page')!;
        const p = page.getBoundingClientRect();
        const normalize = (element: Element) => {
          const r = element.getBoundingClientRect();
          return [(r.x - p.x) / p.width, (r.y - p.y) / p.width, r.width / p.width, r.height / p.width];
        };
        const words = [...page.querySelectorAll<HTMLElement>('.m-word')].map(word => ({
          id: word.dataset.wid!, glyph: word.firstChild?.textContent,
          role: word.dataset.role, box: normalize(word),
        }));
        const lines = [...page.querySelectorAll('.mushaf-lines > .m-line, .mushaf-lines > .surah-band')].map(normalize);
        return { mode: host.dataset.proofMode!, page: Number(page.dataset.page),
          width: Number(host.dataset.proofWidth), zoom: Number(host.dataset.proofZoom),
          pageAspect: p.width / p.height, words, lines };
      });
      const fixedRows = rows.filter(row => row.mode === 'fixed');
      const failures: string[] = [];
      let maxWordDrift = 0, maxLineDrift = 0, checks = 0;
      for (const row of fixedRows) {
        const base = fixedRows.find(r => r.page === row.page && r.width === 532 && r.zoom === 1)!;
        if (row.words.length !== base.words.length) failures.push(`Word count on page ${row.page}`);
        row.words.forEach((word, index) => {
          const original = base.words[index];
          if (!original || word.id !== original.id || word.glyph !== original.glyph) failures.push(`Source identity ${word.id}`);
          else { maxWordDrift = Math.max(maxWordDrift, ...word.box.map((n, i) => Math.abs(n - original.box[i]))); checks++; }
        });
        row.lines.forEach((line, index) => { maxLineDrift = Math.max(maxLineDrift, ...line.map((n, i) => Math.abs(n - base.lines[index][i]))); });
      }
      // 0.001 of page width = 0.532px at the canonical size. Much larger than observed rounding.
      if (maxWordDrift > .001 || maxLineDrift > .001) failures.push('Proportional geometry drift');
      setResult({ fonts: document.fonts.status, viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        canonicalWidth: CANONICAL_WIDTH, cases: fixedRows.length, checks, failures,
        maxWordDrift, maxLineDrift, rows });
    });
    return () => cancelAnimationFrame(frame);
  }, [pages]);
  return <><header className="audit-heading"><h1>Page scale verification</h1><p id="audit-status">{result ? 'Measurements complete' : 'Measuring loaded page fonts…'}</p></header>
    <div ref={root} className="audit-pages" aria-hidden="true">{pages.flatMap(page => cases.flatMap(({ width, zoom }) => ['fixed', 'current'].map(mode =>
      <Paper key={`${page.page}-${mode}-${width}-${zoom}`} page={page} width={width} zoom={zoom} mode={mode as Mode} />
    )))}</div><pre id="audit-report" aria-hidden="true">{result && JSON.stringify(result)}</pre></>;
}

function App({ pages }: { pages: MushafPage[] }) {
  const [mode, setMode] = useState<Mode>(query.get('mode') === 'current' ? 'current' : 'fixed');
  const [pageNumber, setPageNumber] = useState(FIXTURES.includes(initialPage) ? initialPage : 589);
  const [requestedWidth, setRequestedWidth] = useState(widthOption >= 300 && widthOption <= 760 ? widthOption : 532);
  const [fit, setFit] = useState(!widthOption);
  const [frameWidth, setFrameWidth] = useState(0);
  const [selected, setSelected] = useState<PageWord | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const frame = stage.current!;
    const observer = new ResizeObserver(() => {
      // Vertical scrolling remains available when a deliberate width is selected.
      // Leave one pixel for fractional viewport rounding to avoid a Fit scrollbar.
      setFrameWidth(Math.floor(Math.max(1, Math.min(760, frame.clientWidth - 24, (frame.clientHeight - 25) * .68))));
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { setSelected(null); }, [pageNumber]);
  const page = pages.find(p => p.page === pageNumber)!;
  const width = fit ? frameWidth : requestedWidth;
  return <main className="scale-proof">
    <header className="proof-header">
      <div className="proof-title"><span>Tahqeeq</span><h1>Page proportions</h1><small>
        <a href={`https://tafsir.app/scans/m-madinah-old/${pageNumber + 2}.png`} target="_blank" rel="noreferrer"
          aria-label={`Printed reference for page ${pageNumber}`}>Printed scan ↗</a>
      </small></div>
      <div className="proof-controls">
        <div className="proof-switch" role="group" aria-label="Page rendering">
          <button aria-pressed={mode === 'fixed'} onClick={() => setMode('fixed')}>Fixed proportions</button>
          <button aria-pressed={mode === 'current'} onClick={() => setMode('current')}>Current</button>
        </div>
        <label className="page-choice">Page <select aria-label="Mushaf page" value={pageNumber} onChange={event => setPageNumber(Number(event.target.value))}>
          {FIXTURES.map(n => <option key={n} value={n}>{n}</option>)}
        </select></label>
        <div className="proof-size"><button aria-pressed={fit} onClick={() => setFit(true)}>Fit</button>
          <input aria-label="Page width" type="range" min="300" max="760" step="1" value={fit ? Math.round(frameWidth) : requestedWidth}
            onChange={event => { setRequestedWidth(Number(event.target.value)); setFit(false); }} />
          <output>{Math.round(width)}<span>px</span></output>
        </div>
      </div>
    </header>
    <div className="proof-stage" ref={stage}>
      {width > 0 && <Paper page={page} width={width} mode={mode} selected={selected?.wid} onSelect={setSelected} />}
    </div>
    <footer className="proof-footer">
      <div className="proof-selection" role="status" aria-live="polite">
        {selected ? <><span className="selected-word" dir="rtl">{selected.text}</span><span>{selected.surah}:{selected.ayah ?? 'basmala'}</span>
          <button onClick={() => setSelected(null)} aria-label="Clear word selection">×</button></> : <span>Tap a word to check its target</span>}
      </div>
      <p>{mode === 'fixed' ? 'Words and spacing scale together.' : 'Current sizing rules, for comparison.'}<span> Final print calibration is pending.</span></p>
    </footer>
  </main>;
}

const reactRoot = createRoot(document.getElementById('root')!);
let disposed = false;
import.meta.hot?.dispose(() => { disposed = true; reactRoot.unmount(); });

async function boot() {
try {
  const pages = await Promise.all(FIXTURES.map(async page => {
    const [response] = await Promise.all([fetch(`/pages/p${page}.json`), loadQcfPageFont(page)]);
    if (!response.ok) throw new Error(`Page ${page} could not load.`);
    const data = await response.json() as MushafPage;
    if (data.page !== page || data.font !== 'qcf-v1' || data.layout !== 'KFGQPC V1 1405H') throw new Error('Unexpected page source.');
    return data;
  }));
  await document.fonts.load('29px "HafsUthmanic"', 'بِسۡمِ');
  await document.fonts.ready;
  if (!disposed) reactRoot.render(audit ? <GeometryAudit pages={pages} /> : <App pages={pages} />);
} catch (error) {
  if (!disposed) reactRoot.render(<p>Unable to open page comparison. {String(error)}</p>);
}
}
void boot();
