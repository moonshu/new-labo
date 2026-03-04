# 핵심 12편 기반 MVP 설계 원칙

## 0) 선정 기준
- 제품 적합성: 현재 서비스(사유 캔버스, 타임라인, 우측 드로어, 비개입적 AI)에 직접 연결 가능한가
- 구조 적합성: "사유 기록"을 데이터 구조/검증 구조로 변환하는 근거를 주는가
- 검증 가능성: 실험 지표와 품질 게이트로 전환 가능한가

## 1) 핵심 12편

| # | 논문 | 연도 | 왜 MVP에 중요한가 | 즉시 반영 포인트 |
|---|---|---:|---|---|
| 1 | Judgment under Uncertainty: Heuristics and Biases ([link](https://doi.org/10.1126/science.185.4157.1124)) | 1974 | 사용자의 판단 오류를 시스템이 기본적으로 고려해야 함 | 편향 점검 질문 자동 제시 |
| 2 | The magical number 4 in short-term memory ([link](https://doi.org/10.1017/s0140525x01003922)) | 2001 | 긴 입력/복잡 UI는 사고 품질을 떨어뜨릴 수 있음 | 입력/검토 단계를 3~4개 청크로 제한 |
| 3 | On the acceptability of arguments... ([link](https://doi.org/10.1016/0004-3702(94)00041-x)) | 1995 | 주장 수용성 계산의 형식적 기반 제공 | claim-attack 그래프 모델 도입 |
| 4 | Defeasible logic programming ([link](https://doi.org/10.1017/s1471068403001674)) | 2004 | 예외/반박이 있는 현실적 추론 흐름 반영 | 반박 우선 규칙과 충돌 로그 |
| 5 | A translation approach to portable ontology specifications ([link](https://doi.org/10.1006/knac.1993.1008)) | 1993 | 특정 저장소/구현과 분리된 지식 구조 필요 | 온톨로지 계층을 앱 로직과 분리 |
| 6 | Ontology Development 101 ([link](http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.136.5085)) | 2002 | 도메인 모델링 절차의 실무 표준 | 범위-클래스-속성 워크숍 운영 |
| 7 | Named graphs, provenance and trust ([link](https://doi.org/10.1145/1060745.1060835)) | 2005 | 출처 단위 추적의 핵심 메커니즘 | 그래프/노드 단위 source id 부여 |
| 8 | PROV-O: The PROV Ontology ([link](http://www.w3.org/TR/2013/REC-prov-o-20130430/)) | 2013 | 생성 경로를 표준 온톨로지로 표현 가능 | provenance 필드 표준화 |
| 9 | FAIR Guiding Principles ([link](https://doi.org/10.1038/sdata.2016.18)) | 2016 | 재사용 가능한 데이터 운영 원칙 | 내보내기/검색/재사용 설계 기준 |
|10| Dense Passage Retrieval ([link](https://doi.org/10.18653/v1/2020.emnlp-main.550)) | 2020 | 근거 검색 품질을 크게 개선 | sparse+dense 하이브리드 검색 |
|11| Retrieval-Augmented Generation ([link](http://arxiv.org/abs/2005.11401v4)) | 2020 | 생성 결과를 외부 근거와 결합 | 답변+근거 동시 반환 의무화 |
|12| ReAct ([link](http://arxiv.org/abs/2210.03629v3)) | 2022 | 추론과 도구 행동을 연결 | 도구 호출 단계 로그 공개 |

## 2) 핵심 원칙 (MVP Rules)

### 2-1. 필수 원칙
1. `Evidence-first`: 결론보다 근거가 먼저 보이게 한다.
2. `Human-final`: 최종 판단은 항상 사용자가 한다.
3. `Claim graph`: 텍스트를 주장/반박 그래프로 구조화한다.
4. `Provenance-default`: 모든 AI 산출물에 출처 메타데이터를 붙인다.
5. `Chunked cognition`: UI와 워크플로우는 작업기억 한계를 넘지 않게 분할한다.

### 2-2. 금지 원칙
1. 근거 없는 결론 제안
2. 사용자가 끌 수 없는 강제 자동 분류
3. 추론 경로가 보이지 않는 블랙박스 추천

### 2-3. 측정 원칙
1. 최소 1개 근거 링크 없는 AI 제안은 실패로 계산
2. 반박 가능한 결론 노드 비율을 추적
3. 사용자 수정/거절률을 건강지표로 본다 (낮다고 무조건 좋은 것 아님)

## 3) MVP 범위 정의
- In-Scope
  - Claim/Evidence 구조 저장
  - 근거 링크 포함 AI 제안
  - RightDrawer 논증 관계 편집
  - 기본 provenance 기록
- Out-of-Scope
  - 완전 자동 결론 생성
  - 장문 보고서 자동 작성
  - 다중 에이전트 자율 의사결정

## 4) MVP 성공 기준
1. 결론 노드의 90% 이상이 근거 링크를 포함
2. AI 제안 중 사용자 무조건 수용 비율이 아니라 "수정 가능한 사용성" 지표 확보
3. 방치 문제 회고 전환률(넛지 이후 기록 생성률) 유의미 개선
