// api/lotto.js - Vercel Serverless Function
// 동행복권 API CORS 프록시 (강건성 강화)
export const config = { runtime: 'nodejs', regions: ['icn1'] };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  const round = req.query?.round ?? new URL(req.url, "http://x").searchParams.get("round");

  if (!round || isNaN(round)) {
    return res.status(400).json({ error: "round 파라미터가 필요합니다", got: round });
  }

  const upstream = `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${round}`;

  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);

    const response = await fetch(upstream, {
      signal: ctl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        "Referer": "https://www.dhlottery.co.kr/gameResult.do?method=byWin",
        "Origin": "https://www.dhlottery.co.kr",
      },
    });
    clearTimeout(timer);

    const text = await response.text();

    if (!response.ok) {
      return res.status(502).json({ error: "upstream not ok", status: response.status, body: text.slice(0, 200) });
    }

    let data;
    try { data = JSON.parse(text); }
    catch { return res.status(502).json({ error: "upstream returned non-JSON", body: text.slice(0, 200) }); }

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error?.message || String(error), name: error?.name });
  }
}
