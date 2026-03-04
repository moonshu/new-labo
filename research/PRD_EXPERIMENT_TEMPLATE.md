# 논문 구조 모방 PRD 실험 템플릿

## 사용 방법
- 이 템플릿은 기능 PRD + 실험 설계를 한 문서에 결합한 형태다.
- 아래 섹션을 순서대로 채우면 바로 구현/실험/판정까지 가능하다.

---

## 1) 문서 메타
- PRD 제목:
- 작성일:
- 담당자:
- 관련 기능:
- 관련 인사이트 문서: `research/SERVICE_DESIGN_INSIGHTS.md`
- 관련 핵심 논문:

## 2) 문제 정의 (Problem Statement)
- 현재 사용자 문제:
- 비즈니스/제품 리스크:
- 왜 지금 해결해야 하는가:

## 3) 가설 (Hypothesis)
- 1차 가설:
- 2차 가설:
- 반증 조건 (falsification):

예시:
- "근거 링크를 기본 노출하면 사용자의 결론 수정 품질이 높아진다."

## 4) 사용자/시나리오
- 대상 사용자:
- 핵심 시나리오 3개:
1.
2.
3.

## 5) 기능 요구사항
- Functional
1.
2.
3.
- Non-Functional
1. 응답시간 SLO:
2. 로그/감사 요구:
3. 안전성 제약:

## 6) 데이터/모델 계약
- 입력 스키마:
- 출력 스키마:
- 저장 필드(필수): `claim`, `evidence`, `provenance`, `status`
- 버전 정책:

## 7) 실험 설계 (Experiment Design)

### 7-1. 실험군/대조군
- Control:
- Treatment A:
- Treatment B (optional):

### 7-2. 데이터셋
- 평가 데이터 출처:
- 샘플 수:
- 라벨링 기준:
- 품질 점검 절차:

### 7-3. 핵심 지표
- Primary Metric:
- Secondary Metrics:
- Guardrail Metrics:

권장 기본 지표:
1. Evidence Coverage
2. Hallucination Proxy
3. Contradiction Resolution Rate
4. User Override Rate
5. Response Latency p95

### 7-4. 통계/판정
- 최소 검출 효과(MDE):
- 유의수준/검정법:
- 실험 기간:
- 조기중단 규칙:

## 8) 리스크 및 대응
- 과개입 리스크:
- 프라이버시 리스크:
- 성능 리스크:
- 실패 시 롤백 계획:

## 9) 출시 게이트 (Go/No-Go)
- Gate 1 (품질):
- Gate 2 (안전):
- Gate 3 (성능):
- Gate 4 (사용자 신뢰):

Go 조건 예시:
- Evidence Coverage >= 0.90
- Hallucination Proxy <= 0.05
- p95 Latency <= 2.0s

## 10) 구현 백로그
1. API 변경:
2. UI 변경:
3. 상태관리 변경:
4. 로그/모니터링:
5. 테스트:

## 11) 테스트 계획
- 단위 테스트:
- 통합 테스트:
- 회귀 테스트:
- 실사용 점검 체크리스트:

## 12) 운영 계획
- 배포 전략:
- 모니터링 대시보드:
- 온콜/장애 대응:
- 주간 리뷰 항목:

---

# 빠른 복제용 미니 템플릿

## [기능명]
- 문제:
- 가설:
- 핵심 지표:
- 출시 게이트:
- 구현 범위(In/Out):
- 일정:
