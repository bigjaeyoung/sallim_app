# 살림 — Data Model

Source of truth: `apps/api/prisma/schema.prisma`. Update this doc and the schema in the same PR.

---

## Tables overview

```
users ──┐
        │
        ├─< household_members >── households ──┬──< products ──┬──< product_photos
        │                                      │                ├──< receipts
        │                                      │                ├──< service_events
        │                                      │                ├──< reminders
        │                                      │                └── (linked_product_db_id → product_db)
        │                                      ├──< household_invites
        │                                      └──< email_integrations
        │
        └─< notification_tokens

product_db (read-only seed data)
brand_directory (read-only seed data)
```

---

## Tables

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | nanoid |
| `phone` | text unique | E.164 (e.g., `+821012345678`) |
| `email` | text unique | optional |
| `kakao_id` | text unique | optional, for Kakao login |
| `name` | text |  |
| `avatar_url` | text |  |
| `default_household_id` | text references households(id) |  |
| `locale` | text default 'ko' |  |
| `created_at` | timestamptz default now() |  |

### `households`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK |  |
| `name` | text not null | "우리집", "부모님댁" |
| `address_label` | text | optional, free-form ("서울 마포") |
| `created_by` | text references users(id) |  |
| `plan` | text not null default 'free' | `free` \| `premium` \| `family` |
| `plan_expires_at` | timestamptz | when next billing renews |
| `created_at` | timestamptz default now() |  |

### `household_members`

| Column | Type | Notes |
|---|---|---|
| `user_id` | text references users(id) on delete cascade |  |
| `household_id` | text references households(id) on delete cascade |  |
| `role` | text not null | `owner` \| `member` \| `viewer` |
| `joined_at` | timestamptz default now() |  |

PK: `(user_id, household_id)`. Index on `household_id`.

### `household_invites`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK |  |
| `household_id` | text references households(id) on delete cascade |  |
| `inviter_id` | text references users(id) |  |
| `target_phone` | text | optional |
| `token` | text unique not null | shareable link suffix |
| `role` | text not null default 'member' |  |
| `expires_at` | timestamptz not null |  |
| `accepted_by` | text references users(id) |  |
| `accepted_at` | timestamptz |  |
| `created_at` | timestamptz default now() |  |

### `products`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK |  |
| `household_id` | text references households(id) on delete cascade |  |
| `category` | text not null | `refrigerator` \| `washer` \| `dryer` \| `tv` \| ... See `lib/categories.ts`. |
| `display_name` | text not null | user-editable, defaults to `${brand} ${model}` |
| `brand` | text |  |
| `model` | text |  |
| `serial` | text |  |
| `linked_product_db_id` | text references product_db(id) | nullable; set when matched to our DB |
| `purchased_at` | date |  |
| `purchase_price` | integer | KRW, no decimals |
| `retailer` | text | `coupang` \| `11st` \| `gmarket` \| `samsungstore` \| ... |
| `warranty_until` | date | computed when possible |
| `warranty_special_notes` | text | for parts that have longer/shorter warranty |
| `is_subscription` | boolean default false | LG/Samsung subscription? |
| `room` | text | `kitchen` \| `living` \| `bedroom1` \| ... |
| `notes` | text |  |
| `created_at` | timestamptz default now() |  |
| `updated_at` | timestamptz default now() |  |

Indexes: `(household_id)`, `(household_id, category)`, `(linked_product_db_id)`.

### `product_photos`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK |  |
| `product_id` | text references products(id) on delete cascade |  |
| `kind` | text not null | `label` \| `front` \| `room` \| `serial` |
| `r2_key` | text not null | R2 object key |
| `width` | integer |  |
| `height` | integer |  |
| `created_at` | timestamptz default now() |  |

### `receipts`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK |  |
| `household_id` | text references households(id) on delete cascade |  |
| `source` | text not null | `gmail` \| `naver` \| `manual` |
| `source_message_id` | text | for dedupe |
| `vendor` | text not null |  |
| `total_amount` | integer | KRW |
| `currency` | text default 'KRW' |  |
| `purchased_at` | date |  |
| `raw_html` | text | sanitized, kept for diagnostic |
| `extracted_items` | jsonb | array of `{ name, qty, price }` |
| `linked_product_id` | text references products(id) | nullable until user links |
| `created_at` | timestamptz default now() |  |

Index on `(household_id, source_message_id)` unique (dedupe).

### `service_events`

A/S history per product.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK |  |
| `product_id` | text references products(id) on delete cascade |  |
| `kind` | text not null | `repair` \| `cleaning` \| `inspection` \| `parts` |
| `vendor` | text | `samsung_official` \| `lg_official` \| `private` |
| `occurred_on` | date |  |
| `cost` | integer | KRW |
| `notes` | text |  |
| `created_at` | timestamptz default now() |  |

### `reminders`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK |  |
| `product_id` | text references products(id) on delete cascade |  |
| `kind` | text not null | `warranty_30d` \| `warranty_7d` \| `consumable_due` (for any consumable defined in `product_details.consumables`) \| `cleaning_due` |
| `consumable_kind` | text | nullable; matches `product_details.consumables[].kind` when applicable. Used to render the right copy ("카본필터 교체 시기") |
| `notify_at` | timestamptz not null |  |
| `status` | text not null default 'pending' | `pending` \| `sent` \| `dismissed` |
| `created_at` | timestamptz default now() |  |

Index on `(notify_at, status)` partial where status='pending'.

### `email_integrations`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK |  |
| `user_id` | text references users(id) on delete cascade |  |
| `provider` | text not null | `gmail` \| `naver` |
| `email_address` | text not null |  |
| `oauth_access_token_enc` | bytea not null | sealed-box encrypted |
| `oauth_refresh_token_enc` | bytea | sealed-box encrypted |
| `expires_at` | timestamptz |  |
| `last_synced_at` | timestamptz |  |
| `status` | text not null default 'active' | `active` \| `revoked` \| `error` |
| `created_at` | timestamptz default now() |  |

### `notification_tokens`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK |  |
| `user_id` | text references users(id) on delete cascade |  |
| `expo_push_token` | text not null |  |
| `device_id` | text |  |
| `last_active_at` | timestamptz |  |

### `product_db` (read-only, seeded)

Our Korean product database. Seeded from manufacturer catalogs and updated quarterly.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK |  |
| `brand` | text not null | `samsung` \| `lg` \| `winia` \| ... |
| `model_pattern` | text not null | regex matching model strings (e.g., `^RF85B`) |
| `category` | text not null |  |
| `display_brand` | text | "삼성전자" |
| `display_model` | text | exact model name when known |
| `manual_pdf_url` | text |  |
| `manual_html_url` | text |  |
| `default_warranty_months` | integer | usually 12 |
| `special_warranty_rules` | jsonb | e.g., `{ "compressor": 60, "motor": 36 }` |
| `images` | text[] | catalog photo URLs |
| `updated_at` | timestamptz |  |

Indexes: `(brand)`, `(category)`. We match an OCR'd model string against `model_pattern` regexes; fastest match wins.

### `product_details` (read-only, derived from manual PDF parsing)

Per-model rich content extracted from manufacturer manuals via Claude (M3.5 pipeline). One row per `product_db.id`. Unlike `product_db` (which is structured metadata), this holds prose/structured maintenance data lifted from the official manual.

| Column | Type | Notes |
|---|---|---|
| `product_db_id` | text PK references product_db(id) on delete cascade |  |
| `thumbnail_url` | text | catalog image; from manufacturer site or 다나와 |
| `usage_summary_md` | text | Markdown — 주요 기능 / 청소 / 자주 묻는 문제 / 분리수거 (Claude로 manual PDF에서 추출) |
| `consumables` | jsonb | array of `{ kind, display_name, interval_days, default_part_number?, replacement_url? }`. Examples: `{ kind: "filter_carbon", display_name: "카본필터", interval_days: 180 }`. Drives `reminders` of kind `consumable_due` |
| `maintenance_tips` | jsonb | array of strings, short Korean tips. e.g., `["월 1회 외부 청소", "분기별 배수 점검"]` |
| `manual_parsed_at` | timestamptz | when we last ran the parser |
| `manual_source_pdf_url` | text | source URL — for re-parse later when manufacturer updates |
| `parser_version` | text | version of our extraction prompt; lets us re-parse selectively when prompt improves |

**How rows get populated**: M3.5 pipeline downloads `product_db.manual_pdf_url`, sends to Claude with a Korean-language extraction prompt, validates JSON, upserts. Re-parse when `parser_version` lags behind current.

**How `consumables` drives reminders**: When a `products` row links to a `product_db_id` that has consumables, on product creation we schedule reminders at `purchased_at + interval_days - 14d` (14 day lead time). User can mark "교체했어요" — we snooze the next one to `now() + interval_days`.

### `brand_directory` (read-only, seeded)

A/S contact data per brand.

| Column | Type | Notes |
|---|---|---|
| `brand` | text PK | `samsung`, `lg`, ... |
| `display_name` | text | "삼성전자" |
| `as_phone` | text | `1588-3366` |
| `as_kakao_url` | text | KakaoTalk channel deep link |
| `as_web_url` | text | A/S 신청 page |
| `support_hours` | text | "평일 09:00~18:00" |
| `updated_at` | timestamptz |  |

---

## Authorization model

Every API call resolves the authenticated user, then resolves their accessible household ids. All queries that touch household-scoped tables MUST filter by an `household_id` from that allowed set.

A NestJS guard `@HouseholdAccess('member' | 'owner')` extracts `householdId` from the request (URL param or body), checks the user's role in that household, and rejects with 403 otherwise.

---

## Reminder scheduling

When a product is created or updated with a `warranty_until` date, schedule reminders:

- 30 days before → `warranty_30d`
- 7 days before → `warranty_7d`

A scheduled job runs every 15 minutes and processes `reminders` where `notify_at <= now()` and `status='pending'`. It sends Expo Push to all `notification_tokens` of household members and marks `sent`.

---

## Data retention & deletion

- Users can delete a household: cascade deletes all products, receipts, photos, etc.
- Users can request full account deletion via Settings → "계정 삭제". We hard-delete within 7 days; document this in privacy policy.
- Receipt `raw_html` is auto-purged after 90 days.
- Email tokens revoked: we delete refresh tokens immediately; access tokens expire naturally.
