# 살림 — Build Milestones

This is the canonical build order. Work milestones in sequence. **M0 is a feasibility gate — if it fails, do not proceed without a pivot.**

Each milestone has:
- **Goal**: one sentence
- **Tasks**: ordered checklist
- **Acceptance criteria**: how we know it's done
- **Out of scope**: what NOT to build

---

## M0 — Feasibility gate (5 days)

**Goal**: Prove that label photos → Korean product info actually works at high enough accuracy. If accuracy is too low, the product can't exist.

This is **not a real product** — it's a CLI / Jupyter notebook to validate the riskiest assumption.

### Tasks
- [ ] Collect 50 Korean appliance label photos. Spread across:
  - Samsung (10), LG (10), Winia/Daewoo (5), SK Magic (5), Coway (5), Cuckoo (5), Dyson (3), Smaller brands (7).
  - Spread across categories: refrigerator, washer, dryer, AC, vacuum, water purifier, dishwasher, TV, AC, microwave.
  - Mix of clean photos and realistic phone photos (poor lighting, partial occlusion).
- [ ] Build `scripts/feasibility/extract.ts`: a TS script that takes a photo and uses Claude Sonnet 4.6 vision to extract `{ brand, model, category, confidence }`.
- [ ] Run on all 50 photos. Score:
  - Brand correct: target ≥ 95%.
  - Model exact: target ≥ 80%.
  - Model normalized (after strip-spaces, uppercase): target ≥ 90%.
  - Category correct: target ≥ 95%.
- [ ] Build `scripts/feasibility/manuals.ts`: for each correctly-extracted model, attempt to find the manual PDF URL using:
  - Samsung & LG official support sites (try direct URL pattern, fallback to search).
  - Manual.한국, fallback to Google.
  - Target: ≥ 70% of recognized models have a working PDF link.
- [ ] Build `scripts/feasibility/email_parsing.ts`: collect 30 sample receipt emails (own emails or volunteers; sanitize PII). Parse with Claude. Target accuracy:
  - Vendor identification: ≥ 95%.
  - Total amount: ≥ 90%.
  - Item names: ≥ 80%.
  - Purchase date: ≥ 95%.
- [ ] Write `docs/M0_REPORT.md` summarizing accuracies, failure modes, recommended mitigations.

### Acceptance criteria (gate)

All of these must be true to proceed:
- Brand accuracy ≥ 95%, normalized-model accuracy ≥ 90% on the 50 labels.
- Manual link coverage ≥ 70% on Samsung + LG.
- Email parsing accuracy hits the targets above on ≥ 5 distinct Korean retailers.

If any gate fails: STOP. Document failure mode in `docs/M0_REPORT.md`. Do not proceed to M1 without revising scope.

### Out of scope
- Any UI. Any DB. Any auth. Just scripts.

---

## M1 — Project skeleton (1 day)

**Goal**: Empty Expo + NestJS monorepo that boots, lints, builds, deploys.

### Tasks
- [ ] `pnpm` workspace with `apps/mobile` (Expo, TypeScript), `apps/api` (NestJS, TypeScript), `packages/shared` (zod schemas).
- [ ] Mobile: `expo-router` with a placeholder home screen showing "살림".
- [ ] API: NestJS with one health endpoint `GET /health`. Configured for Cloud Run / Railway.
- [ ] Configure ESLint + Prettier consistently across both apps.
- [ ] Vitest for unit tests; one passing test per app.
- [ ] `.env.example` for both apps.
- [ ] Deployed: API to Railway preview, mobile via Expo EAS dev build.
- [ ] CI workflow: lint + test + build on PR.

### Acceptance criteria
- I can run `pnpm --filter mobile start` and see the home screen on simulator.
- I can `curl https://<railway-url>/health` and get `{"ok":true}`.

### Out of scope
- Auth, DB, features.

---

## M2 — Auth + database + households (3 days)

**Goal**: User signs up via phone OTP, lands in their default household, can edit their profile.

### Tasks
- [ ] Provision Neon Postgres (https://console.neon.tech). Capture pooled and direct connection strings (`DATABASE_URL` and `DIRECT_DATABASE_URL`).
- [ ] Add Prisma to `apps/api`. Implement schema from `docs/DATA_MODEL.md`. Run migration.
- [ ] Phone OTP flow (Twilio Verify):
  - `POST /auth/send-otp` { phone } → sends code.
  - `POST /auth/verify-otp` { phone, code } → returns JWT.
- [ ] On first verification: create user, create their default household ("내 집"), add as owner.
- [ ] JWT-based auth guard in NestJS. `@CurrentUser()` decorator.
- [ ] Mobile: phone-input screen → OTP input screen → home screen.
- [ ] Mobile: store JWT in Expo SecureStore. Auto-refresh logic.
- [ ] Settings screen: name, profile photo, language.
- [ ] Household guard: `@HouseholdAccess('member' | 'owner')` in NestJS.

### Acceptance criteria
- I can sign up on a real device with my Korean phone number; OTP arrives via SMS within 30 seconds.
- I can log out and log back in.
- A new user has exactly one household with themselves as owner.

### Out of scope
- KakaoTalk login (later), email signup (later), products.

---

## M3 — Korean product DB + brand directory (2 days)

**Goal**: Seed product_db and brand_directory with real Korean data so M4 has something to look up.

### Tasks
- [ ] Build a seed pipeline: `apps/api/scripts/seed-product-db.ts`.
- [ ] Manual curation step (one-time): collect manual / model-prefix data for these brands:
  - Samsung (refrigerators, washers, ACs, TVs, microwaves) — at least 30 model patterns.
  - LG (same categories) — at least 30 model patterns.
  - Winia, SK Magic, Coway, Cuckoo, Dyson — at least 10 model patterns each.
- [ ] Each row in `product_db.csv` has: brand, model_pattern (regex), category, display_brand, display_model (or "any" if pattern matches a family), manual_pdf_url, default_warranty_months.
- [ ] `brand_directory.csv` has Korean A/S phones and KakaoTalk channel URLs for the brands above. Verify each one by calling once or visiting the URL.
- [ ] `pnpm --filter api seed:products` upserts both CSVs.
- [ ] Implement `ProductDbService.findByModel(modelString)` with regex fan-out (use a precompiled list, not DB regex).
- [ ] Tests: 30 known model strings should resolve to correct product_db rows.

### Acceptance criteria
- `findByModel("RF85B900W3")` returns Samsung refrigerator with manual URL and 12-month warranty.
- `brand_directory` has correct A/S phone for Samsung (1588-3366) and LG (1544-7777). Verify by calling.

### Out of scope
- Smaller brands beyond the listed 8. We'll add long-tail later.

---

## M3.5 — Manual PDF parsing → product_details (3 days)

**Goal**: For the seeded products in M3, automatically extract structured Korean usage content + consumables schedule from manufacturer manual PDFs. This is what differentiates "살림" from a bare inventory app — the user gets maintenance reminders and quick how-to summaries without ever opening a 200-page PDF.

### Tasks
- [ ] Add `apps/api/src/modules/product-details/` module.
- [ ] Implement `ManualParserService.parsePdf(pdfUrl)` — downloads PDF, sends to Claude Sonnet 4.6 with a Korean-language extraction prompt. Returns `{ usage_summary_md, consumables, maintenance_tips }` matching `product_details` schema.
- [ ] Prompt lives in `apps/api/src/modules/product-details/prompts/parseManual.ts`. Required sections to extract:
  - 주요 기능 / 사용법 핵심 (≤ 600자 markdown)
  - 청소 및 관리 (≤ 600자)
  - 자주 발생하는 문제와 해결 (≤ 600자)
  - 소모품 (필터·카트리지·가스 등) — 종류별 교체 주기를 일 단위 정수로
- [ ] Implement `seed-product-details.ts`: iterates `product_db` rows that have `manual_pdf_url` but no `product_details` row, calls parser, upserts. Resumable.
- [ ] Add Prisma migration for `product_details` table per `docs/DATA_MODEL.md`.
- [ ] Add `consumable_kind` column + new `consumable_due` value to `reminders.kind`.
- [ ] Tests:
  - 5 fixture PDFs (2 Samsung, 2 LG, 1 Coway) round-trip through the prompt and produce schema-valid output
  - `consumables[].interval_days` is always a positive integer ≤ 1825 (5년 이내)
  - Idempotency: parsing the same PDF twice produces identical output (with `parser_version` pinned)

### Acceptance criteria
- 30+ Samsung models and 30+ LG models in `product_db` have `product_details` rows populated.
- Coway 정수기 한 모델의 `consumables`에 `[{kind:"filter_carbon", interval_days:180}, {kind:"filter_hepa", interval_days:365}]` 형태가 들어 있음.
- Cost per parse ≤ $0.10 (sanity check; spec target).

### Out of scope
- User-customizable maintenance schedules (V2 — when users override default intervals).
- Manual update detection (when manufacturer publishes new revision — V2; for MVP we re-parse quarterly via cron).
- Multi-language manuals (Korean only for MVP).

---

## M4 — Add product via photo (5 days)

**Goal**: User snaps a label photo, app extracts brand+model, links to product_db, saves.

### Tasks
- [ ] Mobile: camera screen using `expo-camera`. UI guide overlay ("라벨이 잘 보이게 찍어주세요").
- [ ] Mobile: photo upload to API.
- [ ] API: `POST /products/extract` accepts photo (multipart). Stores in R2. Calls `VisionService.extractLabel(photo)`.
- [ ] `VisionService` calls Claude Sonnet 4.6 vision with the prompt from `docs/VISION_PIPELINE.md`. Returns `{ brand, model, category, serial?, confidence }`.
- [ ] **Every** call writes a row to `vision_extractions` (regardless of success/error) — see `docs/DATA_STRATEGY.md`. Capture `model_id`, `prompt_version`, `extraction_json`, `latency_ms`, `input_tokens`, `output_tokens`, `cost_usd`, `error_code`.
- [ ] User's review-screen edits write back to the same `vision_extractions` row as `user_corrected_json` — this is the ground-truth label for our future training set.
- [ ] API resolves brand+model against `product_db` via `ProductDbService.findByModel`. If matched, hydrate manual URL, default warranty, and set `vision_extractions.matched_product_db_id`.
- [ ] `POST /products` creates the product with extracted + DB-hydrated data. `purchased_at` defaults to today (user editable).
- [ ] Mobile: review screen showing extracted fields, photo, suggested category. User can edit each. Tap "저장".
- [ ] **Training-data consent (opt-in)**: in onboarding (right after first photo) AND in Settings, present a toggle "내 사진을 살림 AI 학습에 사용해도 됨". Default OFF. Wire to `users.training_consent` + `consent_granted_at`. Copy and behavior per `docs/PRIVACY.md` "AI training opt-in" section.
- [ ] R2 bucket split: `sallim-photos` (short-term, all users) + `sallim-training` (long-term, consent-only, anonymized — EXIF stripped, label-region cropped). Photo uploader writes to both when consent is on; only the first when consent is off.
- [ ] Cron job (weekly): recompute `vision_extractions.usable_for_training` based on current consent state; remove rows from training set when consent withdrawn or account deleted.
- [ ] Mobile: home screen lists products for current household. Empty state with "+ 추가" CTA.
- [ ] Mobile: product detail screen showing photo, brand, model, warranty, A/S phone (tappable), KakaoTalk button (if available), notes.
- [ ] Tests: extraction service unit tests with fixture photos; `findByModel` covered; **`vision_extractions` row is written on every call (success + error paths)**; consent gate correctly excludes pre-consent photos from training set.

### Acceptance criteria
- I take a photo of a Samsung refrigerator label; within 6 seconds I see the review screen with brand, model, category prefilled correctly.
- After save, the product appears on home screen with correct manual link.
- Tapping the A/S phone number on detail screen opens the phone dialer with `1588-3366`.
- A row exists in `vision_extractions` for every photo I uploaded (verified via `db:studio`).
- If I have not granted training consent, my photo's `r2_key_original` does NOT appear in the `sallim-training` bucket.
- After granting consent and uploading a NEW photo, that photo's row in `vision_extractions` has `usable_for_training=true` (after the weekly cron) but my OLD pre-consent photos do not.

### Out of scope
- Email import (M6), warranty alerts (M5), service event log (M7), training-set exporter (M9 or later when 50K+ usable rows).

---

## M5 — Warranty alerts + reminders (2 days)

**Goal**: Users get push notifications before warranties expire.

### Tasks
- [ ] On product create/update: if `warranty_until` is set, schedule `warranty_30d` and `warranty_7d` reminders.
- [ ] Cron worker (NestJS scheduled task) every 15 min: query pending reminders due now, send Expo Push, mark `sent`.
- [ ] Push tokens: mobile registers Expo Push token on login; API stores in `notification_tokens`.
- [ ] Mobile: push handler routes to product detail.
- [ ] Mobile: "곧 만료" section on home screen with the next 3 expiring products.
- [ ] User can edit warranty date manually if our default is wrong.
- [ ] Tests: reminder generation when warranty changes; cron picks up correctly.

### Acceptance criteria
- I create a product with `warranty_until` = today + 35 days. Wait 5 days (or fast-forward). I get a push.
- Tapping the push opens the product detail.
- **Consumable reminders**: when a product links to a `product_db_id` whose `product_details.consumables` is non-empty, on creation we schedule `consumable_due` reminders at `purchased_at + interval_days - 14d` per consumable. After user marks "교체했어요", next reminder is rescheduled to `now() + interval_days`.
- A Coway 정수기 (with carbon=180d, hepa=365d in `product_details.consumables`) created today gets two scheduled reminders, one at +166d (carbon - 14), one at +351d (hepa - 14).

### Out of scope
- User-customizable maintenance intervals (V2 — for MVP we use the seeded defaults from M3.5).
- Cleaning reminders that aren't tied to consumables (e.g., "월 1회 외부 청소" stays as a static `maintenance_tip` shown on product detail, not as a push).

---

## M6 — Email receipt import (5 days)

**Goal**: User connects Gmail; we import receipts from major Korean e-commerce vendors.

### Tasks
- [ ] Gmail OAuth flow: server generates auth URL, mobile opens in WebBrowser, OAuth callback to our API, store tokens encrypted in `email_integrations`.
- [ ] Token encryption: libsodium sealed boxes. Master key in env.
- [ ] `EmailImportService.syncRecent(integrationId, sinceDate)`:
  - Queries Gmail for messages from sender domains in our allowlist (쿠팡, 11번가, G마켓, SSG, 마켓컬리, 카카오쇼핑, 롯데, 신세계, 등).
  - Domain → vendor mapping in `lib/vendors.ts`.
  - For each new message (dedupe via `source_message_id`), download HTML, send to `ReceiptParserService.parse(html, vendor)`.
- [ ] `ReceiptParserService.parse` uses Claude with prompts from `docs/EMAIL_IMPORT.md`. Returns structured receipt data.
- [ ] Insert into `receipts`, status pending review.
- [ ] Mobile: "이메일에서 가져온 영수증" inbox screen showing pending receipts. User taps "추가" → links to existing product or creates new product.
- [ ] Background job: nightly sync per integration (runs once/day for active integrations).
- [ ] Tests: vendor matching, dedupe, parse on 10 fixture emails.

### Acceptance criteria
- I connect my Gmail. Within 3 minutes I see at least 5 receipts in the inbox (assuming I have past purchases).
- Approving a 쿠팡 receipt creates a product with the vendor, price, and date filled in.
- Daily sync picks up tomorrow's new receipts without duplicates.

### Out of scope
- Naver Mail (V2), KakaoTalk receipts (V2), photo OCR of paper receipts (V2).

---

## M7 — Service events + family sharing (3 days)

**Goal**: Users log A/S history; households can be shared with family.

### Tasks
- [ ] Service events: from product detail, "A/S 기록 추가" creates a `service_events` row with kind, vendor, date, cost, notes.
- [ ] After tapping "A/S 전화 걸기", show a soft prompt 1 hour later: "오늘 A/S를 신청하셨나요?". If yes, create event.
- [ ] Household invites:
  - `POST /households/:id/invites` → returns share URL (deep link with token).
  - User opens link → if logged in, asks to join; if not, prompts sign-up.
  - Owner can revoke invites and remove members from settings.
- [ ] Multiple households: switcher in mobile header. Default household is shown first.
- [ ] Tests: invite acceptance idempotency; member-removal authorization (only owner can remove).

### Acceptance criteria
- I share my household with my spouse via KakaoTalk link. They install the app, sign up, tap the link, and end up viewing my products.
- They can add a new product. I see it appear after pull-to-refresh.

### Out of scope
- Move mode (M8), real-time sync (later — pull-to-refresh fine for MVP), chat between members (no).

---

## M8 — Move mode + polish (3 days)

**Goal**: Users moving home can pack their products and continue without losing anything.

### Tasks
- [ ] Move mode entry on home screen ("이사 준비"): user sets new address (optional) and target date.
- [ ] Checklist: per-product reinstall guides (deep link to manual PDF), Wi-Fi reset reminders, subscription cancellation reminders.
- [ ] QR generation: produces a short-lived signed URL that, when scanned by a household member or new owner, restores product context.
- [ ] After move date passes: prompt "이사 완료" — products updated with new room labels (optional bulk edit).

### Acceptance criteria
- I set a move date 14 days out. Home screen shows checklist. Each product has a "이전 가이드" link.

---

## M9 — Billing + closed beta polish (3 days)

**Goal**: Apple/Google IAP working; first 50 beta testers can use the app end-to-end.

### Tasks
- [ ] Apple App Store IAP: configure Premium and Family product IDs. StoreKit 2 client.
- [ ] Google Play Billing: same.
- [ ] Server-side receipt validation. Webhook endpoints for Apple Server Notifications V2 and Google RTDN.
- [ ] On successful purchase, set `households.plan` and `plan_expires_at`.
- [ ] Paywall UI: shown when free user hits 30-product limit or tries email import.
- [ ] Empty states / loading states / error states throughout.
- [ ] Onboarding: 3 swipe screens → permissions (camera, notifications) → first photo prompt.
- [ ] App store screenshots & metadata in Korean.
- [ ] Sentry for both apps.
- [ ] PostHog for product analytics. Track `product_added`, `email_connected`, `as_called`, `paywall_shown`, `paywall_converted`.
- [ ] Privacy policy and terms (link to web pages — content drafted with PIPC compliance).

### Acceptance criteria
- TestFlight build distributed to 50 beta testers.
- A test purchase via sandbox credentials updates the household plan correctly.
- Walking through entire flow as a fresh user: sign up → take photo → add product → connect Gmail → import receipts → invite spouse → upgrade to Premium — works without errors.

---

## After M9 (not in initial build)

- Naver Mail integration.
- Kakao login (replaces phone-only).
- B2B2C partnerships (insurance, real estate, moving company API).
- Subscription tracking & cancellation deep-links (LG 가전구독 / 삼성 AI 구독클럽 / 코웨이 / 청호).
- Photo OCR of paper receipts.
- Spouse's parents' household — multi-generational management.
- English locale + expansion to Japan/Taiwan.
