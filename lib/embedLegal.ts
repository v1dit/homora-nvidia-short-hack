// lib/embedLegal.ts - Convert legal documents to embeddings for RAG retrieval
import fs from 'fs';
import path from 'path';
import { getEmbedder } from './rag';

export interface LegalDocument {
  id: string;
  filename: string;
  content: string;
  chunks: LegalChunk[];
  metadata: {
    region?: string;
    documentType: 'hoa' | 'zoning' | 'rental_law' | 'general';
    lastUpdated?: string;
  };
}

export interface LegalChunk {
  id: string;
  text: string;
  embedding: number[];
  metadata: {
    section?: string;
    startIndex: number;
    endIndex: number;
    chunkIndex: number;
  };
}

const LEGAL_DATA_PATH = path.join(process.cwd(), 'data/legal');
const LEGAL_VECTORS_PATH = path.join(process.cwd(), 'data/legal_vectors.json');

/**
 * Split text into overlapping chunks for better retrieval
 */
function chunkText(text: string, chunkSize = 500, overlap = 100): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);
    
    // Try to break at sentence boundaries
    if (end < text.length) {
      const lastSentence = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const breakPoint = Math.max(lastSentence, lastNewline);
      
      if (breakPoint > start + chunkSize * 0.5) {
        chunk = text.slice(start, breakPoint + 1);
      }
    }
    
    chunks.push(chunk.trim());
    start = Math.max(start + chunkSize - overlap, start + 1);
  }
  
  return chunks.filter(chunk => chunk.length > 50); // Filter out very small chunks
}

/**
 * Extract metadata from filename and content
 */
function extractMetadata(filename: string, content: string): LegalDocument['metadata'] {
  const documentType: LegalDocument['metadata']['documentType'] = 
    filename.includes('hoa') ? 'hoa' :
    filename.includes('zoning') ? 'zoning' :
    filename.includes('rental') ? 'rental_law' : 'general';
  
  let region: string | undefined;
  if (filename.includes('mountain_view') || content.toLowerCase().includes('mountain view')) {
    region = 'Mountain View, CA';
  } else if (filename.includes('texas') || content.toLowerCase().includes('texas')) {
    region = 'Texas';
  } else if (content.toLowerCase().includes('california')) {
    region = 'California';
  }
  
  return {
    documentType,
    region,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Load and process all legal documents
 */
async function loadLegalDocuments(): Promise<LegalDocument[]> {
  const documents: LegalDocument[] = [];
  
  if (!fs.existsSync(LEGAL_DATA_PATH)) {
    console.warn('⚠️ Legal data directory not found:', LEGAL_DATA_PATH);
    return documents;
  }
  
  const files = fs.readdirSync(LEGAL_DATA_PATH).filter(f => f.endsWith('.txt'));
  
  for (const filename of files) {
    const filePath = path.join(LEGAL_DATA_PATH, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const chunks = chunkText(content);
    const metadata = extractMetadata(filename, content);
    
    documents.push({
      id: `legal_${filename.replace('.txt', '')}`,
      filename,
      content,
      chunks: chunks.map((chunk, index) => ({
        id: `${filename.replace('.txt', '')}_chunk_${index}`,
        text: chunk,
        embedding: [], // Will be populated by embedDocuments
        metadata: {
          startIndex: content.indexOf(chunk),
          endIndex: content.indexOf(chunk) + chunk.length,
          chunkIndex: index
        }
      })),
      metadata
    });
  }
  
  return documents;
}

/**
 * Generate embeddings for all legal document chunks
 */
export async function embedLegalDocuments(): Promise<LegalDocument[]> {
  console.log('🔄 Loading legal documents...');
  const documents = await loadLegalDocuments();
  
  if (documents.length === 0) {
    console.warn('⚠️ No legal documents found to embed');
    return documents;
  }
  
  console.log(`📄 Found ${documents.length} legal documents`);
  
  const embedder = await getEmbedder();
  let totalChunks = 0;
  
  for (const doc of documents) {
    console.log(`🔢 Embedding ${doc.chunks.length} chunks from ${doc.filename}...`);
    
    for (const chunk of doc.chunks) {
      try {
        const embedding = await embedder.embed(chunk.text);
        chunk.embedding = Array.isArray(embedding) ? embedding : [];
        totalChunks++;
      } catch (error) {
        console.error(`❌ Failed to embed chunk ${chunk.id}:`, error);
        // Use fallback embedding
        chunk.embedding = [];
      }
    }
  }
  
  console.log(`✅ Generated embeddings for ${totalChunks} legal document chunks`);
  return documents;
}

/**
 * Save embedded documents to JSON file
 */
export async function saveLegalEmbeddings(documents: LegalDocument[]): Promise<void> {
  const output = {
    documents,
    metadata: {
      generatedAt: new Date().toISOString(),
      totalDocuments: documents.length,
      totalChunks: documents.reduce((sum, doc) => sum + doc.chunks.length, 0)
    }
  };
  
  fs.writeFileSync(LEGAL_VECTORS_PATH, JSON.stringify(output, null, 2));
  console.log(`💾 Saved legal embeddings to ${LEGAL_VECTORS_PATH}`);
}

/**
 * Load pre-computed legal embeddings
 */
export function loadLegalEmbeddings(): LegalDocument[] | null {
  if (!fs.existsSync(LEGAL_VECTORS_PATH)) {
    return null;
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(LEGAL_VECTORS_PATH, 'utf-8'));
    return data.documents || [];
  } catch (error) {
    console.error('❌ Failed to load legal embeddings:', error);
    return null;
  }
}

/**
 * CLI function to generate and save embeddings
 */
export async function generateLegalEmbeddings(): Promise<void> {
  console.log('🚀 Starting legal document embedding process...');
  
  const documents = await embedLegalDocuments();
  await saveLegalEmbeddings(documents);
  
  console.log('✅ Legal embeddings generation complete!');
}

// Allow running this script directly
if (require.main === module) {
  generateLegalEmbeddings().catch(console.error);
}
