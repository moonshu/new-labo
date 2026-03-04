# 서비스 설계 적용 인사이트 (강화판)

## 0) 목적
- 목표: Thought Mapping System을 "비개입적 AI" 철학을 유지하면서도, 근거성/검증가능성/재현성을 갖춘 사유 기록 시스템으로 고도화한다.
- 근거: 인지과학(편향/작업기억), 논증 이론(반박 가능성), 온톨로지/프로비넌스(구조/출처), RAG(근거 기반 생성).

## 1) 설계 불변조건 (Non-Negotiables)
1. AI는 판단을 대체하지 않는다. AI는 "구조화와 검증 질문"만 제공한다.
2. 모든 자동 제안은 출처와 생성 근거를 남긴다.
3. 사용자는 언제든 AI 제안과 자동 분류를 수정/거절할 수 있다.
4. 사유 기록은 결과물보다 변화 궤적을 우선한다.
5. 고위험 제안(결론 강요, 근거 부족)은 기본 차단한다.

## 2) 논문 기반 핵심 인사이트

### 2-1. 인지과학 인사이트
- 휴리스틱 편향은 기본값이다. 따라서 편향 방지 UI가 필수다.
- 작업기억은 제한적이다. 긴 입력 플로우보다 청크형 편집이 안정적이다.
- 사고 체계는 자동(빠름)/통제(느림) 모드가 공존한다. 인터페이스가 이 전환을 지원해야 한다.

서비스 적용:
- `Editor`에 "빠른 기록"/"검증 모드" 2단계를 명시한다.
- 저장 직후 "편향 점검 질문"을 2~3개 제시한다.
- 긴 텍스트를 claim 단위로 자동 분할해 인지 부하를 줄인다.

### 2-2. 논증/논리 인사이트
- 주장만 저장하면 추적성이 약하다. 주장-근거-반박 구조를 함께 저장해야 한다.
- 예외 규칙과 반박 가능성(Defeasible Logic)을 처리해야 실제 사고 흐름을 반영할 수 있다.

서비스 적용:
- 노드 단위를 `claim/evidence/refutation/open_questions`로 확장한다.
- `RightDrawer`에서 논증 그래프(공격/지지 관계)를 편집 가능하게 한다.
- "반박 없음" 상태의 결론 노드는 경고 배지를 붙인다.

### 2-3. 온톨로지/프로비넌스 인사이트
- 온톨로지는 도메인 공통 언어를 만든다. 기능 확장 시 구조 붕괴를 방지한다.
- PROV/FAIR 원칙은 데이터 재사용성과 감사 가능성을 보장한다.

서비스 적용:
- 핵심 엔터티를 고정: `ThoughtNode`, `Problem`, `Theme`, `Claim`, `Evidence`, `Source`, `InferenceRun`.
- 모든 AI 분석 결과에 provenance 메타데이터를 저장한다.
- 내보내기(JSON)에 PROV 필드를 포함해 재현 가능한 기록으로 만든다.

### 2-4. RAG/추론 인사이트
- 검색 품질이 생성 품질 상한을 결정한다.
- 단일 경로 추론보다 다중 경로 합의(Self-Consistency)가 안정적이다.
- Tool 사용형 추론(ReAct)은 행동 로그를 남길 때 신뢰성이 올라간다.

서비스 적용:
- 내부 지식 검색은 `sparse + dense` 혼합 검색을 기본으로 설계한다.
- 고위험 응답은 n-sample 합의 점수 임계치 통과 시에만 노출한다.
- 도구 호출/검색 경로를 사용자에게 요약 공개한다.

## 3) 데이터/추론 계약 (Data & Reasoning Contract)

### 3-1. ThoughtNode 확장 스키마 (초안)
```json
{
  "id": "string",
  "content": "string",
  "status": "DRAFT|HESITATED|CONCLUDED",
  "claims": [
    {
      "id": "string",
      "text": "string",
      "confidence": 0.0,
      "supports": ["claim_id"],
      "attacks": ["claim_id"]
    }
  ],
  "evidence": [
    {
      "id": "string",
      "type": "internal_note|external_source|retrieved_doc",
      "source_ref": "url_or_node_id",
      "relevance": 0.0
    }
  ],
  "provenance": {
    "analyzer_version": "string",
    "prompt_hash": "string",
    "retrieval_ids": ["string"],
    "generated_at": "ISO-8601"
  }
}
```

### 3-2. 추론 결과 표시 계약
- 최소 표시 항목: `요약 결론`, `근거 1개 이상`, `불확실성 라벨`, `검증 질문`.
- 결론 확정 조건: 근거 다양성 점수/반박 대응률/합의 점수 임계치 통과.

## 4) 평가 프레임워크 (Metrics)

### 4-1. 제품 KPI
1. Evidence Coverage: 결론 노드 중 근거 링크를 가진 비율
2. Contradiction Resolution Rate: 충돌 주장 중 해결 상태로 전환된 비율
3. Reflection Completion Rate: 방치 문제 넛지 이후 후속 기록 생성률
4. Hallucination Proxy: 근거 미첨부 AI 제안 비율
5. User Override Health: AI 제안에 대한 사용자 수정/거절 비율

### 4-2. 품질 게이트
- Gate A (출시 전): Evidence Coverage >= 0.9
- Gate B (출시 전): Hallucination Proxy <= 0.05
- Gate C (운영): Reflection Completion Rate 주간 하락폭 <= 10%

## 5) 리스크 통제
1. 과개입 리스크: AI 제안 수를 회당 최대 3개로 제한
2. 허위 권위 리스크: 근거 없는 제안은 "참고 아이디어" 라벨 강제
3. 프라이버시 리스크: 개인 노트 검색 인덱스는 기본 로컬 우선
4. 구조 복잡도 리스크: 온톨로지 변경은 버전 태깅과 마이그레이션 로그 의무화

## 6) 운영 정책
- 감사 로그 보관: AI 분석 요청/응답/근거 ID를 추적 가능하게 저장
- 실험 정책: 핵심 지표 악화 시 자동 롤백
- UX 원칙: "한 번에 한 판단"(single-decision step) 유지

## 7) 실행 우선순위 (요약)
1. Claim/Evidence/Provenance 데이터 구조 도입
2. RightDrawer 논증 그래프 편집기 도입
3. 근거 기반 AI 제안 정책 적용
4. 실험 대시보드(Evidence/Hallucination/Override) 구축
5. 고위험 제안 게이팅(Self-Consistency, 반박 체크)
