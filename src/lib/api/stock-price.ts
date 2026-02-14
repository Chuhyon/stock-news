// 주가 정보 - 간단한 스크래핑 또는 API로 가져오기
// 실제 운영 시 KRX API나 증권사 API로 교체 가능

export async function fetchStockPrice(code: string): Promise<{
  price: number;
  changePct: number;
} | null> {
  try {
    // Google Finance에서 간단히 조회 (무료)
    const url = `https://www.google.com/finance/quote/${code}:KRX`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) return null;

    const html = await res.text();

    // 가격 추출 (간단한 파싱)
    const priceMatch = html.match(/data-last-price="([^"]+)"/);
    const changeMatch = html.match(/data-last-normal-market-change-percent="([^"]+)"/);

    if (!priceMatch) return null;

    return {
      price: parseFloat(priceMatch[1]),
      changePct: changeMatch ? parseFloat(changeMatch[1]) : 0,
    };
  } catch {
    console.error(`Failed to fetch price for ${code}`);
    return null;
  }
}
