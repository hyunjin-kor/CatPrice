# COMET → GPT(Codex) 핸드오프: 프롬프트와 작업 구조

작성일 2026-09-06, 기준 커밋 `dd04fa9` (master, PR #103~#110 머지 완료).

이 문서는 저장소 접근 권한이 있는 GPT(Codex 등)에게 COMET을 넘겨 (1) 프로젝트를 이해시키고, (2) 기능을 모듈별로 갱신하고, (3) 논문에 바로 쓸 수 있는 수준까지 검증·최적화하고, (4) 소프트웨어 논문 관례대로 배포와 논문 작성까지 밀어붙이기 위한 프롬프트 묶음이다. 사람(연구자)이 각 단계 사이에서 결정을 내리고 PR을 승인하는 구조다.

---

## 0. 사용 방법

1. **마스터 프롬프트(1절)** 를 첫 메시지로 통째로 붙여 넣는다. 저장소 접근이 없는 GPT라면 `CLAUDE.md`, `AGENTS.md`, `README.md`, `docs/methodology.md`, `docs/roadmap.md`, `docs/paper/manuscript_draft_2026-09-02.md` 본문도 함께 첨부한다.
2. **단계 프롬프트(3절)** 를 Phase 0부터 하나씩 보낸다. 한 단계의 PR이 CI를 통과하고 머지되기 전에는 다음 단계를 시작시키지 않는다.
3. 각 단계 끝에 **보고 형식(6절)** 대로 보고를 받고, **결정 대기 백로그(4절)** 의 항목은 사람이 답한다. GPT가 임의로 정하게 두지 않는다.
4. GPT가 말하는 "사실"은 저장소·테스트·API 응답으로 재확인한다. 검증 안 된 숫자, 링크, 인용은 받아들이지 않는다.

---

## 1. 마스터 프롬프트 (첫 메시지에 그대로 붙여 넣기)

```text
당신은 COMET 저장소의 수석 엔지니어이자 논문 공동저자 역할이다. 아래 규칙과 사실을 먼저 읽고, 지시받은 단계만 수행한다.

## 프로젝트 요약
- COMET (Catalyst Overall Manufacturing Estimation Tool): 촉매 제조 원가를 계산하는 Windows 데스크톱/웹 도구. 저장소 https://github.com/hyunjin-kor/COMET, 기본 브랜치 master. 라이선스 PolyForm Noncommercial 1.0.0 (OSI 승인 라이선스가 아님).
- 방법론: NREL CatCost의 Step Method(Table 6.1 시간당 단가, Small/Medium/Large 규모, 2017 기준 ChemPPI 물가지수 환산)와 간접비·판매 마진 구조를 독립적으로 재구현. CatCost User Guide Table 6.2의 세 검증 사례(Pt/C 센트 단위 일치, Ni/Al2O3 7% 이내, FCC 각주 b 단가 기준 2% 이내)를 재현하는 것이 방법론 변경의 합격 기준이다. CatCost 원본 워크북(CatCost_v1-1-1/)은 독점 자료라 재배포 금지, 공개 출처로 재소싱.
- 가격 기준 두 계층(metal_prices.basis): live(야후 파이낸스·Johnson Matthey·Kitco·Markets Insider·Westmetall + USGS/CatCost 앵커, 실무용)와 reference(IMF PCPS 월평균 Al Cu Ni Zn Sn Co Mo Au Ag, Johnson Matthey 일별→월평균 Pt Pd Rh Ru Ir, W Re V Fe는 앵커, 학술용). 앱과 논문 스크립트 모두 --price-basis / price_basis로 기준을 고른다. 담체(지지체) 11종은 UN Comtrade HS 코드 수입 단가 시계열(backend/data/support_series.json)로 reference 기준에서 덮어쓴다(API 키 COMTRADE_API_KEY, 없으면 라이브러리 가격 유지).
- 기능 모듈: 원가 계산 마법사(열촉매: 조성·담체 자동 잔량·복합 담체, 제조법 카탈로그 28종을 Step Library 단계 조합으로 정의하고 규모별 장비 치환 fit_steps_to_scale과 방법별 가공비 GET /api/templates/costs 제공, 폐촉매 회수 가치; 전기촉매: 촉매 분말·아이오노머·멤브레인·GDL 면적 기준 전극 조립체 모델과 제조 시나리오), 결과 화면(원가 내역, 제조법, cradle-to-gate GWP/CED, 출처 근거), 실시간/월평균 금속 시세와 이력, 문헌 벤치마크 30 반응군·116 후보의 의사결정 엔진(경제성·근거·경로·성능 가중), 추정 범위(몬테카를로), 설비·운영비(Lang 계수, 0.6승 법칙), 자료 라이브러리(재료 출처·단계 단가·템플릿), 한/영 UI, kg/lb 단위, Electron 데스크톱 패키징과 자동 업데이트.
- 스택(고정): React 19 + TypeScript + Vite + Tailwind 4 + Recharts / FastAPI + SQLModel + SQLite + APScheduler + httpx / Electron 41 + PyInstaller 사이드카 / pytest, tsc+vite build, PowerShell 데스크톱 스모크 / GitHub Actions(CI, 태그 릴리스, Zenodo 자동 아카이브). 새 프레임워크·ORM·빌드 도구 도입 금지.
- 현재 상태(2026-09-06): master dd04fa9. 백엔드 테스트 573개 통과, 프론트 lint/build 통과, 데스크톱 스모크 통과. 최신 GitHub 릴리스 v1.3.24 = package 버전 1.3.24이며, PR #104 이후의 기능(월평균 기준, 담체 시계열, 제조법 카탈로그, 용어 정비, 한글 문구, 전체 테스트 결함 수정)은 아직 릴리스되지 않았다. 논문 초안 docs/paper/manuscript_draft_2026-09-02.md와 결과 docs/paper/results_2026-09-02.md는 2026-07 기준월 reference basis로 생성됐고 잠정 배너가 붙어 있다.

## 반드시 먼저 읽을 것 (순서대로)
CLAUDE.md → AGENTS.md → README.md → docs/methodology.md → docs/api-reference.md → docs/roadmap.md → docs/paper/manuscript_draft_2026-09-02.md → docs/paper/results_2026-09-02.md → docs/gpt-handoff.md(이 문서) → backend/tests/conftest.py와 test_api.py(테스트 관례).

## 절대 규칙
1. 지어내지 않는다. 가격, 인용, DOI, URL, 벤치마크 값, 릴리스 상태를 확인 없이 쓰지 않는다. 모르면 "확인 필요"라고 쓴다. DOI는 Crossref로, URL은 실제 응답으로 확인한다.
2. 비밀값을 커밋하지 않는다. .env.example에는 키 이름만.
3. CatCost 원본 데이터를 재배포하지 않고, CatCost 방법론은 학술적으로 인용만 한다(NREL 보증 주장 금지).
4. 계산 엔진·가격 피드·패키징·버전 파일을 건드릴 때는 보수적으로. 계산 결과가 바뀌는 변경은 Table 6.2 재현 스크립트(scripts/reproduce_catcost_table62.py)와 관련 테스트로 반드시 증명한다.
5. 버전은 package.json, frontend/package.json, pyproject.toml, backend/main.py APP_VERSION을 함께 올린다(test_version_sync.py가 검사). 릴리스가 생기면 docs/project-links.md, README.md, docs/release-notes.md도 함께.
6. 모든 변경은 feature 브랜치 → PR → CI 통과 → master에 squash merge. 커밋은 Conventional Commits(영어). --no-verify, 서명 우회, force push 금지. 한 PR은 한 주제.
7. UI 문구는 촉매 연구자 어휘를 쓴다. 공정공학·소프트웨어 은어(campaign, unit operation, stack, landed, proxy, anchor, draft, workspace) 대신 생산 규모/생산 기간, 제조 단계, 전극 조립체, 납품 기준 촉매 단가, 추정/회수 가치, 시세, 입력. 한국어는 외래어 직역을 피한다(루트→제조 경로, 레코드→항목, 벤더→공급사, 커버리지→적용 금속/반영률, 팩터→계수). 모든 새 UI 문자열은 frontend/src/lib/i18n.tsx의 t('English key')를 통해 넣고 한국어 값을 함께 추가한다.
8. 코드는 요청된 범위만 바꾼다. 리팩터링·재포맷·이름 바꾸기를 끼워 넣지 않는다. 주석은 이유가 비자명할 때만.
9. 사용자 결정이 필요한 항목(docs/gpt-handoff.md 4절)은 임의로 정하지 말고 질문으로 남긴다.

## 진실 신호 (성공 판정은 이 명령의 출력으로만)
- 백엔드: python -m pytest backend/tests -q  (기준 573 passed, 약 7.5분; conftest가 시작 시 가격 수집을 막는다)
- 프론트: cd frontend && npm run lint && npm run build
- 데스크톱: npm run build && npm run smoke:desktop  (설치 파일 생성 + 패키지 앱 실행·단일 인스턴스·API 200 확인)
- 방법론: python scripts/reproduce_catcost_table62.py  (Table 6.2 세 사례)
- 논문 파이프라인: scripts/fetch_price_history.py → scripts/build_reference_basis.py → scripts/run_all_families.py / price_volatility_screen.py / active_metal_breakeven.py (--price-basis 공통)
- UI 변경은 브라우저에서 실제 화면을 열어 확인한 뒤에만 "된다"고 말한다. 타입체크 통과만으로 성공을 주장하지 않는다.

## 작업 방식
- 시작 전에 2~4줄로 계획(바꿀 파일, 바뀌는 동작, 성공 확인 방법)을 쓴다.
- 한 번에 한 단계. 단계가 끝나면 docs/gpt-handoff.md 6절의 보고 형식으로 결과를 정리한다.
- 결함을 발견하면 고치기 전에 "재현 → 원인 → 수정안 → 검증 방법"을 적는다.
```

---

## 2. 작업 구조

| 단계 | 목표 | 산출물 | 완료 기준 |
|---|---|---|---|
| 0. 온보딩 | 프로젝트를 정확히 이해했는지 확인 | 프로젝트 브리프 1쪽 + 질문 목록 | 브리프의 사실이 저장소와 일치, 사람이 승인 |
| 1. 감사·기준선 | 현재 품질을 숫자로 고정 | 기능 인벤토리, 결함·공백 목록, 기준선 지표 | 테스트·빌드·스모크 재현, 지표 표 확정 |
| 2. 기능 갱신 | 모듈별 개선을 PR 단위로 | 모듈당 1개 이상 PR | 각 PR CI 통과·머지, 테스트 추가 |
| 3. 논문 수준 검증·최적화 | 재현성·정확도·성능·데이터 출처 | 재현 파이프라인 1명령화, 검증 리포트 | Table 6.2 재현, 결정론적 MC, 출처 100% 검증 |
| 4. 릴리스 | 인용 가능한 배포본 | 버전 범프, 릴리스 노트, 태그, 설치 파일, Zenodo DOI, 문서 사이트 | 릴리스 자산·DOI 확인, 문서 링크 갱신 |
| 5. 논문 | 투고 가능한 원고 | 결과 재생성, 그림·표, 원고, SI, 데이터 가용성 | 잠정 배너 제거, 모든 수치가 산출 파일과 대응 |
| 6. 투고 후 | 리뷰 대응 준비 | 리뷰어 체크리스트, 재현 패키지 | 별도 지시 시 |

단계 2와 3은 모듈마다 번갈아 진행해도 된다(모듈 갱신 → 그 모듈 검증). 단계 4는 3이 끝난 뒤, 단계 5는 4의 DOI가 나온 뒤 시작한다.

---

## 3. 단계별 프롬프트

### Phase 0 — 온보딩 브리프

```text
[Phase 0] 저장소를 읽고 다음을 한국어로 작성하라. 코드는 수정하지 않는다.
1. 프로젝트 브리프 1쪽: 목적, 사용자, 핵심 계산 흐름(입력 → 가격 결정 → Step Method → 간접비·마진 → 결과), 두 가격 기준의 차이, 데이터 출처 목록(파일 경로와 원출처), 검증 사례.
2. 아키텍처 지도: backend/core, backend/routers, backend/services, backend/data, frontend/src/pages, frontend/src/lib, electron/, scripts/, .github/workflows 각각의 역할을 한 줄씩. API 엔드포인트 전체 목록.
3. 최근 변경 요약: git log --oneline -15와 PR #103~#110의 제목·핵심 변경을 표로.
4. 이해가 불확실한 점 질문 목록(최대 10개). 각 질문에 당신의 추정 답과 그 근거 파일을 함께 쓴다.
5. 다음 단계에서 쓸 진실 신호 명령을 실제로 실행해 결과(테스트 수, 빌드 시간, 스모크 결과)를 기록한다.
보고는 docs/gpt-handoff.md 6절 형식.
```

### Phase 1 — 감사와 기준선

```text
[Phase 1] 기능 인벤토리와 기준선을 만든다. 코드 수정은 하지 않고 브랜치 audit/baseline에 문서만 추가한다.
1. 기능 인벤토리: 화면·API·스크립트 단위로 "무엇을 하는가 / 입력 / 출력 / 테스트 유무 / 문서 유무 / 한국어 번역 유무"를 표로. 열촉매·전기촉매 두 경로를 모두 실제 브라우저에서 끝까지 실행해 본 뒤 작성한다.
2. 결함·공백 목록: 재현 절차, 심각도(계산 오류 > 사용 불가 > 표시 오류 > 문구), 관련 파일. 이미 알려진 관찰: reference 기준에서 시세 18종이 전부 "점검 필요"로 표시됨(월평균이 7일 초과라 오래된 시세로 판정), 결과 화면의 숨은 recharts 차트 크기 0 경고, 자료 라이브러리 템플릿 탭 분류 태그와 벤치마크 요약·경고문 같은 데이터 문자열은 영어.
3. 기준선 지표 표: 테스트 수·소요 시간, 프론트 빌드 크기·시간, POST /api/calculate 응답 시간(열촉매·전기촉매 각 20회 중앙값), POST /api/uncertainty 1,000회·10,000회 소요 시간, 벤치마크 30 반응군 평가 시간(run_all_families.py), Table 6.2 세 사례 오차, 데이터 출처 수(DOI·URL 개수와 검증 여부), i18n 키 수와 미번역 문자열 수.
4. docs/audit/2026-XX-XX-baseline.md로 저장하고 PR을 연다.
```

### Phase 2 — 기능 갱신 (모듈별, 각각 별도 PR)

공통 지시를 앞에 붙이고, 모듈 블록을 하나씩 보낸다.

```text
[Phase 2 공통] 아래 모듈 하나만 다룬다. 브랜치 feat/<모듈> 또는 fix/<모듈>. 계획 2~4줄 → 구현 → 테스트 추가 → 진실 신호 실행 → 브라우저 확인(해당 시) → PR. 계산 결과가 바뀌면 Table 6.2 재현 결과와 바뀐 수치의 이유를 PR 본문에 쓴다. 문서(docs/methodology.md, docs/api-reference.md, README)도 같은 PR에서 갱신한다.
```

```text
[2a 가격 계층] 
- reference 기준의 "점검 필요" 판정을 고친다: 월평균 시세는 발표 월 기준으로 신선도를 판정해야 하며(최근 발표 월이면 정상), 7일 규칙은 live 기준에만 적용한다. 테스트로 고정.
- live 계층 출처 재배치(사용자 결정 대기 4절 B): 결정이 나면 Pt/Pd를 Johnson Matthey로, Cu/Al을 Westmetall로 옮기고 야후 폴링 주기를 줄인다. 출처별 실패 시 폴백 순서를 문서화한다.
- IMF PCPS·JM 월평균 수집이 24시간 주기로 실제 갱신되는지 로그로 확인하고, 실패 시 마지막 성공 월을 유지하되 UI에 "발표 월"을 표시한다.
- 담체 시계열: COMTRADE_API_KEY가 있을 때와 없을 때의 동작을 테스트로 고정한다. USGS/BLS PPI 확장은 4절 C 결정 후.
```

```text
[2b 제조법 카탈로그]
- 28개 제조법 각각의 단계 정의·출처(DOI)·규모별 가공비가 docs/methodology.md의 "Preparation methods" 절과 일치하는지 대조하고, 불일치는 고친다.
- uncosted_operations(오토클레이브, 환원로, 원심분리, 체, 코터, 동결건조, CVD/ALD)는 4절 A(Plan B) 결정 전까지 "미산정"으로 표시만 유지한다. 결정이 나면 scripts/derive_loh_step_rates.py와 backend/data/loh2002_step_anchors.json을 확장해 "derived" 신뢰 등급으로 넣고, 방법론 문서에 유도 절차를 쓴다.
- 제조법 카드 선택 → 결과 화면 라벨·template_id 전달이 열촉매에서 유지되는지 테스트를 추가한다(PR #110에서 고친 동작).
```

```text
[2c 벤치마크·의사결정 엔진]
- 30 반응군·116 후보의 인용(DOI·URL)을 Crossref와 실제 응답으로 전수 검증하고, 죽은 링크·잘못된 DOI 목록을 만든다. 수정은 원출처를 다시 찾은 경우에만.
- 벤치마크 담체에 reference_series(Comtrade HS 코드) 연결(4절 E).
- 큐레이션 Mo 항목 점검(4절 D): 앵커 23.13 $/lb와 라이브러리 값의 근거를 대조.
- 가중치 프로파일(균형·비용 우선·근거 우선)이 순위를 어떻게 바꾸는지 테스트로 고정.
```

```text
[2d LCA]
- 탄소·실리카·제올라이트 계수는 인용 가능한 LCI가 있을 때만 추가한다(4절 F). 없으면 "데이터 없음"을 유지하고 반영률에 정직하게 반영.
- 공정 에너지(소성·건조) 경계 문서와 계수 출처(EPA GHG Emission Factors Hub, Perry's)를 재확인한다.
```

```text
[2e 전기촉매]
- 응용 분야(연료전지·수전해·DMFC·일반)와 템플릿(PEM/AEM/DMFC/알칼리 수전해/PEM 수전해)별 기본 재료 규칙을 표로 문서화하고 테스트로 고정한다(PR #110의 순위 규칙).
- 제조 시나리오(연구용 배치, 파일럿 롤투롤)의 cm²당 비용 출처를 확인한다.
- 전극 조립체 결과에 전극 타일만 나오고 열촉매 값이 섞이지 않는지 테스트.
```

```text
[2f 설비·운영비와 추정 범위]
- 몬테카를로에 시드를 받게 하고(요청 필드 seed), 같은 시드에서 같은 분포가 나오는지 테스트.
- 10,000회 실행 시간을 측정하고, 벡터화로 줄일 수 있으면 줄인다(결과 분포가 통계적으로 동일함을 검증).
- CapEx의 Lang 계수 출처(Peters & Timmerhaus 판·표)를 코드와 문서에 명시.
```

```text
[2g UI·문서·한국어]
- 데이터 문자열(벤치마크 요약, 경고문)을 번역할지 정책을 정한다(기본: 데이터는 원문 유지, UI 라벨만 번역). 남은 미번역 UI 라벨을 모두 찾아 i18n에 넣는다.
- docs/getting-started.md의 한국어 판을 만든다(roadmap Phase 4 항목).
- README 스크린샷을 현재 화면으로 갱신한다(scripts/capture_readme_screens.mjs).
```

```text
[2h 데이터 출처 감사]
- backend/data/*.json의 모든 항목에 대해 출처 필드(quote_source, reference_url, DOI)가 있는지, 없는 항목 수와 목록을 만든다.
- 각 데이터 파일의 라이선스·재배포 가능성 표(IMF, JM, USGS, Comtrade, Nuss & Eckelman CC BY 4.0, Fuel Cell Store 공개 가격 등).
- 결과를 docs/sources/ 아래 문서로 저장한다.
```

### Phase 3 — 논문 수준 검증과 최적화

```text
[Phase 3] 목표는 "논문의 모든 숫자를 한 명령으로 다시 만들 수 있고, 그 숫자가 검증됐다"는 상태다.
1. 재현 파이프라인 1명령화: scripts/reproduce_paper.py(또는 Makefile 타깃)가 fetch_price_history → build_reference_basis → run_all_families → price_volatility_screen → active_metal_breakeven → 그림 생성까지 --price-basis 하나와 기준월 하나로 실행한다. 입력 데이터 스냅샷의 SHA-256을 결과 JSON에 기록한다.
2. 방법론 검증: Table 6.2 세 사례를 pytest에 고정하고(이미 있으면 허용 오차를 문서와 일치시킴), 2017→현재 물가지수 환산과 규모 치환(fit_steps_to_scale)의 단위 테스트를 보강한다.
3. 결정론: 몬테카를로 시드, 벤치마크 정렬의 타이브레이크, 가격 조회의 기준월 고정으로 두 번 실행 결과가 바이트 단위로 같게 한다.
4. 성능: /api/calculate 중앙값, MC 10,000회, 30 반응군 평가 시간을 기준선(Phase 1)과 비교해 개선하고 표로 남긴다. 목표는 사용자 체감(계산 1초 이내, MC 10,000회 10초 이내)이며 수치는 측정으로 정한다.
5. 정확도 문서: 오차 예산(가격 변동성, 물가지수, 규모 치환, 회수 가치 가정, LCA 반영률)을 docs/methodology.md에 절로 추가한다.
6. 테스트 커버리지: backend는 pytest --cov로 측정해 핵심 모듈(core/*)이 90% 이상인지 확인, 프론트는 최소한 i18n 키 누락과 API 타입 일치를 검사하는 스크립트를 추가한다.
7. 결과를 docs/audit/2026-XX-XX-validation.md로 정리하고 PR.
```

### Phase 4 — 릴리스

```text
[Phase 4] 릴리스 v1.4.0(사용자가 다른 번호를 원하면 그 번호)을 준비한다.
1. 버전 네 곳 동시 범프, docs/release-notes.md에 #104~#110과 Phase 2·3 변경을 사용자 관점으로 정리(기능·수정·방법론 변경·데이터 갱신·알려진 제한).
2. CITATION.cff, codemeta.json(없으면 추가), README 인용 절, docs/project-links.md의 릴리스·DOI 갱신. Zenodo 자동 아카이브(concept DOI 10.5281/zenodo.21451931)가 새 버전 DOI를 발급하는지 릴리스 후 확인한다.
3. 태그 푸시 → release.yml → 설치 파일 COMET.Setup.<version>.exe, COMET-win-unpacked.zip, latest.yml 확인. 설치 파일을 실제로 설치해 자동 업데이트 경로를 검증한다.
4. MkDocs Material로 docs/를 GitHub Pages에 올린다(roadmap Phase 1 항목). methodology 페이지가 첫 화면에서 한 번에 닿게.
5. 릴리스 체크리스트를 docs/release-checklist.md로 남긴다.
주의: 태그와 릴리스 생성은 사람이 최종 승인한 뒤 실행한다.
```

### Phase 5 — 논문

```text
[Phase 5] docs/paper/manuscript_draft_2026-09-02.md를 투고 원고로 끌어올린다. 5절의 구조를 따른다.
1. 결과 재생성: Phase 3의 파이프라인을 --price-basis reference, 기준월(사용자 지정)로 실행해 docs/paper/*_<날짜>.json과 results_<날짜>.md를 새로 만들고, 원고의 모든 수치를 새 파일과 대응시킨다(수치마다 산출 파일명·키를 주석으로).
2. 잠정 배너 제거. 3.4절(가격 기준에 따라 30 반응군 중 몇 개의 추천이 바뀌는가)과 3.5절(활성 금속 손익분기 가격)을 새 결과로 다시 쓴다.
3. 그림: (a) 아키텍처·데이터 흐름, (b) Table 6.2 재현, (c) 라이브러리 전체 GWP 대 원가, (d) 가중치 민감도, (e) live 대 reference 추천 변화, (f) 손익분기 스윕. 각 그림은 스크립트로 재생성 가능해야 한다.
4. SI: 30 반응군·116 후보 표, 제조법 28종 단계·출처 표, 데이터 출처·라이선스 표, 오차 예산.
5. Data and code availability: GitHub URL, 릴리스 태그, Zenodo 버전 DOI, 재현 명령, 입력 스냅샷 해시.
6. 저널 요건 대조: 투고 저널(사용자 결정 4절 G)의 분량·그림 수·형식을 확인하고 원고를 맞춘다. 라이선스 주의(5절).
7. 원고는 docs/paper/manuscript_<날짜>.md로, 변경 사유는 PR 본문에.
```

### Phase 6 — 투고 후 (지시가 있을 때만)

```text
[Phase 6] 리뷰어 관점 체크리스트(방법론 독립성, 가격 데이터의 재현성, 검증 사례의 충분성, 라이선스, LCA 경계)를 만들고 각 항목에 원고·저장소의 근거 위치를 적는다. 예상 질문 10개와 답을 준비한다.
```

---

## 4. 사람이 결정해야 하는 백로그

| 키 | 항목 | 선택지 | 권장 기본값 |
|---|---|---|---|
| A | Plan B 미산정 공정(오토클레이브·환원로·원심분리·체·코터·동결건조·CVD/ALD) 단가 유도 | Loh 2002 하한 유도 + 보정 후 "derived" 등급 / 미산정 유지 | 논문 1판은 미산정 유지, 릴리스 후 별도 방법론 절로 추가 |
| B | live 계층 출처 재배치 | Pt/Pd→Johnson Matthey, Cu/Al→Westmetall, 야후 폴링 축소 / 현행 유지 | 재배치 (논문에는 영향 없음, 실무 신뢰도 개선) |
| C | 담체 데이터 확장 | USGS 확대 + 재료별 BLS PPI / Comtrade만 | Comtrade 키 확보 후 USGS·PPI는 2판 |
| D | 큐레이션 Mo 항목 | 앵커 23.13 $/lb 유지 / 라이브러리 값 교체 | 근거 대조 후 결정 |
| E | 벤치마크 담체 reference_series 연결 | 연결 / 미연결 | 연결 (reference 기준 일관성) |
| F | 탄소·실리카·제올라이트 LCA 계수 | 인용 가능 LCI 있을 때만 추가 / 보류 | 보류, 반영률로 정직하게 표기 |
| G | 투고 저널 | ACS Sustainable Chem. Eng.(BioSTEAM-LCA형 방법론 논문) / Digital Discovery / Computers & Chemical Engineering / SoftwareX / JOSS | ACS Sustainable Chem. Eng. 1순위. JOSS는 OSI 승인 라이선스를 요구하므로 PolyForm NC로는 불가. SoftwareX도 오픈소스 라이선스 요건을 투고 전 확인 |
| H | 릴리스 번호 | 1.4.0 / 2.0.0 | 1.4.0 (하위 호환 유지) |
| I | 데이터 문자열 번역 정책 | UI 라벨만 / 데이터까지 | UI 라벨만 |

---

## 5. 논문 구조 초안

기존 초안(`docs/paper/manuscript_draft_2026-09-02.md`)의 뼈대를 유지하고 다음을 채운다.

1. **제목 후보**: "COMET: an open desktop tool for catalyst manufacturing cost and cradle-to-gate impact screening with a reproducible price basis" 계열. 'open'은 라이선스 표현과 충돌하지 않게 'freely available'로 바꿀지 저널 요건에 따라 결정.
2. **Abstract**: 문제(촉매 원가 추정이 스프레드시트와 고정 가격에 묶임) → 도구(Step Method 재구현, 두 가격 기준, 30 반응군 벤치마크, LCA 결합) → 검증(Table 6.2 재현) → 결과(가격 기준·가중치가 추천을 바꾸는 사례 수, 손익분기 금속 가격) → 가용성(릴리스·DOI).
3. **Introduction**: CatCost·ESTIMATe·BioSTEAM-LCA·CaTS·OpenPyTEA 등 도구 논문 선례와의 차이(실시간/월평균 두 기준, 데스크톱 배포, 벤치마크 의사결정).
4. **Methods**: 2.1 원가(Step Method, 물가지수, 간접비·마진, 규모 치환), 2.2 가격 기준(live·reference 정의, 출처, 신선도 규칙), 2.3 담체 시계열(Comtrade), 2.4 제조법 카탈로그(28종, 출처), 2.5 회수 가치, 2.6 cradle-to-gate 영향(Nuss & Eckelman 2014, 공정 에너지 경계), 2.7 벤치마크 의사결정 엔진(가중치·근거 등급), 2.8 검증(Table 6.2), 2.9 가격 상태 재생(price-state replay)과 손익분기, 2.10 소프트웨어 구조·배포·재현 파이프라인.
5. **Results and discussion**: 3.1 Table 6.2 재현, 3.2 라이브러리 전반의 GWP 대 원가, 3.3 가중치 민감도, 3.4 가격 기준에 따른 추천 변화, 3.5 활성 금속 손익분기, 3.6 제조법에 따른 가공비 범위(신규, 28종 카탈로그).
6. **Limitations**: 수명·재생 미모델링, LCA 반영률, 미산정 공정, 라이선스, Windows 한정.
7. **Data and code availability**: 저장소, 릴리스 태그, Zenodo DOI, 입력 스냅샷 해시, 재현 명령.
8. **SI**: 반응군·후보 표, 제조법 표, 출처·라이선스 표, 오차 예산, 전체 그림 데이터.

그림·표 목록은 Phase 5 프롬프트 3~4항과 같다.

---

## 6. 보고 형식 (각 단계 끝에 GPT가 제출)

```text
### [Phase N] 보고
- 한 줄 결론: (됐다/안 됐다/일부) + 근거 명령 출력 요약
- 바뀐 것: 파일·동작 목록 (PR 링크)
- 검증: 실행한 진실 신호와 결과 수치 (테스트 수, 빌드, 스모크, Table 6.2 오차, 브라우저 확인 화면)
- 발견한 문제: 재현 절차 · 원인 · 조치 (미조치면 이유)
- 결정 요청: 4절 키와 질문
- 다음 단계에 필요한 것
```

숫자는 명령 출력을 그대로 붙이고, 확인하지 못한 것은 "확인 못 함"이라고 쓴다.
