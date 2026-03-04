# 인사이트 반영 서비스 기능 보완 계획 (실행형 v2)

## 0) 문서 목적
- 강화 인사이트를 실제 제품 기능과 테스트 가능한 산출물로 연결한다.
- 개발 완료 기준을 "구현됨"이 아니라 "작동 검증 + 보완 완료"로 정의한다.

## 1) 범위와 원칙

### 1-1. 이번 사이클 범위
- F1. Evidence-Linked Thought Node
- F2. Argument Graph in RightDrawer
- F3. Provenance & Audit Trail
- F4. Evidence-Aware Suggestion Policy
- F5. Experiment Dashboard

### 1-2. 제품 불변 원칙
1. AI는 판단을 대체하지 않는다.
2. 결론은 근거와 함께 저장된다.
3. 사용자 수정/거절 가능성이 항상 유지된다.
4. 모든 AI 산출물은 provenance를 남긴다.

## 2) 현재 갭 진단 (요약)
1. `status/theme/problem` 중심 구조로 근거성 부족
2. 주장-근거-반박 구조 미흡
3. AI 생성 경로(provenance) 가시성 부족
4. 품질 지표(근거성/환각성/사용자 통제) 운영 부재

## 3) 기능 설계 및 수용 기준

### F1. Evidence-Linked Thought Node
- 구현 항목:
1. `ThoughtNode` 스키마에 `claims`, `evidence`, `provenance` 추가
2. Editor 저장 단계에서 근거 연결 UI 제공
3. 결론(`CONCLUDED`) 노드는 근거 누락 경고 상태 기록
- 수용 기준:
1. 신규 저장 노드 100%가 provenance 필드 보유
2. `CONCLUDED` 노드에 evidence 0개면 warning=true
3. 내보내기/가져오기 후 claims/evidence/provenance 유실 0건

### F2. Argument Graph in RightDrawer
- 구현 항목:
1. RightDrawer에 주장(Claim) 편집 섹션 추가
2. claim 간 `supports/attacks` 관계 편집
3. 반박 충돌(REFUTATION) 목록 노출
- 수용 기준:
1. claim 추가/수정/삭제 가능
2. supports/attacks 변경 후 저장 및 재조회 일치
3. 반박 관계 목록이 active node 기준으로 정확히 표시

### F3. Provenance & Audit Trail
- 구현 항목:
1. AI 분석 응답에 provenance 메타데이터 포함
2. 노드 상세에서 analyzerVersion/promptHash/generatedAt 표시
3. export JSON에 provenance 일괄 포함
- 수용 기준:
1. AI 기반 저장 노드의 provenance 누락률 0%
2. provenance 표시 UI가 active node 전환 시 즉시 갱신

### F4. Evidence-Aware Suggestion Policy
- 구현 항목:
1. AI 응답에 `uncertaintyLabel`, `evidenceHints` 추가
2. 품질 게이트 함수 도입 (근거/불확실성/고위험 규칙)
3. 게이트 미통과 제안은 저장 차단 또는 상태 강등
- 수용 기준:
1. 근거 없는 `CONCLUDED` 제안은 저장 불가
2. 사용자에게 차단 사유가 문구로 노출
3. 제안 편집 시 게이트 상태가 즉시 재계산

### F5. Experiment Dashboard
- 구현 항목:
1. Evidence Coverage / Hallucination Proxy / Override Rate / Reflection Completion Rate 계산
2. 대시보드 요약 카드 표시
3. 임계치 이탈 경고 표시
- 수용 기준:
1. 지표 계산 오류 없이 0~1 범위로 정규화
2. 노드 추가/수정 후 지표가 실시간 갱신
3. 임계치 위반 항목이 시각적으로 구분됨

## 4) 테스트 계획

### 4-1. 자동 테스트
1. 도메인 테스트: schema 확장, gate 판정, metrics 계산, import/export 안정성
2. API 테스트: fallback 응답 구조(`uncertaintyLabel`, `evidenceHints`, `provenance`) 보장
3. 회귀 테스트: 기존 핵심 기능(add/update/remove/filter) 유지

### 4-2. 수동 테스트
1. 결론 노드 저장 시 근거 없으면 차단되는지
2. claim supports/attacks 편집 후 재오픈 시 유지되는지
3. RightDrawer provenance 표시가 노드 전환에 따라 바뀌는지
4. 대시보드 지표가 저장 직후 변경되는지

## 5) 미흡점 보완 루프 (필수)
- 각 기능별로 최소 3개 미흡점을 도출한다.
- 미흡점 분류: UX / 데이터정합성 / 성능 / 회귀리스크
- 도출 즉시 보완 코드를 반영하고 재테스트한다.

보완 루프 절차:
1. 기능별 테스트 수행
2. 미흡점 3개 기록
3. 코드 보완
4. 재테스트
5. 변경 로그 기록

## 6) 실행 로드맵 (이번 작업 세션)
1. 타입/도메인/API 확장
2. Editor/RightDrawer/대시보드 UI 연결
3. 테스트 실행 및 실패 수정
4. 기능별 미흡점 3개씩 보완
5. 결과 리포트 작성

## 7) 완료 판정
- 구현 + 테스트 + 기능별 3개 보완이 모두 끝나야 완료로 간주한다.

## 8) 이번 실행 결과 (2026-03-05)
- [x] F1~F5 기능 도입
- [x] 자동 테스트 통과 (`npm test`)
- [x] 정적 검증 통과 (`npm run lint`)
- [x] 빌드 검증 통과 (`npm run build`)
- [x] 기능별 미흡점 3개씩 도출 및 보완
- 세부 리포트: `research/FEATURE_ENHANCEMENT_REVIEW.md`

## 9) 기능-코드 추적 매트릭스
- F1. Evidence-Linked Thought Node
1. 타입: `src/types/thought.ts`
2. 도메인 저장/정합성: `src/lib/domain/thought-system.ts`
3. 입력 UI: `src/components/canvas/Editor.tsx`
4. 경고 노출: `src/components/views/Timeline.tsx`

- F2. Argument Graph in RightDrawer
1. 주장/관계 편집 UI: `src/components/shared/RightDrawer.tsx`
2. claim sanitize: `src/lib/domain/thought-system.ts`
3. 업데이트 저장: `src/store/useSystemStore.ts`

- F3. Provenance & Audit Trail
1. AI 응답 provenance: `src/app/api/ai/analyze/route.ts`
2. 노드 상세 표시: `src/components/shared/RightDrawer.tsx`
3. 마이그레이션/보정: `src/store/useSystemStore.ts`, `src/lib/domain/thought-system.ts`

- F4. Evidence-Aware Suggestion Policy
1. 프롬프트 스키마: `src/lib/ai/prompts.ts`, `src/app/api/ai/analyze/route.ts`
2. 게이트 판정: `src/lib/domain/thought-system.ts`
3. 저장 차단 UX: `src/components/canvas/Editor.tsx`, `src/components/shared/RightDrawer.tsx`

- F5. Experiment Dashboard
1. 지표 계산: `src/lib/domain/thought-system.ts`
2. 요약 카드/임계치: `src/components/views/DashboardWorkspace.tsx`

## 10) 운영 적용 계획 (Stage Gate)
1. Stage A - 개발 검증
- 조건: `npm test`, `npm run lint`, `npm run build` 전부 통과
- 산출물: 기능/리뷰 문서 최신화

2. Stage B - 내부 사용자 검증
- 조건: 수동 시나리오 4종(근거 없는 결론 차단, claim 관계 저장, provenance 전환, 지표 실시간 갱신) 통과
- 산출물: 이슈 로그 + 우선순위 태깅(P0/P1/P2)

3. Stage C - 제한 배포
- 조건: warning count 급증 없음, override rate 과도 상승 없음
- 산출물: 주간 운영 리포트

## 11) 롤백/완화 기준
1. P0 회귀(저장 불가/데이터 유실) 발생 시 즉시 이전 릴리스로 롤백
2. 품질 게이트 오탐 증가 시 `CONCLUDED` 강제 차단 정책을 UI 경고 모드로 임시 완화
3. 지표 계산 오류 시 Dashboard 카드 숨김 후 hotfix 배포

## 12) 다음 사이클 백로그
1. claim relation 시각화(미니 그래프)
2. evidence type별 가중치 모델(외부문헌 > 내부노트)
3. provenance diff 뷰(초안 대비 사용자 수정 라인 하이라이트)
