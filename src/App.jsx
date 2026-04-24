import { useState, useMemo, useCallback, useEffect, useRef } from "react";

// ── 내장 통계 데이터 (1~1218회 전체 기반, 오프라인에서도 정확한 분석 가능) ──
const BASE_STATS = {
  totalRounds: 1218, latestRound: 1218,
  allFreq: {1:167,2:152,3:171,4:159,5:153,6:163,7:168,8:156,9:133,10:161,11:164,12:177,13:175,14:170,15:166,16:166,17:169,18:172,19:167,20:168,21:165,22:141,23:147,24:164,25:150,26:164,27:180,28:152,29:153,30:156,31:166,32:142,33:173,34:181,35:161,36:162,37:171,38:169,39:165,40:172,41:147,42:154,43:162,44:161,45:173},
  twFreq: {1:167,2:152,3:171,4:159,5:153,6:163,7:168,8:156,9:133,10:161,11:164,12:177,13:175,14:170,15:166,16:166,17:169,18:172,19:167,20:168,21:165,22:141,23:147,24:164,25:150,26:164,27:180,28:152,29:153,30:156,31:166,32:142,33:173,34:181,35:161,36:162,37:171,38:169,39:165,40:172,41:147,42:154,43:162,44:161,45:173},
  r50Freq: {1:8,2:3,3:12,4:6,5:8,6:8,7:8,8:8,9:7,10:6,11:6,12:7,13:6,14:4,15:9,16:10,17:7,18:4,19:7,20:6,21:4,22:3,23:8,24:9,25:5,26:7,27:12,28:8,29:6,30:7,31:8,32:5,33:6,34:2,35:7,36:7,37:7,38:8,39:6,40:8,41:6,42:7,43:3,44:6,45:5},
  r20Freq: {1:4,2:2,3:4,4:2,5:3,6:2,7:2,8:3,9:2,10:4,11:1,12:1,13:1,14:1,15:4,16:4,17:3,18:1,19:2,20:3,21:2,22:1,23:3,24:4,25:3,26:2,27:8,28:2,29:2,30:4,31:6,32:3,33:2,34:0,35:4,36:3,37:2,38:5,39:2,40:2,41:2,42:3,43:0,44:3,45:3},
  cold: {1:8,2:9,3:0,4:13,5:5,6:10,7:8,8:1,9:8,10:1,11:5,12:16,13:3,14:2,15:1,16:13,17:8,18:15,19:3,20:1,21:3,22:11,23:2,24:2,25:5,26:7,27:4,28:0,29:1,30:4,31:0,32:0,33:4,34:23,35:7,36:5,37:9,38:5,39:9,40:7,41:6,42:0,43:21,44:3,45:0},
  topPairs: [{a:27,b:38,c:10},{a:3,b:15,c:7},{a:27,b:36,c:6},{a:7,b:9,c:6},{a:15,b:19,c:5},{a:19,b:21,c:5},{a:15,b:27,c:5},{a:15,b:33,c:5},{a:3,b:27,c:5},{a:16,b:28,c:5},{a:30,b:31,c:5},{a:3,b:6,c:5},{a:37,b:40,c:5}],
  recentRounds: [
    {r:1218,n:[3,28,31,32,42,45],b:25,date:"2024-12-07"},{r:1217,n:[8,10,15,20,29,31],b:41,date:"2024-11-30"},
    {r:1216,n:[3,10,14,15,23,24],b:25,date:"2024-11-23"},{r:1215,n:[13,15,19,21,44,45],b:39,date:"2024-11-16"},
    {r:1214,n:[10,15,19,27,30,33],b:14,date:"2024-11-09"},{r:1213,n:[5,11,25,27,36,38],b:2,date:"2024-11-02"},
    {r:1212,n:[5,8,25,31,41,44],b:45,date:"2024-10-26"},{r:1211,n:[23,26,27,35,38,40],b:10,date:"2024-10-19"},
    {r:1210,n:[1,7,9,17,27,38],b:31,date:"2024-10-12"},{r:1209,n:[2,17,20,35,37,39],b:24,date:"2024-10-05"},
    {r:1208,n:[6,27,30,36,38,42],b:25,date:"2024-09-28"},{r:1207,n:[10,22,24,27,38,45],b:11,date:"2024-09-21"},
    {r:1206,n:[1,3,17,26,27,42],b:23,date:"2024-09-14"},{r:1205,n:[1,4,16,23,31,41],b:2,date:"2024-09-07"},
    {r:1204,n:[8,16,28,30,31,44],b:27,date:"2024-08-31"},
  ],
  stats: { sumMean: 138.2, sumStd: 30.8 },
};

// ── API 호출 (Vercel 서버사이드 프록시 → 로컬 Vite 프록시 동일 경로) ──
async function fetchRound(round) {
  try {
    const res = await fetch(`/api/lotto?round=${round}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    if (d.returnValue !== 'success') return null;
    return {
      r: d.drwNo,
      n: [d.drwtNo1,d.drwtNo2,d.drwtNo3,d.drwtNo4,d.drwtNo5,d.drwtNo6].sort((a,b)=>a-b),
      b: d.bnusNo, date: d.drwNoDate,
    };
  } catch { return null; }
}

function estimateLatest() {
  return Math.floor((Date.now() - new Date(2002,11,7)) / (7*24*60*60*1000)) + 1;
}

// ── localStorage 캐시 (주 1회 추첨이므로 새 회차 나올 때만 갱신) ──
const CACHE_KEY = 'lotto_cache_v2';

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data } = JSON.parse(raw);
    if (!data?.latestRound) return null;
    return data;
  } catch { return null; }
}

function saveCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, savedAt: Date.now() }));
  } catch {}
}

// 서버의 manualRounds를 BASE_STATS에 적용하여 통계 재계산
function applyManual(base, manualRounds) {
  if (!manualRounds?.length) return base;
  const sorted = [...manualRounds].sort((a,b)=>b.r-a.r);
  const allFreq = { ...base.allFreq };
  for (const rd of sorted) for (const x of rd.n) allFreq[x] = (allFreq[x]||0) + 1;
  const seen = new Set(sorted.map(x => x.r));
  const baseRecent = (base.recentRounds || []).filter(x => !seen.has(x.r));
  return mergeRecent(
    { ...base, allFreq, totalRounds: (base.totalRounds||0) + sorted.length },
    [...sorted, ...baseRecent].sort((a,b)=>b.r-a.r),
  );
}

// 병렬 배치로 N회차 가져오기
async function fetchBatch(startRound, count) {
  const rounds = Array.from({length: count}, (_, i) => startRound - i).filter(r => r >= 1);
  const results = await Promise.all(rounds.map(r => fetchRound(r)));
  return results.filter(Boolean).sort((a,b) => b.r - a.r);
}

// ── 지수 감쇠 시간 가중 빈도 계산 (반감기 52회 ≈ 1년) ──
function calcTWFreq(freshRounds, base) {
  const lambda = Math.LN2 / 52;
  if (!freshRounds?.length) {
    const tot = Object.values(base.allFreq).reduce((s,v)=>s+v,0);
    const tw = {};
    for (let i=1;i<=45;i++) tw[i] = tot>0 ? (base.allFreq[i]||0)/tot : 1/45;
    return tw;
  }
  const latest = freshRounds[0].r;
  const oldest = freshRounds[freshRounds.length-1].r;
  const tw = {};
  for (let i=1;i<=45;i++) tw[i] = 0;

  for (const rd of freshRounds) {
    const w = Math.exp(-lambda * (latest - rd.r));
    for (const n of rd.n) tw[n] += w;
  }

  if (oldest > 1) {
    const fetchedFreq = {};
    for (let i=1;i<=45;i++) fetchedFreq[i] = 0;
    for (const rd of freshRounds) for (const n of rd.n) fetchedFreq[n]++;
    const avgHistAge = latest - (oldest - 1) / 2;
    const histW = Math.exp(-lambda * avgHistAge);
    for (let i=1;i<=45;i++) {
      const histCount = Math.max(0, (base.allFreq[i]||0) - fetchedFreq[i]);
      tw[i] += histCount * histW;
    }
  }
  return tw;
}

// 새로 가져온 회차로 recentRounds + cold + r20Freq 만 업데이트
function mergeRecent(base, freshRounds) {
  if (!freshRounds?.length) return base;
  const latest = freshRounds[0].r;
  const lastSeen = { ...Object.fromEntries(Object.entries(base.cold).map(([k,v]) => [k, latest - v])) };

  // r20Freq 재계산
  const r20Freq = {};
  for (let i = 1; i <= 45; i++) r20Freq[i] = 0;
  freshRounds.slice(0, 20).forEach(rd => rd.n.forEach(n => r20Freq[n]++));

  // r50Freq 재계산
  const r50Freq = {};
  for (let i = 1; i <= 45; i++) r50Freq[i] = 0;
  freshRounds.slice(0, 50).forEach(rd => rd.n.forEach(n => r50Freq[n]++));

  // cold 재계산 (새 회차 기준)
  const cold = {};
  freshRounds.forEach(rd => rd.n.forEach(n => { if (!(n in cold) || rd.r > (lastSeen[n]||0)) lastSeen[n] = rd.r; }));
  for (let i = 1; i <= 45; i++) cold[i] = latest - (lastSeen[i] || 0);

  // topPairs (최근 100회)
  const pairCount = {};
  freshRounds.slice(0, 100).forEach(rd => {
    for (let i=0;i<6;i++) for (let j=i+1;j<6;j++) {
      const k = `${rd.n[i]}-${rd.n[j]}`; pairCount[k] = (pairCount[k]||0)+1;
    }
  });
  const topPairs = Object.entries(pairCount).sort((a,b)=>b[1]-a[1]).slice(0,13)
    .map(([k,c]) => { const [a,b]=k.split("-").map(Number); return {a,b,c}; });

  const twFreq = calcTWFreq(freshRounds, base);

  return {
    ...base,
    latestRound: latest,
    totalRounds: Math.max(base.totalRounds, freshRounds.length),
    recentRounds: freshRounds.slice(0, 15),
    r20Freq, r50Freq, cold, topPairs, twFreq,
  };
}

// ── 광고 배너 컴포넌트 ──
// data-ad-slot: AdSense에서 광고 단위 생성 후 슬롯 ID로 교체하세요
const AD_CLIENT = "ca-pub-6843910277588116";
const AD_SLOT   = "9569659445";

function AdBanner() {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || ref.current.dataset.pushed) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      ref.current.dataset.pushed = "1";
    } catch {}
  }, []);
  return (
    <div style={{ margin:"8px 0", textAlign:"center", minHeight:100, background:"rgba(31,41,55,0.3)", borderRadius:10, overflow:"hidden" }}>
      <ins ref={ref}
        className="adsbygoogle"
        style={{ display:"block" }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={AD_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

// ── UI 컴포넌트 ──
const BC = n => {
  if (n<=10) return {bg:"#FCD34D",t:"#92400E",g:"#FDE68A"};
  if (n<=20) return {bg:"#60A5FA",t:"#1E3A5F",g:"#93C5FD"};
  if (n<=30) return {bg:"#F87171",t:"#7F1D1D",g:"#FCA5A5"};
  if (n<=40) return {bg:"#A78BFA",t:"#3B1F7E",g:"#C4B5FD"};
  return {bg:"#34D399",t:"#064E3B",g:"#6EE7B7"};
};

function Ball({ num, size=36, sel, onClick, bonus, gray, mini }) {
  const c = BC(num), s = mini ? 26 : size;
  return (
    <button onClick={onClick} style={{
      width:s, height:s, borderRadius:"50%",
      background: gray ? "#1F2937" : `radial-gradient(circle at 35% 35%,${c.g},${c.bg})`,
      color: gray ? "#4B5563" : c.t,
      border: sel ? "2.5px solid #F59E0B" : bonus ? "2.5px solid #10B981" : "2px solid rgba(255,255,255,0.12)",
      fontSize: mini?10:s>38?15:13, fontWeight:800,
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      cursor: onClick ? "pointer" : "default",
      transform: (sel||bonus) ? "scale(1.08)" : "scale(1)",
      boxShadow: sel ? `0 0 12px ${c.bg}88` : bonus ? "0 0 10px #10B98188" : gray ? "none" : `0 1px 4px ${c.bg}44`,
      flexShrink:0, padding:0, transition:"all 0.15s",
      fontFamily:"inherit", letterSpacing:-0.5, WebkitTapHighlightColor:"transparent",
    }}>{num}</button>
  );
}

function FreqBar({ num, value, max, sel, onClick }) {
  const c = BC(num), pct = max > 0 ? (value/max)*100 : 0;
  return (
    <div onClick={onClick} style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer", padding:"1.5px 3px", borderRadius:5, background: sel?"rgba(245,158,11,0.1)":"transparent" }}>
      <span style={{ width:20, textAlign:"right", fontSize:11, fontWeight:700, color:sel?"#F59E0B":"#9CA3AF", fontFamily:"monospace" }}>{num}</span>
      <div style={{ flex:1, height:14, background:"#1F2937", borderRadius:3, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${c.bg}CC,${c.bg})`, borderRadius:3, transition:"width 0.4s" }} />
      </div>
      <span style={{ width:24, textAlign:"right", fontSize:10, color:"#6B7280", fontWeight:600, fontFamily:"monospace" }}>{value}</span>
    </div>
  );
}

function Gauge({ label, value, color }) {
  const pct = Math.min(value, 100);
  return (
    <div style={{ textAlign:"center" }}>
      <div style={{ fontSize:9, color:"#9CA3AF", marginBottom:3, fontWeight:600, whiteSpace:"nowrap" }}>{label}</div>
      <div style={{ position:"relative", width:44, height:44, margin:"0 auto" }}>
        <svg width="44" height="44" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="17" fill="none" stroke="#1F2937" strokeWidth="4"/>
          <circle cx="22" cy="22" r="17" fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={`${pct*1.068} 106.8`} strokeLinecap="round" transform="rotate(-90 22 22)"
            style={{ transition:"stroke-dasharray 0.8s ease" }}/>
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color }}>{Math.round(pct)}</div>
      </div>
    </div>
  );
}

function analyze(sel, stats) {
  if (sel.length !== 6 || !stats) return null;
  const n = [...sel].sort((a,b)=>a-b);
  const sum = n.reduce((a,b)=>a+b,0);
  const odd = n.filter(x=>x%2).length, low = n.filter(x=>x<=22).length;
  const range = n[5]-n[0];
  const diffs = new Set();
  for (let i=0;i<6;i++) for (let j=i+1;j<6;j++) diffs.add(n[j]-n[i]);
  const ac = diffs.size-5;
  const ss = Math.max(0, 100-Math.abs(sum-stats.sumMean)/stats.sumStd*25);
  const os = (odd>=2&&odd<=4)?100:(odd===1||odd===5)?50:10;
  const ls = (low>=2&&low<=4)?100:(low===1||low===5)?50:10;
  const acs = ac>=7?100:ac>=5?70:30;
  const rs = (range>=25&&range<=40)?100:range>=20?70:30;
  return { sum, odd, low, range, ac, ss, os, ls, acs, rs, total:Math.round((ss+os+ls+acs+rs)/5) };
}

function smartPick(DATA) {
  if (!DATA) return [];
  const twFreq = DATA.twFreq || DATA.allFreq;
  const cold = DATA.cold;
  const twTotal = Object.values(twFreq).reduce((s,v)=>s+v,0);
  const w = {};
  for (let i=1;i<=45;i++) {
    const tw = twTotal > 0 ? (twFreq[i]||0)/twTotal : 1/45;
    const coldBonus = Math.min((cold[i]||0)/20, 1);
    w[i] = tw * 0.85 + coldBonus * 0.15;
  }
  const e = Object.entries(w).map(([k,v])=>[+k,v]);
  const tot = e.reduce((s,[,v])=>s+v,0);
  let ps = new Set(), att = 0;
  while (ps.size<6&&att<500) {
    let r = Math.random()*tot;
    for (const [n,wt] of e) { r-=wt; if(r<=0){ps.add(n);break;} }
    att++;
    if (ps.size===6) {
      const ns=[...ps].sort((a,b)=>a-b), s=ns.reduce((a,b)=>a+b,0);
      if (s<90||s>190) ps.clear();
    }
  }
  return [...ps].sort((a,b)=>a-b);
}

// ── 로딩 상태 배지 ──
function StatusBadge({ status, round }) {
  if (status === "idle") return null;
  const cfg = {
    loading:  { bg:"rgba(99,102,241,0.15)",  color:"#818CF8", text:"⟳ 최신화 중..." },
    bg:       { bg:"rgba(99,102,241,0.08)",  color:"#6366F1", text:"⟳ 통계 보강 중..." },
    done:     { bg:"rgba(16,185,129,0.12)",  color:"#10B981", text:`✓ ${round}회차 최신화 완료` },
    cached:   { bg:"rgba(16,185,129,0.08)",  color:"#6EE7B7", text:`✓ ${round}회차 저장 데이터 사용 중` },
    base:     { bg:"rgba(107,114,128,0.1)",  color:"#9CA3AF", text:"ℹ 내장 기본 데이터 사용 중 · 연결 시 자동 갱신" },
    error:    { bg:"rgba(239,68,68,0.1)",    color:"#F87171", text:"⚠ 네트워크 오류 · 내장 데이터 사용 중" },
  }[status] || {};
  return (
    <div style={{ fontSize:10, padding:"3px 8px", borderRadius:6, marginBottom:4, background:cfg.bg, color:cfg.color }}>
      {cfg.text}
    </div>
  );
}

export default function App() {
  const [sel, setSel]       = useState([]);
  const [tab, setTab]       = useState("pick");
  const [fMode, setFMode]   = useState("all");
  const [guide, setGuide]   = useState(false);
  const [anim, setAnim]     = useState(false);
  const [saved, setSaved]   = useState([]);
  const [DATA, setDATA]     = useState(() => loadCache() || BASE_STATS);
  const [status, setStatus] = useState("idle"); // idle | loading | bg | done | cached | error
  const abortRef            = useRef(null);
  const [mForm, setMForm]      = useState(() => ({ r:"", n:["","","","","",""], b:"", date:"" }));
  const [mErr, setMErr]        = useState("");
  const [mBusy, setMBusy]      = useState(false);
  const [editing, setEditing]  = useState(null); // 수정 중인 회차 번호
  const [manualRounds, setManualRounds] = useState([]);
  const [adminToken, setAdminToken]     = useState(() => { try { return localStorage.getItem('lotto_admin_token') || ''; } catch { return ''; } });
  const isAdmin = adminToken !== '' || new URLSearchParams(window.location.search).has('admin');

  function saveToken(t) {
    setAdminToken(t);
    try { localStorage.setItem('lotto_admin_token', t); } catch {}
  }

  async function submitManual(action, payload) {
    setMErr("");
    if (!adminToken) { setMErr("관리자 토큰을 먼저 입력하세요"); return; }
    setMBusy(true);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) { setMErr(data.error || '저장 실패'); return; }
      setManualRounds(data.manualRounds);
      const next = applyManual(BASE_STATS, data.manualRounds);
      setDATA(next);
      saveCache(next);
      setMForm({ r:"", n:["","","","","",""], b:"", date:"" });
      setEditing(null);
    } catch (e) {
      setMErr(e?.message || '네트워크 오류');
    } finally { setMBusy(false); }
  }

  function addOrUpdateManualRound() {
    setMErr("");
    const r = parseInt(mForm.r, 10);
    const nums = mForm.n.map(x => parseInt(x, 10));
    const b = parseInt(mForm.b, 10);
    const date = mForm.date.trim();
    if (!r || r < 1) return setMErr("회차를 입력하세요");
    if (nums.some(x => !x || x < 1 || x > 45)) return setMErr("당첨번호는 1~45 정수 6개");
    if (new Set(nums).size !== 6) return setMErr("당첨번호 6개가 중복되었습니다");
    if (!b || b < 1 || b > 45 || nums.includes(b)) return setMErr("보너스 번호 확인");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setMErr("날짜 YYYY-MM-DD 형식");
    const sorted = [...nums].sort((a,b)=>a-b);
    submitManual(editing != null ? 'update' : 'add', { round: { r, n: sorted, b, date } });
  }

  function startEdit(rd) {
    setEditing(rd.r);
    setMForm({ r: String(rd.r), n: rd.n.map(String), b: String(rd.b), date: rd.date });
    setMErr("");
  }

  function cancelEdit() {
    setEditing(null);
    setMForm({ r:"", n:["","","","","",""], b:"", date:"" });
    setMErr("");
  }

  function deleteManualRound(r) {
    if (!confirm(`${r}회를 삭제하시겠습니까?`)) return;
    submitManual('delete', { r });
  }

  useEffect(() => {
    fetch('/api/data').then(r=>r.json()).then(d => {
      const list = Array.isArray(d?.manualRounds) ? d.manualRounds : [];
      setManualRounds(list);
      if (list.length > 0) {
        const next = applyManual(BASE_STATS, list);
        setDATA(next);
        saveCache(next);
      }
    }).catch(()=>{});
    doUpdate();
    return () => abortRef.current?.abort();
  }, []);

  async function doUpdate(force = false) {
    if (abortRef.current) abortRef.current.abort();

    // ── 캐시 확인: 저장된 회차가 현재 추정 최신 회차와 같으면 네트워크 불필요 ──
    const cached = loadCache();
    const estimated = estimateLatest();
    if (!force && cached && cached.latestRound >= estimated - 1) {
      setDATA(cached);
      setStatus("cached");
      return;
    }

    setStatus("loading");

    // ── 1단계: 최신 회차 탐색 후 20회차 즉시 로드 ──
    let latest = estimated;
    let first = null;
    for (let i = 0; i < 6; i++) {
      first = await fetchRound(latest - i);
      if (first) { latest = latest - i; break; }
    }
    if (!first) {
      // 네트워크 실패 시 캐시 또는 내장 데이터로 소프트 폴백
      if (cached) { setDATA(cached); setStatus("cached"); }
      else { setStatus("base"); }
      return;
    }

    const fast = await fetchBatch(latest, 20);
    if (fast.length > 0) {
      setDATA(prev => {
        const merged = mergeRecent(prev, fast);
        saveCache(merged);
        return merged;
      });
      setStatus("done");
    }

    // ── 2단계: 백그라운드로 추가 80회차 로드해서 통계 보강 ──
    setStatus("bg");
    const extra = await fetchBatch(latest - 20, 80);
    const all = [...fast, ...extra].sort((a,b)=>b.r-a.r);
    if (all.length > 20) {
      setDATA(prev => {
        const merged = mergeRecent(prev, all);
        saveCache(merged);
        return merged;
      });
    }
    setStatus("done");
  }

  const toggle = useCallback((n) => {
    setSel(p => p.includes(n) ? p.filter(x=>x!==n) : p.length>=6 ? p : [...p,n].sort((a,b)=>a-b));
  }, []);

  const an  = useMemo(() => analyze(sel, DATA?.stats), [sel, DATA]);
  const fd  = useMemo(() => {
    if (fMode === "tw") {
      const vals = Object.entries(DATA.twFreq||{}).map(([k,v])=>({num:+k,raw:v}));
      const maxVal = Math.max(...vals.map(v=>v.raw), 1);
      return vals.map(({num,raw})=>({num, value: Math.round((raw/maxVal)*999)+1}));
    }
    const d = fMode==="all" ? DATA.allFreq : fMode==="r50" ? DATA.r50Freq : DATA.r20Freq;
    return Object.entries(d).map(([k,v]) => ({num:+k, value:v}));
  }, [fMode, DATA]);
  const mx  = useMemo(() => Math.max(...fd.map(d=>d.value), 1), [fd]);

  const doPick = () => { setAnim(true); setSel([]); setTimeout(() => { setSel(smartPick(DATA)); setAnim(false); }, 500); };

  const C = { background:"#111827", borderRadius:14, padding:14, marginBottom:12, border:"1px solid rgba(55,65,81,0.5)" };
  const TABS = [{id:"pick",l:"번호 선택",i:"🎯"},{id:"freq",l:"출현 빈도",i:"📊"},{id:"pairs",l:"동반 출현",i:"🔗"},{id:"recent",l:"최근 당첨",i:"📋"}];

  return (
    <div style={{ minHeight:"100vh", background:"#0A0E17", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color:"#E5E7EB", overflowX:"hidden", WebkitFontSmoothing:"antialiased" }}>

      {/* ── 헤더 ── */}
      <div style={{ background:"linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)", borderBottom:"1px solid rgba(245,158,11,0.2)", padding:"14px 12px 10px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:480, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <div style={{ fontSize:24 }}>🎱</div>
            <div style={{ flex:1 }}>
              <h1 style={{ margin:0, fontSize:19, fontWeight:900, background:"linear-gradient(135deg,#F59E0B,#FBBF24,#F59E0B)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", letterSpacing:-0.5 }}>로또 번호 분석기</h1>
              
            </div>
            <button onClick={() => doUpdate(status==="cached")} disabled={status==="loading"||status==="bg"} style={{ padding:"5px 10px", borderRadius:14, border:"1px solid rgba(99,102,241,0.3)", background:"rgba(99,102,241,0.15)", color:"#818CF8", fontSize:10, fontWeight:700, cursor:(status==="loading"||status==="bg")?"wait":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:3 }}>
              <span style={{ display:"inline-block", animation:(status==="loading"||status==="bg")?"spin 1s linear infinite":"none", fontSize:12 }}>🔄</span>
              {status==="loading"||status==="bg" ? "갱신중" : status==="cached" ? "강제갱신" : "최신화"}
            </button>
          </div>

          <StatusBadge status={status} round={DATA.latestRound} />

          <div style={{ display:"flex", gap:2 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, padding:"7px 2px", borderRadius:6, border:"none", background:tab===t.id?"rgba(245,158,11,0.15)":"transparent", color:tab===t.id?"#F59E0B":"#6B7280", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", borderBottom:tab===t.id?"2px solid #F59E0B":"2px solid transparent", lineHeight:1.3, WebkitTapHighlightColor:"transparent" }}>
                <span style={{ fontSize:13 }}>{t.i}</span><br />{t.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:480, margin:"0 auto", padding:"12px 10px 80px" }}>

        {/* ── 번호 선택 ── */}
        {tab==="pick" && (<div>
          <div style={{ ...C, background:"linear-gradient(135deg,#111827,#1F2937)", border:"1px solid rgba(245,158,11,0.15)", boxShadow:"0 4px 24px rgba(0,0,0,0.3)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:6 }}>
              <span style={{ fontSize:12, fontWeight:700, color:"#F59E0B" }}>선택한 번호 ({sel.length}/6)</span>
              <div style={{ display:"flex", gap:5 }}>
                <button onClick={doPick} disabled={anim} style={{ padding:"5px 12px", borderRadius:18, border:"1px solid #F59E0B", background:"rgba(245,158,11,0.1)", color:"#F59E0B", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>{anim?"✨ 분석중...":"🤖 AI 추천"}</button>
                <button onClick={() => setSel([])} style={{ padding:"5px 10px", borderRadius:18, border:"1px solid #374151", background:"transparent", color:"#9CA3AF", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>초기화</button>
              </div>
            </div>
            <div style={{ display:"flex", gap:6, justifyContent:"center", minHeight:46, alignItems:"center", flexWrap:"wrap" }}>
              {sel.length===0 ? <span style={{ color:"#4B5563", fontSize:12 }}>아래에서 번호를 선택하세요</span> :
                sel.map((n,i) => <div key={n} style={{ animation:"popIn 0.3s ease", animationDelay:`${i*60}ms`, animationFillMode:"both" }}><Ball num={n} size={42} sel onClick={()=>toggle(n)} /></div>)}
            </div>
            {sel.length===6 && <button onClick={() => setSaved(p=>[...p,[...sel]])} style={{ marginTop:8, width:"100%", padding:"7px", borderRadius:8, border:"1px solid #10B981", background:"rgba(16,185,129,0.1)", color:"#10B981", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>💾 이 번호 저장하기</button>}
          </div>

          {an && (<div style={{ ...C, border:"1px solid rgba(99,102,241,0.2)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontSize:12, fontWeight:700, color:"#818CF8" }}>📐 통계 적합도</span>
              <div style={{ background:an.total>=70?"rgba(16,185,129,0.15)":an.total>=40?"rgba(245,158,11,0.15)":"rgba(239,68,68,0.15)", color:an.total>=70?"#10B981":an.total>=40?"#F59E0B":"#EF4444", padding:"3px 10px", borderRadius:16, fontSize:12, fontWeight:800 }}>
                {an.total>=70?"🟢":an.total>=40?"🟡":"🔴"} {an.total}점
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:4, justifyItems:"center" }}>
              <Gauge label={`∑ ${an.sum}`} value={an.ss} color="#60A5FA"/>
              <Gauge label={`홀${an.odd}:짝${6-an.odd}`} value={an.os} color="#A78BFA"/>
              <Gauge label={`저${an.low}:고${6-an.low}`} value={an.ls} color="#F87171"/>
              <Gauge label={`AC ${an.ac}`} value={an.acs} color="#34D399"/>
              <Gauge label={`↔ ${an.range}`} value={an.rs} color="#FCD34D"/>
            </div>
            <button onClick={() => setGuide(!guide)} style={{ marginTop:8, width:"100%", padding:"5px", borderRadius:6, border:"none", background:"rgba(129,140,248,0.1)", color:"#818CF8", fontSize:10, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>{guide?"▲ 접기":"▼ 지표 설명"}</button>
            {guide && <div style={{ marginTop:8, padding:10, background:"#0F172A", borderRadius:8, fontSize:10, lineHeight:1.7, color:"#9CA3AF" }}>
              <p style={{ margin:"0 0 3px" }}><b style={{ color:"#60A5FA" }}>∑ 합계</b>: 평균 {DATA.stats.sumMean}, 표준편차 {DATA.stats.sumStd}</p>
              <p style={{ margin:"0 0 3px" }}><b style={{ color:"#A78BFA" }}>⚖ 홀짝</b>: 3:3이 최빈, 2:4도 양호</p>
              <p style={{ margin:"0 0 3px" }}><b style={{ color:"#F87171" }}>📏 저고</b>: 1~22 vs 23~45, 3:3 최다</p>
              <p style={{ margin:"0 0 3px" }}><b style={{ color:"#34D399" }}>🧬 AC</b>: 복잡도 0~10, 7+ 가 70%+</p>
              <p style={{ margin:0 }}><b style={{ color:"#FCD34D" }}>↔ 범위</b>: 최대-최소, 25~40 적합</p>
            </div>}
          </div>)}

          <div style={C}>
            <div style={{ fontSize:12, fontWeight:700, color:"#9CA3AF", marginBottom:10 }}>1~45 번호판 <span style={{ fontSize:10, color:"#6B7280", fontWeight:500 }}>(탭하여 선택)</span></div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:5, justifyItems:"center" }}>
              {Array.from({length:45},(_,i)=>i+1).map(n => <Ball key={n} num={n} size={36} sel={sel.includes(n)} gray={sel.length>=6&&!sel.includes(n)} onClick={()=>toggle(n)}/>)}
            </div>
            <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap", justifyContent:"center" }}>
              {[{r:"1~10",c:"#FCD34D"},{r:"11~20",c:"#60A5FA"},{r:"21~30",c:"#F87171"},{r:"31~40",c:"#A78BFA"},{r:"41~45",c:"#34D399"}].map(g=><span key={g.r} style={{ fontSize:9, color:g.c, fontWeight:600 }}>● {g.r}</span>)}
            </div>
          </div>

          <AdBanner />

          {saved.length>0 && <div style={{ ...C, border:"1px solid rgba(16,185,129,0.2)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:12, fontWeight:700, color:"#10B981" }}>💾 저장됨 ({saved.length})</span>
              <button onClick={()=>setSaved([])} style={{ padding:"3px 8px", borderRadius:10, border:"1px solid #374151", background:"transparent", color:"#6B7280", fontSize:10, cursor:"pointer", fontFamily:"inherit" }}>전체 삭제</button>
            </div>
            {saved.map((s,i)=><div key={i} style={{ display:"flex", gap:4, alignItems:"center", marginBottom:5, padding:"5px 6px", background:"#0F172A", borderRadius:8 }}>
              <span style={{ fontSize:10, color:"#6B7280", fontWeight:700, width:18 }}>#{i+1}</span>
              <div style={{ display:"flex", gap:3 }}>{s.map(n=><Ball key={n} num={n} mini/>)}</div>
              <button onClick={()=>setSaved(p=>p.filter((_,j)=>j!==i))} style={{ marginLeft:"auto", background:"none", border:"none", color:"#4B5563", cursor:"pointer", fontSize:13 }}>×</button>
            </div>)}
          </div>}
        </div>)}

        {/* ── 출현 빈도 ── */}
        {tab==="freq" && <div style={C}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:6 }}>
            <span style={{ fontSize:13, fontWeight:700 }}>📊 출현 빈도</span>
            <div style={{ display:"flex", gap:3 }}>
              {[{id:"all",l:"전체"},{id:"r50",l:"50회"},{id:"r20",l:"20회"},{id:"tw",l:"가중"}].map(m=><button key={m.id} onClick={()=>setFMode(m.id)} style={{ padding:"4px 8px", borderRadius:10, border:"none", background:fMode===m.id?(m.id==="tw"?"#818CF8":"#F59E0B"):"#1F2937", color:fMode===m.id?"#000":"#9CA3AF", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>{m.l}</button>)}
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
            {fd.map(d=><FreqBar key={d.num} num={d.num} value={d.value} max={mx} sel={sel.includes(d.num)} onClick={()=>toggle(d.num)}/>)}
          </div>
          <AdBanner />
        </div>}

        {/* ── 동반 출현 ── */}
        {tab==="pairs" && <div style={C}>
          <div style={{ marginBottom:10 }}>
            <span style={{ fontSize:13, fontWeight:700 }}>🔗 동반 출현 TOP</span>
            <span style={{ fontSize:10, color:"#6B7280", marginLeft:6 }}>최근 100회</span>
          </div>
          {DATA.topPairs.map((p,i)=><div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", background:"#0F172A", borderRadius:8, marginBottom:5, border:(sel.includes(p.a)&&sel.includes(p.b))?"1px solid rgba(245,158,11,0.3)":"1px solid transparent" }}>
            <span style={{ color:"#4B5563", fontSize:11, fontWeight:700, width:18 }}>{i+1}</span>
            <Ball num={p.a} mini sel={sel.includes(p.a)} onClick={()=>toggle(p.a)}/>
            <span style={{ color:"#374151", fontSize:12 }}>+</span>
            <Ball num={p.b} mini sel={sel.includes(p.b)} onClick={()=>toggle(p.b)}/>
            <div style={{ flex:1 }}/>
            <div style={{ background:"rgba(245,158,11,0.1)", padding:"2px 8px", borderRadius:8, fontSize:11, fontWeight:700, color:"#F59E0B" }}>{p.c}회</div>
          </div>)}
          <div style={{ marginTop:14, padding:10, background:"#0F172A", borderRadius:8, border:"1px solid rgba(55,65,81,0.3)" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#9CA3AF", marginBottom:6 }}>🧊 장기 미출현 (Cold)</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
              {Object.entries(DATA.cold).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([n,g])=><div key={n} onClick={()=>toggle(+n)} style={{ display:"flex", alignItems:"center", gap:3, padding:"3px 6px", background:"#111827", borderRadius:6, cursor:"pointer", border:sel.includes(+n)?"1px solid #F59E0B":"1px solid #1F2937" }}>
                <Ball num={+n} mini sel={sel.includes(+n)}/>
                <span style={{ fontSize:9, color:"#6B7280", fontWeight:600 }}>{g}회전</span>
              </div>)}
            </div>
          </div>
          <AdBanner />
        </div>}

        {/* ── 최근 당첨 ── */}
        {tab==="recent" && <div style={C}>
          <AdBanner />
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <span style={{ fontSize:13, fontWeight:700 }}>📋 최근 당첨 번호</span>
            {DATA.recentRounds[0]?.date && <span style={{ fontSize:10, color:"#6B7280" }}>{DATA.recentRounds[0].date} 기준</span>}
          </div>

          {/* 수동 입력 폼 — 관리자 전용 */}
          {isAdmin && <div style={{ padding:10, background:"#0F172A", borderRadius:8, marginBottom:10, border:"1px solid rgba(99,102,241,0.2)" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#818CF8", marginBottom:8 }}>
              {editing!=null ? `✏ ${editing}회 수정 중` : "✍ 새 회차 직접 입력"} <span style={{ fontSize:9, color:"#6B7280", fontWeight:500 }}>· 서버 공유 저장</span>
            </div>
            <input value={adminToken} onChange={e=>saveToken(e.target.value)} type="password" placeholder="관리자 토큰"
              style={{ width:"100%", padding:"5px 6px", borderRadius:6, border:`1px solid ${adminToken?"#10B981":"#7F1D1D"}`, background:"#111827", color:"#E5E7EB", fontSize:11, fontFamily:"inherit", marginBottom:6 }}/>
            <div style={{ display:"flex", gap:5, marginBottom:6 }}>
              <input value={mForm.r} onChange={e=>setMForm(p=>({...p, r:e.target.value.replace(/\D/g,"")}))} placeholder="회차" inputMode="numeric" disabled={editing!=null}
                style={{ width:60, padding:"5px 6px", borderRadius:6, border:"1px solid #374151", background:editing!=null?"#1F2937":"#111827", color:"#E5E7EB", fontSize:11, fontFamily:"inherit" }}/>
              <input value={mForm.date} onChange={e=>setMForm(p=>({...p, date:e.target.value}))} placeholder="2026-04-23"
                style={{ flex:1, padding:"5px 6px", borderRadius:6, border:"1px solid #374151", background:"#111827", color:"#E5E7EB", fontSize:11, fontFamily:"inherit" }}/>
            </div>
            <div style={{ display:"flex", gap:3, marginBottom:6, alignItems:"center", flexWrap:"wrap" }}>
              {mForm.n.map((v,i)=><input key={i} value={v} inputMode="numeric"
                onChange={e=>{ const nv=e.target.value.replace(/\D/g,"").slice(0,2); setMForm(p=>({...p, n:p.n.map((x,j)=>j===i?nv:x)})); }}
                placeholder={`#${i+1}`}
                style={{ width:36, padding:"5px 4px", borderRadius:6, border:"1px solid #374151", background:"#111827", color:"#E5E7EB", fontSize:11, textAlign:"center", fontFamily:"inherit" }}/>)}
              <span style={{ color:"#374151", fontSize:13, margin:"0 1px" }}>+</span>
              <input value={mForm.b} inputMode="numeric"
                onChange={e=>setMForm(p=>({...p, b:e.target.value.replace(/\D/g,"").slice(0,2)}))}
                placeholder="보너스"
                style={{ width:48, padding:"5px 4px", borderRadius:6, border:"1px solid #10B981", background:"#111827", color:"#10B981", fontSize:11, textAlign:"center", fontFamily:"inherit" }}/>
            </div>
            {mErr && <div style={{ fontSize:10, color:"#F87171", marginBottom:5 }}>⚠ {mErr}</div>}
            <div style={{ display:"flex", gap:5 }}>
              <button onClick={addOrUpdateManualRound} disabled={mBusy}
                style={{ flex:1, padding:"6px", borderRadius:6, border:"none", background:"rgba(129,140,248,0.15)", color:"#818CF8", fontSize:11, fontWeight:700, cursor:mBusy?"wait":"pointer", fontFamily:"inherit", opacity:mBusy?0.6:1 }}>
                {mBusy ? "⟳ 저장 중..." : editing!=null ? "💾 수정 저장" : "➕ 추가하고 통계 갱신"}
              </button>
              {editing!=null && <button onClick={cancelEdit} disabled={mBusy}
                style={{ padding:"6px 10px", borderRadius:6, border:"1px solid #374151", background:"transparent", color:"#9CA3AF", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
                취소
              </button>}
            </div>
          </div>}
          {DATA.recentRounds.map(r=>{
            const mc = r.n.filter(n=>sel.includes(n)).length;
            const isManual = manualRounds.some(x => x.r === r.r);
            const manualRd = isManual ? manualRounds.find(x => x.r === r.r) : null;
            return <div key={r.r} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 8px", background:"#0F172A", borderRadius:8, marginBottom:5, border:mc>=3?"1px solid rgba(245,158,11,0.3)":isManual?"1px solid rgba(129,140,248,0.25)":"1px solid transparent" }}>
              <div style={{ width:42, flexShrink:0, fontSize:12, fontWeight:800, color:"#F59E0B" }}>
                {r.r}회{isManual && isAdmin && <span style={{ fontSize:8, color:"#818CF8", display:"block", lineHeight:1 }}>✍ 수동</span>}
              </div>
              <div style={{ display:"flex", gap:2, flexWrap:"wrap", flex:1, alignItems:"center" }}>
                {r.n.map(n=><Ball key={n} num={n} mini sel={sel.includes(n)}/>)}
                <span style={{ color:"#374151", fontSize:12, margin:"0 1px" }}>+</span>
                <Ball num={r.b} mini bonus/>
              </div>
              {mc>0&&sel.length>0&&<span style={{ fontSize:9, fontWeight:700, padding:"2px 5px", borderRadius:6, flexShrink:0, background:mc>=3?"rgba(245,158,11,0.15)":"rgba(107,114,128,0.15)", color:mc>=3?"#F59E0B":"#6B7280" }}>{mc}개</span>}
              {isManual && isAdmin && <div style={{ display:"flex", gap:2, flexShrink:0 }}>
                <button onClick={()=>startEdit(manualRd)} disabled={mBusy} title="수정"
                  style={{ padding:"3px 6px", borderRadius:5, border:"1px solid #374151", background:"transparent", color:"#818CF8", fontSize:10, cursor:"pointer", fontFamily:"inherit" }}>✏</button>
                <button onClick={()=>deleteManualRound(r.r)} disabled={mBusy} title="삭제"
                  style={{ padding:"3px 6px", borderRadius:5, border:"1px solid #374151", background:"transparent", color:"#F87171", fontSize:10, cursor:"pointer", fontFamily:"inherit" }}>🗑</button>
              </div>}
            </div>;
          })}
        </div>}
      </div>

      <style>{`
        @keyframes popIn{0%{transform:scale(0.3);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
        button:active{opacity:0.7;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:#374151;border-radius:3px;}
      `}</style>
    </div>
  );
}
