# 살림 (Sallim)

A mobile-first app where Korean households register every appliance, gadget, and piece of furniture by snapping a label photo, then track warranties, manuals, A/S, and maintenance schedules in one place.

> M0 (feasibility gate) — PASSED. See `docs/M0_REPORT.md` (in the legacy `naegeot/` folder).
> Currently in **M1 — Project skeleton**.

---

## Repo layout (monorepo)

```
sallim_app/
├── apps/
│   ├── mobile/        Expo (React Native) — iOS + Android
│   └── api/           NestJS — backend on Railway
├── packages/
│   └── shared/        @sallim/shared — Zod schemas + shared types
├── docs/              product specs (read these first)
├── .github/workflows/ CI (lint + test + build on PR)
└── package.json       pnpm workspace root
```

---

## Quick start

Requires Node.js ≥ 20, pnpm ≥ 9.

```bash
# 1) Install
pnpm install

# 2) Mobile (Expo dev server)
pnpm --filter @sallim/mobile start
# Press 'i' for iOS simulator (requires Xcode), 'a' for Android emulator,
# or scan the QR code from Expo Go on a physical device

# 3) API (NestJS dev server, port 4000)
pnpm --filter @sallim/api dev

# In another terminal:
curl http://localhost:4000/health
# → {"ok":true}

# 4) Tests
pnpm test            # all packages
pnpm typecheck       # all packages
pnpm lint            # all packages
```

---

## Where the spec lives

Read these in order before any non-trivial change:

1. **`docs/PRODUCT.md`** — what we're building, who for, why
2. **`docs/MILESTONES.md`** — build sequence (M1 → M9). Always check this before starting work.
3. **`docs/DATA_MODEL.md`** — DB schema (Prisma source of truth lives in `apps/api/prisma/schema.prisma` from M2)
4. **`docs/VISION_PIPELINE.md`** — AI vision contract (M0 validated, M4 implements)
5. **`docs/EMAIL_IMPORT.md`** — Korean e-commerce receipt parsing (M6)
6. **`docs/PRODUCT_DB.md`** — Korean product database structure (M3)
7. **`docs/PRIVACY.md`** — PIPC compliance, data inventory

---

## Working with Claude Code

Always start by reading `CLAUDE.md` and the relevant `docs/MILESTONES.md` section. The single biggest mistake to avoid is skipping ahead — every milestone has explicit out-of-scope items.

---

## License

Proprietary — pre-launch. All rights reserved.
