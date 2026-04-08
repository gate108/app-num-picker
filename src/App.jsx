import { useState, useMemo, useCallback } from "react";

const DATA = {
  totalRounds: 1218, latestRound: 1218,
  allFreq: {1:167,2:152,3:171,4:159,5:153,6:163,7:168,8:156,9:133,10:161,11:164,12:177,13:175,14:170,15:166,16:166,17:169,18:172,19:167,20:168,21:165,22:141,23:147,24:164,25:150,26:164,27:180,28:152,29:153,30:156,31:166,32:142,33:173,34:181,35:161,36:162,37:171,38:169,39:165,40:172,41:147,42:154,43:162,44:161,45:173},
  r50Freq: {1:8,2:3,3:12,4:6,5:8,6:8,7:8,8:8,9:7,10:6,11:6,12:7,13:6,14:4,15:9,16:10,17:7,18:4,19:7,20:6,21:4,22:3,23:8,24:9,25:5,26:7,27:12,28:8,29:6,30:7,31:8,32:5,33:6,34:2,35:7,36:7,37:7,38:8,39:6,40:8,41:6,42:7,43:3,44:6,45:5},
  r20Freq: {1:4,2:2,3:4,4:2,5:3,6:2,7:2,8:3,9:2,10:4,11:1,12:1,13:1,14:1,15:4,16:4,17:3,18:1,19:2,20:3,21:2,22:1,23:3,24:4,25:3,26:2,27:8,28:2,29:2,30:4,31:6,32:3,33:2,34:0,35:4,36:3,37:2,38:5,39:2,40:2,41:2,42:3,43:0,44:3,45:3},
  cold: {1:8,2:9,3:0,4:13,5:5,6:10,7:8,8:1,9:8,10:1,11:5,12:16,13:3,14:2,15:1,16:13,17:8,18:15,19:3,20:1,21:3,22:11,23:2,24:2,25:5,26:7,27:4,28:0,29:1,30:4,31:0,32:0,33:4,34:23,35:7,36:5,37:9,38:5,39:9,40:7,41:6,42:0,43:21,44:3,45:0},
  topPairs: [{a:27,b:38,c:10},{a:3,b:15,c:7},{a:27,b:36,c:6},{a:7,b:9,c:6},{a:15,b:19,c:5},{a:19,b:21,c:5},{a:15,b:27,c:5},{a:15,b:33,c:5},{a:3,b:27,c:5},{a:16,b:28,c:5},{a:30,b:31,c:5},{a:3,b:6,c:5},{a:37,b:40,c:5}],
  recentRounds: [{r:1218,n:[3,28,31,32,42,45],b:25},{r:1217,n:[8,10,15,20,29,31],b:41},{r:1216,n:[3,10,14,15,23,24],b:25},{r:1215,n:[13,15,19,21,44,45],b:39},{r:1214,n:[10,15,19,27,30,33],b:14},{r:1213,n:[5,11,25,27,36,38],b:2},{r:1212,n:[5,8,25,31,41,44],b:45},{r:1211,n:[23,26,27,35,38,40],b:10},{r:1210,n:[1,7,9,17,27,38],b:31},{r:1209,n:[2,17,20,35,37,39],b:24},{r:1208,n:[6,27,30,36,38,42],b:25},{r:1207,n:[10,22,24,27,38,45],b:11},{r:1206,n:[1,3,17,26,27,42],b:23},{r:1205,n:[1,4,16,23,31,41],b:2},{r:1204,n:[8,16,28,30,31,44],b:27}],
  stats: { sumMean:138.2, sumStd:30.8, acMean:8.0, rangeMean:32.7, consecutiveRate:51.7 }
};

const BALL_COLORS = n => {
  if (n <= 10) return { bg: "#FCD34D", text: "#92400E", glow: "#FDE68A" };
  if (n <= 20) return { bg: "#60A5FA", text: "#1E3A5F", glow: "#93C5FD" };
  if (n <= 30) return { bg: "#F87171", text: "#7F1D1D", glow: "#FCA5A5" };
  if (n <= 40) return { bg: "#A78BFA", text: "#3B1F7E", glow: "#C4B5FD" };
  return { bg: "#34D399", text: "#064E3B", glow: "#6EE7B7" };
};

function LottoBall({ num, size = 36, selected, onClick, bonus, grayOut, mini }) {
  const c = BALL_COLORS(num);
  const s = mini ? 26 : size;
  const isActive = selected || bonus;
  return (
    <button
      onClick={onClick}
      style={{
        width: s, height: s, borderRadius: "50%",
        background: grayOut ? "#1F2937" : `radial-gradient(circle at 35% 35%, ${c.glow}, ${c.bg})`,
        color: grayOut ? "#4B5563" : c.text,
        border: selected ? "2.5px solid #F59E0B" : bonus ? "2.5px solid #10B981" : "2px solid rgba(255,255,255,0.12)",
        fontSize: mini ? 10 : s > 38 ? 15 : 13,
        fontWeight: 800,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.15s cubic-bezier(.4,0,.2,1)",
        transform: isActive ? "scale(1.08)" : "scale(1)",
        boxShadow: selected ? `0 0 12px ${c.bg}88` : bonus ? `0 0 10px #10B98188` : grayOut ? "none" : `0 1px 4px ${c.bg}44`,
        flexShrink: 0, padding: 0,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        letterSpacing: -0.5,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {num}
    </button>
  );
}

function FreqBar({ num, value, max, selected, onClick }) {
  const c = BALL_COLORS(num);
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 5, cursor: "pointer",
      padding: "1.5px 3px", borderRadius: 5,
      background: selected ? "rgba(245,158,11,0.1)" : "transparent",
    }}>
      <span style={{ width: 20, textAlign: "right", fontSize: 11, fontWeight: 700, color: selected ? "#F59E0B" : "#9CA3AF", fontFamily: "monospace" }}>{num}</span>
      <div style={{ flex: 1, height: 14, background: "#1F2937", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${c.bg}CC, ${c.bg})`, borderRadius: 3, transition: "width 0.4s ease" }} />
      </div>
      <span style={{ width: 24, textAlign: "right", fontSize: 10, color: "#6B7280", fontWeight: 600, fontFamily: "monospace" }}>{value}</span>
    </div>
  );
}

function ScoreGauge({ label, value, max, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 9, color: "#9CA3AF", marginBottom: 3, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ position: "relative", width: 44, height: 44, margin: "0 auto" }}>
        <svg width="44" height="44" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="17" fill="none" stroke="#1F2937" strokeWidth="4" />
          <circle cx="22" cy="22" r="17" fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={`${pct * 1.068} 106.8`} strokeLinecap="round" transform="rotate(-90 22 22)"
            style={{ transition: "stroke-dasharray 0.8s ease" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color }}>{Math.round(pct)}</div>
      </div>
    </div>
  );
}

function analyzeSelection(selected) {
  if (selected.length !== 6) return null;
  const nums = [...selected].sort((a, b) => a - b);
  const sum = nums.reduce((a, b) => a + b, 0);
  const odd = nums.filter(n => n % 2 === 1).length;
  const low = nums.filter(n => n <= 22).length;
  const range = nums[5] - nums[0];
  const diffs = new Set();
  for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) diffs.add(nums[j] - nums[i]);
  const ac = diffs.size - 5;
  const sumScore = Math.max(0, 100 - Math.abs(sum - DATA.stats.sumMean) / DATA.stats.sumStd * 25);
  const oddScore = (odd >= 2 && odd <= 4) ? 100 : (odd === 1 || odd === 5) ? 50 : 10;
  const lowScore = (low >= 2 && low <= 4) ? 100 : (low === 1 || low === 5) ? 50 : 10;
  const acScore = ac >= 7 ? 100 : ac >= 5 ? 70 : 30;
  const rangeScore = (range >= 25 && range <= 40) ? 100 : (range >= 20) ? 70 : 30;
  return { sum, odd, low, range, ac, sumScore, oddScore, lowScore, acScore, rangeScore, total: Math.round((sumScore + oddScore + lowScore + acScore + rangeScore) / 5) };
}

function smartPick() {
  const weights = {};
  for (let i = 1; i <= 45; i++) {
    weights[i] = DATA.allFreq[i] / DATA.totalRounds * 0.2 + DATA.r50Freq[i] / 50 * 0.3 + DATA.r20Freq[i] / 20 * 0.35 + Math.min(DATA.cold[i] / 20, 1) * 0.15;
  }
  const entries = Object.entries(weights).map(([k, v]) => [parseInt(k), v]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const pick = new Set();
  let attempts = 0;
  while (pick.size < 6 && attempts < 500) {
    let r = Math.random() * total;
    for (const [num, w] of entries) { r -= w; if (r <= 0) { pick.add(num); break; } }
    attempts++;
    if (pick.size === 6) {
      const nums = [...pick].sort((a, b) => a - b);
      const sum = nums.reduce((a, b) => a + b, 0);
      if (sum < 90 || sum > 190) pick.clear();
    }
  }
  return [...pick].sort((a, b) => a - b);
}

export default function LottoPicker() {
  const [selected, setSelected] = useState([]);
  const [tab, setTab] = useState("pick");
  const [freqMode, setFreqMode] = useState("all");
  const [showGuide, setShowGuide] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [savedSets, setSavedSets] = useState([]);

  const toggleNum = useCallback((n) => {
    setSelected(prev => {
      if (prev.includes(n)) return prev.filter(x => x !== n);
      if (prev.length >= 6) return prev;
      return [...prev, n].sort((a, b) => a - b);
    });
  }, []);

  const analysis = useMemo(() => analyzeSelection(selected), [selected]);
  const freqData = useMemo(() => {
    const d = freqMode === "all" ? DATA.allFreq : freqMode === "r50" ? DATA.r50Freq : DATA.r20Freq;
    return Object.entries(d).map(([k, v]) => ({ num: parseInt(k), value: v }));
  }, [freqMode]);
  const maxFreq = useMemo(() => Math.max(...freqData.map(d => d.value)), [freqData]);

  const handleSmartPick = () => {
    setAnimating(true); setSelected([]);
    setTimeout(() => { setSelected(smartPick()); setAnimating(false); }, 600);
  };

  const tabs = [
    { id: "pick", label: "번호 선택", icon: "🎯" },
    { id: "freq", label: "출현 빈도", icon: "📊" },
    { id: "pairs", label: "동반 출현", icon: "🔗" },
    { id: "recent", label: "최근 당첨", icon: "📋" },
  ];
  const card = { background: "#111827", borderRadius: 14, padding: 14, marginBottom: 12, border: "1px solid rgba(55,65,81,0.5)" };

  return (
    <div style={{ minHeight: "100vh", background: "#0A0E17", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#E5E7EB", overflowX: "hidden", WebkitFontSmoothing: "antialiased" }}>
      <div style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)", borderBottom: "1px solid rgba(245,158,11,0.2)", padding: "14px 12px 10px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ fontSize: 24 }}>🎱</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 19, fontWeight: 900, background: "linear-gradient(135deg, #F59E0B, #FBBF24, #F59E0B)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -0.5 }}>로또 번호 분석기</h1>
              <p style={{ margin: 0, fontSize: 11, color: "#6B7280", fontWeight: 500 }}>1~{DATA.latestRound}회 데이터 기반 통계 분석</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: "7px 2px", borderRadius: 6, border: "none",
                background: tab === t.id ? "rgba(245,158,11,0.15)" : "transparent",
                color: tab === t.id ? "#F59E0B" : "#6B7280",
                fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                borderBottom: tab === t.id ? "2px solid #F59E0B" : "2px solid transparent",
                lineHeight: 1.3, WebkitTapHighlightColor: "transparent",
              }}><span style={{ fontSize: 13 }}>{t.icon}</span><br />{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 10px 80px" }}>
        {tab === "pick" && (<div>
          <div style={{ ...card, background: "linear-gradient(135deg, #111827, #1F2937)", border: "1px solid rgba(245,158,11,0.15)", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#F59E0B" }}>선택한 번호 ({selected.length}/6)</span>
              <div style={{ display: "flex", gap: 5 }}>
                <button onClick={handleSmartPick} disabled={animating} style={{ padding: "5px 12px", borderRadius: 18, border: "1px solid #F59E0B", background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))", color: "#F59E0B", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{animating ? "✨ 분석중..." : "🤖 AI 추천"}</button>
                <button onClick={() => setSelected([])} style={{ padding: "5px 10px", borderRadius: 18, border: "1px solid #374151", background: "transparent", color: "#9CA3AF", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>초기화</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", minHeight: 46, alignItems: "center", flexWrap: "wrap" }}>
              {selected.length === 0 ? <span style={{ color: "#4B5563", fontSize: 12 }}>아래에서 번호를 선택하세요</span> :
                selected.map((n, i) => <div key={n} style={{ animation: "popIn 0.3s ease", animationDelay: `${i * 60}ms`, animationFillMode: "both" }}><LottoBall num={n} size={42} selected onClick={() => toggleNum(n)} /></div>)}
            </div>
            {selected.length === 6 && <button onClick={() => setSavedSets(prev => [...prev, [...selected]])} style={{ marginTop: 8, width: "100%", padding: "7px", borderRadius: 8, border: "1px solid #10B981", background: "rgba(16,185,129,0.1)", color: "#10B981", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>💾 이 번호 저장하기</button>}
          </div>

          {analysis && (<div style={{ ...card, border: "1px solid rgba(99,102,241,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#818CF8" }}>📐 통계 적합도</span>
              <div style={{ background: analysis.total >= 70 ? "rgba(16,185,129,0.15)" : analysis.total >= 40 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)", color: analysis.total >= 70 ? "#10B981" : analysis.total >= 40 ? "#F59E0B" : "#EF4444", padding: "3px 10px", borderRadius: 16, fontSize: 12, fontWeight: 800 }}>
                {analysis.total >= 70 ? "🟢" : analysis.total >= 40 ? "🟡" : "🔴"} {analysis.total}점
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, justifyItems: "center" }}>
              <ScoreGauge label={`∑ ${analysis.sum}`} value={analysis.sumScore} max={100} color="#60A5FA" />
              <ScoreGauge label={`홀${analysis.odd}:짝${6-analysis.odd}`} value={analysis.oddScore} max={100} color="#A78BFA" />
              <ScoreGauge label={`저${analysis.low}:고${6-analysis.low}`} value={analysis.lowScore} max={100} color="#F87171" />
              <ScoreGauge label={`AC ${analysis.ac}`} value={analysis.acScore} max={100} color="#34D399" />
              <ScoreGauge label={`↔ ${analysis.range}`} value={analysis.rangeScore} max={100} color="#FCD34D" />
            </div>
            <button onClick={() => setShowGuide(!showGuide)} style={{ marginTop: 8, width: "100%", padding: "5px", borderRadius: 6, border: "none", background: "rgba(129,140,248,0.1)", color: "#818CF8", fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>{showGuide ? "▲ 접기" : "▼ 지표 설명 보기"}</button>
            {showGuide && <div style={{ marginTop: 8, padding: 10, background: "#0F172A", borderRadius: 8, fontSize: 10, lineHeight: 1.7, color: "#9CA3AF" }}>
              <p style={{ margin: "0 0 4px" }}><b style={{ color: "#60A5FA" }}>∑ 합계</b>: 6개 번호의 합. 평균 138, 표준편차 31.</p>
              <p style={{ margin: "0 0 4px" }}><b style={{ color: "#A78BFA" }}>⚖ 홀짝</b>: 3:3이 최빈, 2:4도 양호.</p>
              <p style={{ margin: "0 0 4px" }}><b style={{ color: "#F87171" }}>📏 저고</b>: 1~22 vs 23~45. 3:3 최다.</p>
              <p style={{ margin: "0 0 4px" }}><b style={{ color: "#34D399" }}>🧬 AC</b>: 복잡도(0~10). 7+ 가 70%+.</p>
              <p style={{ margin: 0 }}><b style={{ color: "#FCD34D" }}>↔ 범위</b>: 최대-최소. 25~40 적합.</p>
            </div>}
          </div>)}

          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", marginBottom: 10 }}>1~45 번호판 <span style={{ fontSize: 10, color: "#6B7280", fontWeight: 500 }}>(탭하여 선택)</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5, justifyItems: "center" }}>
              {Array.from({ length: 45 }, (_, i) => i + 1).map(n => (
                <LottoBall key={n} num={n} size={36} selected={selected.includes(n)} grayOut={selected.length >= 6 && !selected.includes(n)} onClick={() => toggleNum(n)} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", justifyContent: "center" }}>
              {[{r:"1~10",c:"#FCD34D"},{r:"11~20",c:"#60A5FA"},{r:"21~30",c:"#F87171"},{r:"31~40",c:"#A78BFA"},{r:"41~45",c:"#34D399"}].map(g => <span key={g.r} style={{ fontSize: 9, color: g.c, fontWeight: 600 }}>● {g.r}</span>)}
            </div>
          </div>

          {savedSets.length > 0 && <div style={{ ...card, border: "1px solid rgba(16,185,129,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#10B981" }}>💾 저장됨 ({savedSets.length})</span>
              <button onClick={() => setSavedSets([])} style={{ padding: "3px 8px", borderRadius: 10, border: "1px solid #374151", background: "transparent", color: "#6B7280", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>전체 삭제</button>
            </div>
            {savedSets.map((set, idx) => <div key={idx} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 5, padding: "5px 6px", background: "#0F172A", borderRadius: 8 }}>
              <span style={{ fontSize: 10, color: "#6B7280", fontWeight: 700, width: 18 }}>#{idx+1}</span>
              <div style={{ display: "flex", gap: 3 }}>{set.map(n => <LottoBall key={n} num={n} mini />)}</div>
              <button onClick={() => setSavedSets(prev => prev.filter((_,i) => i !== idx))} style={{ marginLeft: "auto", background: "none", border: "none", color: "#4B5563", cursor: "pointer", fontSize: 13 }}>×</button>
            </div>)}
          </div>}
        </div>)}

        {tab === "freq" && <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>📊 출현 빈도</span>
            <div style={{ display: "flex", gap: 3 }}>
              {[{id:"all",l:"전체"},{id:"r50",l:"50회"},{id:"r20",l:"20회"}].map(m => <button key={m.id} onClick={() => setFreqMode(m.id)} style={{ padding: "4px 8px", borderRadius: 10, border: "none", background: freqMode === m.id ? "#F59E0B" : "#1F2937", color: freqMode === m.id ? "#000" : "#9CA3AF", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{m.l}</button>)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {freqData.map(d => <FreqBar key={d.num} num={d.num} value={d.value} max={maxFreq} selected={selected.includes(d.num)} onClick={() => toggleNum(d.num)} />)}
          </div>
        </div>}

        {tab === "pairs" && <div style={card}>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>🔗 동반 출현 TOP</span>
            <span style={{ fontSize: 10, color: "#6B7280", marginLeft: 6 }}>최근 100회</span>
          </div>
          {DATA.topPairs.map((p, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "#0F172A", borderRadius: 8, marginBottom: 5, border: (selected.includes(p.a) && selected.includes(p.b)) ? "1px solid rgba(245,158,11,0.3)" : "1px solid transparent" }}>
            <span style={{ color: "#4B5563", fontSize: 11, fontWeight: 700, width: 18 }}>{i+1}</span>
            <LottoBall num={p.a} mini selected={selected.includes(p.a)} onClick={() => toggleNum(p.a)} />
            <span style={{ color: "#374151", fontSize: 12 }}>+</span>
            <LottoBall num={p.b} mini selected={selected.includes(p.b)} onClick={() => toggleNum(p.b)} />
            <div style={{ flex: 1 }} />
            <div style={{ background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, color: "#F59E0B" }}>{p.c}회</div>
          </div>)}
          <div style={{ marginTop: 14, padding: 10, background: "#0F172A", borderRadius: 8, border: "1px solid rgba(55,65,81,0.3)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", marginBottom: 6 }}>🧊 장기 미출현 (Cold)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {Object.entries(DATA.cold).sort((a,b) => b[1]-a[1]).slice(0,10).map(([num, gap]) => <div key={num} onClick={() => toggleNum(parseInt(num))} style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 6px", background: "#111827", borderRadius: 6, cursor: "pointer", border: selected.includes(parseInt(num)) ? "1px solid #F59E0B" : "1px solid #1F2937" }}>
                <LottoBall num={parseInt(num)} mini selected={selected.includes(parseInt(num))} />
                <span style={{ fontSize: 9, color: "#6B7280", fontWeight: 600 }}>{gap}회전</span>
              </div>)}
            </div>
          </div>
        </div>}

        {tab === "recent" && <div style={card}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>📋 최근 당첨 번호</span>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
            {DATA.recentRounds.map(r => {
              const mc = r.n.filter(n => selected.includes(n)).length;
              return <div key={r.r} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 8px", background: "#0F172A", borderRadius: 8, border: mc >= 3 ? "1px solid rgba(245,158,11,0.3)" : "1px solid transparent" }}>
                <div style={{ width: 42, flexShrink: 0, fontSize: 12, fontWeight: 800, color: "#F59E0B" }}>{r.r}회</div>
                <div style={{ display: "flex", gap: 2, flexWrap: "wrap", flex: 1, alignItems: "center" }}>
                  {r.n.map(n => <LottoBall key={n} num={n} mini selected={selected.includes(n)} />)}
                  <span style={{ color: "#374151", fontSize: 12, margin: "0 1px" }}>+</span>
                  <LottoBall num={r.b} mini bonus />
                </div>
                {mc > 0 && selected.length > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 6, flexShrink: 0, background: mc >= 3 ? "rgba(245,158,11,0.15)" : "rgba(107,114,128,0.15)", color: mc >= 3 ? "#F59E0B" : "#6B7280" }}>{mc}개</span>}
              </div>;
            })}
          </div>
        </div>}
      </div>

      <style>{`
        @keyframes popIn { 0%{transform:scale(0.3);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
        button:active{opacity:0.7;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:#374151;border-radius:3px;}
      `}</style>
    </div>
  );
}
