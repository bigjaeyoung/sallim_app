# 살림 — Korean Product Database

The `product_db` and `brand_directory` tables are our moat. They turn extracted model numbers into rich Korean product info (manuals, A/S, warranties).

This doc describes how we build, structure, and maintain them.

---

## Why we own this data

- Manufacturer apps (SmartThings, ThinQ) only cover their own products — we cover everyone.
- No public Korean appliance API exists.
- Quality of this data directly determines product usefulness. Garbage data → bad UX.

---

## product_db row format

| Field | Example | Notes |
|---|---|---|
| `brand` | `samsung` | lowercase identifier (allowlist) |
| `model_pattern` | `^RF85[A-Z]\d+[A-Z]?\d?$` | regex matching the model code |
| `category` | `refrigerator` | category enum |
| `display_brand` | "삼성전자" | what we show to user |
| `display_model` | null or "삼성 비스포크 냉장고 RF85 시리즈" | optional friendly name |
| `manual_pdf_url` | https://downloadcenter.samsung.com/... | direct link to PDF |
| `manual_html_url` | https://www.samsung.com/sec/support/... | fallback HTML page |
| `default_warranty_months` | 12 | from Korean consumer warranty law + brand policy |
| `special_warranty_rules` | `{ "compressor": 60, "motor": 36 }` | brand-extended warranties on specific parts |
| `images` | `["https://images.samsung.com/...jpg"]` | catalog photos |
| `updated_at` | timestamptz | for staleness tracking |

---

## brand_directory row format

| Field | Example |
|---|---|
| `brand` | `samsung` |
| `display_name` | "삼성전자" |
| `as_phone` | `1588-3366` |
| `as_kakao_url` | `https://pf.kakao.com/_xxxxxx/...` |
| `as_web_url` | `https://www.samsung.com/sec/support/` |
| `support_hours` | "평일 09:00~18:00, 토 09:00~13:00" |
| `updated_at` | timestamptz |

---

## Seeding strategy

### Phase 1 (M3 — manual curation, ~3 days)

Build seed CSVs by hand for the 8 priority brands × top categories. We prioritize:

1. **Samsung** (refrigerator, washer, dryer, AC, vacuum, TV, microwave, water purifier) → ~30 model patterns.
2. **LG** (same categories) → ~30 patterns.
3. **Winia / Daewoo** (refrigerator, washer, AC, kimchi 냉장고) → ~10 patterns.
4. **SK Magic** (water purifier, dishwasher, induction) → ~10 patterns.
5. **Coway** (water purifier, air purifier, bidet) → ~10 patterns.
6. **Cuckoo** (rice cooker, water purifier) → ~10 patterns.
7. **Dyson** (vacuum, hair dryer) → ~5 patterns.
8. **Xiaomi / Other** (small appliances) → ~10 patterns.

Total: ~115 rows. Doable manually in a few days with structured spreadsheet entry.

### Phase 2 (post-MVP — semi-automatic)

Crawl manufacturer support sites:
- `downloadcenter.samsung.com/?language=KR` exposes a model search; we scrape the model directory.
- `lge.co.kr/support/manuals` similar.
- For long-tail brands, Google Search API to find the manual URL.

Crawler runs quarterly, writes a candidate file, human approves diff via PR.

### Phase 3 (post-PMF — community)

Allow users to suggest a product when extraction misses. Their suggestion goes to a moderation queue. Approved entries enter `product_db`. This requires moderation tooling we won't build until we have users.

---

## Model pattern regex guidelines

- Patterns are case-insensitive (`/.../i`) when compiled.
- Anchor with `^` and `$`.
- Use character classes for parts of model that vary by sub-model (color, capacity).
- Be specific enough to avoid false matches. Example: don't match `^RF\d+$` — match `^RF\d{2}[A-Z]\d+[A-Z]?\d?$` for Samsung Bespoke refrigerators.

If two patterns match the same model, the row inserted first wins. Keep this stable — order of CSV matters.

---

## Quality checks

CI runs these on every seed CSV change:

1. Parse each CSV row; reject malformed regex.
2. Compile regex; check it matches at least one known model from a fixtures file (per row, an example model is included as a sanity check column).
3. Verify HTTPS reachability of `manual_pdf_url` (HEAD request, expect 200) — non-blocking warning.
4. Reject duplicate `(brand, model_pattern)`.

---

## Updating data

- `product_db` and `brand_directory` are seeded by `pnpm --filter api seed:products`.
- Always do this via PR — never hand-edit production DB.
- Phone numbers and KakaoTalk URLs change occasionally — re-verify quarterly.

---

## Coverage targets

| Category | Coverage target by M9 |
|---|---|
| Korean refrigerators (top 90% of installed base) | ≥ 80% recognized |
| Korean washers | ≥ 80% |
| Korean ACs | ≥ 70% |
| Korean small kitchen appliances | ≥ 50% |
| Korean cleaning appliances (vacuums, robot vacs) | ≥ 70% |
| Furniture | excluded for MVP |

A user with a typical Korean household should find that ≥ 70% of their items get correctly linked to a `product_db` row on first try.

---

## Known limitations

- Subscription products (LG 가전구독, Samsung AI 구독클럽) sometimes have different model labels than retail. We add separate patterns for them as we encounter.
- Imported brands (Whirlpool, Bosch) have lower coverage; that's fine for MVP.
- Old appliances (>10 years) often lack online manuals. We accept missing manual URLs gracefully.
