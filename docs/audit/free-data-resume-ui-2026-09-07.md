# 무료 담체 데이터 재개 실행 — 실제 화면 확인

2026-09-07에 설치된 Chrome 152.0.7977.76으로 열촉매 계산을 네 번 끝까지 실행했다. 새로 확보한 TiO2·활성탄 월평균 가격은 reference에서 적용되고, live에서는 기존 라이브러리 가격이 유지된다. 네 요청 모두 HTTP 200이며 JavaScript 예외, 콘솔 오류, 실패한 API 응답은 각각 0건이다.

## 환경과 확인 범위

- 앱: 기존 `frontend/dist`와 현재 FastAPI 앱을 `http://127.0.0.1:8877`에서 실행했다. 제품 코드 수정은 없다.
- 데이터베이스: 새 임시 디렉터리의 독립 SQLite 파일을 사용했다. 사용자 DB는 읽거나 수정하지 않았다.
- 외부 수집: 서버 시작 전에 `backend.main.collect_prices`를 비동기 no-op으로 교체하고 선택적 API 키 환경변수를 비웠다. 브라우저 외부 요청도 0건이다. 출처 링크는 DOM의 주소를 확인했으며 Comtrade에 재요청하지 않았다.
- 스냅샷: `backend/data/support_price_history.json`, SHA-256 `e6ce5251b911026a80d94c516ac919150f711417fdc660ba0d5fb2f58020dfe3`.
- 화면: 1440×1100 뷰포트, 실제 앱의 전체 페이지 PNG 6장을 저장했다. 한국어 reference 화면 두 장을 직접 열어 가격·관측 월·원 자료 가격·출처 표시와 배치를 확인했다.
- 실행 종료 후 격리 서버를 중지했다.

## 실행 결과

각 경로에서 촉매 유형 → 조성 → 제조법 → 계산 → 결과의 근거 화면 순으로 이동했다. 조성은 Ni 20 wt%·담체 80 wt%, 생산 규모는 20 short tons, 제조법은 `wet_impregnation_metal_oxide`이다. 네 요청의 Ni 가격은 모두 7.7362 USD/lb였으며, 아래 가격은 당시 격리 환경에서 얻은 결과다.

| 담체 | 가격 기준 | 원 자료 단가 (USD/kg) | 관측/견적 기준 | 납품 기준 촉매 단가 (USD/kg) | GWP (kg CO2-eq/kg) | LCA 질량 반영률 |
|---|---|---:|---|---:|---:|---:|
| TiO2 | reference | 3.3905 | 2026-06, HS282300 | 13.4407 | 5.7029 | 100% |
| TiO2 | live | 3.2000 | 2025 USGS 라이브러리 | 13.3567 | 5.7029 | 100% |
| 활성탄 | reference | 3.7154 | 2026-06, HS380210 | 13.7965 | 1.5429 | 20% |
| 활성탄 | live | 2.7000 | 2024 Comtrade 라이브러리 | 12.8271 | 1.5429 | 20% |

live의 과거 라이브러리 단가는 기존 ChemPPI 환산(TiO2 1.0356배, 활성탄 1.0483배)을 거쳐 계산된다. reference 월평균 가격의 환산 계수는 1이다. 이 확인에서 live가 유지된다는 뜻은 새 담체 시계열이 live의 원 자료 단가·연도·URL을 덮어쓰지 않았다는 것이다. 외부 실시간 시세 수집 성공을 주장하지 않는다.

reference 응답의 `price_scope=reference_monthly`, `quote_year=2026`, `pricing_basis=reference_monthly:<HS code>:2026-06`, `live_override.basis=reference`를 확인했다. 실제 출처 링크는 월별 공개 preview 경로와 해당 HS 코드, `period=202606`을 포함한다. live의 단가·연도·URL은 reference 응답에 보존된 원 라이브러리 정보와 각각 일치한다.

영문 `Monthly reference quote in use` 및 `Observation month 2026-06`, 한국어 `월평균 기준 가격 적용 중` 및 `관측 월 2026-06`이 실제 근거 화면에 표시된다. 한국어 화면에서도 문헌·재료 이름 등 데이터 문자열은 원문을 유지한다. 활성탄의 LCA 질량 반영률은 두 가격 기준 모두 20%로 표시되어, 새 가격을 LCA 근거로 오인하지 않는다.

## 증거 파일

전체 요청·응답, 영문/한국어 화면 텍스트, 오류 목록, 스크린샷 경로는 [free-data-resume-ui-2026-09-07.json](free-data-resume-ui-2026-09-07.json)에 기록했다.

- [TiO2 reference 영문](screens/free-data-resume-tio2-reference-en-2026-09-07.png)
- [TiO2 reference 한국어](screens/free-data-resume-tio2-reference-ko-2026-09-07.png)
- [TiO2 live 한국어](screens/free-data-resume-tio2-live-ko-2026-09-07.png)
- [활성탄 reference 영문](screens/free-data-resume-activated-carbon-reference-en-2026-09-07.png)
- [활성탄 reference 한국어](screens/free-data-resume-activated-carbon-reference-ko-2026-09-07.png)
- [활성탄 live 한국어](screens/free-data-resume-activated-carbon-live-ko-2026-09-07.png)

검사 보조 스크립트의 첫 실행은 선택적 `live_override` 필드가 `null` 대신 생략된 응답을 엄격히 비교해 실패했다. 검사에서 해당 필드의 `applied` 유무를 확인하도록 수정한 뒤 네 경로를 처음부터 다시 실행했고 모두 통과했다. 제품 결함은 확인되지 않았다.
