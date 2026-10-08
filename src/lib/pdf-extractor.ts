/**
 * Utilitário universal para extração de texto de PDFs no Node.js e Vercel Serverless.
 * Fornece polyfill de DOMMatrix e APIs web mínimas, além de injetar o worker em memória,
 * eliminando qualquer tentativa de leitura dinâmica de arquivos em disco (/var/task/...).
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
  ensurePolyfills();

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // Injetar o worker explicitamente em memória para o Next.js empacotá-lo no bundle
  // e evitar erro de módulo dinâmico ausente em /var/task/...
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
