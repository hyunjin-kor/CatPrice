# 무료 담체 자료 추가에 따른 논문 재현 영향 — 2026-09-07

기존 1계열·3개 관측값에 무료 공개 자료 8계열·8개 관측값을 추가한 시나리오다. 완전한 공통 기준월은 **2026-06**, 시드는 **20260906**이다. 이전 논문 산출물은 보존하고 새 결과를 `docs/paper/free-data-2026-09-07/`에 별도로 생성했다.

비교 대상은 `docs/paper/free-data-2026-09-06/`과 `docs/paper/free-data-2026-09-07/`이다. 두 manifest의 코드 입력 37개는 SHA-256이 같고, 데이터 입력 81개 가운데 변경된 파일은 `backend/data/support_price_history.json` 한 개뿐이다. 금속 가격 원본과 기존 담체 관측값, 조성, 제조 단계, 가공비 및 LCA 계수도 유지했다. 상세 값과 JSON 키 대응은 `free-data-resume-impact-2026-09-07.json`의 `source_contract`, `input_changes`, `invariants`에 있다.

## 수치 영향

- 30개 반응군·116개 후보 중 11개 반응군의 15개 후보 단가가 달라졌다. 9개 감소, 6개 증가이며 변화율은 -3.8091%에서 +4.6066%까지다.
- 단가만으로 정렬한 반응군별 후보 순서는 모두 같았다. 90개 명명 가중치 프로파일과 30개 성능 가중치 0 프로파일을 비교하면 전체 순서가 2곳, 1위가 1곳 달라졌다.
- 1위 변경은 olefin-metathesis의 balanced 프로파일에서 `mo-silica-alumina` → `wo3-silica-oct`다. 후자의 가격 근거 점수는 59.9 → 61.0, 종합 점수는 87.2 → 87.4로 달라졌다. 전자의 종합 점수는 87.3 → 87.2다. 가격 및 비용 비중으로 가중한 출처 신뢰도 영향이며, 촉매 성능의 실측 개선을 의미하지 않는다.
- 모든 후보의 LCA 결과와 반영률은 동일하다. live 분석 내용도 입력 파일명만 제외하면 동일하고, live 가격 스냅샷 내용은 완전히 같다.

| 반응군 | 후보 | 이전 납품 단가 USD/lb | 이후 납품 단가 USD/lb | 변화율 % |
|---|---|---:|---:|---:|
| ammonia-cracking | co-mgo-la2o3 | 4.8305 | 4.6465 | -3.8091 |
| ammonia-cracking | ni-mgo-ceo2-interface | 5.7065 | 5.6028 | -1.8172 |
| ammonia-cracking | ru-mgo-premium | 1214.0658 | 1213.9222 | -0.0118 |
| co2-methanol | cu-zrox-interface | 5.9142 | 5.7735 | -2.3790 |
| co-prox | au-tio2-nanogold | 2468.8081 | 2468.9481 | +0.0057 |
| fischer-tropsch-synthesis | fe-cu-k-precipitated | 6.6259 | 6.6185 | -0.1117 |
| hydrodeoxygenation | nimo-carbon-hdo | 12.8186 | 13.4091 | +4.6066 |
| hydrodeoxygenation | pt-silica-hdo | 412.5713 | 412.4117 | -0.0387 |
| hydrodeoxygenation | ru-carbon-hdo | 1839.3629 | 1839.9619 | +0.0326 |
| methane-pyrolysis | ni-sio2-highload | 11.8040 | 11.7675 | -0.3092 |
| nh3-scr | v2o5-wo3-tio2 | 6.0476 | 6.1546 | +1.7693 |
| olefin-metathesis | wo3-silica-oct | 6.4049 | 6.2749 | -2.0297 |
| pem-electrolyzer-oer | iro2-tio2-supported | 73452.8558 | 73452.9268 | +0.0001 |
| rwgs | pt-tio2-premium | 758.6141 | 758.7300 | +0.0153 |
| water-gas-shift | fe-cr-hts | 6.8681 | 6.7814 | -1.2624 |

## 추가 자료와 범위

| 계열 | 관측 월 | 수입 단가 USD/kg |
|---|---|---:|
| HS251990 | 2026-06 | 0.6434 |
| HS281122 | 2026-06 | 2.1895 |
| HS281990 | 2026-06 | 4.5274 |
| HS282010 | 2026-06 | 2.7147 |
| HS282300 | 2026-06 | 3.3905 |
| HS284210 | 2026-06 | 4.5579 |
| HS284610 | 2026-06 | 17.6330 |
| HS380210 | 2026-06 | 3.7154 |

모든 관측값은 미국의 전 세계 상대국 대상 6자리 HS 품목 수입액을 순중량으로 나눈 전 등급 단가다. 촉매 등급 담체의 공급사 견적이 아니다. 추가 8계열에는 2026-06 한 달만 있어 자체 변동성을 추정하지 않는다. 2019-01~2026-06의 90개월 분석에서는 담체 9계열을 기준월 가격에 고정한다. 따라서 아래 변동 결과 변화는 담체 가격이 달마다 관측되어 변동한 효과가 아니라, 고정된 담체 기준 단가를 바꾼 상태에서 금속 가격을 재생한 효과다.

| 파이프라인 지표 | 기존 1계열 | 추가 후 9계열 |
|---|---:|---:|
| 균형 가중치 1위 안정성 중앙값 % | 55.59 | 55.59 |
| 안정성 50% 미만 반응군 | 12 | 11 |
| 성능 가중치를 0으로 바꾸었을 때 1위 변경 | 3 | 4 |
| 90개월 재생 중 balanced 1위 변경 반응군 | 7 | 6 |
| 90개월 재생 중 performance_zero 1위 변경 반응군 | 5 | 6 |
| live/reference balanced 1위 차이 | 6 | 5 |
| 후보 평균 LCA 반영률 % | 62.79 | 62.79 |

## 검증 및 재현

- 두 번의 연속 실행에서 안정적인 JSON 7개는 바이트 단위로 동일했다. 기준 생성·가격 변동성·손익분기 JSON 3개는 `generated_at`만 제외하고 모든 내용이 같았다. 최초 검증에서 실행 시각까지 바이트 비교한 실패를 기록했고, 제외 범위를 이 키 하나로 명시했다. 계산 수치를 제외하지 않았다.
- 기록된 연속 실행의 파이프라인 시간은 25.910초, 재현 명령 벽시계 시간은 28.078초다. 병행 검사 중의 관측 시간이며 성능 개선 주장에 사용하지 않는다.
- 최종 manifest의 코드 37개·데이터 81개·산출물 27개 SHA-256이 실제 파일과 모두 일치했다. 이전 보충 산출물 28개 파일은 바뀌지 않았다.
- Table 6.2: Pt/C 27.3695 USD/lb(센트 단위 일치), Ni/Al2O3 19.2206 USD/lb(−6.65%), FCC 각주 b 2.4380 USD/lb(+1.16%). 계산식과 제조법별 가공비는 동일하다.
- 그림 6종을 PNG/SVG로 생성했고, 그림 3의 단위·반영률 구분과 그림 5의 프로파일별 분모·표시값을 실제 이미지에서 확인했다.

```bash
python scripts/reproduce_paper.py --price-basis reference --month 2026-06 --seed 20260906 --date 2026-09-07 --history "docs/paper/free-data-2026-09-07/price_history_2026-09-07.json" --live-basis "docs/paper/free-data-2026-09-07/live_basis_2026-09-07.json" --support-history "docs/paper/free-data-2026-09-07/support_history_2026-09-07.json" --out-dir "docs/paper/free-data-2026-09-07"
```

금속 원본 SHA-256: `84888f60f59d4a21a47945f1f98576c1824bc20babbde678c7419cf3806d4c69`.

기존 담체 원본 SHA-256: `4d0dccdf351ea3ecbebca9233da5cd6a97d5a790ecab313749fcd9b6c8af5896`.

추가 후 담체 원본 SHA-256: `e6ce5251b911026a80d94c516ac919150f711417fdc660ba0d5fb2f58020dfe3`.

가격 자료 추가는 GWP/CED 누락을 해소하지 않는다. 탄소·실리카·제올라이트의 일반 계수는 새로 넣지 않았으며, 확인되지 않은 담체 가격도 채우지 않았다. 이 추가 시나리오는 기존 2026-07 기준 원고를 자동으로 대체하지 않는다.

README의 별도 `_local/free-data-replay-2026-09-07` 출력 명령도 그대로 실행했다. 29.560초, 종료코드 0. `all_families`, `all_families_live`, `paper_summary` 3개 JSON은 동결한 새 결과와 바이트 단위로 같고, 이 추가 실행의 코드 37개·데이터 81개·산출물 27개 해시도 모두 일치했다. 근거: 영향 JSON의 `readme_replay`.
