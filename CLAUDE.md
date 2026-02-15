# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Development server (localhost:3000)
npm run build     # Production build
npm run start     # Start production server
npm run lint      # ESLint
```

No test framework is configured.

## Architecture

KOSPI AI 뉴스 분석 웹앱. Next.js 16 App Router + Supabase + OpenAI로 매일 자동으로 뉴스를 수집하고 AI 분석을 수행한다.

### Tech Stack
- **Next.js 16** (App Router, React 19, TypeScript strict)
- **Supabase** - PostgreSQL DB (서버: service role key, 클라이언트: anon key)
- **OpenAI** - GPT-4o-mini(요약), GPT-4o(유망주 분석)
- **Tailwind CSS 4** - 다크 테마 UI
- **rss-parser** - Google News RSS 수집

### Data Flow
1. Vercel Cron (`/api/cron`) → 매일 UTC 15:00 (KST 00:00) 자동 실행
2. Google News RSS로 종목별 뉴스 수집 → `news_articles` 테이블 (URL 기준 중복 제거)
3. GPT-4o-mini로 종목별 뉴스 요약 → `ai_summaries` 테이블
4. GPT-4o로 전체 분석 후 유망주 3개 선정 → `daily_analysis` + `stocks.is_high_potential` 업데이트
5. 프론트엔드는 서버 컴포넌트 SSR + 1시간 ISR revalidation

### Key Directories
- `src/config/stocks.ts` - KOSPI 10종목 정의 (코드, 이름, 검색 키워드)
- `src/config/constants.ts` - AI 모델, 토큰 한도, 일일 비용 제한 등 설정값
- `src/lib/supabase/` - 서버/클라이언트 Supabase 클라이언트
- `src/lib/ai/` - OpenAI 래퍼, 뉴스 요약기, 유망주 분석기
- `src/lib/api/` - RSS 파서, 주가 API 등 외부 연동
- `src/types/` - Stock, NewsArticle, AISummary 등 타입 정의
- `supabase/migrations/` - DB 스키마 (RLS 활성화, public read-only)

### DB Tables
- `stocks` - 종목 마스터 (is_top_10, is_high_potential 플래그)
- `news_articles` - 뉴스 (url unique constraint)
- `ai_summaries` - 종목별 일일 AI 요약 (stock_code+date unique)
- `daily_analysis` - 일일 종합 분석 (analysis_date unique)
- `api_usage_log` - OpenAI 비용 추적

### Import Alias
`@/*` → `./src/*`

### Environment Variables
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `NEWSAPI_KEY`, `CRON_SECRET`
