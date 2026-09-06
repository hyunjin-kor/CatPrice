# 무료 1차 문헌 대조: CO2 메탄올 합성 및 수소 발생

확인일: 2026-09-06 UTC. **루트 승인 후 B01–B11 적용 완료.** 두 벤치마크 JSON의 DOI·인용 연결·설명만 수정했다. 계산 코드, 가격, 조성, 점수, 제조 단계와 단계비용은 유지했다. 논문의 실험 성능을 제조 원가의 실측 검증값으로 사용하지 않는다.

검증: 신규 메타데이터 테스트 9개와 기존 담체 기준 테스트 9개가 모두 통과했다(`18 passed in 0.86s`); 해당 테스트 파일 ruff도 통과했다. 동일한 2026-06 가격 스냅샷으로 전체 분석을 다시 실행한 `_local/free-data-after-citations.json`은 수정 전 `_local/free-data-after-support.json`과 **바이트까지 동일**하다. 30개 반응군·116개 후보, 90개 프로파일 순위, 반응군당 286개 가중치 조합에서 비용·점수·순위가 유지됐다. 승인된 메타데이터 경로를 제외한 두 JSON의 나머지 구조도 동일함을 확인했다. 명령·입력/출력 해시·후보별 전후 값은 [적용 검증 기록](free-benchmark-application-check-2026-09-06.json)에 보존했다. 프론트의 `Price evidence` 라벨은 루트 담당이다.

대상은 `backend/data/co2_methanol_benchmark.json`의 후보 4개와 `backend/data/hydrogen_evolution_benchmark.json`의 후보 4개다. 산화물 담체와 탄소/C2N 담체의 자료 공백, 분말 실험과 전극 조립체 가정의 차이를 함께 확인했다. 두 파일의 기존 인용 25개와 아래 교체 제안 DOI 2개는 Crossref 응답 200 및 제목으로 식별했다. 모든 인용의 실험 원문을 전수 검증했다는 뜻은 아니다. 무료 원문 또는 공개 보충자료에서 읽은 범위는 아래에 구분했다.

## 입력과 접근 기록

검토 시작 시 HEAD: `601ce9bbd15453a102250ca3536b994cda532d9c`. 아래 수정 전 파일 SHA-256은 당시 Windows 작업 파일의 실제 바이트 기준이다. 적용 후 해시는 별도 적용 검증 JSON에 기록했다.

| 입력 | SHA-256 |
|---|---|
| `backend/data/co2_methanol_benchmark.json` | `8a00005ca1c6074b994e384f85abc8c6df7f7ce672bb791d7d48a3831e2e3ff7` |
| `backend/data/hydrogen_evolution_benchmark.json` | `ec0dc49b1331c9450372acbb3498b37c55a2ab4baed8575620bd97289a596811` |

`httpx`로 Crossref `GET /works/{doi}`를 요청하고 반환 제목을 대조했다. 첫 병렬 요청 일부는 429였으며, 이후 1.5초 간격의 직렬 재확인으로 기존 인용 25개 모두 200을 받았다. DOI가 존재하는 것과 인용 내용이 맞는 것은 별도로 판정했다. HTML은 본문/초록 구분 후 확인했고, PDF는 `%PDF` 시그니처와 페이지 수를 검사한 뒤 `pypdf`로 읽었다. Ru 보충표의 행 정렬과 TGA 그림은 렌더링해서 확인했다.

| 식별자 / 확인 URL | 접근 결과와 실제 사용 범위 |
|---|---|
| [Frei 2019, Pd/In2O3](https://www.nature.com/articles/s41467-019-11349-9) | 200, 공개 원문. Fig. 6, Table 2, 제조법과 조건 확인. [Crossref](https://api.crossref.org/works/10.1038/s41467-019-11349-9) 200. |
| [Frei 보충자료](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41467-019-11349-9/MediaObjects/41467_2019_11349_MOESM1_ESM.pdf) | 200, 실제 PDF 37쪽. Supplementary Table 1, p. 28의 명목/측정 담지량 확인. |
| [Cu-ZnO-ZrO2 2019](https://www.nature.com/articles/s41467-019-09072-6) | 200, 공개 원문 Methods. [Crossref](https://api.crossref.org/works/10.1038/s41467-019-09072-6) 200. |
| [Ni-promoted In2O3 2021](https://www.nature.com/articles/s41467-021-22224-x) | 200, 공개 원문: 니켈 첨가, 조성 의존 선택성, Fig. 1 조건 확인. [Crossref](https://api.crossref.org/works/10.1038/s41467-021-22224-x) 200. |
| [In2O3 photothermal CO 2022](https://www.nature.com/articles/s41467-022-30958-5) | 200, 공개 원문: 생성물이 CO인 실험 확인. [Crossref](https://api.crossref.org/works/10.1038/s41467-022-30958-5) 200. |
| [Flame-made Pd-In2O3-ZrO2 2022](https://www.nature.com/articles/s41467-022-33391-w) | 200, 공개 원문: FSP, 삼원계 및 이원계 비교 확인. [Crossref](https://api.crossref.org/works/10.1038/s41467-022-33391-w) 200. |
| [Cu/ZrOx-MgO 2024](https://www.nature.com/articles/s41929-024-01236-y) | 200. 공개 초록으로 liquid-phase ALD와 선택성만 확인. 기관 구독으로 전달된 본문은 무료 원문 검증 근거로 채택하지 않았다. [Crossref](https://api.crossref.org/works/10.1038/s41929-024-01236-y) 200. |
| [Cu/ZrOx-MgO 공개 SI 링크](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41929-024-01236-y/MediaObjects/41929_2024_1236_MOESM1_ESM.pdf) | HTTP 200이지만 3,038바이트 HTML challenge였다. PDF 확인 실패. [EPFL 저자 저장소](https://infoscience.epfl.ch/entities/publication/a1356ebb-aac0-45d4-900f-51c961369899)도 405 Human Verification. 정확한 조성은 확인 못 함. |
| [Gong NiO/Ni-CNT 2014](https://www.nature.com/articles/ncomms5695) | 200. 공개 초록에서 실험 대상이 NiO/Ni-CNT임을 확인. NiMo 실험의 직접 근거로 사용하지 않는다. [Crossref](https://api.crossref.org/works/10.1038/ncomms5695) 200. |
| [Stamenkovic Pt3M 2007](https://www.nature.com/articles/nmat1840) | 200. 공개 초록의 반응은 ORR. HER Pt/C 제조·성능 검증 근거가 아님. [Crossref](https://api.crossref.org/works/10.1038/nmat1840) 200. |
| [MoS2 정정문](https://www.nature.com/articles/nmat4564) / [원 논문 DOI 메타데이터](https://api.crossref.org/works/10.1038/nmat4465) | 정정문은 최초 요청 200으로 읽음. 저자 이름 정정이며 원 실험 논문이 아님. 두 DOI 모두 Crossref 200. 이후 출판사 원문 요청은 challenge였으므로 원 논문의 전극 조립체 조건은 확인 못 함. |
| [Ru@C2N 2017](https://www.nature.com/articles/nnano.2016.304) | 200. 무료 초록과 아래 공개 SI만 근거로 사용. 기관 구독으로 전달된 본문은 무료 원문 검증으로 세지 않음. [Crossref](https://api.crossref.org/works/10.1038/nnano.2016.304) 200. |
| [Ru@C2N 보충자료](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fnnano.2016.304/MediaObjects/41565_2017_BFnnano2016304_MOESM177_ESM.pdf) | 200, 실제 PDF 37쪽. p. 3, Fig. S6(p. 9), Tables S1-S2(pp. 32-34) 확인. UNIST 저자 저장소 검색은 JavaScript 안내만 반환하여 별도 무료 본문 파일은 확인 못 함. |
| [McKone Ni-Mo 2013, Caltech 저자 저장소](https://authors.library.caltech.edu/records/z7ryh-8sk10) | 200. 원문 PDF 4쪽과 SI PDF 12쪽을 로그인/키 없이 수신. 아래 NiMo 교체 근거. [Crossref](https://api.crossref.org/works/10.1021/cs300691m) 200. |

무료로 읽을 수 있음은 재배포 허가와 동일하지 않다. 원문/PDF/SI는 저장소에 추가하지 않았다. Caltech 다운로드의 일회성 서명 URL도 기록에 넣지 않고 영구 저장소 URL을 사용한다.

| 실제로 읽은 무료 PDF | SHA-256 |
|---|---|
| Frei SI, 2,068,777바이트 | `915de39c8c55d267cc03ae2b23d391fcb3344da39343d055e5308ba780f9008f` |
| Ru@C2N SI, 3,889,573바이트 | `f7249a1dbb3682e2fbf9b78694977690be8b4d8ac029d21b106ef857a21c5288` |
| [McKone 원문](https://authors.library.caltech.edu/records/z7ryh-8sk10/files/cs300691m.pdf?download=1), 3,812,965바이트 | `c48e0fb4fd06e35b38355a5d9256d58ec57b0888acab289061b35801ac342ab0` |
| [McKone SI](https://authors.library.caltech.edu/records/z7ryh-8sk10/files/cs300691m_si_001.pdf?download=1), 1,677,045바이트 | `0ea3e5dbf205551b8b434c388fe2087318962c392a9ab65620ba28882efb837e` |

## 후보별 조성·단위·조건 대조

아래 질량비, 기본 담지량과 점수는 기존 JSON 값이다. `performance_index`와 `screening_exactness`는 측정 단위가 없는 편집자 점수이며, 실험값으로 검증되지 않았다.

| 파일 / 후보 경로 | 기존 조성 및 모델 조건 | 무료 근거와의 대조 | 판정 |
|---|---|---|---|
| `co2_methanol_benchmark.json` `/candidates/0` `cza-baseline` | Cu/ZnO/Al2O3 = 45/25/30 wt%; 220-290 °C; performance 75, exactness 71 | 연결된 2019 논문의 주 실험은 Cu-ZnO-ZrO2이며 Methods의 Cu/Zn/Zr 전구체 몰비는 5:2:3이다. 이는 현재 Al2O3 함유 질량비의 검증값이 아니다. | 기존 `engineering_proxy` 유지. 정확한 상업 조성 또는 실험 성능으로 승격하지 않음. |
| 같은 파일 `/candidates/1` `cu-zrox-interface` | Cu/ZrOx/MgO = 14/21/65 wt%; 180-260 °C; performance 89, exactness 79 | 2024 공개 초록은 액상 ALD를 명시하고, 200/250 °C에서 메탄올 선택성 100/76.7%를 보고한다. 현재 질량비는 무료 SI로 확인하지 못했다. | 구조 개념만 확인. 일반 침전/조립 공정이 논문 ALD 제조법을 재현한다는 주장은 불가. |
| 같은 파일 `/candidates/2` `in2o3-zro2-lowtemp` | 원소 In/ZrO2 = 55/45 wt%; 180-250 °C; performance 92, exactness 83 | Ni-promoted 논문은 Ni를 포함하고, 2022 FSP 논문의 대표 시료는 `0.75Pd-5In2O3-ZrO2`이다. 후자는 553 K, 5 MPa, H2/CO2=4, 48,000 cm³(STP)/(h gcat)에서 1.3 gMeOH/(h gcat), 50 h를 보고한다. 원소 In 55 wt%와 같은 조성으로 볼 수 없다. | 산화물 구조의 참고 근거. 현 조성·온도창·점수의 직접 실험 근거는 확인 못 함. CO 생성 photothermal 논문은 아래 B03에 따라 직접 메탄올 근거에서 제외 권고. |
| 같은 파일 `/candidates/3` `pd-in2o3` | Pd/In2O3 = 0.75/99.25 wt%; 280-300 °C; performance 92, exactness 80 | Frei SI Table 1의 명목 Pd는 0.75 wt%, 측정값은 0.74 wt%. 500 h 시험은 553 K, 5 MPa, H2/CO2=4, WHSV 48,000 cm³(STP)/(h gcat); 유지 생산성 0.96 gMeOH/(h gcat), 선택성 78%. Table 2의 초기 생산성 1.01과 구분해야 한다. | 명목 담지량 유지가 타당. 성능 숫자는 조건을 함께 쓰면 근거 있음. 순위 점수와 산업 제조비 검증은 아님. |
| `hydrogen_evolution_benchmark.json` `/candidates/0` `pt-carbon-her-cathode` | Pt/Carbon = 20/80 wt%; 총 분말 담지량 0.5 mg/cm², 면적 25 cm², I/C 0.3; performance 90, exactness 84 | Norskov는 HER 교환전류의 기초 근거이며 Stamenkovic는 ORR 논문이다. 이 조합으로 PFSA 막/이오노머, Ti PTL, 위 조립체 조건을 입증하지 못한다. | `engineering_proxy` 유지. 0.5 mg/cm²는 Pt 질량이 아니라 입력된 촉매 분말 담지량으로 취급해야 함. |
| 같은 파일 `/candidates/1` `nimo-alkaline-her-cathode` | Ni/Mo = 70/30 wt%; 2 mg/cm², 면적 25 cm², I/C 0.15; performance 82, exactness 73 | 무료 McKone 원문은 6:4 **몰비** 전구체, 침전/환원 분말, Ti 위 도포를 다룬다. Table 1의 직접 측정 예는 1 mg/cm², 2 M KOH, 25 °C, 20 mA/cm²에서 70 mV. 현재 질량비와 막/니켈펠트 조립체 조건은 이 예와 다르다. | 직접 NiMo 문헌으로 교체 가능. 조성과 조립체 기본값은 자동 치환하지 않음. |
| 같은 파일 `/candidates/2` `mos2-acidic-her-cathode` | MoS2 100 wt%; 1.5 mg/cm², 면적 25 cm², I/C 0.25; performance 76, exactness 70 | 연결된 `nmat4564`는 저자명 정정문. 원 논문 DOI는 `nmat4465`. 연결된 `nmat4660`의 무료 초록은 단층 MoS2와 기판의 전기적 결합을 설명하며, 현재 분말/막 조립체 조건의 직접 증거가 아니다. | DOI 수정 권고. 100 wt% 분말과 CCM 기본값은 proxy로 유지. |
| 같은 파일 `/candidates/3` `ru-c2n-her` | Ru/C2N = 30/70 wt%; 후보 자체 `electrode_defaults` 없음; performance 90, exactness 72 | 무료 SI Table S1-S2에는 0.285 mg/cm²의 전극 시험이 있다. Fig. S6는 TGA 곡선이며 정확한 Ru 30 wt%를 텍스트로 확인하지 못했다. 그래프 잔류질량을 검증되지 않은 조성 보정에 사용하지 않음. | 현재 30 wt%의 `screening assumption` 표시 유지. Pt/C 조립체 제조 경로가 Ru@C2N 합성법을 재현한다고 간주하지 않음. |

## 승인된 최소 수정과 적용 결과

아래 B01–B11은 루트가 모두 승인한 뒤 이 하위 작업에서 적용했다. 기존 값과 수정 문구를 함께 보존한다. 경로 앞의 `M`은 `backend/data/co2_methanol_benchmark.json`, `H`는 `backend/data/hydrogen_evolution_benchmark.json`을 뜻한다. 조성·가격·점수를 동결하는 메타데이터 수정은 현재 엔진에서 비용과 순위 숫자를 바꾸지 않는다.

| ID | 파일 / JSON 경로 | 기존 값 또는 주장 | 제안 값 / 처리 | 수치·점수·조성 영향 | 적용 결정 |
|---|---|---|---|---|---|
| B01 | H `/citations/9/url` | `https://doi.org/10.1038/nmat4564` | `https://doi.org/10.1038/nmat4465`. 필요하면 정정문은 별도 인용으로만 보존. 원 DOI와 제목을 Crossref에서 확인함. | 없음. `performance_index=76`, 조성/전극값 유지. | **적용 완료.** DOI 교체 처리. |
| B02 | H `/citations/3/note`, `/candidates/0/literature_basis_ids` | Stamenkovic Pt3M을 저담지 HER 근거로 설명 | 인용 메모: `ORR study on Pt3M alloy surfaces; mechanistic context only, not direct HER or Pt/C electrode-assembly evidence.` 후보의 직접 근거 목록에서는 해당 ID 제외. | 가격 근거 점수에는 영향 없음. HER 직접 성능 근거로 표시하지 않음. | **적용 완료.** 반응 귀속 수정 및 직접 목록 제외 처리. |
| B03 | M `/citations/2/note`, `/candidates/2/literature_basis_ids` | In2O3 methanol operando/dynamics 근거 | 메모: `Photothermocatalytic CO2-to-CO study on In-embedded In2O3; mechanistic context only, not direct methanol-performance evidence.` 후보 목록에서 `in2o3-dynamics-ncomms-2022` 제외. | 숫자 변화 없음. 해당 논문의 99.99% 선택성은 CO이며 메탄올 선택성으로 전용 불가. | **적용 완료.** 직접 목록 제외 처리. |
| B04 | M `/citations/0/note` | ZnZrOx methanol route만 설명 | `Study of ternary Cu-ZnO-ZrO2 interactions, with binary controls; not a measured Cu/ZnO/Al2O3 recipe.` | 현 CZA 질량비 45/25/30과 가격 유지. | **적용 완료.** 화학계 설명 수정 처리. |
| B05 | H `/citations` 새 항목, `/candidates/1/literature_basis_ids` | NiMo 직접 근거가 Gong NiO/Ni 및 광범위 리뷰 | ID 제안 `mckone-nimo-acscatal-2013`, DOI `10.1021/cs300691m`, `kind: literature`. 메모: `Unsupported Ni-Mo nanopowders prepared by precipitation/reduction; 6:4 Ni:Mo precursor molar ratio. Table 1 reports 70 mV at 20 mA/cm2 with 1 mg/cm2 in 2 M KOH at 25 C. The COMET 70/30 wt% recipe and electrode defaults remain screening assumptions.` NiMo 후보에서 Gong ID를 이 ID로 교체. | 현재 70/30 wt%, 2 mg/cm², 성능 82는 유지. 몰비를 질량비처럼 복사하지 않음. | **적용 완료.** 무료 원문/보충자료가 있는 교체 근거로 추가 처리. |
| B06 | M `/candidates/1/decision_notes`, 해당 `/route_templates/1/route_note` | 정밀 인터페이스 조립을 일반 단계 비용으로 설명 | `The cited Cu/ZrOx-MgO study uses liquid-phase ALD. Its 14/21/65 wt% representation and generic processing chain are unvalidated screening proxies; ALD-specific processing cost is not estimated.` | 14/21/65, 단계 단가 및 ALD 미산정 유지. | **적용 완료.** 한계 명시 처리. 무료 SI 확보 전 실제 제조법 일치 주장 금지. |
| B07 | M `/candidates/2/decision_notes` | 55 wt% In 저온 경로를 여러 첨가금속 연구로 뒷받침 | `Cited Ni/Pd-promoted and flame-made oxide systems provide architectural context. They do not validate this 55 wt% elemental-In/45 wt% ZrO2 recipe, temperature window, or assigned performance score.` | 55/45, 온도창, 점수 유지. 임의로 5 wt% In2O3 또는 0.75 wt% Pd를 추가하지 않음. | **적용 완료.** 맥락/실험 구분 처리. |
| B08 | M `/candidates/3/summary`, `/citations/9/note` | 조건 일부가 빠진 0.96/78%/500 h 및 `record` 표현 | `Nominal 0.75 wt% Pd/In2O3 prepared by co-precipitation sustained 0.96 gMeOH/(h gcat) with 78% methanol selectivity after 500 h at 553 K, 5 MPa, H2/CO2=4 and WHSV 48000 cm3(STP)/(h gcat) in the 2019 study.` 현재 최고 기록이라는 의미의 `record` 삭제. | 명목 0.75 유지. 초기 1.01과 안정화 후 0.96을 혼합하지 않음. | **적용 완료.** 조건 및 시점 명시 처리. |
| B09 | M `/candidates/3/decision_notes/1` | CZA 체인을 사용하면서 `matching the source preparation` | `Co-precipitation is source-supported; the reused Cu-Zn-Al processing chain and its labels are a costing proxy, not the reported Pd/In2O3 recipe.` | 공유 CZA 경로/계산식/추가비 유지. | **적용 완료.** 후보 메모만 수정 처리. 공유 경로 이름을 전역 변경하지 않음. |
| B10 | H `/candidates/3/decision_notes/1`, `/candidates/3/components/1/pricing/note` | C2N 합성 전구체를 melamine 가격의 바닥값으로 연결 | `C2N is an engineering price proxy. The public supplementary methods identify hexaaminobenzene preparation; no source-matched melamine-to-C2N cost conversion or bulk C2N quotation was verified.` | C2N 5 USD/lb와 신뢰도 50은 동결. 이 문헌만으로 새로운 가격 또는 LCA 계수 도출 불가. | **적용 완료.** melamine 근거 주장 제거 처리. |
| B11 | H `/citations/12/note`, `/candidates/3/summary` | 초록의 acid/base 13.5/17.0 mV 및 Ru 가격이 Pt의 약 1/3이라는 표현 | 초록 값을 인용한다면 `abstract-reported`로 한정하고 `SI Table S1 gives 22 mV in acid at 10 mA/cm2; the discrepancy is unresolved in this audit.` 추가. 고정 가격비는 `Relative Ru/Pt cost depends on the selected price basis.`로 대체. | SI 수치를 임의 평균하거나 13.5를 몰래 22로 치환하지 않음. 가격·성능 점수는 그대로. | **적용 완료.** 상충 값과 가격 시점 한계 명시 처리. |

## 점수가 근거를 과장하는지

`backend/core/decision_engine.py::_weighted_evidence_score`는 재료 항목별 `cost_per_lb_cat × evidence.confidence_score` 합을 재료비 합으로 나눈 값이다. 문헌 개수, DOI의 반응 적합성, 실험 조건 일치율을 읽지 않는다. `scores.evidence`와 `evidence_summary.weighted_confidence_score`는 따라서 **가격 근거 신뢰도**다. 위 DOI/메모/인용 연결만 수정해도 이 값이 바뀌지 않는 것이 현재 구현의 정상 동작이다.

`_route_score`는 `route_confidence`, `manufacturing_readiness`, `screening_exactness`의 평균이고, `scores.performance`는 `performance_index`를 그대로 사용한다. 예를 들어 In2O3-ZrO2의 exactness 83과 performance 92는 위 문헌 대조가 입증한 측정값이 아니다. 코드의 기존 `score_basis_note`도 이 값들이 편집자 점수라고 명시한다. 이를 물성치처럼 다시 검증하거나 임의 감점 수식을 만들면 또 다른 근거 없는 숫자가 생긴다.

최소 변경 권고는 계산식을 유지하면서 벤치마크 전용 출력의 의미를 명확히 하는 것이다.

| 경로 | 기존 | 제안 | 영향 / 적용 결정 |
|---|---|---|---|
| `frontend/src/pages/Compare.tsx`의 `winner.scores.evidence` 표시, `frontend/src/pages/CalculatorResult.tsx`의 `benchmarkCandidate.scores.evidence` 표시 | `t('Evidence')` | `t('Price evidence')`; i18n 한국어 `가격 근거` | 점수/순위 불변. 벤치마크 점수 라벨에만 적용 권고. 다른 원자료 출처 패널을 일괄 치환하지 않음. |
| 해당 후보의 `decision_notes`와 인용 `note` | 문헌 구조와 현재 조성/전극 기본값의 차이가 불명확 | 위 B02-B11의 직접 근거/맥락/모델 가정 설명을 표시 | 수치 불변. 기존 API와 자료 구조 안에서 적용 가능. |
| 문헌 신뢰도 점수 신설 또는 현재 `scores.evidence`의 자동 감점 | 현재 없음 | 이번 수정에서는 도입하지 않음 | 평가 기준과 점수 보정의 검증 데이터가 없으므로 보류 권고. |

새 직접 문헌이 있어도 `performance_index`를 원문 STY·과전압·전류밀도로 단순 치환하지 않는다. 열촉매의 gMeOH/(h gcat), 전극의 mg/cm²·mA/cm²·mV, 상용 조립체의 비용은 비교 축이 다르며 온도·압력·전해질·기판·측정 방식까지 맞아야 한다.

## 확인하지 못한 것과 유지한 가정

- Cu/ZrOx-MgO의 정확한 14/21/65 wt% 배합과 현재 공정 체인의 실험 일치 여부는 무료 SI/저자 원문으로 확인하지 못했다. ALD 단가를 유도하지 않는다.
- In 55/ZrO2 45 wt%, CZA 45/25/30 wt%, HER 전극 면적·막·이오노머·기판 기본값을 동일 조건으로 검증하는 실험은 확보하지 못했다. 현재 proxy 상태를 유지한다.
- Ru@C2N의 초록과 SI 산성 과전압 차이를 iR 보정, 전극 상태 또는 오타로 단정하지 않았다. 30 wt% 조성도 TGA 그림에서 임의 역산하지 않았다.
- 공개 SI는 C2N 가격이나 cradle-to-gate GWP/CED를 제공하지 않는다. Carbon/C2N에 다른 재료의 LCA 값을 대입하거나 실측 제조 원가 비교를 만들어 넣지 않았다.
- Crossref의 DOI/제목 확인은 25개 기존 인용과 2개 제안 DOI에 대해 완료했지만, 초록/제목만 확인한 다른 인용의 모든 성능 수치까지 검증된 것은 아니다.

반영한 근거 교정은 잘못 연결된 정정 DOI, 반응이 다른 문헌의 직접 성능 귀속, NiMo 직접 문헌 교체, Pd 시험 조건, C2N 전구체/고정 가격비 설명이다. 비용·조성·점수는 검증되지 않은 실험값으로 바꾸지 않고 유지하는 것이 이번에 승인받아 적용한 변경 범위다.
