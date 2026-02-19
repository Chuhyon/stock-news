# Work Log — stock-news

## 2026-02-19

### GitHub Actions 자동 갱신 전환

**배경**
Vercel Hobby 플랜의 서버리스 함수 타임아웃(60초) 때문에 기존 Vercel Cron(`/api/cron`)이 실행되지 못하는 문제가 있었음. 뉴스 수집 + AI 분석 전체 작업이 실제로 약 7분 소요되어 타임아웃 초과가 필연적. 또한 `CRON_SECRET` 환경변수도 미설정 상태였음.

**작업 내용**

1. **`scripts/daily-update.ts` 신규 생성**
   - `src/app/api/cron/route.ts`의 핵심 로직을 추출
   - Next.js 의존성(`NextRequest`, `NextResponse`) 제거, 순수 Node.js 스크립트로 재작성
   - `@/` 경로 alias 대신 상대경로(`../src/config/stocks`, `../src/types/stock`) 사용
   - 환경변수 누락 시 명확한 오류 메시지 출력 후 `process.exit(1)`
   - 실행 중 단계별 콘솔 로그 추가 (진행상황 추적 가능)
   - 유망주 분석 실패 시 비정상 종료 코드 반환 (GitHub Actions 실패 감지용)

2. **`.github/workflows/daily-update.yml` 신규 생성**
   - 초기: `0 15 * * *` (KST 00:00) 1일 1회
   - 최종: `0 21 * * *` (KST 06:00), `0 9 * * *` (KST 18:00) 1일 2회로 변경
   - `workflow_dispatch` 지원 (수동 실행 가능)
   - `timeout-minutes: 30` 설정 (Vercel 60초 제한 완전 우회)
   - `npm ci` + `npx tsx` 조합으로 의존성 설치 후 실행

3. **`package.json` 수정**
   - `tsx ^4.21.0` devDependency 추가 (TypeScript 파일 직접 실행)
   - `"update": "tsx scripts/daily-update.ts"` npm 스크립트 추가

4. **`vercel.json` 정리**
   - 기존 cron 설정 제거 (`{}`로 초기화)
   - GitHub Actions가 역할 완전 대체

**트러블슈팅**
- 1차 실행 실패: 워크플로우의 `cache-dependency-path: stock-news/package-lock.json`, `working-directory: stock-news` 설정이 잘못됨
  - 원인: git 리포지토리 루트가 `stock-news/` 자체이므로, 경로 앞에 `stock-news/`를 붙이면 안 됨
  - 수정: `cache-dependency-path: package-lock.json`, `working-directory` 제거

**검증 결과**
- 수동 실행(workflow_dispatch) 성공
- 소요 시간: 약 7분 (Vercel 60초 제한 대비 7배 여유)
- 뉴스 수집: 130건 삽입 (created_at 기준 118건 신규)
- ai_summaries: KOSPI 10종목 + NASDAQ 10종목 = 20종목 전부 생성
- daily_analysis: KOSPI·NASDAQ 각 유망주 3종목 선정 완료
- 에러: 0건

**GitHub Secrets 설정 (사용자 직접)**
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- 위치: Repository Settings → Secrets and variables → Actions → Repository secrets
