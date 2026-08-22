import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  buildParticipantTemplate,
  verifyParticipantTemplate,
} from "../src/lib/roster.ts";
import { createSampleCompetition } from "../src/lib/sampleCompetition.ts";

const outputPath = resolve(
  process.argv[2] ??
    "outputs/019ffe6e-7f75-7963-af86-4ae06bca6d39/Tahqeeq-participant-list-template-v7.xlsx",
);
const sample = createSampleCompetition();
const competition = {
  ...sample,
  isSample: false,
  status: "draft",
  liveSnapshot: null,
};
const buffer = await buildParticipantTemplate(competition);
await verifyParticipantTemplate(buffer, competition);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, Buffer.from(buffer));
process.stdout.write(`${outputPath}\n`);
