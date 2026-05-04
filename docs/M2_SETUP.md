# M2 — 로컬 환경 셋업 가이드

M2 코드는 **재영님의 외부 계정 3개**(Neon, Twilio)에 연결되어야 동작합니다. 이 문서는 그 3개를 발급하고 .env에 채워 넣어 첫 SMS 인증이 동작할 때까지를 안내합니다.

---

## 사전 요구사항

- Node 20+, pnpm 9+ (M1에서 이미 설정)
- macOS 터미널, Expo Go 앱 (M1에서 이미 사용)
- 신용/체크카드 (Neon/Twilio 무료 티어 가입에 필요할 수 있음 — 카드만 등록하고 결제는 안 됨)

---

## 1. Neon Postgres 가입 (5분)

1. https://console.neon.tech 접속 → GitHub 로그인 추천
2. 새 프로젝트 → 이름 `sallim` → **Region: AWS Asia Pacific (Singapore)** 선택 (한국에서 지연시간 가장 짧음)
3. Postgres 버전: 17 (기본값)
4. 생성 후 **Connection Details** 패널에 두 가지 string이 보임:
   - **Pooled connection** → `DATABASE_URL`
   - **Direct connection** → `DIRECT_DATABASE_URL` (체크박스를 풀거나 "Show direct connection" 클릭)
5. 두 string 모두 복사

> 💡 Pooled는 앱 런타임용 (Prisma client). Direct는 마이그레이션용 (Prisma migrate). 두 개 다 필요합니다.

---

## 2. Twilio Verify 가입 (10분)

Twilio가 한국 시장 SMS 발송 인증사이며, OTP 발송에 가장 안정적입니다.

1. https://www.twilio.com/try-twilio 가입 → 신용카드 등록 (free trial $15 크레딧 제공, 충분)
2. 본인 휴대폰 번호 인증 (한국 번호 OK)
3. Console → **Verify** → **Services** → **Create new** → 이름 `sallim` → 채널 SMS만 선택
4. 생성된 Service의 **SID** 복사 (`VA...` 로 시작) → `TWILIO_VERIFY_SERVICE_SID`
5. 좌측 사이드바 **Account** → **API keys & tokens** → **Account SID** → `TWILIO_ACCOUNT_SID`
6. 같은 페이지의 **Auth Token** 복사 → `TWILIO_AUTH_TOKEN`

> 💡 **Trial 계정**은 인증된 본인 번호로만 SMS 발송됩니다. 다른 번호로 테스트하려면 Twilio 콘솔에서 해당 번호를 verified caller로 추가하거나, $20 충전해서 정식 계정 전환.

> 💰 **비용**: 한국향 SMS 1건당 약 $0.05 (~70원). M2 테스트 5번이면 $0.25. M9 출시 후 사용량은 사용자 수 × 가입 시 1회 + 재인증 시 1회 정도.

---

## 3. .env 채우기

```bash
cd ~/Documents/Claude/Projects/사업개발/build/sallim_app/apps/api
cp .env.example .env
open -e .env
```

다음 5개 값을 채웁니다:

```
DATABASE_URL=<Neon pooled string>
DIRECT_DATABASE_URL=<Neon direct string>
JWT_SECRET=<openssl rand -base64 48 출력값>
TWILIO_ACCOUNT_SID=<Twilio Account SID>
TWILIO_AUTH_TOKEN=<Twilio Auth Token>
TWILIO_VERIFY_SERVICE_SID=<Twilio Verify Service SID, VA...>
```

JWT_SECRET 생성 한 줄:

```bash
openssl rand -base64 48
```

이 출력 64자 정도를 그대로 `JWT_SECRET=`에 붙여넣기.

---

## 4. 모바일 .env 설정

Mac의 LAN IP를 찾고 mobile/.env에 입력:

```bash
ipconfig getifaddr en0      # 출력 예: 192.168.0.10

cd ~/Documents/Claude/Projects/사업개발/build/sallim_app/apps/mobile
cp .env.example .env
open -e .env
```

`.env` 의 `EXPO_PUBLIC_API_URL=` 줄을 본인 IP로:

```
EXPO_PUBLIC_API_URL=http://192.168.0.10:4000
```

> ⚠️ **localhost 안 됨.** 폰의 Expo Go에서 Mac의 localhost를 못 찾습니다. 같은 Wi-Fi의 LAN IP가 필요.

---

## 5. DB 스키마 적용

```bash
cd ~/Documents/Claude/Projects/사업개발/build/sallim_app
pnpm install                              # prisma, twilio, expo-secure-store 등 설치
pnpm --filter @sallim/api db:generate     # Prisma Client 생성
pnpm --filter @sallim/api db:push         # 스키마를 Neon에 적용 (개발용; 프로덕션은 db:migrate)
```

`db:push` 끝나면 https://console.neon.tech 에서 테이블 14개 (`users`, `households`, ..., `vision_extractions`) 생성 확인.

---

## 6. 동작 확인 — API + 모바일

### 터미널 1 — API
```bash
pnpm --filter @sallim/api dev
```

`[sallim-api] listening on http://localhost:4000` 떠야 함.

### 터미널 2 — 모바일
```bash
pnpm --filter @sallim/mobile start --clear
```

폰의 Expo Go로 QR 스캔.

### 첫 가입 흐름

1. 첫 화면 — "**살림 / 휴대폰 번호로 시작**" + 폰 번호 입력 필드
2. 본인 번호 (Twilio에 verified로 등록된 번호) 입력 → "인증번호 받기" 탭
3. 본인 폰에 SMS 도착 (~10초)
4. 6자리 코드 입력 → "확인"
5. **로그인됨** + 가구 ID 표시 화면

### Neon에서 확인

```bash
pnpm --filter @sallim/api db:studio
```

브라우저에서 Prisma Studio 열림. `users` 테이블에 1개 행, `households` 1개, `household_members` 1개 (role=owner) 확인.

---

## 흔한 실패와 해결

| 증상 | 원인 / 해결 |
|---|---|
| 모바일에서 "Network error" | API URL이 localhost인지 확인. Mac LAN IP로 바꿔야 함 |
| `db:push` 실패 — connection refused | DATABASE_URL이 pooled여야 함. DIRECT는 따로 |
| Twilio 401 | Account SID / Auth Token 정확히 복사됐는지. 공백이나 줄바꿈 섞이면 fail |
| Twilio 60200 (invalid phone) | Trial 계정은 verified 번호만. Twilio 콘솔에서 본인 번호 verified 등록 |
| OTP 정상 도착했는데 verify 시 "Invalid OTP" | 복사 시 보이지 않는 공백 포함 가능. 직접 타이핑 |
| `pnpm install` 실패 (sharp 또는 expo) | `node_modules` + `pnpm-lock.yaml` 삭제 후 다시 |

---

## M2 PASS 기준

- [ ] 본인 휴대폰으로 OTP 받고 verify 성공
- [ ] 로그인 후 home 화면에서 본인 번호 + household ID 표시
- [ ] 로그아웃 후 다시 sign-in 화면 진입
- [ ] 다시 로그인하면 같은 user (Prisma Studio에서 user row 1개만)
- [ ] `pnpm test`, `pnpm lint`, `pnpm typecheck` 모두 통과

이 5개 통과하면 M2 PASS. M3 (Korean Product DB seed) 시작 가능.
