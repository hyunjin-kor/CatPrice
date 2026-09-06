# Autonomous run — 2026-09-06

## Baseline

- Verified base: master dd04fa9aae9f82dc0ceec45a305db3945d22c65b. Branch autonomous/2026-09-06; Draft PR https://github.com/hyunjin-kor/COMET/pull/112; initial log commit 06b33e3.
- Policy: no questions; no tags, releases, deployments, license changes, secrets, or proprietary workbook redistribution.
- This log is the resumption source. Begin with the first task not marked 완료.
- Baseline: 573 passed in 543.22 s (wall 548.71 s); frontend lint/build passed in 12.58 s; desktop build 189.24 s and smoke passed (total 206.39 s), Version 1.3.24, one window, prices/calculate HTTP 200.
- Table 6.2: Pt/C 27.3695 USD/lb (rounds 27.37); Ni 19.2206 (-6.65%); FCC footnote-b 2.4380 (+1.16%). Nominal FCC 1.6090 (-33.24%) is diagnostic, not the acceptance case.
- Raw command evidence: baseline-pytest.txt, baseline-frontend.txt, baseline-desktop.txt, baseline-table62.txt.
- Latest release rechecked with gh release list -L 1: v1.3.24, published 2026-08-31T18:24:09Z.
- Tailwind sourcemap warning and electron-builder duplicate dependency notices are pre-existing non-failing diagnostics.

## Tasks

| ID | 상태 | 커밋 | 근거 명령 출력 요약 | 메모 |
|---|---|---|---|---|
| T01 | 완료 | 06b33e3, 84d416f | All four baseline signals passed; outputs above | 필수; Draft PR #112 |
| T02 | 완료 | 87a4791 | Browser thermal/electrode HTTP 200; calculate median 4.15 ms, MC10000 2.812 s; 104 raw JSX/2 missing keys; 1,520 structural objects without direct source | 필수; 2026-09-06-baseline.md |
| T03 | 완료 | 9d08443 | 23 targeted passed; full 605 passed; frontend lint/build passed; browser reference review 18 to 0 | Publication month and fixed anchors; live review age 7 days |
| T04 | 완료 | a8e4597 | 7 focused passed; same seed both request shapes equal; two full family JSON outputs byte-identical; full605 passed | Default seed None replaces implicit42; deterministic score/cost/slug order |
| T05 | 완료 | f8ab863 | 17 focused passed; full pipeline completed; fresh14-series input; hashes/environment captured; full605 passed | Final data regenerated under T16; README and methodology command documented |
| T06 | 완료 | ccfedb6 | 80JSON,3046objects;317/317Crossref;467URLs:287ok,179unverified,1notfound; ruff passed | No source price corrected; Mo23.13 retained; exhaustive status evidence |
| T07 | 완료 | 3001c1b | 28 thermal methods x3 scales API parity; native Node9 passed; full605 and frontendlintbuild pass | Explicit card ID; repeated operations retained; catalog 28+custom+5electrode documented |
| T08 | 완료 | f0ed93e | Node defaults and poisoned-thermal ledger assertions pass; real PEM browser HTTP200 and area ledger verified | Application/template default table; area ledger matches headline; thermal campaign/margin hidden |
| T09 | 완료 | afc1615 | 27 focused tests pass; actual public feeds retrieved; Pt/Pd JM and Cu/Al Westmetall verified; Yahoo300s | Source deltas and full selected snapshot recorded; optional paid feeds not invoked |
| T10 | 완료 | 88bab31 | 38/83 support entries linked;20 focused pass;synthetic90 profile cases; frozen paper has noHS observations so values unchanged | 45 ambiguous entries explicitly unlinked; immutable fixed-price fallbacks |
| T11 | 완료 | 74175cb | 18 focused tests; exact seeded MC JSON equality; final MC10k 0.4188 s vs paired 2.4119 s (5.76x); Table 6.2 unchanged | mtime/size cache and row-major batched RNG; final performance evidence supersedes intermediate run |
| T12 | 완료 | 60c0588 | Methodology error-budget table cites exact price bounds, index inputs, 1/10/150 vs 67 t/day, recovery defaults, LCA gaps and uncosted routes | Prose landed with T05 (f8ab863); validated against regenerated summary and SI; no invented aggregate error bar |
| T13 | 완료 | b93c62d | Clean coverage run 625 passed in 347.52 s; backend/core 94%, every module at least89%; 20 provider HTTP contract tests added | pytest-cov temporary environment only; check:i18n and CI wiring land with T14 translations to keep intermediate CI green |
| T14 | 완료 | e209ff1 | check:i18n 781 calls/822 keys,0 missing/0 untranslated; frontend lint/build and Node9 pass; 3 real browser flows200; 11 README screenshots regenerated | Data text unchanged; Korean guide added; reference review0; capture failures and initial422 recorded honestly |
| T15 | 완료 | 300fbf7 | All4 versions1.4.0; final desktop build156.36s and smoke200/one window; total172.41s; latest public release remains1.3.24 | Prepared metadata, notes and checklist only; isolated junction packaging issue recovered with unchanged-lockfile npm ci |
| T16 | 완료 | ea787f0 | Full pipeline2026-07/seed20260906;14series91months; six PNG/SVGfigures; 26outputs+80data+34code hash checks pass; staged raw SHA preserved | Fresh history fetched; actual live12quote snapshot; latest-common July; live-classification edge tests11 included in final636 |
| T17 | 완료 | e7effeb | Manuscript69+SI980 keys resolve;466 numeric checks;4Crossref citations;165-word abstract; estimated6624 word equivalents; six figures inspected | New3.4/3.5/3.6 and4SI tables; ACS guidelines verified; no invented authorship or version DOI |
| T18 | 완료 | 5365889 | Reviewer checklist plus10 evidence-linked questions/answers; no fabricated performance/coverage/reuse claims | Expected objections cover method reproduction, proxies, sources, LCA, licensing and price reproducibility |
| T19 | 완료 | 0844666 | Final636 passed; ruff, frontend/i18n/Node9, desktop1.4.0, Table6.2 and paper hashes pass; final report prepared | Single PR #112; no merge/tag/release/deployment |

## Assumptions and unverified items

- docs/gpt-handoff.md is absent on the requested master commit; other requested entry documents read. Its later addition on origin/master (10b5388) was read during final review. The user's unattended decisions override that document's older multi-PR/approval workflow.
- The user-defined audit log takes precedence over duplicate .autonomy state files; no scheduled automation was created.
- Initial log-only commit used unchanged, user-verified baseline code; local full checks completed before any implementation commit.
- At 11:48:39 KST an external process switched the shared checkout to master and pulled 10b5388. No task agent issued that operation. Preserved every working file and resumed in C:/Users/user/Desktop/COMET-autonomous-2026-09-06 on the original run branch. The original checkout was left intact; all subsequent writes use explicit isolated paths.

## Final verification checkpoint

- `python -m pytest backend/tests -q`: 636 passed in 383.97 s, measured wall 387.33 s (`final-pytest.log`). Baseline: 573 passed.
- `python -m ruff check .`: all checks passed (`final-ruff.log`). Frontend check:i18n, lint, build and nine calculator rule tests passed in 8.25 s (`final-frontend.log`).
- `python scripts/reproduce_catcost_table62.py`: unchanged acceptance results (`final-table62.log`).
- Final version 1.4.0 desktop build and smoke passed after the isolated dependency-link recovery (`t15-release-validation.md`, `final-desktop-retry.log`).
- Paper pipeline: 2026-07, seed 20260906, fresh fetched history; all 26 output, 80 data and 34 code hashes verified. All 26 staged output byte hashes also match (`final-manifest-integrity.json`).
- Independent diff review against dd04fa9 found no changed LICENSE/COPYING files, no proprietary CatCost workbook/raw-extract or DB additions, no backend data deletion, and no high-confidence secret/private-key patterns in added text. This check reports its scope and does not relicense existing data.
- Temporary browser server stopped after captures. Intermediate scratch outputs, including the superseded five-year replay, were preserved under ignored `_local/autonomous-scratch`; no dataset was deleted. Only the final 91-month replay is committed.

## Final report

COMET 1.4.0 릴리스 준비와 재현 가능한 논문 패키지를 완료했습니다. **완료 19 / 보류 0 / 부분 완료 0**. 변경은 `autonomous/2026-09-06`의 PR #112 한 개에 있으며, master 머지·태그·릴리스·외부 배포는 수행하지 않았습니다.

## 작업 결과

| ID | 상태 | 커밋 | 근거 명령 출력 요약 | 메모 |
|---|---|---|---|---|
| T01 | 완료 | 06b33e3, 84d416f | All four baseline signals passed; outputs above | 필수; Draft PR #112 |
| T02 | 완료 | 87a4791 | Browser thermal/electrode HTTP 200; calculate median 4.15 ms, MC10000 2.812 s; 104 raw JSX/2 missing keys; 1,520 structural objects without direct source | 필수; 2026-09-06-baseline.md |
| T03 | 완료 | 9d08443 | 23 targeted passed; full 605 passed; frontend lint/build passed; browser reference review 18 to 0 | Publication month and fixed anchors; live review age 7 days |
| T04 | 완료 | a8e4597 | 7 focused passed; same seed both request shapes equal; two full family JSON outputs byte-identical; full605 passed | Default seed None replaces implicit42; deterministic score/cost/slug order |
| T05 | 완료 | f8ab863 | 17 focused passed; full pipeline completed; fresh14-series input; hashes/environment captured; full605 passed | Final data regenerated under T16; README and methodology command documented |
| T06 | 완료 | ccfedb6 | 80JSON,3046objects;317/317Crossref;467URLs:287ok,179unverified,1notfound; ruff passed | No source price corrected; Mo23.13 retained; exhaustive status evidence |
| T07 | 완료 | 3001c1b | 28 thermal methods x3 scales API parity; native Node9 passed; full605 and frontendlintbuild pass | Explicit card ID; repeated operations retained; catalog 28+custom+5electrode documented |
| T08 | 완료 | f0ed93e | Node defaults and poisoned-thermal ledger assertions pass; real PEM browser HTTP200 and area ledger verified | Application/template default table; area ledger matches headline; thermal campaign/margin hidden |
| T09 | 완료 | afc1615 | 27 focused tests pass; actual public feeds retrieved; Pt/Pd JM and Cu/Al Westmetall verified; Yahoo300s | Source deltas and full selected snapshot recorded; optional paid feeds not invoked |
| T10 | 완료 | 88bab31 | 38/83 support entries linked;20 focused pass;synthetic90 profile cases; frozen paper has noHS observations so values unchanged | 45 ambiguous entries explicitly unlinked; immutable fixed-price fallbacks |
| T11 | 완료 | 74175cb | 18 focused tests; exact seeded MC JSON equality; final MC10k 0.4188 s vs paired 2.4119 s (5.76x); Table 6.2 unchanged | mtime/size cache and row-major batched RNG; final performance evidence supersedes intermediate run |
| T12 | 완료 | 60c0588 | Methodology error-budget table cites exact price bounds, index inputs, 1/10/150 vs 67 t/day, recovery defaults, LCA gaps and uncosted routes | Prose landed with T05 (f8ab863); validated against regenerated summary and SI; no invented aggregate error bar |
| T13 | 완료 | b93c62d | Clean coverage run 625 passed in 347.52 s; backend/core 94%, every module at least89%; 20 provider HTTP contract tests added | pytest-cov temporary environment only; check:i18n and CI wiring land with T14 translations to keep intermediate CI green |
| T14 | 완료 | e209ff1 | check:i18n 781 calls/822 keys,0 missing/0 untranslated; frontend lint/build and Node9 pass; 3 real browser flows200; 11 README screenshots regenerated | Data text unchanged; Korean guide added; reference review0; capture failures and initial422 recorded honestly |
| T15 | 완료 | 300fbf7 | All4 versions1.4.0; final desktop build156.36s and smoke200/one window; total172.41s; latest public release remains1.3.24 | Prepared metadata, notes and checklist only; isolated junction packaging issue recovered with unchanged-lockfile npm ci |
| T16 | 완료 | ea787f0 | Full pipeline2026-07/seed20260906;14series91months; six PNG/SVGfigures; 26outputs+80data+34code hash checks pass; staged raw SHA preserved | Fresh history fetched; actual live12quote snapshot; latest-common July; live-classification edge tests11 included in final636 |
| T17 | 완료 | e7effeb | Manuscript69+SI980 keys resolve;466 numeric checks;4Crossref citations;165-word abstract; estimated6624 word equivalents; six figures inspected | New3.4/3.5/3.6 and4SI tables; ACS guidelines verified; no invented authorship or version DOI |
| T18 | 완료 | 5365889 | Reviewer checklist plus10 evidence-linked questions/answers; no fabricated performance/coverage/reuse claims | Expected objections cover method reproduction, proxies, sources, LCA, licensing and price reproducibility |
| T19 | 완료 | 0844666 | Final636 passed; ruff, frontend/i18n/Node9, desktop1.4.0, Table6.2 and paper hashes pass; final report prepared | Single PR #112; no merge/tag/release/deployment |

## 검증과 계산 결과

- 백엔드: 기준 573개에서 최종 **636 passed**, 383.97초(전체 경과 387.33초). `ruff check .` 통과. 핵심 모듈 커버리지 **94%**, 모든 모듈 80% 이상(커버리지 전체 실행은 625개 테스트; 이후 추가 11개는 논문 live 스냅샷 경계 조건).
- 프론트: lint/build, `check:i18n`, 계산기 규칙 테스트 9개 통과. 정적 UI 검사: 번역 호출 781개, 한국어 키 822개, 누락 키 0개, 미번역 라벨 0개. 데이터 원문과 동적 출처 값은 번역 대상에서 제외했습니다.
- 실제 브라우저: 열촉매, PEM 전극 조립체, 단계가 같은 다른 제조법의 2 short ton 입력까지 HTTP 200과 template_id 일치를 확인했습니다. reference 화면의 점검 필요는 18 → 0. README 화면 11종과 감사 화면을 저장했습니다.
- 데스크톱: **1.4.0 / 창 1개 / 가격·계산 HTTP 200**. 최종 빌드 156.36초, 빌드와 스모크 합계 172.41초. 첫 시도는 격리 작업 폴더의 node_modules 연결 때문에 전이 의존성이 패키징에서 빠져 실패했고, 잠금 파일 그대로 로컬 설치한 뒤 통과했습니다. 실패 로그도 보존했습니다.
- 논문: 최신 공통 완전 발표 월은 **2026-07**. 새로 수집한 14개 월평균 계열, 2019-01~2026-07의 91개월을 사용했습니다. 세 분석은 같은 reference 기준을 사용하며 결정론적 열거입니다. `--seed 20260906`은 실행 환경에 기록하고, API 몬테카를로에는 요청 seed를 사용합니다.
- 원고·SI: 근거 경로 **1,049개** 모두 연결, 직접 비교한 수치 **466개** 일치, 그림 6종 시각 확인. 원고 3.4·3.5 재작성, 3.6 제조법별 가공비 범위 추가, SI 표 4종과 리뷰어 질문·답 10개를 작성했습니다.

| Table 6.2 사례 | COMET, USD/lb | 출판값, USD/lb | 오차 |
|---|---:|---:|---:|
| 2 wt% Pt/C | 27.3695 → 27.37 | 27.37 | 센트 일치 (미반올림 −0.0018%) |
| 21 wt% Ni/Al₂O₃ | 19.2206 | 20.59 | −6.65% |
| FCC, 각주 b의 67 short tons/day | 2.4380 | 2.41 | +1.16% |

원가 공식·규모별 단가·마진 상관식은 바꾸지 않았습니다. Ni 차이는 출판 표 각주와 상관식의 마진 기준 차이이고, FCC 검증은 각주 b의 유효 생산율을 적용합니다. 명목 150 short tons/day의 FCC 1.6090 USD/lb는 별도 진단값입니다.

결과가 달라지는 조건은 다음과 같습니다.

- live 입력은 결정 B에 따라 JM/Westmetall을 우선합니다. 같은 수집 응답으로 비교한 Pt 1,826 → 1,820 USD/troy oz, Pd 1,403.9 → 1,418 USD/troy oz, Cu 6.6825 → 6.5131 USD/lb, Al 1.5754 → 1.4982 USD/lb입니다. 가격 변화와 출처 근거 점수 변화가 추천에 함께 반영됩니다. 전체 폴백 표와 수집 근거는 methodology 및 T09 로그에 있습니다.
- 담체 83개 항목 중 명확한 38개에 Comtrade reference_series를 연결했습니다. 해당 월·단위의 관측값이 있을 때만 reference 기준을 덮어씁니다. 이번 동결 입력에는 HS 관측값이 없어 이 연결 자체로 논문 수치는 바뀌지 않았습니다. 45개는 미연결이며 Mo 앵커 23.13 USD/lb는 유지했습니다.
- seed를 생략한 API는 이제 비결정적입니다. 고정 seed의 최적화 전후 MC 결과 JSON은 1,000회와 10,000회 모두 완전히 같습니다. 전극 결과의 내역·차트는 기존 면적 기준 총액과 맞도록 표시를 고쳤습니다.
- 기존 2026-09-02 결과 문서는 로컬 live 및 서로 다른 시점의 스냅샷을 사용했다고 명시합니다. 이번에는 하나의 월평균 기준으로 통일했습니다. 가중치 격자의 균형 추천 유지율 중앙값은 기존 문서 58.0%에서 새 결과 55.42%, 50% 미만 반응군은 8개에서 12개입니다. 이는 서로 다른 입력 기준의 결과이며 엔진 회귀로 해석하지 않습니다.
- 새 고정 입력의 live/reference 추천 차이는 균형/비용 우선/근거 우선/성능 가중치 0에서 5/4/11/5개 반응군입니다. 이 비교는 순수 가격 효과와 출처 근거 효과를 분리한 실험이 아닙니다.

## 성능 전후

| 측정 | T02 기준선 | 최종 | T11 직전 통제 측정 → 최종 |
|---|---:|---:|---:|
| calculate 20회 중앙값 | 4.151 ms | 3.078 ms | 3.823 → 3.078 ms |
| MC 1,000회 | 0.301 s | 0.063 s | 0.258 → 0.063 s |
| MC 10,000회 | 2.812 s | 0.419 s | 2.412 → 0.419 s, **5.76배** |
| 30개 반응군 스크립트 | 1.697 s | 1.172 s | 1.396 → 1.172 s |

같은 장비의 오프라인 TestClient 및 고정 입력으로 측정했습니다. 실제 네트워크 왕복 지연이나 다른 장비의 성능 보장이 아닙니다. 캐시 무효화와 RNG 순서·입력 불변성 테스트를 함께 통과했습니다. 상세 수치와 명령은 `docs/audit/t11-performance-notes.md`에 있습니다.

## 논문 재현과 저널 기준

```bash
python scripts/reproduce_paper.py --price-basis reference --month 2026-07 --seed 20260906 --history docs/paper/price_history_2026-09-06.json --live-basis docs/paper/live_basis_2026-09-06.json
```

`--history`를 생략하면 이력 수집부터 실행합니다. 원본 이력 SHA-256은 `84888f60f59d4a21a47945f1f98576c1824bc20babbde678c7419cf3806d4c69`입니다. 26개 산출물, 80개 데이터, 34개 코드의 실행 당시 바이트 해시를 확인했습니다. 원본 스냅샷과 산출물은 Git의 줄바꿈 변환도 막아 해시를 보존합니다. 코드·기존 데이터 해시는 실행 OS의 실제 바이트를 기록하므로 다른 OS에서는 줄바꿈 차이도 설명해야 합니다.

[ACS Sustainable Chemistry & Engineering 안내](https://researcher-resources.acs.org/publish/author_guidelines?coden=ascecg)의 실제 HTTP 200 응답을 확인했습니다. Article 한도 7,000 word equivalents, 초록 150–200단어, 키워드 5–8개이며 고정 그림 수 제한은 찾지 못했습니다. 현재 초록 165단어·키워드 6개, 본문과 그림·표의 예상 합계 6,624 word equivalents입니다. 최종 배치의 크기별 산정, 저자 정보와 TOC 그림은 사람이 확인해야 합니다. 검증된 참고문헌에서 Baddour 2018의 학술지는 JACS가 아닌 Organic Process Research & Development입니다.

## 사람이 해야 할 남은 일

1. PR #112와 CI를 검토하고 승인된 변경을 master에 머지합니다. 이번 실행은 머지하지 않았습니다.
2. 승인된 커밋에서 **태그 v1.4.0을 만들고 푸시**합니다.
3. GitHub 릴리스 설치 파일·업데이트 메타데이터와 이전 버전에서의 업데이트를 확인합니다. 현재 확인된 공개 릴리스는 여전히 v1.3.24입니다.
4. 새 Zenodo 버전 DOI 및 concept DOI `10.5281/zenodo.21451931`과의 연결을 확인합니다. 기존 concept 등록은 확인했지만 새 릴리스 DOI는 만들지 않았습니다.
5. 저자·소속·연구비·TOC 그림·최종 분량을 확정하고 투고 저널 안내를 최종 확인합니다. 검토용 절 번호는 ACS 제출본에서 제거합니다.
6. 작업 보류 항목은 없습니다. 미산정 공정, 담체 미연결, LCA 미반영 자료, 접근 불가 출처와 재사용 조건의 후속 조사 여부를 결정합니다.

## 가정한 것

- 다른 프로세스가 공유 체크아웃을 master로 전환했을 때 그 변경은 건드리지 않고, 같은 작업 브랜치의 격리 worktree에서 계속했습니다. 원래 체크아웃과 중간 데이터는 보존했습니다.
- 최신 공통 월과 달리 미래 날짜의 일부 관측치를 완전한 발표 월로 취급하지 않았습니다. 이력 수집은 성공하여 과거 파일 폴백은 쓰지 않았습니다.
- Comtrade 관측값이 없거나 HS/단위가 모호하면 고정 라이브러리 가격을 유지합니다. AEM 기본 재료의 추가 화학 규칙이나 단위가 다른 견적의 순위 보정은 새로 만들지 않았습니다.
- DOI 등록 확인과 URL 접근 확인을 원문 과학적 타당성이나 재배포 허가의 검증으로 확대하지 않았습니다. LCA 반영률이 낮은 후보를 완전한 환경 비교로 취급하지 않았습니다.
- 표·그림 수에 고정 제한이 없는 저널 안내에서는 분량과 가독성을 기준으로 요청된 그림 6종을 유지했습니다. 저자 정보를 지어내지 않았습니다.

## 확인 못 한 것과 실패 이력

- 전수 감사의 DOI **317/317**은 Crossref에서 확인했습니다. URL **467개** 중 287개 HTTP 200, 146개 403, 4개 429, 29개 네트워크 실패, 1개 404였습니다. 접근 제한/네트워크 실패 **179개**는 확인 못 함으로 남겼고, 이를 죽은 링크로 단정하지 않았습니다. 404는 CoinMarketCap 관련 기존 URL이며 데이터는 바꾸지 않았습니다.
- 일부 출판사 원문 접근, 각 공급원의 모든 재사용 조건, Mo 화합물 견적의 단위 해석, 연결하지 않은 45개 담체의 확정 HS는 확인 못 했습니다. 선택적 유료 API는 키 없이 호출하지 않았고, 실제 Comtrade 갱신은 확인 못 했습니다.
- 첫 브라우저 감사 시도에 HTTP 422가 한 번 있었으나 응답 본문을 확보하지 못해 원인은 확인 못 했습니다. 이후 완주 검사는 반복 통과했고, 감사 스크립트는 초기 네트워크 대기와 실패 응답 기록을 보강했습니다. 이를 앱 결함 수정으로 주장하지 않습니다.
- README 캡처 도구의 화면 밖 좌표 선택은 두 번 실패한 뒤 실제 DOM 좌표에 맞게 수정하여 11종 모두 통과했습니다. 데스크톱 패키징의 연결 경로 문제도 한 번 실패한 뒤 복구했습니다. 세 번 연속 실패하여 작업을 보류한 경우는 없습니다.
- 최종 출시·자동 업데이트·새 Zenodo 보관·투고 승인 상태는 이번 실행에서 만들거나 확인할 대상이 아닙니다. 사람이 실행할 체크리스트로 남겼습니다.

핵심 검토 파일: `docs/audit/autonomous-run-2026-09-06.md`, `docs/paper/manuscript_2026-09-06.md`, `docs/paper/si_2026-09-06.md`, `docs/paper/reproduction_manifest_2026-09-06.json`, `docs/release-checklist.md`. GitHub CI의 최종 상태와 링크는 이 PR의 Checks에서 확인할 수 있습니다.

## Subsequent user decision — free data only

After the run, the user prohibited paid data acquisition and requested that supplementation rely as far as possible on free papers and other free sources. The data budget is zero: no dataset or paper purchases, paid subscriptions, or billable API calls. The policy is recorded in `docs/roadmap.md`; verified free literature, supplementary data, repositories, public statistics and supplier information are prioritized. Missing free evidence remains an explicit gap. This documentation-only decision does not alter the completed run's calculations, data snapshots, source licenses or validation results.

## Subsequent goal update — verified free data

# 무료 자료 업데이트 최종 보고 — 2026-09-06

무료 자료만으로 담체 관측값과 출처를 보완하고 두 화면 오류를 수정했습니다. **추가 goal 작업 완료 6 / 부분 완료 1 / 보류 0**. 부분 완료는 Comtrade 호출 제한으로 담체 11종 중 1종의 관측값만 확보한 항목입니다. 기존 T01–T19는 19개 완료 상태를 유지합니다. 전체 합계는 **완료 25 / 부분 완료 1 / 보류 0**입니다.

유료 구매·구독·과금 API·키 발급은 없었습니다. 코드 커밋은 `a300071`, 브랜치는 `autonomous/2026-09-06`, PR은 [#112](https://github.com/hyunjin-kor/COMET/pull/112) 한 개입니다. 1.4.0은 릴리스 준비 상태이며 머지·태그·릴리스·Zenodo 등록·배포는 하지 않았습니다.

## 추가 작업 결과

| ID | 상태 | 커밋 | 근거 명령 출력 요약 |
|---|---|---|---|
| D01 | 완료 | `601ce9b` | goal 생성, 무료 자료 정책과 로컬 재개 상태 저장 |
| D02 | 완료 | `a300071` | 무료 Comtrade 응답/이용 조건, LCA 8개 출처, 두 반응군 8개 후보 대조; 실제 422 재현 |
| D03 | 부분 완료 | `a300071` | 엄격한 수집·검증·오프라인 적용·논문 연결 완료. 알루미나 3개월 확보, 다음 요청 HTTP429에서 중단. 다른 10종 미확보 |
| D04 | 완료 | `a300071` | 문헌 수정 B01–B11, 관련 18 tests 통과; 동일 가격의 전체 분석 JSON 바이트 일치. GWP/CED 4쌍은 조건을 붙여 근거 목록에 수록 |
| D05 | 완료 | `a300071` | 규모별 단계 로딩 전 계산 차단; 월평균 출처·관측 월·원자료 링크 구분. 브라우저 5개 시나리오, 한/영 화면 및 계산값 불변 검증 |
| D06 | 완료 | `a300071` | 6월 기준 별도 논문 분석·그림 6종. 실제 재현 명령 재실행 후 주요 JSON 3종 바이트 일치. 37개 코드·81개 데이터·27개 산출물 해시 확인 |
| D07 | 완료 | `a300071` + 최종 보고 커밋 | 전체 679 passed; ruff·프론트·Node·Windows 빌드/스모크 통과. [코드 CI34018926982](https://github.com/hyunjin-kor/COMET/actions/runs/34018926982) backend/frontend 모두 성공 |

## 계산 결과와 이유

무료 API에서 받은 HS281820 알루미나 수입 단가는 4월 **0.5782**, 5월 **0.6728**, 6월 **0.5558 USD/kg**입니다. 7월은 HTTP200/count0으로 관측값이 없었습니다. 모든 등급과 교역 상대를 합친 수입 단가이며, 촉매용 감마 알루미나 견적으로 간주하지 않습니다. 앱의 reference 기준에서만 해당 관측값을 사용하고 live는 기존 라이브러리 경로를 유지합니다.

동일한 6월 금속 가격·조성·점수 가중치·계산식으로 담체 관측값 유무만 비교했습니다. **116개 중 23개 후보(15개 반응군)**의 단가가 **0.0011–8.6778%** 낮아졌습니다. 출처와 재료비 비중이 바뀌면 가격 근거 점수도 바뀌므로, 종합 추천 변화 전체를 순수 가격 효과라고 부르지 않습니다.

| 반응군 / 가중치 | 이전 추천 | 담체 반영 후 |
|---|---|---|
| 암모니아 분해 / 성능 가중치 0 | Co-MgO-La2O3 | Ni/알루미나 |
| CO2 메탄화 / 균형 | Ni/세리아 | Ni/알루미나 |

나머지 해당 프로파일의 최상위 추천은 같습니다. 전체 후보별 전후 단가와 입력 가격은 `docs/audit/free-data-impact-2026-09-06.json`에 있습니다. 재현 명령:

```bash
python scripts/audit_free_support_impact.py --history docs/paper/price_history_2026-09-06.json --support-history docs/paper/free-data-2026-09-06/support_history_2026-09-06.json --out docs/audit/free-data-impact-2026-09-06.json
```

문헌 B01–B11 수정은 DOI·반응 귀속·직접 인용 연결·조건·가정 설명만 바꿨습니다. 같은 가격으로 실행한 30개 반응군·116개 후보의 원가·점수·순위 JSON은 바이트까지 같습니다. 잘못 연결한 정정 DOI와 ORR/CO 생성 논문을 바로잡고, 무료 원문과 SI가 있는 NiMo 논문을 직접 근거로 연결했습니다. 조성·성능 점수·공정 단가는 임의로 바꾸지 않았습니다.

| Table 6.2 | COMET, USD/lb | 출판값, USD/lb | 결과 |
|---|---:|---:|---|
| Pt/C | 27.3695 → 27.37 | 27.37 | 센트 일치 |
| Ni/Al2O3 | 19.2206 | 20.59 | −6.65%, 7% 이내 |
| FCC, 각주 b의 67 short tons/day | 2.4380 | 2.41 | +1.16%, 2% 이내 |

계산식과 미산정 공정 단가는 유지했습니다. FCC 명목 생산율 150 short tons/day의 1.6090 USD/lb는 합격값이 아닌 별도 진단값입니다.

## LCA와 논문 재현

무료 1차 출처 8개, Crossref DOI 7개, 원문 6개를 확인해 활성탄·13X의 GWP/CED 4쌍을 확보했습니다. 기존 일반 Carbon/Activated carbon/Zeolite 항목의 원료·등급·제조 경로와 일치한다는 증거가 없어 자동 연결하지 않았습니다. LCA 값과 반영률은 불변이며, 임의 CED·탄소 중립·범용 담체 계수를 넣지 않았습니다.

별도 결과는 `docs/paper/free-data-2026-09-06/`에 있습니다. 금속과 확보된 담체의 최신 공통 월은 **2026-06**, seed는 **20260906**입니다. 90개 역사 월, 30개 반응군, 116개 후보, 그림 6종을 재생성했습니다. 짧은 담체 이력은 장기 변동성 분석에서 기준값으로 유지하고 그 사실을 출력에 표시합니다. 기존 7월 원고·SI·수치·스냅샷은 그대로 보존했습니다.

```bash
python scripts/reproduce_paper.py --price-basis reference --seed 20260906 --history docs/paper/price_history_2026-09-06.json --live-basis docs/paper/live_basis_2026-09-06.json --support-history docs/paper/free-data-2026-09-06/support_history_2026-09-06.json --out-dir docs/paper/free-data-2026-09-06
```

- 금속 원본 SHA-256: `84888f60f59d4a21a47945f1f98576c1824bc20babbde678c7419cf3806d4c69`.
- 담체 원본 SHA-256: `4d0dccdf351ea3ecbebca9233da5cd6a97d5a790ecab313749fcd9b6c8af5896`.

원본과 생성 산출물의 바이트를 보존합니다. 코드·기존 데이터 해시는 실행 OS의 실제 바이트이므로 다른 OS의 줄바꿈 차이는 별도로 해석해야 합니다. 생성된 SVG의 경로 공백은 Matplotlib 출력 그대로이며, 원본 해시를 맞추려고 임의 재포맷하지 않았습니다.

## 검증과 성능 기록

| 확인 | 최초 실행 완료 시점 | 무료 자료 업데이트 |
|---|---|---|
| 전체 백엔드 | 636 passed, 383.97s | 679 passed, 386.99s |
| 새 자료 검증 모듈 | 없음 | 93% coverage, 33 focused tests |
| 프론트 | lint/build·번역 검사 통과 | lint/build·Node10 통과; 787 번역 호출, 829 한국어 키, 누락 0 |
| Windows | 1.4.0 빌드/스모크 통과 | 커밋 a300071 재빌드/스모크 192.77s, 한 창·API200 |
| 실제 브라우저 | 열촉매/전극 흐름 확인 | 로딩 5개 시나리오, reference/live, 출처 한/영 확인 |

추가 속도 개선을 주장하지 않습니다. 기존 T11의 calculate 3.078ms, MC10,000회 0.419s, 전체 반응군 1.172s는 해당 고정 입력의 기존 측정값이며 이번 goal의 새 성능값으로 재표기하지 않습니다. 전체 테스트 시간은 테스트 개수와 동시 작업도 달라 직접적인 속도 비교가 아닙니다.

상세 근거는 `docs/audit/free-data-checks-2026-09-06.json`, `free-data-replay-check-2026-09-06.json`, `free-data-stability-2026-09-06.md`, `free-data-support-ui-2026-09-06.md`와 스크린샷에 있습니다. 기본 Python에는 pytest-cov가 없어 기존 임시 coverage venv를 재사용했습니다. 의존성 추가나 git hook 우회는 없었습니다.

## 사람이 해야 할 남은 일

1. PR과 CI를 검토한 뒤 승인된 변경을 master에 머지하고 태그 `v1.4.0`을 만들고 푸시합니다.
2. 실제 릴리스·설치 파일·이전 버전에서의 자동 업데이트를 확인합니다.
3. Zenodo 버전 DOI와 concept DOI `10.5281/zenodo.21451931` 연결을 확인합니다.
4. 저자·소속·연구비·TOC·분량과 ACS Sustainable Chemistry & Engineering의 투고 안내를 최종 확인합니다.
5. 무료 호출이 다시 허용되면 남은 담체 자료를 추가 수집할 수 있습니다. 유료 자료로 전환하지 않습니다. LCA 자동 연결은 후보 재료의 등급·원료·공정 증거가 확보된 경우에만 판단합니다.

## 보수적으로 유지한 가정과 확인 못 한 것

- 무료 접근과 재배포 허가, DOI 등록과 과학적 타당성을 구분했습니다. 원문/PDF/SI나 제한된 LCA 배경 인벤토리는 커밋하지 않았습니다. 코드 라이선스는 변경하지 않았습니다.
- 무료 공개 API의 다음 요청이 429가 된 뒤 재시도하거나 유료 endpoint로 우회하지 않았습니다. 다른 10종의 새 관측값은 확인 못 했습니다. 7월 미발표는 조회한 알루미나에 한정합니다.
- 탄소흑·실리카의 정확한 GWP/CED 쌍과 일부 원문/SI 접근·재사용 조건, 후보의 정확한 담체 등급은 확인 못 했습니다. 4개의 조건부 LCA 근거를 일반 담체로 확대하지 않았습니다.
- NiMo 몰비를 질량비로 복사하지 않았고, ALD 단가·Ru 30wt%·C2N 제조 원가를 추정해 채우지 않았습니다. Ru 문헌의 초록/SI 산성 과전압 차이는 미해결로 표시했습니다.
- 최초 T02의 응답 미확보 422가 이번에 재현한 로딩 경쟁과 같은 원인인지는 확인 못 했습니다. 새 회귀는 실패 요청/응답을 보존하고 고쳤습니다.
- source audit는 두 반응군에 대한 심화 대조이며 나머지 28개 반응군의 모든 원문 수치가 새로 검증됐다는 뜻이 아닙니다.

기존 T01–T19 표와 초기 성능·출처·릴리스 준비 기록은 `docs/audit/autonomous-run-2026-09-06.md`의 앞부분에 유지합니다. 이후 보고 커밋은 문서·검증 기록만 바꾸며, 최종 PR Checks 결과도 확인합니다.

## Resumption on 2026-09-07 — free support observations

# 무료 자료 수집 재개 최종 보고 — 2026-09-07

무료 담체 시계열을 **1종에서 9종으로 확대**하고 검증을 마쳤습니다. D03의 자료 수집은 **9종 반영·2종 품질 조건 미충족으로 부분 완료**이며, 기존 완료 작업을 반복하거나 누락 자료를 추정하지 않았습니다. 기존 전체 집계는 완료25 / 부분 완료1 / 보류0을 유지합니다.

사용자는 사용량 초기화 후 재개를 요청했습니다. 확인 결과 이전 실행은 `8f4ae4d`까지 커밋되고 최종 CI가 통과한 상태였으며, 실제 남은 항목은 담체 수집이었습니다. 같은 `autonomous/2026-09-06` 브랜치와 [PR112](https://github.com/hyunjin-kor/COMET/pull/112)에서 이어갔습니다. 이 보고·데이터·검증 파일이 함께 반영되는 재개 커밋의 최종 해시와 GitHub CI 결과는 PR 본문과 Checks에 기록합니다. 이 파일의 검증표는 실제 완료된 로컬 검사입니다.

## 재개 작업 표

| ID | 상태 | 커밋 | 근거 명령 출력 요약 |
|---|---|---|---|
| D03 | 부분 완료 | PR112 재개 커밋, 기준 `8f4ae4d` | 공개 무키 API11회 모두 HTTP200; 검증9종 통과·2종 거부. 새8종을 추가해 총9시계열·11관측값. 기존3관측값·원문 응답 보존 |
| D06 | 완료, 재검증 | 동일 재개 커밋 | 6월·seed20260906의 별도 논문 결과와 그림6종. 안정적 JSON7종 바이트 일치; 시간 필드가 있는3종은 `generated_at`만 제외한 값 일치. README 명령의 주요JSON3종도 일치 |
| D07 | 완료, 로컬 검증 | 동일 재개 커밋 | 679 passed; ruff·번역·lint/build·Node10 통과. 실제Chrome4경로 HTTP200·화면6장. Windows 빌드208.000s·스모크17.993s 통과 |

새 앱 기능이나 계산식을 추가하지 않았습니다. 오프라인 시작 테스트를 모든 배포 시계열에 적용하도록 보강해, 각 월평균의 저장·재시작 중복 방지·live 미적용을 확인했습니다. 기본 가격 자료와 실제 시계열의 연결, LCA 계수, 제조 단계 단가는 유지했습니다.

## 수집 결과와 근거

2026-09-07은 한국 날짜이며 원본의 수집 시각은 September6 UTC입니다. 기존 스크립트를 그대로 실행했습니다.

```bash
python scripts/fetch_support_history.py --start 2026-06 --end 2026-06 --out support-history-resume-2026-09-07.json
```

추가된 6월 관측값은 TiO2 3.3905, SiO2 2.1895, 활성탄3.7154, 합성 제올라이트·알루미노실리케이트4.5579, MgO0.6434, 세륨 화합물17.6330, MnO2 2.7147, 크롬 산화물·수산화물4.5274 USD/kg입니다. 알루미나0.5558 USD/kg는 재조회 값이 같았습니다. 모두 미국의 세계 수입액/순중량이며 촉매용 등급 견적이 아닙니다. 세륨 화합물은 여러 화학종의 합계이므로 기존 CeO2 가격에 연결하지 않았습니다.

인조 코런덤 HS281810은 `isNetWgtEstimated=true`, 탄소흑 HS280300은 `netWgt=null`이라 미반영했습니다. HTTP 실패가 아닌 데이터 검증 거부이며, 응답의 원래 상태 `unverified`와 이유를 보존했습니다. 수집기는 이 두 건 때문에 exit1을 반환했습니다. 오류를 없애기 위해 검증 조건을 완화하거나 추정 중량·0가격으로 바꾸지 않았습니다. 이번 수집에는429가 없었으며, 재시도·유료 우회·키 발급을 하지 않았습니다.

모든 URL·응답·품질 플래그와 이용 조건 확인은 [출처 근거](../sources/free-comtrade-evidence-2026-09-07.md), [원본11응답](../sources/comtrade-preview-2026-09-07.json)에 있습니다. UN Comtrade 원자료 권리와 코드의 PolyForm Noncommercial1.0.0 라이선스는 유지합니다.

## 계산 변화와 Table6.2

비교 기준은 이전 알루미나1시계열을 포함한 6월 결과입니다. 금속 가격·37개 계산/분석 코드 입력·다른80개 데이터 입력·조성·제조법·가중치를 고정하고 새 담체 관측값만 추가했습니다. [영향 JSON](free-data-resume-impact-2026-09-07.json)의 `effect_summary`, `cost_changes`, `winner_changes`, `invariants`에 후보별 전후 값이 있습니다.

| 비교 | 결과 |
|---|---|
| 단가 변경 | 116후보 중15개, 30반응군 중11개 |
| 변경 범위 | 9개 감소·6개 증가, −3.8091%~+4.6066% |
| 종합 순서 변경 | 이름 있는90개 + 성능 가중치0의30개 순위 중2개 |
| 1위 변경 | 올레핀 복분해 / 균형: `mo-silica-alumina` → `wo3-silica-oct` |
| 순수 단가순 정렬 변경 | 반응군0개 |
| 불변 | live 분석 수치, 모든 LCA 값·반영률, 제조 단계·가공비·Table6.2 |

종합 추천은 단가와 재료비 비중에 따른 가격 근거 점수의 영향을 함께 받습니다. 순위 변화가 촉매 성능 개선을 뜻하지 않습니다. live 분석의 입력 파일명은 새 날짜로 바뀌지만 그 외 분석 내용은 같습니다.

| Table6.2 | COMET USD/lb | 출판값 USD/lb | 결과 |
|---|---:|---:|---|
| Pt/C | 27.3695 → 27.37 | 27.37 | 센트 일치 |
| Ni/Al2O3 | 19.2206 | 20.59 | −6.65%, 7% 이내 |
| FCC 각주b, 67 short tons/day | 2.4380 | 2.41 | +1.16%, 2% 이내 |

FCC 명목 생산율150 short tons/day의1.6090 USD/lb는 별도 진단값이며 합격값으로 쓰지 않습니다.

## 재현·화면·검증

새 결과는 `docs/paper/free-data-2026-09-07/`에 분리했습니다. 30반응군·116후보·2019-01부터2026-06까지90개월을 분석하고 그림6종을 재생성했습니다. 기존7월 원고와9월6일의 알루미나 단독 보완 결과는 보존했습니다. 이전 감사 문서의 명령도 당시의 동결 담체 입력을 가리키도록 정정했습니다.

README의 다음 명령을 실제로 실행했으며 주요JSON3종이 새 동결본과 바이트까지 같았습니다. 별도 출력 폴더를 사용합니다.

```bash
python scripts/reproduce_paper.py --price-basis reference --seed 20260906 --date 2026-09-07 --history docs/paper/price_history_2026-09-06.json --live-basis docs/paper/live_basis_2026-09-06.json --support-history docs/paper/free-data-2026-09-07/support_history_2026-09-07.json --out-dir _local/free-data-replay-2026-09-07
```

Manifest의37코드·81데이터·27산출물 해시를 확인했습니다. 이 해시는 실행 OS의 실제 파일 바이트이며 코드·기존 데이터의 줄바꿈 차이를 다른 OS에서는 별도로 해석해야 합니다. `generated_at`을 포함하는 기준/변동성/손익분기 JSON 전체가 실행 간 바이트까지 같다고 주장하지 않습니다. 그 세 파일은 해당 실행 시각만 제외하고 비교했습니다.

- 원본 금속 SHA-256: `84888f60f59d4a21a47945f1f98576c1824bc20babbde678c7419cf3806d4c69`.
- 재개 HTTP응답 SHA-256: `fb14f7fe7203dbe34e32cf544f46d2f500195ed58c363716755eeb9d69149cfc`.
- 병합 담체 SHA-256: `e6ce5251b911026a80d94c516ac919150f711417fdc660ba0d5fb2f58020dfe3`.

| 검사 | 이전 무료 자료 업데이트 | 이번 재개 |
|---|---|---|
| 전체 backend | 679 passed, 386.99s | 679 passed, 455.93s |
| Windows 빌드+스모크 | 192.77s | 225.99s, 버전1.4.0·창1개·가격/계산200 |
| 프론트 | lint/build·번역·Node10 통과 | 동일 검사 통과; 누락 번역0 |
| 실제Chrome | 알루미나 및 로딩 검사 | TiO2·활성탄×reference/live4경로200, 오류0 |

실행 부하와 입력 자료가 달라졌으므로 이 시간표를 성능 개선/악화의 통제 실험으로 해석하지 않습니다. 새 최적화는 하지 않았습니다. 상세 명령 출력은 [검증 JSON](free-data-resume-checks-2026-09-07.json), UI 요청·응답과6개 스크린샷은 [화면 보고](free-data-resume-ui-2026-09-07.md)에 있습니다. 활성탄 LCA 질량 반영률20%는 두 가격 기준에서 동일하게 표시됩니다.

## 보수적 가정·확인 못 한 항목·사람이 할 일

- 무료 API를11회로 제한해 이전 공통월6월의 누락 단면을 보완했습니다. 7·8월의 새 발표 여부는 이번에 확인하지 않았습니다. `latest_common_month=2026-06`은 제공된 동결 입력 기준입니다.
- 새8개 시계열은6월 한 점씩입니다. 장기 변동성에서는 기준값으로 유지한다고 명시했으며, 이를 다년 담체 가격 이력으로 해석하지 않습니다.
- 인조 코런덤과 탄소흑은 정확한 순중량 자료를 확보하지 못했습니다. 해당 월 자료는 계속 미반영하고 기존 가격 경로를 유지합니다. 무료 자료가 검증될 때만 후속 반영할 수 있습니다.
- 탄소·실리카·제올라이트의 일반 LCA 계수, 미산정 제조 공정, 근거 부족 문헌 조건은 현행 한계를 유지합니다. 유료 데이터 보완은 허용하지 않습니다.
- 프론트 빌드의 기존 Tailwind sourcemap 경고는 빌드를 실패시키지 않았습니다. UI 보조 검사 첫 실행의 선택 필드 null/생략 비교는 검사만 바로잡고 재실행했으며 제품 오류는 없었습니다.
- 사람은 PR을 검토한 뒤 별도로 머지·태그v1.4.0·릴리스/자동 업데이트·Zenodo DOI 연결·투고 저널과 저자 정보를 확인해야 합니다. 이번 재개에서도 머지·태그·릴리스·Zenodo 등록·배포는 하지 않았습니다.


# 세 우선순위 최종 보고 — 2026-09-07

무료 자료 보완과 5월 기준 논문 통합을 마쳤다. 추가 작업 V01–V04는 **완료 3개·보류 0개·부분 완료 1개**이며, 실제 제조 원가 정확도는 아직 검증되지 않았다. 누적 T01–T19·D01–D07·V01–V04는 완료 28개·부분 완료 2개다. D03의 일부 담체 관측 공백과 V01의 적격 실측 부재는 완료로 바꾸지 않았다.

같은 `autonomous/2026-09-06` 브랜치와 [PR112](https://github.com/hyunjin-kor/COMET/pull/112)를 유지한다. 머지·태그·릴리스·Zenodo 등록·배포는 하지 않았다. 공개 릴리스는 `gh release list -L 1`로 2026-09-07 재확인한 v1.3.24이며, 소스와 Windows 패키지는 준비 버전 1.4.0이다.

| ID | 상태 | 커밋 | 근거 명령 출력 요약 | 메모 |
|---|---|---|---|---|
| V01 | 부분 완료 | `b69123b` | `reproduce_external_cost_cases.py`: 10건, 계약 가격표 1건·검증한 소매 견적 3건, 적격 전체 원가 비교 0건; 새 테스트 11개 통과 | MAPE는 `null`; 실측 정확도를 주장하지 않음 |
| V02 | 완료 | `b69123b` | Comtrade 22회 HTTP200, 19개 채택·3개 품질 거부; 중복 제외 17개 추가. 4반응군·15후보·40 DOI 대조, 새 테스트 20개 통과 | 총 10시계열·28관측값; 인용·설명 53개 경로만 교정 |
| V03 | 완료 | `docs: unify the May reference manuscript and validation report` | 공통월2026-05·seed20260906; 7개 분석 JSON 반복 일치, 3개는 `generated_at`만 제외해 일치; 본문76·SI1059 키 참조 통과 | 그림6종·SI5종·TOC SVG/TIFF, 이전 동결본 보존 |
| V04 | 완료 | `b69123b` + 최종 보고 커밋 | 로컬710 passed/459.11s, Ruff·프론트·번역·Node10·Windows·실제Chrome6경로 통과; 자료 커밋 CI710 passed/332.52s | 보고 커밋의 최종 head CI 판정은 PR본문에 기록 |

원래 T01–T19의 개별 커밋과 명령 근거는 [누적 실행 로그](autonomous-run-2026-09-06.md)의 Tasks 표를 보존했다. 자료 커밋의 [CI34045687191](https://github.com/hyunjin-kor/COMET/actions/runs/34045687191)은 backend/frontend 모두 성공했다. 이 보고 커밋을 푸시한 뒤에도 최종 head CI를 확인하며, 결과는 같은 PR본문에 기록한다. 로그만 바꾸는 반복 커밋을 만들지 않는다.

## 무료 자료와 외부 원가 검증

[외부 근거 감사](external-cost-validation-2026-09-07.md)는 서명된 AXENS 계약의 EUR16.50/kg 기준 가격표와 실제 선택한 1g 소매 가격 세 건을 확보했다. 계약은 2007년 6월 기준이고, 결제 송장·조성·주문량·제조 경로가 맞지 않는다. 소매 견적도 산업 제조 규모와 다르다. 열 건 중 조건을 모두 맞춘 사례가 없어 COMET 예측값이나 MAPE를 만들어 넣지 않았다. 공개 견적의 단위 환산은 실제 대량 구매가격 검증이 아니다. 검증 스크립트는 이 제외 사례들을 재현하는 감사 도구이며, 향후 적격 사례가 생기면 별도의 비교 구현이 필요하다.

[문헌 대조](../sources/free-benchmark-expansion-2026-09-07.md)는 암모니아 분해·올레핀 복분해·수소탈산소·NH3-SCR의 15후보를 조사했다. 잘못 연결한 반응·금속·담체 등급·제조 조건과 과장된 성능 설명을 고쳤다. 기존 40 DOI는 Crossref와 일치했다. 조성·가격·온도 입력·제조 단계·점수 변경은 0개이며, 같은 가격의 전체 분석은 수정 전후 바이트 일치했다. 논문의 배합과 완전히 같은 실험 제조법으로 승격한 후보는 없다.

[담체 수집 감사](../sources/comtrade-history-extension-2026-09-07.md)는 무료·무키 Comtrade 조회를 12초 간격으로 22회 수행했다. 19개 응답을 채택했고, 기존 알루미나 두 점을 중복 제거해 17개 새 관측값을 더했다. 4월 실리카와 4·5월 탄소흑은 추정/누락 순중량 때문에 거부했다. HTTP200 자체를 유효한 가격의 증거로 취급하지 않았다. 전체는 10시계열·28관측값이고, 이전 11개 값은 그대로 보존했다. 인조 코런덤과 세륨 화합물에 새 직접 재료 연결을 만들지 않았다.

## 계산 변화와 Table6.2

5월 금속 가격·조성·가중치·계산식을 고정하고, 담체 관측값이 없는 라이브러리 기준과 채택 자료 전체를 비교한 [담체 영향 감사](submission-support-impact-2026-09-07.json)에서는 **후보38개의 원가와 프로파일별1위3개**가 바뀌었다. LCA는 모두 같았다. 이는 이번 직전 버전과의 차이가 아니라, 같은 5월 입력의 담체 반영 여부를 비교한 결과다.

직전 6월 동결본과 새 5월 통합본의 [별도 비교](submission-month-comparison-2026-09-07.json)는 원가93개, 순위5개, 1위4개가 달라졌고 원가 변화는 −1.5079%~+20.8767%다. **금속 기준월과 담체 가격이 함께 달라진 결과**이므로 담체만의 효과나 정확도 향상으로 해석하지 않는다. 제조 단계·가공비·LCA 값은 같다. 월을 앞당긴 이유는 인조 코런덤의 검증된 6월 관측값이 없어 전체 시계열의 교집합이 5월이기 때문이다.

| Table6.2 | COMET USD/lb | 출판값 USD/lb | 판정 |
|---|---:|---:|---|
| Pt/C | 27.3695 → 27.37 | 27.37 | 센트 일치 |
| Ni/Al2O3 | 19.2206 | 20.59 | −6.65%, 7% 이내 |
| FCC 각주b, 67 short tons/day | 2.4380 | 2.41 | +1.16%, 2% 이내 |

검증 계수·계산식·미산정 제조 공정의 단가는 바꾸지 않았다. 새 그림의 점수 설명은 성능·제조 경로의 저자 판단과 가격에서 계산하는 경제성·가격 근거 점수를 구분하도록 고쳤다.

## 통합 원고와 재현

[원고](../paper/manuscript_2026-09-07.md), [SI](../paper/si_2026-09-07.md), [결과](../paper/submission-2026-09-07/results_2026-09-07.md)는 같은 2026-05 기준이다. 30반응군·116후보·2019-01부터2026-05까지89개 금속 가격 상태를 분석했다. 짧은 담체 이력은 기준 가격에 고정하며 장기 변동성 자료로 확장 해석하지 않는다. 앱은 개별 시계열의 최신 관측값을 보여 주므로 일부 담체의 화면은 6월이고 논문의 공통월은 5월이다.

[재현 검사](submission-reproduction-check-2026-09-07.json)는 코드39개·데이터81개·산출물27개의 SHA-256을 확인했다. 같은 코드의 두 실행에서 주요7개 JSON은 바이트 일치했고, 기준·변동성·손익분기3개는 실행 시각 `generated_at`만 제외하면 같다. README의 별도 폴더 재현 명령도 실제 실행했다. 실행 환경별 코드 줄바꿈이 raw 해시에 반영될 수 있으며, SI 출처 검사는 내용이 같은 LF/CRLF만 허용하고 실제 내용 수정은 거부한다.

- 금속 이력 SHA-256: `84888f60f59d4a21a47945f1f98576c1824bc20babbde678c7419cf3806d4c69`.
- 담체 이력 SHA-256: `b6ac7e3f3309d73c8cfe6c0a61547c576e68d522d5f25e94312a6d992a01fa29`.
- 최종 실행 manifest SHA-256: `0bbebb785a0fc1d74cc50a153a1a5b4d8005e84958171b6633aead92068cd127`.

ACS Sustainable Chemistry & Engineering의 [공식 안내 확인 기록](../paper/submission-format-2026-09-07.md)에 따라 번호 없는 절, 초록185단어, 키워드6개, 그림6개, 본문 표2개, 별도SI와 TOC를 구성했다. 그림·표8개를 각각600단어로 계산하면 추정6,687 word equivalents다. 저널은 큰 그림을600단어 이상으로 계산할 수 있으므로 최종 편집 크기·분량은 사람이 확인해야 한다. 저자·소속·연구비는 추정하지 않았고 AI 지원을 명시했다.

## 검증과 실행 시간

| 항목 | 직전 실행 | 이번 실행 |
|---|---:|---:|
| 전체 backend | 679 passed,455.93s | 710 passed,459.11s |
| Windows build+smoke | 225.99s | 197.81s (build180.74s,smoke17.06s) |
| reference 전체 후보 분석 | 1.564s | 1.375s |
| 분석 파이프라인 내부 명령 합계 | 26.392s | 22.808s |
| 독립 전체 재현 wall time | 통제 비교 없음 | 23.15s / 24.24s |
| 실제 Chrome 기능 검사 | 4경로 | 6경로,9.04s,스크린샷10장 |

가격 입력·기간·시스템 부하가 다르므로 실행 시간을 성능 향상 실험으로 주장하지 않는다. `/api/calculate`와 MC10000은 이번에 최적화하거나 재측정하지 않았으며, 원래 T11의 통제 측정은 누적 로그에 남아 있다.

[검증 JSON](validation-submission-checks-2026-09-07.json)에 전체pytest·Ruff·frontend lint/build·번역 누락0·Node10·Windows1.4.0의 창1개 및 가격/계산HTTP200을 기록했다. 패키지 내부 담체 JSON은 소스와 SHA가 같다. 실제 Chrome의 열촉매4경로·수정 문헌 메모·전극 결과6경로에서 페이지/콘솔/API 오류는0이었다. [화면 보고](validation-submission-ui-2026-09-07.md)는 전극 상단의 `$0.1573`이 두 줄로 나뉘는 기존 표시 문제 UI01도 스크린샷과 함께 기록한다. 계산값·큰 결과 카드·면적 기준 원가는 정상이며, 이번 데이터/원고 범위에서는 UI코드를 바꾸지 않았다.

초기 Node 와일드카드는 검사 파일을 찾지 못했고, 선택적 브라우저 스크립트는 외부 Playwright 경로 없이 실행해 모듈 오류가 났다. 올바른 Node파일10개 검사와 별도로 구성한 실제 Chrome 검사는 통과했다. 의존성을 추가하지 않았다. 새 그림 설명의 잘림과 SI 줄바꿈 판정 문제는 최종 재현 전에 수정·재검증했다. 기존 Tailwind sourcemap 경고와 PyInstaller의 사용하지 않는 NumPy 테스트 모듈 경고는 빌드 성공과 구분해 남긴다.

## 가정·확인 못 한 것·사람이 할 일

- 무료 공개 자료만 사용했다. 구매·구독·과금 API·키 발급·공급사나 저자 연락을 하지 않았다. 코드 라이선스와 원자료 권리는 유지했고 CatCost 원본 워크북을 넣지 않았다.
- 제공된 이력의 공통월을 택했다. 7·8월 전체 담체 발표 여부와 장기 담체 변동성을 확인했다는 주장은 하지 않는다. 추정 순중량·없는 가격·미검증 등급 프리미엄을 채우지 않았다.
- 산업 제조 원가의 독립 정확도, 조건을 맞춘 구매 사례, 미접근 원문/SI의 세부 제조법, 탄소흑 관측값은 미확인이다. 일반 탄소·실리카·제올라이트 LCA 계수와 미산정 공정은 공백을 유지한다.
- 일부 출판사HTTP403·빈응답은 원문 확인 성공으로 처리하지 않았다. 기존 Nuss–Eckelman DOI의 이번 Crossref429는 재시도하지 않았고 이전 검증 기록을 인용했다. 실제 수집을 끈 UI 검사로 새 live 시세 수집 성공을 주장하지 않는다.
- 사람은 PR을 검토·머지한 뒤 태그v1.4.0을 푸시하고 릴리스 자산·자동 업데이트·Zenodo 버전 DOI 연결을 확인해야 한다. 저자·소속·연구비·이해상충·커버레터·최종 저널 분량과 투고 승인을 확정해야 한다. 실측 비교 공백, 미산정 공정·LCA, 표시 문제UI01의 후속 우선순위는 별도로 정한다.
