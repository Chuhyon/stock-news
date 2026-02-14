INSERT INTO stocks (code, name_ko, name_en, sector, is_top_10) VALUES
('005930', '삼성전자', 'Samsung Electronics', '전자/반도체', true),
('000660', 'SK하이닉스', 'SK Hynix', '반도체', true),
('373220', 'LG에너지솔루션', 'LG Energy Solution', '2차전지', true),
('207940', '삼성바이오로직스', 'Samsung Biologics', '바이오', true),
('005380', '현대차', 'Hyundai Motor', '자동차', true),
('051910', 'LG화학', 'LG Chem', '화학/2차전지', true),
('006400', '삼성SDI', 'Samsung SDI', '2차전지', true),
('035420', 'NAVER', 'Naver Corp', 'IT/플랫폼', true),
('035720', '카카오', 'Kakao Corp', 'IT/플랫폼', true),
('028260', '삼성물산', 'Samsung C&T', '건설/패션', true)
ON CONFLICT (code) DO UPDATE SET
  name_ko = EXCLUDED.name_ko,
  name_en = EXCLUDED.name_en,
  sector = EXCLUDED.sector,
  is_top_10 = EXCLUDED.is_top_10;
