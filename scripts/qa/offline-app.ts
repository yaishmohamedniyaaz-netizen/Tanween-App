import * as offline from '../../src/lib/offlineMushaf';
import { fixedMushafLoader } from '../../src/hooks/useFixedMushafPages';
import descriptor from '../../src/data/fixedMushafPackage.json';
import { FIXED_MUSHAF_CACHE } from '../../src/lib/fixedMushafStorage';
import '../../src/main';
if (location.hostname !== '127.0.0.1' || location.port !== '5301') throw new Error('Local offline validation only');
Object.assign(window, { offlineQA: { ...offline, loader: fixedMushafLoader, descriptor, cacheName: FIXED_MUSHAF_CACHE } });
