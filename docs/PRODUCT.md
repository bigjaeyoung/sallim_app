# 살림 (Sallim) — Product Specification

## Why this exists

A typical Korean household owns ~20 appliances + furniture pieces, each with:
- A receipt (paper, email, KakaoTalk, or in a shopping app's order history).
- A warranty card (paper, lost within months).
- A manual (PDF online, but you need the model number to find it).
- An A/S phone number (different per brand, hard to find when something breaks).

When something breaks, the user wastes 30+ minutes finding the right info. When moving, all this metadata is forgotten or lost.

Manufacturer apps (Samsung SmartThings, LG ThinQ) only handle their own IoT-connected appliances. Receipt-tracking apps (꼼꼼영수증) don't tie to product info. There's no Korean app that gives a household a single source of truth for what it owns.

We're building it.

---

## Who it's for

### Primary persona: "지윤, 28, first solo apartment in Seoul"

- Just moved to a 12평 officetel. Bought refrigerator, washer, microwave, vacuum (cordless), TV.
- Receipts arrived in 5 different places: 쿠팡 email, KakaoTalk message, paper receipt at Costco, 11번가 app, mom paid for one.
- 6 months from now, when the washer leaks, she'll have no idea what model it is.
- She's on her phone constantly; comfortable with apps; has 1인 가구 friends with similar problems.

### Secondary persona: "재훈 + 수민, 32, newlyweds in 신축 아파트"

- Bought 1,500만원 worth of appliances at once (혼수). Models scattered across receipts.
- Will move again in ~5 years and want this info to come with them.

### Tertiary persona: "성호, 38, manages parents' home appliances remotely"

- Parents in Daegu; he's in Seoul.
- When their AC breaks, he gets a vague photo on KakaoTalk; spends an hour figuring out the model and A/S number.
- Wants a "parents' household" view he can populate and reference.

---

## Core user stories (MVP)

### S1. As a user, I add a product by photographing its label

- I tap the big "+" button. Camera opens.
- I take a photo of the label/sticker on the appliance.
- Within ~5 seconds the app shows: brand, model, category, photo of the label, with auto-filled fields (warranty period, manual link, A/S number) where confident.
- I tap "Save". It's added to my household.

### S2. As a user, I auto-import past purchases from email

- I tap "이메일 영수증 가져오기" in settings.
- I OAuth into Gmail (or Naver Mail).
- The app shows a queue of detected purchase emails from the past 12 months: 쿠팡, 11번가, G마켓, SSG, 마켓컬리, 카카오쇼핑, 롯데, 신세계.
- For each, I tap "추가" or "건너뛰기".
- Approved items become products in my household with the purchase date and price filled in.

### S3. As a user, I get warned before a warranty expires

- 30 days before warranty expiry, I get a push.
- The notification: "냉장고 무상보증이 30일 후 만료됩니다. 지금 점검 받아보세요."
- Tapping it goes to the product detail with a "A/S 신청" button.

### S3-A. As a user, I get reminded when consumables need replacement

- For products with known maintenance schedules (정수기 필터, 에어컨 필터, 공기청정기 필터, 비데 카본 필터, 청소기 헤파 필터), I get push notifications a few days before due date.
- The notification: "정수기 필터 교체 시기가 다가옵니다 (마지막 교체 6개월 전). 코웨이 1588-XXXX 또는 셀프 교체 가이드 보기."
- I can mark "교체했어요" in the app — next reminder auto-scheduled.
- A consumable schedule lives in our product DB per model (e.g., Coway CHPI-7400N → 카본필터 6개월, 헤파필터 12개월).

### S3-B. As a user, I see how to use my appliance without the manual paper

- On product detail, I see a "사용법 보기" button.
- It opens a curated summary extracted from the official manual PDF: 주요 기능, 청소 방법, 자주 묻는 문제, 분리수거 가이드.
- For appliances we have parsed manuals for (M3.5 deliverable), this is structured Korean text. For unparsed ones, we fall back to a deep link to the manufacturer's PDF.
- I never have to dig through 200-page PDFs to find "에어컨 필터 청소하는 법".

### S4. As a user, I call A/S in one tap

- On product detail, I tap "A/S 전화 걸기".
- The model name + serial + purchase date are copied to clipboard before the call connects.
- After the call, the system asks "오늘 A/S 신청하셨나요?" — if yes, log a service event.
- For brands with KakaoTalk chatbot A/S (삼성, LG), I see a "카카오톡으로 A/S" button that deep-links to the brand's official chatbot.

### S5. As a household, we share access with family

- I invite my spouse / parent / roommate via phone number or KakaoTalk share link.
- They can see and add products. Roles: owner / member / view-only.
- I can have multiple households (e.g., "우리집" and "부모님댁"), switch between them.

### S6. As a user, I pack my products for moving

- I open "이사 모드". Set the move date.
- Get a checklist (취소할 정기배송, Wi-Fi 재설정 가이드, ...).
- Generate a QR code that, when scanned at the new home, restores all product locations and triggers reinstall guides per appliance.

---

## Out of MVP scope (v2 or later)

- Insurance integration (revisit at month 18).
- Real-estate listing integration (revisit at month 18).
- Resale value tracking.
- Smart home control (we do not compete with SmartThings/ThinQ — we link out to them).
- English locale.
- Receipt parsing from photos (V1 supports email-only; photo OCR for paper receipts comes later).
- Gift / shared ownership flows.
- Web app — mobile only for MVP.

---

## Pricing

| Plan | Price | Limits |
|------|-------|--------|
| Free | ₩0 | 30 products, 1 household, manual photo input only |
| Premium | ₩3,900/mo (or ₩39,000/year) | unlimited products, email auto-import, 4 family members, move mode |
| Family | ₩5,900/mo (or ₩59,000/year) | 8 family members, multiple households, data export |

Billing **is in MVP** because mobile app stores require it from launch. Implemented via Apple/Google IAP. Server-side validation through StoreKit and Google Play Billing webhooks.

---

## Differentiation vs. competitors

| Competitor | Strength | Where we win |
|---|---|---|
| Samsung SmartThings / LG ThinQ | Deep control of own IoT appliances | Brand-agnostic; non-IoT items; furniture too |
| Centriq (US) | Mature label OCR, 1.2M product DB | Korean brands, Korean A/S systems, Korean e-commerce email import, **maintenance reminders**, Korean UI/UX |
| Sortly | Folders, multi-location, B2B-ready | Friction-free for households; not built for small business |
| 꼼꼼영수증 | Simple receipt photo storage | Links receipts to products **and warranties + maintenance schedules** |
| 매뉴얼.한국 | Korean manual search | **Structured manual content (parsed, not just PDF link)**, integrated with the user's actual products |

**Differentiator deep-dive — why we're not just inventory**: 단순 가전 보관함은 1년 안에 사용자가 잊어버립니다. 우리는 **사용자가 잊고 있을 때 먼저 알려줍니다** ("필터 교체할 때 됐어요"), **필요할 때 답을 줍니다** ("에어컨 필터 청소법은 매뉴얼 23페이지에 있어요 → 한 줄 요약: 5단계"). 라벨 인식은 입구일 뿐, 진짜 가치는 그 뒤의 **유지보수 비서**.

**Single-sentence pitch (Korean)**: "가전 라벨 찰칵 한 번이면 모델·매뉴얼·보증·A/S가 한 곳에. 필터 교체할 때 알려주고, 사용법도 풀어줍니다. 쿠팡 영수증도 자동으로."

---

## Design principles

1. **Friction zero on add**. If adding a product takes more than 10 seconds, we've failed. Photo → done.
2. **Korean-first, not Korean-translated**. Brand DB, e-commerce parsers, A/S flow are all built around Korean reality.
3. **One-tap A/S**. The moment something breaks, the user should be on the phone in 5 seconds.
4. **Family-aware**. Households are the primary unit, not individuals.
5. **Move-aware**. Korean households move every 5–7 years on average. Our app must shine at move time.
6. **Privacy-respecting**. Photos and receipts contain personal data. We minimize collection, encrypt sensitive fields, and follow PIPC.

---

## What success looks like (12 months)

- 30,000+ downloads.
- 8,000+ MAU.
- 500+ paid subscribers (Premium or Family) — ~1.5% conversion is realistic.
- 1+ B2B2C partner conversation underway (insurance, real estate, or moving company).
- App store rating ≥ 4.4.
- Korean-language press / YouTube coverage at least once.
