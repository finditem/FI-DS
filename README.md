# Design Tokens CI/CD 파이프라인

이 저장소는 **Figma에서 관리하는 디자인 토큰을 코드로 변환**하고, 변환된 결과물을 **FE 리포지토리로 자동 동기화**하는 역할을 합니다.
`Style Dictionary` 기반으로 빌드하며, GitHub Actions가 PR을 자동으로 생성합니다.

> **Flow:** Figma → Style Dictionary → `src/tokens/build/tailwind.config.js` → FE 리포지토리 PR 자동 생성

## 무엇을 해결하나요?

- 디자이너가 Figma(Tokens)에서 수정 → 토큰을 자동 변환
- 변환 결과(`tailwind.config.js`)를 FE 리포지토리에 자동 PR
- FE/디자인 간 토큰 버전 및 적용 시점 일관성 보장

## 저장소 구조

```
│
├─ .github/
│  └─ workflows/
│     └─ sync-tokens-to-fe.yml         # FE/어드민 리포로 PR 자동 생성
│
├─ src/
│  └─ tokens/
│     ├─ build/                        # 빌드 산출물
│     │  ├─ build-tokens.json          # 전체 토큰 빌드 결과
│     │  └─ tailwind.config.js         # FE로 전달되는 최종 결과물
│     │
│     ├─ tokens.json                   # Tokens Studio Export 원본 (유일한 입력)
│     ├─ sd-*.json                     # tokens.json에서 세트별로 분리된 결과 (생성물)
│     ├─ sd-alias.generated.json       # 별칭 토큰 (생성물)
│     │
│     ├─ split-tokens.js               # 1. 토큰 세트 분리
│     ├─ patch-primitives-color-key.js # 2. 루트 "Color" 충돌 차단
│     ├─ gen-alias.js                  # 3. 별칭 생성
│     ├─ sd-tokens-config.js           # 4. Style Dictionary 설정
│     └─ tw-tokens-config.js           # 5. Tailwind 변환 설정
│
├─ package.json
├─ package-lock.json
└─ README.md
```

> `sd-*.json`과 `build/`는 모두 빌드로 생성되며, 손으로 고치면 다음 빌드에서 덮어써집니다.
> 수정할 대상은 `tokens.json`(Figma에서 Export)과 스크립트뿐입니다.

## 기술 스택

- [Style Dictionary](https://github.com/style-dictionary/style-dictionary) v5.0.4
- [@tokens-studio/sd-transforms](https://github.com/tokens-studio/sd-transforms) v2.0.1
- [sd-tailwindcss-transformer](https://github.com/nado1001/style-dictionary-tailwindcss-transformer) v2.1.0

## 변환 파이프라인

`npm run build:tokens` 한 번에 아래 순서로 실행됩니다.

1. **split** — `tokens.json`을 `$metadata.tokenSetOrder` 기준으로 세트별 `sd-*.json`으로 나눕니다.
   - 이전 실행에서 만든 `sd-*.json`은 먼저 지웁니다.
   - `comp` 세트와 `Colors/Dark`, `Colors/IC - *` 세트는 제외합니다.
     같은 키를 가진 모드별 세트라 함께 빌드하면 서로 덮어쓰기 때문이며, 다크 모드를 쓰지 않으므로 `Colors/Light`만 빌드합니다.
2. **patch** — 각 세트 루트의 스칼라 `Color` 토큰을 옮기거나 제거합니다.
   그대로 두면 `color` 팔레트 그룹 전체를 덮어씁니다.
3. **gen-alias** — 참조가 깨지지 않도록 별칭 토큰을 만듭니다.
4. **Style Dictionary** — `build/build-tokens.json` 생성
5. **Tailwind 변환** — `build/tailwind.config.js` 생성. FE로 나가는 최종 산출물입니다.

## CI/CD (GitHub Actions)

GitHub Actions 워크플로: `.github/workflows/sync-tokens-to-fe.yml`

**트리거 조건**:

- `main` 브랜치에 push되고, 다음 경로가 바뀌었을 때
  - `src/tokens/**`
  - `package.json`
- 수동 실행: `workflow_dispatch`

**주요 작업**:

- Node.js 20 환경 설정, `npm ci`
- 토큰 빌드 (`npm run build:tokens`)
- 산출물(`src/tokens/build/tailwind.config.js`) 검증
- 대상 리포 checkout → 산출물 복사 → 변경사항이 있으면 PR 생성

**동기화 대상**: `finditem/FI-FE`, `finditem/admin` (matrix로 병렬 실행)

**PR 정보**:

- 브랜치: `chore/update-design-tokens`
- 기본 브랜치: `develop`
- 라벨: `design-tokens`, `🤖 automated`
- 작성자: `finditem-bot[bot]`

**필요한 설정**:

| 이름 | 종류 | 설명 |
| --- | --- | --- |
| `APP_ID` | variable | `finditem-bot` App ID |
| `APP_PRIVATE_KEY` | secret | 같은 App의 private key |

App에는 대상 리포의 Contents / Pull requests 쓰기 권한이 필요합니다.

## 로컬 검증 (선택)

CI/CD 파이프라인 실행 전에 토큰 변환을 확인하고 싶다면:

```bash
npm run build:tokens
ls -l src/tokens/build/
```

체크리스트:

- 빌드 오류 없음
- `Token collisions detected` 경고 없음
  - 이름이 같은 토큰이 서로 덮어쓰는 경우입니다. Figma 원본에 중복 변수가 있는지 확인이 필요합니다.
- `src/tokens/build/tailwind.config.js` 생성 확인
- FE 프로젝트 빌드 정상 동작 확인
