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
