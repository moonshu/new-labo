# 기능 도입 후 테스트 및 미흡점 보완 리포트

## 테스트 실행 결과
- `npm test`: 19 tests passed
- `npm run lint`: passed
- `npm run build`: passed

## F1. Evidence-Linked Thought Node

### 발견된 미흡점 (3)
1. 근거(sourceRef) 중복 입력이 그대로 저장될 수 있음
2. 결론 노드의 근거 부족 경고가 타임라인에서 바로 보이지 않음
3. 근거 relevance 값이 범위를 벗어날 수 있음

### 보완 내용
1. 근거 dedupe 추가 (대소문자 무시) 및 정규화
2. 타임라인에 `근거 부족` 경고 배지 추가
3. relevance 입력/저장 시 0~1 clamp 적용

### 반영 위치
- `src/lib/domain/thought-system.ts`
- `src/components/canvas/Editor.tsx`
- `src/components/views/Timeline.tsx`

## F2. Argument Graph in RightDrawer

### 발견된 미흡점 (3)
1. 동일 target에 supports/attacks가 동시에 설정될 수 있음
2. claim 삭제 후 고아 참조(없는 claim id)가 남을 수 있음
3. 빈 claim 텍스트가 저장될 수 있음

### 보완 내용
1. 관계 토글 시 반대 관계 자동 제거(상호배타)
2. claim graph sanitize 로직 추가(자기참조/고아참조 제거)
3. 저장 전 유효 claim(비어있지 않은 텍스트) 검증

### 반영 위치
- `src/components/shared/RightDrawer.tsx`
- `src/lib/domain/thought-system.ts`

## F3. Provenance & Audit Trail

### 발견된 미흡점 (3)
1. 생성 시각이 날짜 단위로만 보여 상세 추적이 어려움
2. retrievalIds가 UI에서 보이지 않아 근거 체인 확인이 어려움
3. 기존 저장 데이터(구버전)의 provenance 누락 시 위험

### 보완 내용
1. 날짜+시간 포맷 표시(`formatKoreanDateTime`) 추가
2. provenance 섹션에 retrievalIds 개수/목록 표시
3. store migration(v4)에서 구버전 데이터를 parse/보정

### 반영 위치
- `src/lib/domain/thought-system.ts`
- `src/components/shared/RightDrawer.tsx`
- `src/store/useSystemStore.ts`

## F4. Evidence-Aware Suggestion Policy

### 발견된 미흡점 (3)
1. 품질 게이트가 결론 상태에만 제한적으로 적용됨
2. 근거 입력 시 공백/중복 정규화가 부족함
3. 게이트 사유가 저장 시점에만 확인되어 피드백이 늦음

### 보완 내용
1. 저장 시 품질 게이트 미통과면 전체 차단
2. Editor에서 근거 입력 정규화 + 중복 방지 강화
3. 제안 패널에서 게이트 상태/사유를 실시간 표시

### 반영 위치
- `src/components/canvas/Editor.tsx`
- `src/lib/domain/thought-system.ts`
- `src/app/api/ai/analyze/route.ts`

### 추가 강화 (일관성)
1. RightDrawer 편집에서도 `CONCLUDED + evidence 0` 저장 차단
2. 저장 실패 시 실패 원인을 토스트 설명으로 노출

추가 반영 위치:
- `src/components/shared/RightDrawer.tsx`

## F5. Experiment Dashboard

### 발견된 미흡점 (3)
1. 지표 임계치 기준이 화면에 노출되지 않음
2. 위험 노드 수(warning count)를 한눈에 보기 어려움
3. 지표 pass/fail 상태가 운영자 관점에서 약함

### 보완 내용
1. 각 지표 카드에 임계치 텍스트 표시
2. `Warnings` 카드 추가(concluded 대비 경고 수)
3. 임계치 충족 여부에 따른 색상 상태 표시 강화

### 반영 위치
- `src/components/views/DashboardWorkspace.tsx`
- `src/lib/domain/thought-system.ts`

## 추가 검증
- 도메인 테스트 확장:
1. evidence dedupe/claim 정리 테스트
2. quality gate 실패 조건 테스트
3. quality metrics 범위 테스트
4. import 시 claim/evidence 정합성 자동 보정 테스트

- 반영 파일:
`src/lib/domain/thought-system.test.ts`
