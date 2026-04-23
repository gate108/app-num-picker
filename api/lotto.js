// api/lotto.js - Vercel Serverless Function
// 동행복권 API CORS 프록시
export default async function handler(req, res) {
  const { round } = req.query;

  if (!round || isNaN(round)) {
    return res.status(400).json({ error: "round 파라미터가 필요합니다" });
  }

  try {
    const response = await fetch(
      `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${round}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://www.dhlottery.co.kr/",
        },
      }
    );

    if (!response.ok) {
      return res.status(502).json({ error: "동행복권 API 오류" });
    }

    const data = await response.json();

    // CORS 헤더 설정
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
