export interface StockConfig {
  code: string;
  name_ko: string;
  name_en: string;
  sector: string;
  keywords_ko: string[];
  keywords_en: string[];
}

export const KOSPI_TOP_10: StockConfig[] = [
  {
    code: '005930',
    name_ko: '삼성전자',
    name_en: 'Samsung Electronics',
    sector: '전자/반도체',
    keywords_ko: ['삼성전자', '삼성 반도체', '삼성 갤럭시'],
    keywords_en: ['Samsung Electronics', 'Samsung semiconductor', 'Samsung Galaxy'],
  },
  {
    code: '000660',
    name_ko: 'SK하이닉스',
    name_en: 'SK Hynix',
    sector: '반도체',
    keywords_ko: ['SK하이닉스', 'SK 하이닉스', 'HBM'],
    keywords_en: ['SK Hynix', 'SK Hynix HBM', 'SK Hynix memory'],
  },
  {
    code: '373220',
    name_ko: 'LG에너지솔루션',
    name_en: 'LG Energy Solution',
    sector: '2차전지',
    keywords_ko: ['LG에너지솔루션', 'LG 배터리'],
    keywords_en: ['LG Energy Solution', 'LG battery'],
  },
  {
    code: '207940',
    name_ko: '삼성바이오로직스',
    name_en: 'Samsung Biologics',
    sector: '바이오',
    keywords_ko: ['삼성바이오로직스', '삼성바이오'],
    keywords_en: ['Samsung Biologics'],
  },
  {
    code: '005380',
    name_ko: '현대차',
    name_en: 'Hyundai Motor',
    sector: '자동차',
    keywords_ko: ['현대차', '현대자동차', '현대 전기차'],
    keywords_en: ['Hyundai Motor', 'Hyundai EV'],
  },
  {
    code: '051910',
    name_ko: 'LG화학',
    name_en: 'LG Chem',
    sector: '화학/2차전지',
    keywords_ko: ['LG화학', 'LG 화학'],
    keywords_en: ['LG Chem', 'LG Chemical'],
  },
  {
    code: '006400',
    name_ko: '삼성SDI',
    name_en: 'Samsung SDI',
    sector: '2차전지',
    keywords_ko: ['삼성SDI', '삼성 SDI', '삼성 배터리'],
    keywords_en: ['Samsung SDI', 'Samsung battery'],
  },
  {
    code: '035420',
    name_ko: 'NAVER',
    name_en: 'Naver Corp',
    sector: 'IT/플랫폼',
    keywords_ko: ['네이버', 'NAVER', '네이버 AI'],
    keywords_en: ['Naver', 'Naver Corp', 'Naver AI'],
  },
  {
    code: '035720',
    name_ko: '카카오',
    name_en: 'Kakao Corp',
    sector: 'IT/플랫폼',
    keywords_ko: ['카카오', 'Kakao', '카카오톡'],
    keywords_en: ['Kakao', 'Kakao Corp', 'KakaoTalk'],
  },
  {
    code: '028260',
    name_ko: '삼성물산',
    name_en: 'Samsung C&T',
    sector: '건설/패션',
    keywords_ko: ['삼성물산', '삼성 물산'],
    keywords_en: ['Samsung C&T', 'Samsung Construction'],
  },
];

export function getStockByCode(code: string): StockConfig | undefined {
  return KOSPI_TOP_10.find((s) => s.code === code);
}
