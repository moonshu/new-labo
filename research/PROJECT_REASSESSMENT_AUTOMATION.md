# 프로젝트 재점검 리포트 (자동화 중심)

작성일: 2026-03-05
기준 문서:
- `research/FEATURE_ENHANCEMENT_PLAN.md`
- `research/PHASED_EXECUTION_REPORT.md`

## 1) 사용자 목표 재정의
- 사용자는 "복잡한 수동 조작"이 아니라 "자유롭게 글을 쓰면 AI가 자동 분석"되길 원함.
- 분석 결과는 자동 태깅되어 탐색 가능해야 하며, 결과를 타임라인/노드 그래프 양쪽에서 쉽게 확인해야 함.

## 2) 점검 결과 (갭)
1. 분석 트리거가 수동 버튼 중심이라 작성 흐름이 끊김
2. 태그가 1급 UI로 노출/편집되지 않아 탐색 경험이 약함
3. 그래프는 우측 패널 중심이라 전체 연결 구조를 한눈에 보기 어려움
4. 정보 밀도가 높아 처음 사용자에게 용어/플로우 진입장벽이 큼

## 3) 이번 반영 사항

### A. 자동 분석 흐름
- 입력 후 약 1초 디바운스 자동 분석 도입
- 수동 분석 버튼과 병행(토글로 자동 분석 ON/OFF 가능)
- 자동 분석 중 상태 텍스트 표시

반영 파일:
- `src/components/canvas/Editor.tsx`

### B. 자동 태그 생성/편집/저장 일관화
- AI 응답 `tags` 스키마 강제 + normalize
- Editor 제안 패널에서 태그 칩 추가/삭제/엔터 추가 지원
- 저장 시 `tags`, `evidence` 정규화 후 노드로 반영
- RightDrawer에서도 태그 편집 가능하도록 확장
- 타임라인 카드/그래프 노드에 태그 노출

반영 파일:
- `src/app/api/ai/analyze/route.ts`
- `src/lib/ai/prompts.ts`
- `src/lib/domain/thought-system.ts`
- `src/store/useSystemStore.ts` (persist migration v5)
- `src/components/canvas/Editor.tsx`
- `src/components/shared/RightDrawer.tsx`
- `src/components/views/Timeline.tsx`

### C. 그래프 탐색성 개선
- 대시보드에서 `타임라인 / 노드 그래프` 전환 제공
- 그래프 뷰 신설: 노드/관계선을 한 화면에서 클릭 탐색

반영 파일:
- `src/components/views/GraphView.tsx`
- `src/components/views/DashboardWorkspace.tsx`

### D. 초기 사용성 완화
- 대시보드에 용어 쉬운 설명 토글 추가
- 검색 placeholder에 태그 검색 가능성 명시
- 메인 스크롤 안정화를 위한 `min-h-0`, `overflow` 구조 보정

반영 파일:
- `src/components/views/DashboardWorkspace.tsx`

## 4) 검증 결과
- `npm test` 통과 (22 passed)
- `npm run lint` 통과
- `npm run build` 통과

## 5) 아직 남은 개선 백로그
1. 그래프 레이아웃 고도화
- 현재는 원형 배치 기반이므로 노드 수 증가 시 겹침 가능
- 추후 force-directed 레이아웃으로 개선 필요

2. 자동 분석 트리거 정교화
- 현재는 길이/디바운스 중심
- 추후 문장 경계/의미 변화량 기반 트리거로 개선 필요

3. 초보 사용자 온보딩 고도화
- 용어 설명은 제공하지만, 단계별 인터랙티브 튜토리얼은 미흡
- `research/USER_TEST_TUTORIAL_KR.md` 기반 인앱 체크리스트 연동 필요
