import type { LoadedFixedPage } from './fixedMushafPackage.ts';
import type { ReadyFixedPage } from './readyFixedPages.ts';
import { moveMushafView, visibleMushafPages } from './mushafSpread.ts';

interface Snapshot { requested: string | null; displayed: ReadyFixedPage | null; error: string | null }
/** Desktop-only: at most three spreads (six page resources), including work in
 * progress. The mounted spread stays pinned until React commits its successor. */
export function createReadyFixedSpreads(load: (page: number, signal: AbortSignal) => Promise<LoadedFixedPage>) {
  const entries = new Map<string, { value: ReadyFixedPage; release(): void }>();
  const pinned = new Set<string>(), failed = new Set<string>(), listeners = new Set<() => void>();
  let snapshot: Snapshot = {requested:null,displayed:null,error:null};
  let active: {key:string;abort:AbortController} | null = null;
  let generation=0, direction: -1 | 1=1;
  const emit = (next: Snapshot) => { snapshot=next; listeners.forEach(fn=>fn()); };
  const wanted = () => {
    if(!snapshot.requested) return [];
    const pages=snapshot.requested.split(':').map(Number), layout=pages.length===2?'spread':'full';
    return [...new Set([snapshot.requested,...[direction,-direction].map(d=>
      visibleMushafPages(moveMushafView(pages[0],layout,d as -1|1),layout).join(':'))])];
  };
  const release=(key:string)=>{const entry=entries.get(key);entries.delete(key);entry?.release();};
  const admit=(key:string)=>{const entry=entries.get(key);if(entry && snapshot.requested===key){pinned.add(key);emit({...snapshot,displayed:entry.value,error:null});}};
  function pump() {
    if(active) return;
    const desired=wanted(), next=desired.find(key=>!entries.has(key)&&!failed.has(key));
    if(!next) return;
    if(entries.size>=3) {
      const victim=[...entries.keys()].find(key=>!pinned.has(key)&&!desired.includes(key))
        ?? (next===snapshot.requested?[...entries.keys()].find(key=>!pinned.has(key)):undefined);
      if(!victim) return;
      release(victim);
    }
    const job={key:next,abort:new AbortController()}, epoch=generation;
    active=job;
    void (async()=>{
      const loaded:LoadedFixedPage[]=[];
      try {
        const pages=next.split(':').map(Number);
        for(const page of pages) {
          job.abort.signal.throwIfAborted();
          loaded.push(await load(page,job.abort.signal));
        }
        if(epoch!==generation||job.abort.signal.aborted||!wanted().includes(next)) return;
        const resources=loaded.splice(0);
        active=null;
        entries.set(next,{value:{page:pages[0],
          pages:new Map(resources.map((p,i)=>[pages[i],p.geometry])),
          semantic:new Map(resources.map((p,i)=>[pages[i],p.semantic]))},
          release:()=>resources.forEach(p=>p.dispose())});
        admit(next);
      } catch(error) {
        if(epoch!==generation||job.abort.signal.aborted) return;
        failed.add(next);
        if(snapshot.requested===next) emit({...snapshot,error:error instanceof Error?error.message:'Page unavailable'});
      } finally {
        loaded.forEach(p=>p.dispose());
        if(active===job) active=null;
        pump();
      }
    })();
  }
  return {
    subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};},
    getSnapshot:()=>snapshot,
    request(pages:readonly number[]) {
      if(!pages.length||pages.length>2||pages.some(p=>!Number.isInteger(p)||p<1||p>604)||
        (pages.length===2&&pages[1]!==pages[0]+1)) return;
      const key=pages.join(':');
      if(key===snapshot.requested){pump();return;}
      const previous=Number(snapshot.requested?.split(':')[0]);
      if(previous && previous!==pages[0]) direction=pages[0]>previous?1:-1;
      failed.clear();emit({...snapshot,requested:key,error:null});
      if(active&&active.key!==key) active.abort.abort();
      admit(key);pump();
    },
    committed(value:ReadyFixedPage) {
      if(snapshot.displayed!==value) return;
      const key=[...value.pages.keys()].join(':');
      pinned.clear();pinned.add(key);
      for(const candidate of entries.keys()) if(!wanted().includes(candidate)&&candidate!==key) release(candidate);
      pump();
    },
    retry(){failed.clear();emit({...snapshot,error:null});pump();},
    clear(){generation++;active?.abort.abort();for(const key of entries.keys())release(key);pinned.clear();failed.clear();emit({requested:null,displayed:null,error:null});},
    ownedPages:()=>[...entries.values()].reduce((n,e)=>n+e.value.pages.size,0)+(active?active.key.split(':').length:0),
  };
}
