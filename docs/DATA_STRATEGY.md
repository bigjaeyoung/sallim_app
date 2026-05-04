# 데이터 자산 전략 — Anthropic은 다리, 자체 모델이 목적지

## 핵심 결정

**Anthropic API는 영구 솔루션이 아니다.** M1~M9 동안 사용하면서, 그 기간 내내 **사용자 라벨 사진과 추출 결과를 자체 학습 데이터셋으로 누적**한다. 충분한 데이터가 모이면 OSS vision 모델을 한국 가전 라벨로 fine-tune해서 Anthropic을 대체한다.

이건 단순 비용 절감이 아니다. **사용자 데이터 자산이 회사의 진짜 해자(moat)**이며, 외부 API에 영원히 종속되지 않는 게 사업의 장기 생존 조건이다.

---

## 3단계 로드맵

### Phase A — 누적 (M4부터 ~ 1만 MAU)

**목표**: 모든 vision API 호출의 입출력을 학습 데이터로 보존

수집 대상:
- 원본 라벨 사진 (R2 long-term bucket, anonymized)
- Claude 추출 결과 (brand, model, category, confidence, notes, latency, tokens, cost)
- 사용자 정정 행위 (어떤 필드를 어떻게 바꿨는지)
- 매칭 결과 (product_db에 매칭됐는지, 어느 row인지)

저장 위치: `vision_extractions` 테이블 + `r2://sallim-training/` bucket

**Phase A에서는 데이터를 활용하지 않고 모으기만 한다.** 1만 MAU 도달 시점 (~6개월) 즈음 충분한 양 (~20만 라벨) 누적.

### Phase B — 활용 1차 (~ 10만 MAU)

**목표**: 모인 데이터로 Anthropic 호출의 정확도 / 비용 개선

활동:
- **Prompt 자동 개선**: 실패 케이스 (저신뢰도 + 사용자 정정) 분석 → 프롬프트 few-shot 예시 추가 → 정확도 +5~10%
- **Korean Product DB 자동 확장**: 사용자 정정한 (brand, model, category) 튜플을 product_db에 후보로 등록 → 검토 후 시드에 추가 → DB 크기 ↑ → product_db 매칭 비율 ↑ → API 호출 안 하고 결과 줄 수 있는 비율 ↑
- **Batch API + Prompt caching** 적용 → API 비용 절반

이 단계 끝나면 Anthropic 비용/사진 ~$0.002 (현재 $0.0099의 20% 수준)로 떨어짐.

### Phase C — 자체 모델 (10만 MAU+ ~ 100만 MAU)

**목표**: Anthropic 의존도 제거

활동:
- 누적 데이터셋 ~50만~100만 장으로 OSS vision 모델 fine-tune. 후보:
  - **Qwen2-VL 7B** (Apache 2.0, 한국어 vision 강함)
  - **InternVL 2.5** (MIT, 멀티모달 강함)
  - **LLaVA-1.6 13B**
- 학습은 H100 4-GPU 머신 1주일 (~$2,000) 또는 RunPod·Modal로 할당
- 자체 inference 서버 띄우기 (Modal serverless 또는 RunPod):
  - 비용: 사진당 ~$0.0005 (Anthropic의 5% 수준)
  - latency: 2~3초 (Anthropic의 절반)
- Anthropic은 **fallback 전용** — 자체 모델 confidence < 0.7일 때만 호출
- 점진적 cutover (10% → 50% → 100%)

이 단계 완료 시 Anthropic 비용 거의 0, 자체 GPU 비용 월 ~$2,000 (100만 MAU 기준).

---

## 데이터 수집 정책

### `vision_extractions` 테이블 (DATA_MODEL.md 참조)

모든 API 호출의 raw record. 사용자 consent와 무관하게 **모든 호출은 로그에 남는다** (운영·디버깅·비용 추적용). 단, 학습 데이터로 활용 가능한지는 별도 flag.

핵심 컬럼:
- `id`, `created_at`, `household_id`, `product_id` (FK)
- `r2_key` — 원본 사진 위치
- `model_id` — `claude-sonnet-4-6` 등
- `prompt_version` — 어떤 프롬프트 버전으로 호출했는지 (`vision_label_v1`, `v2`, ...)
- `extraction_json` — Claude 응답 그대로
- `latency_ms`, `input_tokens`, `output_tokens`, `cost_usd`
- `user_corrected_json` — 사용자가 review 화면에서 정정한 최종값 (nullable)
- `usable_for_training` — `users.training_consent && !flagged` 일 때만 true

### Consent 흐름 (`PRIVACY.md` 참조)

**Opt-in, 명시적, 분리 가능:**
- 첫 사진 업로드 시 명시적으로 묻기:
  > "이 사진을 살림 AI 학습에 사용해도 될까요? 모델명·카테고리 추출 정확도가 더 좋아집니다. 언제든 설정에서 끌 수 있어요."
  > [네, 도와줄게요] [아니요]
- 기본값: **OFF** (PIPC 안전)
- 사용자가 ON 했을 때만 `users.training_consent = true`
- 끄면 그 시점 이전 데이터는 다음 정기 정리(주 1회) 때 학습 셋에서 제외 + 익명화 처리

### Retention 정책 차등화

| 사용자 상태 | R2 원본 사진 | 썸네일 | extraction_json | 학습 데이터셋 포함 |
|---|---|---|---|---|
| `training_consent=false` | 30일 후 800px 다운샘플 + 원본 삭제 | 영구 | 영구 (PII 없음) | ❌ |
| `training_consent=true` | **anonymized 후 long-term retention** | 영구 | 영구 | ✅ |
| 계정 삭제 시 | 7일 내 hard delete | 7일 내 hard delete | 7일 내 hard delete | 7일 내 학습 셋에서도 제거 |

### Anonymization

학습 데이터 셋에 들어가는 사진은:
- EXIF GPS 제거
- 사용자 식별자 (filename pattern) 제거 — UUID hash로 대체
- 라벨 외 영역 자동 crop (M3.5 단계에서 라벨 detection 모델로 crop 수행) — 가족 사진·물건 등 PII 노출 차단
- household_id, user_id 등 식별자 dataset에 포함 X

---

## Phase별 측정 지표

각 Phase 진입 가능 여부는 다음으로 판단:

| 지표 | Phase B 진입 | Phase C 진입 |
|---|---|---|
| 누적 사용자 정정 라벨 수 | ≥ 50,000 | ≥ 500,000 |
| 라벨 분포 (브랜드 다양성) | ≥ 20개 브랜드 × 1,000 row | ≥ 30개 브랜드 × 5,000 row |
| 라벨 분포 (카테고리) | ≥ 15개 카테고리 × 500 row | ≥ 25개 카테고리 × 5,000 row |
| 사진 품질 (해상도 ≥ 1568px) | ≥ 70% | ≥ 80% |
| 비용 ROI (자체 vs API) | API 월 비용 ≥ $2,000 | API 월 비용 ≥ $20,000 |

---

## 위험 / 완화

| 위험 | 완화 |
|---|---|
| **PIPC 위반 — 명시적 consent 없는 학습** | Opt-in 흐름 강제. 학습 셋 분기 시 `training_consent=true` AND `created_at > consent_granted_at` 만 포함 |
| **Anthropic이 우리 모델 학습을 약관으로 금지** | Anthropic Terms 검토. 현재 (2026-05) Customer Data 학습 금지 조항 없음. 다만 우리 가 출력으로 다른 모델 학습은 회색지대 — 사용자 정정값을 ground truth로 사용하면 안전 (Claude output 자체를 ground truth로 쓰는 distillation은 회피) |
| **데이터 유출** | Encryption at rest (R2 server-side encryption), audit log, IAM 최소 권한, 학습 dataset export는 owner만 가능 |
| **편향 누적** | 사용자가 수도권/Samsung·LG 편향 → 데이터셋도 편향. Phase B 시점에 distribution audit 정기 수행 |
| **OSS 모델 라이선스** | Apache 2.0 / MIT 모델만 사용. Llama (Meta 라이선스) 같은 제약 있는 모델 회피 |

---

## 실행 체크리스트 (M4 시점에 활성화)

- [ ] `vision_extractions` 테이블 마이그레이션 (DATA_MODEL.md 참조)
- [ ] `users.training_consent` 컬럼 + 마이그레이션
- [ ] `users.consent_granted_at` (timestamp)
- [ ] R2 bucket 분리: `sallim-photos` (단기) + `sallim-training` (long-term)
- [ ] Onboarding 화면에 consent 토글 + Settings에 동일 토글
- [ ] `VisionService.extractLabel` → 호출 결과를 `vision_extractions`에 항상 로그
- [ ] Cron job: 주 1회 `usable_for_training` 재계산 + 학습 bucket 정리
- [ ] Privacy policy 업데이트 (PIPC 준수)

이 항목들을 MILESTONES.md M4에 task로 추가.

---

## 한 줄 요약

**Anthropic은 우리가 데이터 자산을 만들 시간을 사주는 임시 계약.** 1년 안에 우리만의 한국 가전 라벨 인식 모델로 갈아탄다.
