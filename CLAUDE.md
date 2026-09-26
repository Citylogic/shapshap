# shapshap

Group availability finder. No accounts, no email. The URL is the credential.

Read `docs/PRD.md`, `docs/TECH-STACK.md` and `docs/INFRASTRUCTURE.md` before proposing
architecture changes. They are the spec; this file is the summary.

## Hard rules

- **Never log a meeting id, participant id, name, meeting label, or IP.**
  `/m/{id}` is a bearer token (PRD §6.2). Meeting free-text fields are as
  sensitive as the id. Everything goes through `scrub()` in `src/lib/ids.ts`
  for ids; do not pass label or name into logs.
  Two CI assertions enforce id scrubbing (TECH-STACK §7). Do not weaken them.
- **No new runtime dependency** without an argument in the PR. The complete
  permitted list is TECH-STACK §8.
- **60 KB gzipped JS budget on `/m/[id]`.** Hard CI gate.
- **No ORM, no Tailwind, no UI library, no analytics.** See TECH-STACK §9 for
  what was rejected and why — do not re-propose these.
- **Meeting label is allowed** on the meeting row (PRD §5.1). Short capped
  free text; never log it. Still no email, no accounts, no organisation.
- **First + last name** required at the `/m/[id]` entry modal before paint
  (first visit / no claim). Stored as one display string; two-letter initials
  on the respondent strip (PRD §5.2).
- **Never `new Date()` arithmetic for slot boundaries.** Use `Temporal`. PRD §8.
- Ids are generated server-side only, `crypto.getRandomValues` over 16 bytes.
  Not `randomUUID()`.

## Commands

```bash
pnpm dev            # dev server
pnpm test           # vitest unit
pnpm test:int       # vitest integration, needs docker compose up postgres
pnpm test:e2e       # playwright
pnpm check          # svelte-check + tsc --noEmit
pnpm lint
pnpm size           # size-limit — the 60 KB gate
```

## Layout

See TECH-STACK §10. `src/lib/grid/` is the risky part and is built first.

## Style

TypeScript strict, `noUncheckedIndexedAccess`. Plain scoped CSS, no utility
classes. Svelte 5 runes (`$state`, `$derived`), not stores.
