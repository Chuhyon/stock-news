import type { MarketType } from '@/types/stock';

export interface StockConfig {
  code: string;
  name_ko: string;
  name_en: string;
  sector: string;
  market: MarketType;
  keywords_ko: string[];
  keywords_en: string[];
}

export const KOSPI_TOP_10: StockConfig[] = [
  {
    code: '005930',
    name_ko: '삼성전자',
    name_en: 'Samsung Electronics',
    sector: '전자/반도체',
    market: 'KOSPI',
    keywords_ko: ['삼성전자', '삼성 반도체', '삼성 갤럭시'],
    keywords_en: ['Samsung Electronics', 'Samsung semiconductor', 'Samsung Galaxy'],
  },
  {
    code: '000660',
    name_ko: 'SK하이닉스',
    name_en: 'SK Hynix',
    sector: '반도체',
    market: 'KOSPI',
    keywords_ko: ['SK하이닉스', 'SK 하이닉스', 'HBM'],
    keywords_en: ['SK Hynix', 'SK Hynix HBM', 'SK Hynix memory'],
  },
  {
    code: '373220',
    name_ko: 'LG에너지솔루션',
    name_en: 'LG Energy Solution',
    sector: '2차전지',
    market: 'KOSPI',
    keywords_ko: ['LG에너지솔루션', 'LG 배터리'],
    keywords_en: ['LG Energy Solution', 'LG battery'],
  },
  {
    code: '207940',
    name_ko: '삼성바이오로직스',
    name_en: 'Samsung Biologics',
    sector: '바이오',
    market: 'KOSPI',
    keywords_ko: ['삼성바이오로직스', '삼성바이오'],
    keywords_en: ['Samsung Biologics'],
  },
  {
    code: '005380',
    name_ko: '현대차',
    name_en: 'Hyundai Motor',
    sector: '자동차',
    market: 'KOSPI',
    keywords_ko: ['현대차', '현대자동차', '현대 전기차'],
    keywords_en: ['Hyundai Motor', 'Hyundai EV'],
  },
  {
    code: '051910',
    name_ko: 'LG화학',
    name_en: 'LG Chem',
    sector: '화학/2차전지',
    market: 'KOSPI',
    keywords_ko: ['LG화학', 'LG 화학'],
    keywords_en: ['LG Chem', 'LG Chemical'],
  },
  {
    code: '006400',
    name_ko: '삼성SDI',
    name_en: 'Samsung SDI',
    sector: '2차전지',
    market: 'KOSPI',
    keywords_ko: ['삼성SDI', '삼성 SDI', '삼성 배터리'],
    keywords_en: ['Samsung SDI', 'Samsung battery'],
  },
  {
    code: '035420',
    name_ko: 'NAVER',
    name_en: 'Naver Corp',
    sector: 'IT/플랫폼',
    market: 'KOSPI',
    keywords_ko: ['네이버', 'NAVER', '네이버 AI'],
    keywords_en: ['Naver', 'Naver Corp', 'Naver AI'],
  },
  {
    code: '035720',
    name_ko: '카카오',
    name_en: 'Kakao Corp',
    sector: 'IT/플랫폼',
    market: 'KOSPI',
    keywords_ko: ['카카오', 'Kakao', '카카오톡'],
    keywords_en: ['Kakao', 'Kakao Corp', 'KakaoTalk'],
  },
  {
    code: '028260',
    name_ko: '삼성물산',
    name_en: 'Samsung C&T',
    sector: '건설/패션',
    market: 'KOSPI',
    keywords_ko: ['삼성물산', '삼성 물산'],
    keywords_en: ['Samsung C&T', 'Samsung Construction'],
  },
];

export const NASDAQ_TOP_10: StockConfig[] = [
  {
    code: 'AAPL',
    name_ko: 'Apple',
    name_en: 'Apple Inc.',
    sector: 'Technology',
    market: 'NASDAQ',
    keywords_ko: [],
    keywords_en: ['Apple stock', 'Apple Inc', 'AAPL'],
  },
  {
    code: 'MSFT',
    name_ko: 'Microsoft',
    name_en: 'Microsoft Corp.',
    sector: 'Technology',
    market: 'NASDAQ',
    keywords_ko: [],
    keywords_en: ['Microsoft stock', 'Microsoft Corp', 'MSFT'],
  },
  {
    code: 'NVDA',
    name_ko: 'NVIDIA',
    name_en: 'NVIDIA Corp.',
    sector: 'Semiconductors',
    market: 'NASDAQ',
    keywords_ko: [],
    keywords_en: ['NVIDIA stock', 'NVIDIA Corp', 'NVDA'],
  },
  {
    code: 'GOOG',
    name_ko: 'Alphabet',
    name_en: 'Alphabet Inc.',
    sector: 'Technology',
    market: 'NASDAQ',
    keywords_ko: [],
    keywords_en: ['Google stock', 'Alphabet Inc', 'GOOG'],
  },
  {
    code: 'AMZN',
    name_ko: 'Amazon',
    name_en: 'Amazon.com Inc.',
    sector: 'E-Commerce',
    market: 'NASDAQ',
    keywords_ko: [],
    keywords_en: ['Amazon stock', 'Amazon.com', 'AMZN'],
  },
  {
    code: 'META',
    name_ko: 'Meta',
    name_en: 'Meta Platforms Inc.',
    sector: 'Social Media',
    market: 'NASDAQ',
    keywords_ko: [],
    keywords_en: ['Meta Platforms stock', 'META stock', 'Facebook Meta'],
  },
  {
    code: 'TSLA',
    name_ko: 'Tesla',
    name_en: 'Tesla Inc.',
    sector: 'Automotive/EV',
    market: 'NASDAQ',
    keywords_ko: [],
    keywords_en: ['Tesla stock', 'Tesla Inc', 'TSLA'],
  },
  {
    code: 'AVGO',
    name_ko: 'Broadcom',
    name_en: 'Broadcom Inc.',
    sector: 'Semiconductors',
    market: 'NASDAQ',
    keywords_ko: [],
    keywords_en: ['Broadcom stock', 'Broadcom Inc', 'AVGO'],
  },
  {
    code: 'COST',
    name_ko: 'Costco',
    name_en: 'Costco Wholesale Corp.',
    sector: 'Retail',
    market: 'NASDAQ',
    keywords_ko: [],
    keywords_en: ['Costco stock', 'Costco Wholesale', 'COST'],
  },
  {
    code: 'NFLX',
    name_ko: 'Netflix',
    name_en: 'Netflix Inc.',
    sector: 'Entertainment',
    market: 'NASDAQ',
    keywords_ko: [],
    keywords_en: ['Netflix stock', 'Netflix Inc', 'NFLX'],
  },
];

export const ALL_STOCKS: StockConfig[] = [...KOSPI_TOP_10, ...NASDAQ_TOP_10];

export function getStockByCode(code: string): StockConfig | undefined {
  return ALL_STOCKS.find((s) => s.code === code);
}

export function getStocksByMarket(market: MarketType): StockConfig[] {
  return ALL_STOCKS.filter((s) => s.market === market);
}
