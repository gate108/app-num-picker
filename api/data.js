// api/data.js — 수동 입력 회차 공유 저장소 (Vercel Blob)
import { put, list } from '@vercel/blob';

export const config = { runtime: 'nodejs', regions: ['icn1'] };

const BLOB_NAME = 'lotto-data.json';
const EMPTY = { manualRounds: [], updatedAt: 0 };

async function readBlob() {
  const { blobs } = await list({ prefix: BLOB_NAME });
  const found = blobs.find(b => b.pathname === BLOB_NAME);
  if (!found) return EMPTY;
  const res = await fetch(found.url, { cache: 'no-store' });
  if (!res.ok) return EMPTY;
  try { return await res.json(); } catch { return EMPTY; }
}

async function writeBlob(data) {
  await put(BLOB_NAME, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

function validateRound(rd) {
  if (!rd || !Number.isInteger(rd.r) || rd.r < 1) return 'r 정수';
  if (!Array.isArray(rd.n) || rd.n.length !== 6) return 'n 6개';
  if (rd.n.some(x => !Number.isInteger(x) || x < 1 || x > 45)) return 'n 1~45';
  if (new Set(rd.n).size !== 6) return 'n 중복';
  if (!Number.isInteger(rd.b) || rd.b < 1 || rd.b > 45 || rd.n.includes(rd.b)) return 'b 확인';
  if (typeof rd.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(rd.date)) return 'date YYYY-MM-DD';
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const data = await readBlob();
      res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=60');
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const auth = req.headers.authorization || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({ error: '인증 실패' });
      }

      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { action, round, r } = body;
      const data = await readBlob();
      const list = Array.isArray(data.manualRounds) ? data.manualRounds : [];

      let next;
      if (action === 'add' || action === 'update') {
        const sorted = round && Array.isArray(round.n) ? [...round.n].sort((a,b)=>a-b) : null;
        const cleaned = sorted ? { r: round.r, n: sorted, b: round.b, date: round.date } : null;
        const err = validateRound(cleaned);
        if (err) return res.status(400).json({ error: err });
        next = list.filter(x => x.r !== cleaned.r).concat([cleaned]).sort((a,b)=>b.r-a.r);
      } else if (action === 'delete') {
        if (!Number.isInteger(r)) return res.status(400).json({ error: 'r 정수' });
        next = list.filter(x => x.r !== r);
      } else {
        return res.status(400).json({ error: 'unknown action' });
      }

      const newData = { manualRounds: next, updatedAt: Date.now() };
      await writeBlob(newData);
      return res.status(200).json(newData);
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e?.message || String(e), name: e?.name });
  }
}
