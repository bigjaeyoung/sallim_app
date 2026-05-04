# 살림 — Email Receipt Import

## Goal

User connects Gmail (later Naver Mail). We import past purchase confirmation emails from major Korean e-commerce vendors and turn them into receipts that can be linked to products.

## Vendor allowlist (MVP)

| Vendor | Sender domains | Notes |
|---|---|---|
| 쿠팡 | `coupang.com`, `coupangcorp.com` | "주문 완료", "배송 완료" subjects |
| 11번가 | `11st.co.kr`, `11stbiz.co.kr` | |
| G마켓 | `gmarket.co.kr`, `auction.co.kr` | (옥션 same parent) |
| SSG | `ssg.com`, `shinsegae.com` | 신세계 본가 |
| 마켓컬리 | `kurly.com` | 영수증 보다 주문 확인 메일 |
| 카카오쇼핑 | `kakaocorp.com`, `kakaopay.com` | 영수증 거래 한정 |
| 롯데온 | `lotte.net`, `lotteon.com` | |
| 신세계 백화점 | `shinsegae.com` (다른 path) | |
| 11번가 LIVE | `11st.co.kr` 카테고리 | |
| 삼성스토어 / LG베스트샵 | `samsung.com`, `lge.co.kr` | brand direct purchases |

Sender allowlist lives in `lib/vendors.ts` as a Map. We match exact-or-suffix (e.g., `*.coupang.com`).

We **do not** scan the entire inbox. Only messages from allowlisted senders are read.

---

## Sync flow

1. User connects Gmail (OAuth).
2. We request scopes: `https://www.googleapis.com/auth/gmail.readonly` (read-only metadata + body).
3. On first connect: backfill last 12 months. On a schedule: nightly delta sync per integration.
4. For each integration:
   - Build a query: `(from:coupang.com OR from:11st.co.kr OR ...) newer_than:365d` (or `after:lastSync`).
   - Fetch matching message IDs.
   - For each message ID not already in `receipts.source_message_id`, fetch the body (HTML).
   - Sanitize HTML (strip scripts, tracking pixels), extract text.
   - Identify vendor by sender domain.
   - Call `ReceiptParserService.parse(text, vendor)`.
   - Insert into `receipts` with status pending.

Backfill of 12 months for a normal user takes seconds (typically < 100 messages match the query).

---

## Parsing prompt

Lives in `apps/api/src/modules/email-import/prompts/parseReceipt.ts`.

System prompt (paraphrased):

> You are extracting Korean e-commerce purchase data from an email's plain text. The email comes from `${vendor}`. Return strict JSON:
>
> - `is_receipt`: boolean. True only if this email confirms a real purchase or delivery. Marketing, abandoned-cart reminders, refund notices, and shipping-only updates without item info should be `false`.
> - `purchased_at`: ISO date (YYYY-MM-DD) of the order date. Korean dates like "2026년 3월 15일" should be normalized.
> - `total_amount`: integer KRW. Strip "원" and commas. If multiple amounts appear, choose the final billed total.
> - `items`: array of `{ name: string, qty: number, price: number? }`. Korean product names preserved exactly.
> - `notes`: short Korean explanation if anything is uncertain.
>
> Return ONLY JSON. No prose.

If `is_receipt` is false, we discard the email (still mark `source_message_id` to avoid reparsing).

---

## Vendor-specific extraction tweaks

Some vendors have quirks the prompt should know:

- **쿠팡**: order confirmation and delivery confirmation are separate emails. The order email has the items+price; the delivery email is just status. Treat both as the same order via order ID if present.
- **11번가**: items appear in HTML tables; extracting from text after sanitization usually works.
- **마켓컬리**: emails are often image-only with text in alt attributes. Our HTML sanitizer should preserve `alt`s.
- **삼성스토어 / LG베스트샵**: receipts often include the *exact model number* — we should pass this to the user-facing flow so when they later add a product, we can pre-link.

For each vendor, we add a few-shot example to the prompt that shows the expected output for a typical email. Examples live in `apps/api/src/modules/email-import/fixtures/`.

---

## Mobile UX

After connection:
- Loading screen "지난 1년치 영수증을 가져오는 중…"
- Inbox screen lists pending receipts grouped by month.
- Each card: vendor logo + items (first 2) + total + date + 2 buttons: "추가" / "건너뛰기".
- "추가" opens a quick form: pre-filled vendor and date, user picks the category, optionally links to an existing product or creates a new one.
- "건너뛰기" marks dismissed.

---

## Privacy & permissions

- We only request `gmail.readonly`. Document this clearly in the OAuth consent screen.
- We never write to or delete email.
- We never send email to anyone else.
- Tokens are encrypted with libsodium sealed boxes; master key in env.
- Users can disconnect at any time from Settings — we revoke the token on Google's side and hard-delete locally.
- We retain raw HTML for diagnostic for 90 days only, then purge.

This must be reflected in `docs/PRIVACY.md` and our public privacy policy.

---

## Cost & rate limits

Per email parse: ~$0.001 (Claude Sonnet 4.6, ~1500 input tokens, ~200 output).

Backfill (100 emails) per user: ~$0.10. At 10K users / 12 months = $1,000 — one-time, fine.

Daily delta: ~5 emails / user / month = $0.05/user/year. Negligible.

Gmail API rate limits: 250 quota units/user/sec, 1B/day. We're well within.
