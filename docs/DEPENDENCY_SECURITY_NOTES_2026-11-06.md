# Dependency security: what is left (6 November 2026)

Status: note for the owner. No dependency changed in this step.

## Summary

- On `main`, `npm audit` finds 12 known problems (11 high, 1 moderate).
  GitHub reports 28 alerts for `main`; the higher number is likely because it
  counts each advisory, while npm counts each package.
- On `claude/judging-final-polish`, 11 of them are already fixed (commit
  `6ec3dc0`, build tools: vite, wrangler and their parts). They reach `main`
  when this branch is merged.
- **One remains on both: `xlsx` 0.18.5** (SheetJS, the spreadsheet library).
  npm has no fixed version; the fix is only on the SheetJS website.

## Why `xlsx` matters here

The app uses `xlsx` to **read** spreadsheets people choose: roster import
(`src/lib/roster.ts`), judge records and final results workbooks
(`judgeRecordsWorkbook.ts`, `finalResultsWorkbook.ts`). Both known problems
are triggered by reading a crafted file:

| Problem | Fixed in | Strength of source |
| --- | --- | --- |
| Prototype pollution (a crafted file can change built-in JavaScript objects), [CVE-2023-30533](https://osv.dev/vulnerability/CVE-2023-30533) | 0.19.3 | Official advisory database (OSV / GitHub advisory) |
| ReDoS (a crafted file makes reading hang), [CVE-2024-22363](https://cvefeed.io/vuln/detail/CVE-2024-22363) | 0.20.2 | NVD record, mirrored |

Risk in practice: low to medium. Files come from organisers the owner
trusts, and the app runs on each device (no server to attack). But a bad
file passed around could freeze or upset a judging device.

## Fix (needs a machine that can reach cdn.sheetjs.com)

This workspace cannot reach `cdn.sheetjs.com` (blocked by its network list),
so the fix was not made here.

1. Check the newest version on the SheetJS install page
   (docs.sheetjs.com, "Installation", "NodeJS"). 0.20.3 was current when last
   checked.
2. Option A, install from the SheetJS website:
   `npm rm xlsx && npm i --save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`
   The Cloudflare build then downloads it from that site on every build.
3. Option B (safer for builds): save the `.tgz` file in the repo (for example
   `vendor/xlsx-0.20.3.tgz`) and install it with
   `npm i --save file:vendor/xlsx-0.20.3.tgz`. The build no longer depends on
   that site being up.
4. Run `npm test`, `npx tsc -b`, `npm run build`, then import a real roster
   file and a judge records workbook in the browser.

The code only uses `read` and `utils`, which exist in the new versions with
the same names, so no code change is expected (not yet tested).

Recommended: B (score 8/10: no outside site during builds; one binary file
in the repo). A: 7/10.
