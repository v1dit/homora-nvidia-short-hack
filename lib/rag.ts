// lib/rag.ts - retrieval helpers with optional embeddings support and a safe fallback
import fs from 'fs';
import path from 'path';

type KnowledgeItem = { region: string; capRateAvg?: number; roiAvg?: number; insight: string };
type Result = { id: string; region: string; text: string; score: number };

const DATA_PATH = path.join(process.cwd(), 'data/market_knowledge.json');
const RAW_KB: KnowledgeItem[] = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

function simpleTextToVector(text: string): number[] {
  const words = text.toLowerCase().split(/\W+/).filter(Boolean);
  const vec = new Array(128).fill(0);
  for (const w of words) {
    let h = 0;
    for (let i = 0; i < w.length; i++) h = (h * 31 + w.charCodeAt(i)) >>> 0;
    vec[h % vec.length] += 1;
  }
  return vec;
}

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function getEmbedder() {
  try {
    const mod = await import('@nvidia/embeddings');
    return mod;
  } catch (e) {
    // fallback simple embedder
    console.warn('⚠️ NVIDIA embeddings not found — using fallback vectorizer');
    return {
      embed: async (text: string) => {
        // simple deterministic fallback: map characters into normalized counts
        return simpleTextToVector(text);
      },
    };
  }
}

export async function similaritySearch(region: string, topK = 3): Promise<Result[]> {
  const embedModule = await getEmbedder();
  const embedFn = embedModule.embed || (async (t: string) => simpleTextToVector(t));

  const qVec = Array.isArray(await embedFn(region)) ? (await embedFn(region)) as number[] : simpleTextToVector(region);

  const scored = await Promise.all(
    RAW_KB.map(async (d, i) => {
      const docVecRaw = await embedFn(d.insight);
      const docVec = Array.isArray(docVecRaw) ? docVecRaw as number[] : simpleTextToVector(d.insight);
      const score = cosineSimilarity(qVec, docVec);
      return { id: String(i), region: d.region, text: d.insight, score };
    })
  );
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

