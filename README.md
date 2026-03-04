# Thought Mapping System (사유 시스템)

사고의 "완성된 결과"보다 "변화의 궤적"을 기록하는 개인용 웹 애플리케이션입니다.  
사용자는 빈 캔버스에 생각을 남기고, AI는 개입하지 않고 최소한의 맥락 신호만 제안합니다.

## 핵심 철학

- 비개입적 AI: AI는 정답 제시/평가를 하지 않고 상태 분류와 연결 가능성만 제안
- 개인 중심: 커뮤니티 반응이나 공유 최적화보다 개인의 사유 과정 보존
- 사고 노드 중심: 완결된 글이 아닌 "파편적 생각" 자체를 기록 단위로 취급

## 이 앱이 하는 일

1. The Canvas
- 생각을 자유롭게 입력하는 메인 에디터
- 입력 중 포커스 모드와 간단한 상호작용 제공
- "아직 모르겠음"으로 즉시 파편화(유보) 가능

2. AI 분석 제안
- `POST /api/ai/analyze`로 입력 텍스트 분석
- 아래 3가지를 JSON으로 반환받아 칩(Chips) 형태로 제안
  - `status`: `DRAFT | HESITATED | CONCLUDED`
  - `themeName`
  - `problemTitle`

3. Timeline / Graph 뷰
- 타임라인에서 사고 흐름을 시간순으로 확인
- 우측 드로어에서 관계성(그래프) 영역 제공
- 문제별 딥링크 라우트(`/problem/[id]`) 지원

4. 로컬 우선 사유 운영 장치
- LocalStorage 기반 데이터 지속성 (새로고침 후 유지)
- Thought Streak(최근 70일 기록 밀도) 시각화
- 방치 문제(72시간+)에 대한 비강제 회고 신호 및 컨텍스트 넛지

## 현재 구현 상태 (2026-03-05 기준)

### 구현됨

- Next.js App Router 기반 메인 레이아웃
- Sidebar + Canvas + Timeline + Right Drawer 기본 UI
- Zustand 기반 캔버스/시스템 상태 관리
- Gemini(`@ai-sdk/google`) 기반 AI 분석 API 연결
- AI 실패 시 서버 폴백 분석(앱 동작 지속)
- 문제/주제/노드/관계의 로컬 저장 및 자동 관계 추론
- 문제 상태 순환(OPEN/PENDING/RESOLVED) 및 문제별 필터
- 핵심 도메인 단위 테스트(`vitest`) 5종

### 진행 중 / 예정

- Supabase 기반 인증/영구 저장소 연동
- Timeline/Graph의 실제 데이터 연동 (현재는 mock/placeholder 포함)
- 강압적 개입 UI 제거 및 "미세 신호 중심" UX 정교화
- 문제/주제/관계 객체의 실제 CRUD 및 시각화 강화

## 기술 스택

- Framework: Next.js 16 (App Router), React 19
- Styling/UI: Tailwind CSS v4, shadcn/ui, Radix UI
- State: Zustand
- Motion: Framer Motion
- AI: Vercel AI SDK (`ai`), `@ai-sdk/google`
- DB/Auth (planned): Supabase

## 빠른 시작

### 1) 요구사항

- Node.js 20+ 권장
- npm

### 2) 설치 및 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 3) 환경 변수

`.env.local`:

```bash
# Required for AI analysis route
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key-here

# Planned (Supabase integration phase)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 스크립트

```bash
npm run dev     # 개발 서버
npm run build   # 프로덕션 빌드
npm run start   # 프로덕션 실행
npm run lint    # ESLint
npm run test    # Vitest (단위 테스트)
npm run test:watch
```

## API 개요

### `POST /api/ai/analyze`

Request:

```json
{
  "content": "사용자 입력 텍스트",
  "existingThemes": [],
  "activeProblems": []
}
```

Response:

```json
{
  "status": "DRAFT",
  "themeName": "주제 키워드",
  "problemTitle": "핵심 질문"
}
```

## 디렉토리 개요

```text
src/
├── app/
│   ├── (dashboard)/           # 메인 화면 레이아웃/페이지
│   └── api/ai/analyze/        # AI 분석 API
├── components/
│   ├── canvas/                # Editor
│   ├── views/                 # Timeline 등
│   └── shared/                # Sidebar, Drawer, Overlay
├── store/                     # Zustand 스토어
└── lib/                       # 프롬프트/유틸
```

## 프로젝트 문서

- `AI_HANDOFF.md`: 제품 철학 및 AI 역할 원칙
- `AI_SYSTEM_ALIGNMENT.md`: 기존 스펙과 비개입 원칙 정렬 결과
- `SYSTEM_DESIGN.md`: UI/UX 상세 설계
- `INFRA_PLAN.md`: 인프라/아키텍처/개발 페이즈

## 참고

- `button-dashboard/`는 본 앱과 분리된 UI 실험용(Vite) 폴더입니다.
