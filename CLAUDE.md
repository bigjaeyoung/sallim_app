# 살림 (Sallim) — Claude Code instructions

> A mobile-first app where Korean households register every appliance, gadget, and piece of furniture by snapping a label photo, then track warranties, manuals, A/S, and maintenance schedules in one place.

---

## Status

- ✅ **M0 — Feasibility gate**: PASSED (Brand 97%, Model 91%, Category 97%). Validation scripts and report live in the legacy `사업개발/build/sallim/` folder.
- 🔨 **M1 — Project skeleton**: in progress (this repo).
- 🔒 Future milestones: see `docs/MILESTONES.md`.

---

## Tech stack

- **Mobile**: Expo (React Native, TypeScript, expo-router). Single codebase for iOS + Android.
- **API**: NestJS (TypeScript). Hosted on Railway.
- **DB** (M2+): PostgreSQL via Supabase + Prisma.
- **File storage** (M4+): Cloudflare R2 for label photos.
- **Auth** (M2+): phone OTP via Twilio Verify.
- **AI Vision** (M4+): Anthropic `claude-sonnet-4-6` — extracts brand/model/category from label photos.
- **Email parsing** (M6+): Gmail API + Naver Mail (IMAP fallback).
- **Push** (M5+): Expo Notifications + APNs/FCM.
- **Payments** (M9+): Apple/Google IAP for B2C.
- **Manual PDF parsing** (M3.5): Claude PDF input — `usage_summary_md`, `consumables[]`, `maintenance_tips[]` per model.

---

## Repo Layout (monorepo)

```
sallim_app/
├── apps/
│   ├── mobile/                Expo app
│   │   ├── app/               expo-router routes
│   │   ├── components/        (M2+)
│   │   └── lib/               (M2+)
│   └── api/                   NestJS backend
│       ├── src/
│       │   ├── modules/       (M2+ — auth, products, households, etc.)
│       │   └── main.ts
│       └── prisma/            (M2+) schema & migrations
├── packages/
│   └── shared/                @sallim/shared — Zod schemas, shared types
├── docs/                      product specs (read these before non-trivial work)
└── .github/workflows/         CI
```

---

## Commands

```bash
pnpm install                            # workspace install
pnpm --filter @sallim/mobile start      # Expo dev server
pnpm --filter @sallim/api dev           # NestJS dev (port 4000)
pnpm --filter @sallim/api db:push       # (M2+) Prisma db push
pnpm --filter @sallim/api db:studio     # (M2+) Prisma Studio
pnpm test                               # all packages
pnpm lint                               # all packages
pnpm typecheck                          # all packages
```

Env vars: `apps/api/.env.example` and `apps/mobile/.env.example`. **NEVER commit `.env*`** files (except `.env.example`).

---

## Coding Conventions

- **TypeScript**: strict mode. No `any` (Zod where needed). All shared types live in `@sallim/shared`.
- **Mobile**: functional components with hooks. Global state via Zustand. Server state via React Query.
- **API**: NestJS controllers thin → services thick. Use Zod via `nestjs-zod` for DTO validation (over class-validator) for consistency with mobile.
- **Imports**: never reach into another module's internals; only use the package's public exports (`@sallim/shared` from both apps; `apps/api/src/modules/<name>/` exposes via `index.ts`).
- **Korean text**: source code in English; user-facing strings in `apps/mobile/i18n/ko.json`. Korean only at MVP; English locale comes later.
- **Errors**: API throws typed exceptions; mobile catches at the React Query layer and shows friendly Korean toasts.

---

## How to Work in This Repo

1. **Always start by reading `docs/MILESTONES.md`** for the current milestone and its acceptance criteria. Don't skip ahead.
2. **For any AI/Vision change, check `docs/VISION_PIPELINE.md` first.** Accuracy gates there are non-negotiable; if a change risks accuracy, write a short test plan first.
3. **Korean product DB seed data lives in `apps/api/prisma/seeds/products.csv`** (M3+). Don't hand-edit; regenerate via `pnpm --filter @sallim/api seed:products`.
4. **PIPC compliance**: any feature that touches personal data must update `docs/PRIVACY.md` if it changes the data inventory.
5. **Schema changes** (M2+): edit `apps/api/prisma/schema.prisma` first. Run `pnpm --filter @sallim/api db:push` and verify with `db:studio` before writing dependent code.
6. **Before declaring a milestone done**, run `pnpm lint && pnpm test && pnpm typecheck`. All three must pass.

---

## Important Rules

- **NEVER** call AI Vision from the mobile client. Photos are uploaded to API; API calls Claude. (Auth + cost control + PII pipeline live on the server.)
- **NEVER** store Gmail/Naver tokens in plaintext. Use libsodium-sealed boxes; key in env, not in DB.
- **NEVER** display another household's data. Every query joins via `household_id` derived from the authenticated session.
- **NEVER** reproduce manufacturer manual content directly in the UI; show our parsed summary (M3.5) and link out to the official PDF.
- **Korean A/S phone numbers can change**. Treat them as data, not constants. Always read from `brand_directory`.

---

## Where to look for more

- **Why we're building this & who for** → `docs/PRODUCT.md`
- **DB tables and relations** → `docs/DATA_MODEL.md`
- **What to build right now** → `docs/MILESTONES.md`
- **AI vision pipeline & accuracy gates** → `docs/VISION_PIPELINE.md`
- **Email receipt import** → `docs/EMAIL_IMPORT.md`
- **Korean product DB & seed strategy** → `docs/PRODUCT_DB.md`
- **Privacy / PIPC compliance** → `docs/PRIVACY.md`
- **M0 results (historical)** → `사업개발/build/sallim/docs/M0_REPORT.md`
