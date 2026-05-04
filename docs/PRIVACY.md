# 살림 — Privacy & PIPC Compliance

We collect personal data. Korean PIPC (개인정보보호법) is strict. This file is the developer's reference; the user-facing privacy policy will be derived from it (with legal review).

---

## Personal data inventory

| Data | Source | Purpose | Retention |
|---|---|---|---|
| Phone number | OTP signup | Authentication | Lifetime of account |
| Email address | Optional signup or Gmail OAuth | Email-only login + receipt parsing | Lifetime of account |
| Display name | User input | UI personalization | Lifetime |
| Profile photo | User upload | UI personalization | Lifetime |
| KakaoTalk ID | Optional Kakao login | Auth | Lifetime |
| Address label | Household setting (free text, optional) | Multi-household selection | Lifetime |
| Product photos (labels, room shots) — base | User upload | Product extraction + display | 30 days original, then thumbnail; thumbnail lifetime |
| Product photos — **AI training set** (opt-in) | User upload + explicit consent | Improve our own vision model (Sallim's long-term replacement for Anthropic — see `docs/DATA_STRATEGY.md`) | Indefinite, anonymized; deleted on consent withdrawal or account deletion |
| Vision API call logs (`vision_extractions`) | Every label extraction | Operational debugging + (with consent) future model training | Indefinite for ops metadata; original photo retention follows row above |
| Receipt content (HTML) | Email import | Parse purchase data | 90 days raw; structured data lifetime |
| Email OAuth tokens | Gmail/Naver OAuth | Periodic sync | Until user disconnects; encrypted at rest |
| Device push tokens | App registration | Notifications | Until logout / token rotation |
| App usage analytics | Mobile app via PostHog | Product improvement | 1 year, anonymized after |
| Crash reports | Sentry | Bug fixing | 30 days |

---

## Data we do NOT collect

- Location (GPS) — not used.
- Contacts — not used.
- Microphone — not used.
- Calendar — not used.
- We don't read any email outside our vendor allowlist.

---

## Encryption

- All HTTPS traffic in transit.
- Postgres at rest: encrypted by Neon by default (AES-256, AWS KMS-backed).
- R2 photos: encrypted at rest by Cloudflare.
- Sensitive fields (`oauth_access_token_enc`, `oauth_refresh_token_enc`) encrypted application-side using libsodium sealed boxes. Master key in env var, rotated annually.

---

## User rights (PIPC mandates)

The app must support:

1. **Access**: user can view all their data via Settings → 데이터 다운로드 (V2; for MVP we provide on request via support email).
2. **Correction**: every field is editable in app.
3. **Deletion**: Settings → 계정 삭제 → confirmation → hard-delete within 7 days.
   - Cascade deletes households (if user is sole owner), products, photos, receipts, email integrations.
   - Revoke email OAuth tokens before deletion.
4. **Portability**: user can request data export (JSON dump) via support; respond within 10 business days.
5. **Withdrawal of consent**: user can disconnect email integration anytime; tokens revoked and refresh tokens deleted.

---

## Third-party processors

We disclose these in the privacy policy:

| Vendor | Purpose | Data shared |
|---|---|---|
| Neon | DB hosting (PostgreSQL serverless) | All structured data (encrypted at rest, AWS Singapore region) |
| Cloudflare R2 | Photo storage | Product photos |
| Anthropic | AI vision + receipt parsing | Photo bytes; sanitized email text |
| OpenAI | (none, V2) | n/a |
| Twilio | SMS OTP | Phone number, OTP code |
| Apple, Google | App distribution + IAP | Standard platform data |
| Resend | Transactional email | Email address, content of email |
| Expo | Push notification routing | Push token, notification payload |
| PostHog | Product analytics | Anonymized event data |
| Sentry | Error tracking | Stack traces, device info |

**No data is sold to advertisers. Period.**

---

## Children

The app is not designed for users under 14. We don't knowingly collect data from children. Sign-up requires phone OTP, which de-facto restricts access.

---

## Cross-border transfer

Several processors are US-based. We disclose this. For PIPC, we will:
- Get explicit consent for international transfer at signup.
- List recipients in the privacy policy.
- Where possible, prefer Korean / APAC region for processors (Neon has Singapore + Tokyo; R2 has APAC).

---

## Anthropic specifics

- We use Anthropic's API in default mode where data is not used to train models (per Anthropic's standard API terms).
- We do not pass identifiable user data (name, phone) into prompts. Photos and email text contain user info that's needed for the function — we minimize and document this.
- We do not log AI inputs/outputs containing PII beyond 30 days for users without `training_consent`.
- **Anthropic is a bridge, not the destination.** See `docs/DATA_STRATEGY.md` — we are accumulating a labeled dataset to train our own model, eventually replacing Anthropic. The training-data path requires explicit user opt-in (next section).

---

## AI training opt-in (data-asset strategy)

Sallim's long-term plan is to train a Korean-appliance-specialized vision model that replaces our Anthropic API dependency (see `docs/DATA_STRATEGY.md`). To do this we need labeled photo data accumulated over time. We obtain this data only with **explicit, granular, withdrawable consent**.

### Consent rules

- **Opt-in only.** Default `training_consent` is `false`. We never collect for training without an affirmative tap.
- **Granular.** A separate consent toggle, distinct from "use the app". A user can use Sallim without contributing.
- **Forward-only.** When a user grants consent, only photos taken AFTER that moment (`users.consent_granted_at` timestamp) are eligible for training. Pre-consent photos remain on the standard 30-day retention.
- **Withdrawable.** Users can flip the toggle off in Settings at any time. On withdrawal, we (a) stop adding new rows to the training set and (b) within 7 days, remove all of that user's photos from the training bucket and `usable_for_training` flags from `vision_extractions`.
- **Information disclosed at consent moment**:
  - "Sallim will use your label photos to improve our own AI. We never share with advertisers. You can turn this off any time."
  - Link to this privacy section.

### What we do with consented data

- Photos are anonymized (EXIF stripped, label-region cropped) before entering the training bucket.
- We never associate training-set photos with personal identifiers (no `user_id`, `phone`, `email` in the training dataset). Only an opaque hash for deduplication.
- We do not share the training dataset with third parties. Only Sallim's internal ML training pipeline reads it.

### What is in `vision_extractions` (covered by consent or not)

The `vision_extractions` table is **always written** (regardless of consent) for operational debugging — it contains the API call's metadata (latency, cost, error code, structured extraction). However:
- The `usable_for_training` flag is `true` ONLY when consent applies.
- For users without consent, the original photo (`r2_key_original`) is deleted at +30d. Only the 800×600 thumbnail and structured extraction (no PII) remain.

---

## Implementation rules for engineers

- New feature touches new personal data type? Update this doc + privacy policy in same PR.
- Any new third-party processor? Disclose here + privacy policy + add to consent screen.
- Logging: never log raw photos, raw email content, OAuth tokens, or session JWTs. Use redaction.
- PII export: implement before public launch; legal mandate.
- Data deletion: must be **complete** including R2 objects, not just DB rows. Use a deletion job that walks the cascade.

---

## Pre-launch checklist

Before public app store launch:

- [ ] Privacy policy reviewed by Korean privacy lawyer.
- [ ] Terms of service reviewed.
- [ ] Consent screen on signup includes specific consents for each data category.
- [ ] Data deletion path verified end-to-end including R2 cleanup.
- [ ] Data export path documented (manual for MVP, automated later).
- [ ] PIPC self-assessment template completed.
- [ ] DPO (Data Protection Officer) contact published in app and on website.
