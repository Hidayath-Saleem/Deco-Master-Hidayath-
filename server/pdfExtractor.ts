import JSZip from 'jszip';
import type { DocumentPage } from '../src/types/deco.ts';

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function paginateWords(text: string, wordsPerPage = 420): DocumentPage[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const pages: DocumentPage[] = [];
  for (let i = 0; i < words.length; i += wordsPerPage) {
    pages.push({
      pageNumber: Math.floor(i / wordsPerPage) + 1,
      text: words.slice(i, i + wordsPerPage).join(' '),
    });
  }
  return pages;
}

/**
 * Extracts text page-by-page from PDF, DOCX, PPTX, or plain-text buffers while preserving
 * exact 1-indexed page/slide numbers for citations and RAG retrieval.
 */
export async function extractDocumentPages(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<DocumentPage[]> {
  const lowerName = fileName.toLowerCase();
  const isPdf = mimeType === 'application/pdf' || lowerName.endsWith('.pdf');
  const isDocx =
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerName.endsWith('.docx');
  const isPptx =
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    lowerName.endsWith('.pptx');

  if (isDocx) {
    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file('word/document.xml')?.async('string');
    if (!docXml) return [];
    const cleaned = decodeXmlEntities(
      docXml
        .replace(/<\/w:p>/g, '\n')
        .replace(/<w:tab\/>/g, ' ')
        .replace(/<[^>]+>/g, ' ')
    )
      .replace(/\s+/g, ' ')
      .trim();
    return paginateWords(cleaned);
  }

  if (isPptx) {
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files)
      .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
      .sort((a, b) => {
        const na = Number(a.match(/slide(\d+)\.xml/)?.[1] || 0);
        const nb = Number(b.match(/slide(\d+)\.xml/)?.[1] || 0);
        return na - nb;
      });

    const pages: DocumentPage[] = [];
    for (let i = 0; i < slideFiles.length; i++) {
      const xml = await zip.file(slideFiles[i])?.async('string');
      if (!xml) continue;
      const slideText = decodeXmlEntities(
        xml.replace(/<\/a:p>/g, '\n').replace(/<[^>]+>/g, ' ')
      )
        .replace(/\s+/g, ' ')
        .trim();
      if (slideText.length > 0) {
        pages.push({
          pageNumber: i + 1,
          text: slideText,
        });
      }
    }
    return pages;
  }

  if (!isPdf) {
    const text = buffer.toString('utf-8').replace(/\r\n/g, '\n');
    if (text.includes('\f')) {
      return text
        .split('\f')
        .map((chunk, i) => ({
          pageNumber: i + 1,
          text: chunk.replace(/\s+/g, ' ').trim(),
        }))
        .filter((p) => p.text.length > 0);
    }
    return paginateWords(text);
  }

  // Dynamic import of pdfjs-dist legacy Node build
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const uint8 = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({
    data: uint8,
    useSystemFonts: true,
    disableFontFace: true,
  });

  const pdfDoc = await loadingTask.promise;
  const pages: DocumentPage[] = [];

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();
    const strings: string[] = [];
    for (const item of content.items) {
      if ('str' in item && typeof item.str === 'string') {
        strings.push(item.str);
      }
    }
    const pageText = strings.join(' ').replace(/\s+/g, ' ').trim();
    pages.push({
      pageNumber: pageNum,
      text: pageText,
    });
  }

  return pages.filter((p) => p.text.length > 0);
}
