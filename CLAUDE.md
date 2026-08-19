# shapshap

Group availability finder. No accounts, no email. The URL is the credential.

Read `docs/PRD.md`, `docs/TECH-STACK.md` and `docs/INFRASTRUCTURE.md` before proposing
architecture changes. They are the spec; this file is the summary.

## Hard rules

- **Never log a meeting id, participant id, name, or IP.** `/m/{id}` is a bearer
  token (PRD §6.2). Everything goes through `scrub()` in `src/lib/ids.ts`.
  Two CI assertions enforce this (TECH-STACK §7). Do not weaken them.
- **No new runtime dependency** without an argument in the PR. The complete
  permitted list is TECH-STACK §8.
- **60 KB gzipped JS budget on `/m/[id]`.** Hard CI gate.
- **No ORM, no Tailwind, no UI library, no analytics.** See TECH-STACK §9 for
  what was rejected and why — do not re-propose these.
- **No title field, ever.** PRD §5.1.
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
