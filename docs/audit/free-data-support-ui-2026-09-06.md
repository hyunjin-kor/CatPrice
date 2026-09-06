# 무료 담체 스냅샷의 앱 적용 확인 — 2026-09-06

검증된 UN Comtrade 알루미나 3개월 관측값이 새 데이터베이스에 자동 반영되며, reference 계산에 최신 단가 **0.5558 USD/kg**가 적용된다. live 계산은 연결 전 결과와 같다. 실제 화면에서 발견한 월평균 출처의 실시간 오표시도 수정하고 재검증했다.

## 실행 범위와 비용

- 격리된 임시 SQLite 데이터베이스와 `127.0.0.1:8876`의 실제 FastAPI 앱, 빌드된 `frontend/dist`, 설치된 Chrome을 사용했다.
- `main.collect_prices`를 시작 전에 `lambda source=None: asyncio.sleep(0, result={})`로 교체했다. 앱 검증 과정의 요청은 localhost뿐이며, 외부 가격 수집이나 API 키 사용은 하지 않았다.
- 최종 임시 DB는 `comet-free-support-ui-final-l4jeed36/new.db`이다. 실제 브라우저 검증 후 별도 서버를 종료했다. 기존 서버 및 데이터베이스는 사용하지 않았다.
- 무료 스냅샷 수집 자체의 HTTP 응답은 `backend/data/support_price_history.json`에 이미 저장된 자료로 확인했다. 이번 UI 검증에서는 원격 URL을 다시 호출하지 않았다.

## API와 계산 결과

모든 API 응답 원문, 화면 텍스트, 전후 비교는 [검증 JSON](free-data-support-ui-2026-09-06.json)에 있다.

| 검증 | 실제 결과 | JSON 근거 |
|---|---|---|
| `/api/prices/HS281820/history?basis=reference&period=1y` | HTTP 200, 3건 | `api.history_reference` |
| 2026-04-30 | 0.5782 USD/kg | `api.history_reference.history[0]` |
| 2026-05-31 | 0.6728 USD/kg | `api.history_reference.history[1]` |
| 2026-06-30 | 0.5558 USD/kg | `api.history_reference.history[2]` |
| `/api/prices/supports?basis=reference` | 정의 11종 중 알루미나 1종·3개월, 나머지 10종 미수집 | `api.supports_reference` |
| `/api/prices/supports?basis=live` | 11종 모두 가격 없음·0개월 | `api.supports_live` |
| reference 알루미나 적용 단가 | 0.5558 USD/kg, `reference_monthly` | `api.calculate_reference.response.resolved_materials[0]` |
| live 알루미나 적용 근거 | 기존 2024 자료 0.5956 USD/kg; ChemPPI 보정 후 0.2832 USD/lb | `api.calculate_live.response.resolved_materials[0]` |

실제 마법사에서 월평균 → 열촉매 → Ni 20 wt% / Al₂O₃ 80 wt% → 초기습윤 함침 → 20톤 → 계산을 실행했다. 선택된 담체는 `lit:comtrade-calcined-alumina-2024`, 제조법 ID는 `wet_impregnation_metal_oxide`이며 POST `/api/calculate`는 HTTP 200이었다.

| 동일 조성·제조법·생산 규모 | reference | live |
|---|---:|---:|
| 촉매 단가, USD/kg | 10.3361 | 10.4111 |
| 촉매 단가, USD/lb | 4.6884 | 4.7224 |
| GWP, kg CO₂-eq/kg | 8.1029 | 8.1029 |

두 기준의 차이는 담체 가격 계층의 선택에서 발생한다. 출처 표시 수정 전후 `materials`, `step_method`, `summary`, `lca`는 각 기준에서 정확히 같다. live 요청·재료비·최종 요약은 담체 연결 전 [cold-start 기록](free-data-cold-start-after.json)의 첫 사례와도 정확히 일치한다. 비교 결과는 `checks`에 기록했다.

## 화면에서 발견한 결함과 수정

수정 전 reference 단가 자체는 맞았지만 `LIVE MARKET QUOTE IN USE` 배너와 원라이브러리의 2024년·연간 통계 URL이 적용 가격의 근거처럼 표시됐다. [수정 전 화면](screens/free-data-support-reference-before-2026-09-06.png)을 보존했다.

- reference override의 관측 연도·가격 기준은 저장된 `fetched_at`에서 유도한다. 임의의 현재 연도를 넣지 않는다.
- Comtrade URL은 검증된 스냅샷의 금속/담체 식별자, 날짜, 가격, 출처 및 단위가 일치할 때만 저장된 실제 응답 URL을 사용한다. 값이 다르거나 URL을 확인하지 못한 reference 가격에는 기존 자료 URL을 재사용하지 않는다.
- 원라이브러리의 가격·연도·링크는 `fallback_*` 필드와 별도의 '기존 자료 가격' 항목에 남긴다. 라이브러리 항목 이름의 2024 표기는 원자료 이름을 유지한 것이다.
- UI는 '월평균 기준 가격 적용 중', '관측 월 2026-06'을 표시한다. 실시간 시세 배너가 없음을 브라우저에서 검사했다.

새 회귀 테스트 2개를 먼저 실행해 `2024 != 2026`으로 실패함을 확인했다. 수정 후 관련 검증 결과:

| 명령 / 확인 | 결과 |
|---|---|
| `python -m pytest backend/tests/test_reference_price_evidence.py backend/tests/test_comtrade_snapshot.py backend/tests/test_api.py::TestSupportPrices backend/tests/test_curated_library_combinations.py -q` | 46 passed, 1.89s |
| `cd frontend; npm run check:i18n` | 정적 호출 787, 한국어 키 829, 누락·미번역 UI 0 |
| `cd frontend; npm run lint; npm run build` | 통과; 기존 Tailwind sourcemap 경고만 있음 |
| `node scripts/test_calculator_rules.mjs` | 10 passed |
| `python scripts/reproduce_catcost_table62.py` | Pt/C 27.3695, Ni/Al₂O₃ 19.2206, FCC 각주 b 2.4380 USD/lb; 각 오차 약 0%, −6.65%, +1.16% |
| 실제 Chrome reference 계산·출처 링크·한/영 표시 | 통과, page error 0 |
| 문헌 비교 'Price evidence' → '가격 근거' | 한국어 화면에서 확인 |

최종 화면: [영어 reference 출처](screens/free-data-support-reference-2026-09-06.png), [한국어 reference 출처](screens/free-data-support-reference-ko-2026-09-06.png), [문헌 비교 가격 근거](screens/free-data-price-evidence-ko-2026-09-06.png).

지원 데이터 연결 후 cold-start 5개 시나리오도 같은 브라우저 검사 스크립트로 다시 실행했다. 기존 증거를 보존하도록 실행 중 출력 파일 접두어만 `free-data-support-`로 바꿨다. [추가 결과 JSON](free-data-support-cold-start-after.json)에 새 세션, 규모별 제조 단계 지연, 이전 규모 캐시, 지연 중 새로고침의 HTTP 200 네 건과 수집 실패 시 계산 요청 0건을 기록했다. 모든 시나리오의 page error는 0이다. 스크린샷은 `screens/free-data-support-after-*.png`에 있다.

## 확인 범위의 한계

나머지 10종의 월별 담체 가격은 수집하지 못한 상태다. 기존 자료 가격을 유지하며 새 관측값으로 간주하지 않는다. 알루미나 관측값은 미국 수입 통계의 단위가격으로, 촉매급 담체의 개별 견적을 뜻하지 않는다. 검증된 retained response와 일치하지 않는 reference 가격의 공개 URL은 확인 못 함으로 처리하며, 원라이브러리 출처와 구분한다.
