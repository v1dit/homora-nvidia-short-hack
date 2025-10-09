// lib/rag.ts - retrieval helpers with optional embeddings support and a safe fallback
import fs from 'fs';
import path from 'path';
import { loadLegalEmbeddings, type LegalDocument, type LegalChunk } from './embedLegal';

type KnowledgeItem = { region: string; capRateAvg?: number; roiAvg?: number; insight: string };
type Result = { id: string; region: string; text: string; score: number };
type LegalResult = { id: string; text: string; score: number; documentType: string; region?: string; filename: string };

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

/**
 * Retrieve relevant legal documents based on property location and context
 */
export async function retrieveLegalDocs(property: any, topK = 5): Promise<LegalResult[]> {
  const legalDocs = loadLegalEmbeddings();
  if (!legalDocs || legalDocs.length === 0) {
    console.warn('⚠️ No legal documents loaded - skipping legal retrieval');
    return [];
  }

  const embedder = await getEmbedder();
  const embedFn = embedder.embed || (async (t: string) => simpleTextToVector(t));

  // Create query from property location and context
  const location = property?.address || property?.location || '';
  const region = property?.region || '';
  const queryText = `${location} ${region} rental property regulations HOA zoning`;
  
  const queryVec = Array.isArray(await embedFn(queryText)) 
    ? (await embedFn(queryText)) as number[] 
    : simpleTextToVector(queryText);

  const allChunks: LegalChunk[] = [];
  for (const doc of legalDocs) {
    allChunks.push(...doc.chunks);
  }

  const scored = await Promise.all(
    allChunks.map(async (chunk) => {
      let chunkVec: number[];
      if (chunk.embedding && chunk.embedding.length > 0) {
        chunkVec = chunk.embedding;
      } else {
        // Fallback: generate embedding on-the-fly
        const embedding = await embedFn(chunk.text);
        chunkVec = Array.isArray(embedding) && !Array.isArray(embedding[0]) 
          ? embedding as number[] 
          : simpleTextToVector(chunk.text);
      }
      
      const score = cosineSimilarity(queryVec, chunkVec);
      
      // Find the parent document for metadata
      const parentDoc = legalDocs.find(doc => 
        doc.chunks.some(c => c.id === chunk.id)
      );
      
      return {
        id: chunk.id,
        text: chunk.text,
        score,
        documentType: parentDoc?.metadata.documentType || 'general',
        region: parentDoc?.metadata.region,
        filename: parentDoc?.filename || 'unknown'
      };
    })
  );

  // Filter and sort results
  scored.sort((a, b) => b.score - a.score);
  
  // Remove duplicates and low-scoring results
  const seen = new Set<string>();
  const filtered = scored.filter(result => {
    if (result.score < 0.1 || seen.has(result.text.substring(0, 100))) {
      return false;
    }
    seen.add(result.text.substring(0, 100));
    return true;
  });

  return filtered.slice(0, topK);
}

/**
 * Combined retrieval function that gets both market knowledge and legal documents
 */
export async function retrieveContext(property: any, marketTopK = 3, legalTopK = 5): Promise<{
  marketContext: Result[];
  legalContext: LegalResult[];
}> {
  const [marketContext, legalContext] = await Promise.all([
    similaritySearch(property?.region || 'California', marketTopK),
    retrieveLegalDocs(property, legalTopK)
  ]);

  return { marketContext, legalContext };
}

