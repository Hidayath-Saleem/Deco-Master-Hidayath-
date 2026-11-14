import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chunkDocumentPages,
  computeContentHash,
  cosineSimilarity,
  extractDriveFolderId,
  lexicalScore,
  retrieveRelevantChunks,
} from './rag.ts';

test('extractDriveFolderId parses full Drive URLs and raw folder IDs', () => {
  assert.equal(
    extractDriveFolderId('https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz?usp=sharing'),
    '1AbCdEfGhIjKlMnOpQrStUvWxYz'
  );
  assert.equal(
    extractDriveFolderId('https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz'),
    '1AbCdEfGhIjKlMnOpQrStUvWxYz'
  );
  assert.equal(extractDriveFolderId('1AbCdEfGhIjKlMnOpQrStUvWxYz'), '1AbCdEfGhIjKlMnOpQrStUvWxYz');
  assert.equal(extractDriveFolderId('not a folder'), null);
});

test('computeContentHash detects duplicates reliably despite whitespace differences', () => {
  const a = computeContentHash('Karnaugh Map\n\nSimplification of Boolean expressions.');
  const b = computeContentHash('Karnaugh   Map   Simplification of   Boolean expressions.');
  const c = computeContentHash('Pipelining hazards in RISC processors.');
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('chunkDocumentPages preserves document name and exact page numbers', () => {
  const words = Array.from({ length: 300 }, (_, i) => `word${i}`).join(' ');
  const chunks = chunkDocumentPages('doc1', 'DECO_Unit1.pdf', [
    { pageNumber: 1, text: 'Boolean algebra and De Morgan theorems.' },
    { pageNumber: 2, text: words },
  ], 150, 30);

  assert.equal(chunks[0].docName, 'DECO_Unit1.pdf');
  assert.equal(chunks[0].pageNumber, 1);
  assert.ok(chunks.length >= 3);
  assert.equal(chunks[1].pageNumber, 2);
  assert.equal(chunks[2].pageNumber, 2);
});

test('retrieveRelevantChunks prioritizes matching chunks using hybrid vector + lexical scoring', () => {
  const chunks = [
    {
      id: 'c1',
      docId: 'd1',
      docName: 'Unit1.pdf',
      pageNumber: 3,
      chunkIndex: 0,
      text: 'Karnaugh Map (K-map) is a graphical method used to simplify Boolean functions up to 4 variables.',
      embedding: [0.9, 0.1, 0.0],
    },
    {
      id: 'c2',
      docId: 'd2',
      docName: 'Unit4.pdf',
      pageNumber: 12,
      chunkIndex: 1,
      text: 'Cache memory mapping techniques include direct mapping, associative mapping, and set-associative mapping.',
      embedding: [0.1, 0.9, 0.0],
    },
  ];

  assert.ok(cosineSimilarity([1, 0, 0], [1, 0, 0]) > 0.99);
  assert.ok(lexicalScore('Karnaugh Map Boolean', chunks[0].text) > lexicalScore('Karnaugh Map Boolean', chunks[1].text));

  const results = retrieveRelevantChunks('cache memory direct mapping', chunks, [0.1, 0.95, 0.0], 1);
  assert.equal(results.length, 1);
  assert.equal(results[0].chunk.docName, 'Unit4.pdf');
  assert.equal(results[0].chunk.pageNumber, 12);
});
