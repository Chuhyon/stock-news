# PRD — AI 주식 뉴스 분석 (stock-news)

## 1. 제품 개요

**제품명:** AI 주식 뉴스
**URL:** Vercel 배포 (Next.js 앱)
**목적:** KOSPI·NASDAQ 상위 10개 종목의 뉴스를 매일 자동 수집하고, AI가 분석하여 유망주를 선정해 보여주는 웹 서비스
**타겟:** 국내 개인 투자자

### 핵심 가치
- 매일 오전 6시·오후 6시 자동으로 뉴스 수집 및 AI 분석 실행
- KOSPI·NASDAQ 20개 종목을 한 곳에서 한국어로 확인
- GPT가 선정한 오늘의 유망주 3종목 (시장별) 제공

---

## 2. 기능 명세

### 2-1. 메인 페이지 (`/`)
- KOSPI / NASDAQ 탭 전환
- 각 탭에서:
  - 오늘의 유망주 3종목 (점수·선정 이유 포함)
  - 시장 종합 분석 요약
  - 전체 종목 목록 (AI 감성 뱃지: positive / neutral / negative)
  - 최신 뉴스 피드 (최대 20건)

### 2-2. 종목 상세 페이지 (`/stocks/[code]`)
- 종목별 AI 요약 (오늘)
- 핵심 포인트 3개
- 최근 뉴스 목록

### 2-3. 자동 갱신 (GitHub Actions)
- 매일 KST 06:00, 18:00 자동 실행
- 뉴스 수집 → AI 요약 → 유망주 분석 순서로 처리
- 실패 시 GitHub Actions 탭에서 로그 확인 가능

---

## 3. 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 16 (App Router, React 19) |
| 언어 | TypeScript (strict) |
| 스타일 | Tailwind CSS 4 (다크 테마) |
| DB | Supabase (PostgreSQL) |
| AI | OpenAI GPT-4o-mini (요약), GPT-4o (유망주 분석) |
| 뉴스 수집 | Google News RSS (`rss-parser`) |
| 자동화 | GitHub Actions |
| 배포 | Vercel (Hobby 플랜) |

---

## 4. 프로젝트 구조

```
stock-news/
├── .github/
│   └── workflows/
│       └── daily-update.yml      # GitHub Actions 스케줄
├── scripts/
│   └── daily-update.ts           # 독립 실행 갱신 스크립트
├── src/
│   ├── app/
│   │   ├── page.tsx              # 메인 페이지 (SSR + 1h ISR)
│   │   ├── layout.tsx
│   │   ├── stocks/[stockCode]/
│   │   │   └── page.tsx          # 종목 상세 페이지
│   │   └── api/
│   │       ├── cron/route.ts     # Vercel Cron 엔드포인트 (백업)
│   │       ├── stocks/route.ts   # 전체 종목 목록 API
│   │       ├── stocks/[code]/route.ts     # 종목 상세 API
│   │       ├── stocks/[code]/news/route.ts # 종목별 뉴스 API
│   │       └── news/route.ts     # 뉴스 목록 API
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   ├── market/
│   │   │   └── MarketTabs.tsx    # KOSPI/NASDAQ 탭 컴포넌트
│   │   ├── stock/
│   │   │   ├── StockList.tsx
│   │   │   ├── StockCard.tsx
│   │   │   └── PotentialBadge.tsx
│   │   └── news/
│   │       ├── NewsFeed.tsx
│   │       ├── NewsCard.tsx
│   │       └── AISummary.tsx
│   ├── config/
│   │   ├── stocks.ts             # 20개 종목 정의 (코드·키워드)
│   │   ├── constants.ts          # AI 모델 설정, ISR 주기, 비용 한도
│   │   └── news-sources.ts
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── server.ts         # service role 클라이언트
│   │   │   ├── client.ts         # anon key 클라이언트
│   │   │   └── types.ts          # DB 타입 정의
│   │   ├── ai/
│   │   │   ├── openai.ts         # OpenAI 클라이언트 래퍼
│   │   │   ├── summarizer.ts     # 종목별 뉴스 요약
│   │   │   └── analyzer.ts       # 유망주 분석
│   │   └── api/
│   │       ├── rss-parser.ts     # Google News RSS 파서
│   │       ├── newsapi.ts        # NewsAPI 연동 (미사용)
│   │       └── stock-price.ts    # 주가 API (미사용)
│   └── types/
│       ├── stock.ts              # Stock, AISummary, DailyAnalysis 타입
│       └── news.ts
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   └── 002_add_market_column.sql
│   ├── functions/                # Supabase Edge Functions (미사용)
│   └── seed.sql
├── vercel.json                   # 빈 설정 ({})
└── package.json
```

---

## 5. DB 스키마

### stocks
| 컬럼 | 타입 | 설명 |
|------|------|------|
| code | text (PK) | 종목코드 (예: 005930, AAPL) |
| name_ko | text | 한국어 종목명 |
| name_en | text | 영문 종목명 |
| sector | text | 업종 |
| market | text | KOSPI \| NASDAQ |
| is_top_10 | bool | 상위 10종목 여부 |
| is_high_potential | bool | 오늘의 유망주 여부 |
| potential_score | int | AI 선정 점수 (0~100) |
| last_price | numeric | 최근 주가 (미사용) |
| price_change_pct | numeric | 등락률 (미사용) |

### news_articles
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| stock_code | text (FK) | 종목코드 |
| title | text | 기사 제목 (NASDAQ은 한국어 번역본) |
| description | text | 기사 요약 (최대 500자) |
| url | text (UNIQUE) | 기사 원문 URL (중복 방지 기준) |
| source | text | Google News KR \| Google News EN |
| language | text | ko \| en |
| published_at | timestamptz | 기사 발행일시 |
| created_at | timestamptz | DB 삽입일시 |

### ai_summaries
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| stock_code | text | 종목코드 |
| date | date | 분석 날짜 |
| summary_text | text | AI 요약 (3~5문장) |
| key_points | text[] | 핵심 포인트 3개 |
| sentiment_overall | text | positive \| neutral \| negative |
| model | text | gpt-4o-mini |
| token_usage | int | 사용 토큰 수 |
| cost_usd | numeric | 비용 (USD) |
| UNIQUE | | stock_code + date |

### daily_analysis
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| analysis_date | date | 분석 날짜 |
| market | text | KOSPI \| NASDAQ |
| selected_stocks | jsonb[] | 유망주 3종목 (code, name_ko, score, reason) |
| analysis_summary | text | 시장 종합 분석 |
| UNIQUE | | analysis_date + market |

### api_usage_log
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| service | text | openai |
| endpoint | text | 모델:용도:시장 |
| tokens_used | int | 사용 토큰 |
| cost_usd | numeric | 비용 (USD) |
| created_at | timestamptz | |

---

## 6. 데이터 흐름

```
[GitHub Actions] KST 06:00 / 18:00
        │
        ▼
scripts/daily-update.ts
        │
        ├─ Step 1: 뉴스 수집
        │   ├─ KOSPI 10종목
        │   │   ├─ 한국어 뉴스: Google News KR RSS → 최대 5건/종목
        │   │   └─ 영어 뉴스:  Google News EN RSS → 최대 3건/종목 (원문 저장)
        │   └─ NASDAQ 10종목
        │       └─ 영어 뉴스: Google News EN RSS → 최대 5건/종목
        │           └─ GPT-4o-mini로 한국어 번역 후 저장
        │   → upsert news_articles (URL 기준 중복 제거)
        │
        ├─ Step 2a: 종목별 AI 요약 (시장별 반복)
        │   ├─ 각 종목 최신 뉴스 10건 조회
        │   ├─ GPT-4o-mini 호출 → summary, key_points, sentiment
        │   └─ upsert ai_summaries (stock_code+date 기준)
        │
        └─ Step 2b: 시장별 유망주 분석
            ├─ 전체 종목 뉴스 헤드라인 취합
            ├─ GPT-4o 호출 → 유망주 3종목 + 시장 종합 분석
            ├─ stocks.is_high_potential 플래그 업데이트
            ├─ upsert daily_analysis (analysis_date+market 기준)
            └─ insert api_usage_log

[사용자 접속]
        │
        ▼
Next.js 메인 페이지 (SSR, revalidate: 1시간)
        ├─ Supabase: stocks + ai_summaries (오늘) 조회
        ├─ Supabase: news_articles 최신 20건 조회
        └─ Supabase: daily_analysis (오늘) 조회
```

---

## 7. AI 처리 상세

### 뉴스 수집 전략
- **KOSPI 한국어**: `keywords_ko[0]`로 Google News KR RSS 검색, 5건 수집
- **KOSPI 영어**: `keywords_en[0]`로 Google News EN RSS 검색, 3건 수집 (원문)
- **NASDAQ**: `keywords_en[0]`로 Google News EN RSS 검색, 5건 수집 후 GPT-4o-mini 일괄 번역

### AI 모델 역할 분리
| 모델 | 역할 | 비용 |
|------|------|------|
| gpt-4o-mini | 종목별 뉴스 요약, NASDAQ 뉴스 번역 | 낮음 ($0.15/1M input, $0.6/1M output) |
| gpt-4o | 시장별 유망주 선정 분석 | 높음 ($2.5/1M input, $10/1M output) |

### 1회 실행 예상 비용
- gpt-4o-mini (요약 20종목): ~$0.003
- gpt-4o (분석 2시장): ~$0.018
- **합계: ~$0.02 / 1회 실행** (일 2회 기준 ~$0.04/일)

---

## 8. 환경변수

| 변수 | 용도 | 설정 위치 |
|------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Vercel + GitHub Secrets |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 (클라이언트) | Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 키 (서버 전용) | Vercel + GitHub Secrets |
| `OPENAI_API_KEY` | OpenAI API 키 | Vercel + GitHub Secrets |
| `CRON_SECRET` | `/api/cron` 엔드포인트 인증 (미설정) | — |

---

## 9. 자동화 스케줄

| 트리거 | 실행 시각 | 소요 시간 |
|--------|-----------|-----------|
| GitHub Actions (cron) | KST 매일 06:00 | ~7분 |
| GitHub Actions (cron) | KST 매일 18:00 | ~7분 |
| GitHub Actions (manual) | workflow_dispatch | 즉시 |
| Vercel Cron (비활성) | — | — (설정 제거됨) |

---

## 10. 향후 개선 가능 항목

- [ ] 뉴스 수집 키워드 다양화 (현재 각 종목당 1개 키워드만 사용)
- [ ] 주가 데이터 연동 (`last_price`, `price_change_pct` 컬럼 활용)
- [ ] 뉴스 감성 분석 결과를 종목 카드에 더 시각적으로 표시
- [ ] 유망주 히스토리 페이지 (과거 선정 내역 조회)
- [ ] OpenAI 비용 한도 초과 알림 (`dailyCostLimitUsd: 3` 설정 활용)
- [ ] `CRON_SECRET` 설정 후 `/api/cron` 엔드포인트도 정상화
