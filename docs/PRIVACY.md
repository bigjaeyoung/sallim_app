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
| Product photos (labels, room shots) | User upload | Product extraction + display | 30 days original, then thumbnail; thumbnail lifetime |
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
- Postgres at rest: encrypted by Supabase by default.
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
| Supabase | DB hosting | All structured data (encrypted at rest) |
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
- Where possible, prefer Korean / APAC region for processors (Supabase has APAC; R2 has APAC).

---

## Anthropic specifics

- We use Anthropic's API in default mode where data is not used to train models.
- We do not pass identifiable user data (name, phone) into prompts. Photos and email text contain user info that's needed for the function — we minimize and document this.
- We do not log AI inputs/outputs containing PII beyond 30 days.

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
