# 살림 — Vision Pipeline

The riskiest technical part of the product is "photo of label → correct Korean appliance metadata". This doc captures how we do it, the prompt, and the accuracy gates.

---

## Pipeline overview

```
mobile camera → upload photo (multipart) → API
  → R2 store (label-original)
  → resize for vision (max 1568px on long side)
  → Claude Sonnet 4.6 vision
  → structured extraction { brand, model, category, serial?, confidence }
  → Korean product DB lookup (regex match against model_pattern)
  → if matched: hydrate manual URL, default warranty, A/S brand
  → return to mobile for user review
```

Total target: < 6 seconds wall clock from shutter to review screen.

---

## The prompt

Lives in `apps/api/src/modules/vision/prompts/extractLabel.ts`.

System prompt (paraphrased):

> You extract Korean home appliance metadata from a label photo. The photo shows a manufacturer's product label or rating plate. Read the label and return strict JSON with these fields:
>
> - `brand`: lowercase identifier from this allowlist: `samsung`, `lg`, `winia`, `daewoo`, `sk_magic`, `coway`, `cuckoo`, `cheonghonais`, `dyson`, `philips`, `xiaomi`, `apple`, `sony`, `panasonic`, `unknown`. If the label says "삼성전자" or "SAMSUNG", use `samsung`. If you can't determine the brand confidently, use `unknown`.
> - `model`: the product model code as it appears on the label. Preserve case. Strip whitespace. Common patterns: alphanumeric like `RF85B900W3`, `WD10T754ABG`, `OLED77C2KNA`. Do NOT include serial numbers, manufacturing dates, or barcodes. If the model number is partial or illegible, return `null` and explain in `notes`.
> - `category`: lowercase identifier from this allowlist: `refrigerator`, `washer`, `dryer`, `washer_dryer`, `air_conditioner`, `air_purifier`, `vacuum`, `robot_vacuum`, `dishwasher`, `microwave`, `oven`, `range`, `tv`, `monitor`, `water_purifier`, `bidet`, `humidifier`, `dehumidifier`, `kimchi_fridge`, `induction`, `unknown`.
> - `serial`: serial number if clearly distinct from the model. Otherwise `null`.
> - `confidence`: float 0–1 self-assessment of overall extraction confidence. Be honest; say 0.5 if photo is unclear.
> - `notes`: short string explaining any uncertainty, in Korean.
>
> Return ONLY the JSON object. No prose around it.

User content:
- The photo (as image content block).
- A short instruction: "이 라벨을 분석하세요."

Validation: parse with a Zod schema. If parsing fails, return `confidence: 0` and let the user enter manually.

---

## Accuracy gates (M0)

These must hold on a 50-photo test set for the project to proceed:

| Field | Target |
|---|---|
| Brand correct | ≥ 95% |
| Model exact (after `.trim()`) | ≥ 80% |
| Model normalized (after strip-spaces, uppercase) | ≥ 90% |
| Category correct | ≥ 95% |

If we miss these gates on first attempt:
1. Try few-shot examples in the prompt (insert 2–3 labeled examples).
2. Try a photo pre-processing step (auto-rotate, crop to label region using a smaller model first).
3. Try chain-of-thought prompting then extract JSON.

If still missing: STOP. Reconsider the product.

---

## Resilience to bad photos

The user might:
- Take the photo from too far away.
- Hold the camera at an angle.
- Photograph the wrong sticker (e.g., energy efficiency label instead of model label).

Mitigations:
1. **UI hint** during capture: outline overlay shows where to point.
2. **Pre-check** before calling Vision: a tiny on-device quality check (focus, brightness) — defer to V2; for MVP just trust the user.
3. **Confidence threshold**: if `confidence < 0.6`, the review screen says "정확하지 않을 수 있어요. 다시 찍거나 직접 입력하세요." with a "다시 찍기" CTA.
4. **Always editable**: every field is editable on the review screen.

---

## Korean DB matching

Once we have `(brand, model)`:

1. Pull all `product_db` rows for that brand into memory (cached, ~hundreds of rows max).
2. Compile each `model_pattern` regex once on boot.
3. Test the extracted model against each pattern; first match wins.
4. If matched, hydrate `display_brand`, `display_model`, `manual_pdf_url`, `default_warranty_months`, `special_warranty_rules`.
5. If no match: still save the product with raw extraction; we can backfill manuals later.

This matching runs in <5ms per call (fully in-memory).

---

## Privacy

- Photos are stored in R2 with a household-scoped key prefix.
- Photos are private (signed URLs only).
- We do not send photos to any third party other than Anthropic for vision extraction.
- Anthropic API: customer data is not used for training (per their default API policy). We document this in our privacy policy.
- After 30 days, photos with confirmed product matches are downscaled to 800px thumbnails to save storage. Originals deleted.

---

## Cost estimate

Per photo: ~$0.005 with Claude Sonnet 4.6 vision (1 image, ~500 output tokens).

At 10K MAU averaging 2 new products/month: ~20K photos/month → ~$100/month. Healthy.
