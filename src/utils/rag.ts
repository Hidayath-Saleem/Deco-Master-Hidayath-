import type { DocumentChunk, DocumentPage } from '../types/deco.ts';

/**
 * Computes a deterministic FNV-1a-style 64-bit hex hash of normalized text
 * for fast duplicate document detection across Drive sync and manual PDF uploads.
 */
export function computeContentHash(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Extracts a Google Drive folder ID from either a full Drive URL or a raw folder ID.
 */
export function extractDriveFolderId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  // Match /folders/<ID>
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]{10,})/);
  if (folderMatch) return folderMatch[1];

  // Match ?id=<ID> or &id=<ID>
  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (queryMatch) return queryMatch[1];

  // Match raw folder ID (alphanumeric, hyphens, underscores, >= 10 chars, no spaces or slashes)
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Splits extracted PDF/document pages into overlapping word chunks while strictly
 * preserving document name and exact page number for RAG source attribution.
 */
export function chunkDocumentPages(
  docId: string,
  docName: string,
  pages: DocumentPage[],
  chunkSizeWords = 220,
  overlapWords = 40
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    const cleanText = page.text.replace(/\s+/g, ' ').trim();
    if (!cleanText) continue;

    const words = cleanText.split(' ');
    if (words.length <= chunkSizeWords) {
      chunks.push({
        id: `${docId}_p${page.pageNumber}_c${globalChunkIndex}`,
        docId,
        docName,
        pageNumber: page.pageNumber,
        chunkIndex: globalChunkIndex++,
        text: cleanText,
      });
      continue;
    }

    const step = Math.max(1, chunkSizeWords - overlapWords);
    for (let start = 0; start < words.length; start += step) {
      const slice = words.slice(start, start + chunkSizeWords);
      if (slice.length < 15 && start > 0) break;
      chunks.push({
        id: `${docId}_p${page.pageNumber}_c${globalChunkIndex}`,
        docId,
        docName,
        pageNumber: page.pageNumber,
        chunkIndex: globalChunkIndex++,
        text: slice.join(' '),
      });
      if (start + chunkSizeWords >= words.length) break;
    }
  }

  return chunks;
}

/**
 * Computes cosine similarity between two numeric embedding vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

const STOPWORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'of', 'for',
  'with', 'by', 'from', 'as', 'that', 'this', 'are', 'was', 'were', 'be', 'been',
  'it', 'or', 'can', 'what', 'how', 'why', 'when', 'where', 'explain', 'give',
  'me', 'define', 'difference', 'between', 'about', 'notes', 'unit', 'topic',
]);

export function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9+\-*/=^()_\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

/**
 * Lexical relevance score using term frequency + phrase matching.
 */
export function lexicalScore(query: string, text: string): number {
  const lowerText = text.toLowerCase();
  const terms = tokenizeQuery(query);
  if (terms.length === 0) return 0;

  let hits = 0;
  let distinctHits = 0;
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = lowerText.match(new RegExp(`\\b${escaped}`, 'g'));
    if (matches && matches.length > 0) {
      distinctHits += 1;
      hits += Math.min(4, matches.length);
    }
  }

  const coverage = distinctHits / terms.length;
  const density = hits / Math.max(1, terms.length * 2);

  // Bonus if normalized multi-word phrase appears directly
  const cleanedPhrase = terms.join(' ');
  const phraseBonus = cleanedPhrase.length > 4 && lowerText.includes(cleanedPhrase) ? 0.35 : 0;

  return Math.min(1, coverage * 0.65 + density * 0.35 + phraseBonus);
}

export interface RetrievedChunkResult {
  chunk: DocumentChunk;
  score: number;
}

/**
 * Hybrid RAG retrieval: combines embedding cosine similarity (when available)
 * with lexical keyword/phrase scoring so retrieval remains accurate even if some
 * chunks have not yet been embedded.
 */
export function retrieveRelevantChunks(
  query: string,
  chunks: DocumentChunk[],
  queryEmbedding?: number[],
  topK = 6,
  preferredDocIds?: Set<string>
): RetrievedChunkResult[] {
  if (!chunks.length) return [];

  const scored: RetrievedChunkResult[] = chunks.map((chunk) => {
    const lex = lexicalScore(query, chunk.text);
    const vec =
      queryEmbedding && chunk.embedding && chunk.embedding.length === queryEmbedding.length
        ? Math.max(0, cosineSimilarity(queryEmbedding, chunk.embedding))
        : 0;

    const hasVec = Boolean(queryEmbedding && chunk.embedding && chunk.embedding.length > 0);
    let score = hasVec ? vec * 0.68 + lex * 0.32 : lex;
    if (preferredDocIds && preferredDocIds.has(chunk.docId)) {
      score += 0.08;
    }

    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
