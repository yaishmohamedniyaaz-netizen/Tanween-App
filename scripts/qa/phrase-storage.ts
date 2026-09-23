import { createSessionStorage } from "../../src/state/sessionStorageV3";
import { phraseStateFixture, phraseFixture, savedPhraseFixture } from "./phrase-evidence-fixtures";
import { normalizeSavedSession, normalizeLedgerState } from "../../src/state/store";
import { projectMistakes } from "../../src/lib/judgingLedger";
import { STORAGE_KEY } from "../../src/config";

if (!import.meta.env.DEV || location.hostname !== "127.0.0.1") throw Error("Local QA only");
Object.assign(window,{storageQA:{createSessionStorage,phraseStateFixture,phraseFixture,savedPhraseFixture,
  normalizeSavedSession,normalizeLedgerState,projectMistakes,STORAGE_KEY}});
