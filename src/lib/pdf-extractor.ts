/**
 * Utilitário universal para extração de texto de PDFs no Node.js e Vercel Serverless.
 * Prioriza pdf-parse (rápido, nativo, sem dependência de DOM / workers do navegador),
 * com fallback para pdfjs-dist legado.
 */

function ensurePolyfills() {
  if (typeof globalThis.DOMMatrix === 'undefined') {
    (globalThis as any).DOMMatrix = class DOMMatrix {
      a = 1;
      b = 0;
      c = 0;
      d = 1;
      e = 0;
      f = 0;
      m11 = 1;
      m12 = 0;
      m21 = 0;
      m22 = 1;
      m41 = 0;
      m42 = 0;

      constructor(init?: any) {
        if (Array.isArray(init)) {
          this.a = init[0] ?? 1;
          this.b = init[1] ?? 0;
          this.c = init[2] ?? 0;
          this.d = init[3] ?? 1;
          this.e = init[4] ?? 0;
          this.f = init[5] ?? 0;
        }
      }

      multiply() {
        return this;
      }
      preMultiplySelf() {
        return this;
      }
      multiplySelf() {
        return this;
      }
      invertSelf() {
        return this;
      }
      translate() {
        return this;
      }
      scale() {
        return this;
      }
    };
  }

  if (typeof (globalThis as any).Path2D === 'undefined') {
    (globalThis as any).Path2D = class Path2D {
      addPath() {}
    };
  }

  if (typeof (globalThis as any).ImageData === 'undefined') {
    (globalThis as any).ImageData = class ImageData {
      data = new Uint8ClampedArray(0);
      width = 0;
      height = 0;
    };
  }
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // 1. Tenta extração via pdf-parse (v2 ou v1)
  try {
    const pdfParseMod = await import('pdf-parse');
    const PDFParseClass = (pdfParseMod as any).PDFParse || (pdfParseMod as any).default?.PDFParse;
    if (PDFParseClass) {
      const parser = new PDFParseClass({ data: buffer });
      const doc = await parser.getText();
      if (doc && typeof doc.text === 'string' && doc.text.trim().length > 0) {
        return doc.text;
      }
    } else if (typeof (pdfParseMod as any).default === 'function') {
      const data = await (pdfParseMod as any).default(buffer);
      if (data && data.text && data.text.trim().length > 0) {
        return data.text;
      }
    }
  } catch (err) {
    console.warn('Tentativa com pdf-parse falhou, tentando fallback pdfjs-dist:', err);
  }

  // 2. Fallback via pdfjs-dist legado
  ensurePolyfills();

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  try {
    // @ts-ignore
    const worker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
    if (pdfjs.PDFWorker && worker.WorkerMessageHandler) {
      Object.defineProperty(pdfjs.PDFWorker, '_setupFakeWorkerGlobal', {
        value: Promise.resolve(worker.WorkerMessageHandler),
        configurable: true,
        writable: true,
      });
    }
  } catch (err) {
    console.warn('Aviso ao registrar worker em memória:', err);
  }

  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({
    data,
    useSystemFonts: true,
    isEvalSupported: false,
    useWorkerFetch: false,
  }).promise;

  let fullText = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str || '')
      .join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}
