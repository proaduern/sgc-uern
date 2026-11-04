'use client';

import { useEffect } from 'react';
import { jsPDF } from 'jspdf';

function fnv1aHex(str: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  let h3 = 0xdeadbeef;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c + i;
    h2 = Math.imul(h2, 0x85ebca6b);
    h3 ^= c * 31;
    h3 = Math.imul(h3, 0xc2b2ae35);
  }
  const p1 = (h1 >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 4);
  const p2 = (h2 >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 4);
  const p3 = (h3 >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 4);
  return `${p1}-${p2}-${p3}`;
}

function toBase64Url(str: string): string {
  try {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return '';
  }
}

export function estamparAutenticacaoNoJsPdf(doc: jsPDF, nomeArquivo: string, modulo = 'SGC_DOCUMENTO') {
  try {
    const codigo = fnv1aHex(`${modulo}:${nomeArquivo}`);
    const tituloLimpo = (nomeArquivo || 'Documento Oficial PROAD/UERN').replace(/\.pdf$/i, '').replace(/_/g, ' ');
    const payload = JSON.stringify({
      tipo: modulo,
      titulo: tituloLimpo,
      ref: nomeArquivo,
      setor: 'PROAD / UERN',
    });
    const token = toBase64Url(payload);
    const urlBase = `https://pca-uern.vercel.app/verificar/${codigo}`;
    const urlCompleta = token ? `${urlBase}?t=${token}` : urlBase;

    // Registra de forma assíncrona no servidor central de verificação
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      fetch('https://pca-uern.vercel.app/api/verificar-documento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoDocumento: modulo,
          referenciaId: nomeArquivo,
          titulo: tituloLimpo,
          unidadeOuSetor: 'PROAD / UERN',
        }),
      }).catch(() => {});
    }

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const yTop = pageHeight - 10.5;

      doc.setFillColor(248, 250, 252);
      doc.rect(10, yTop - 2.5, pageWidth - 20, 9.5, 'F');
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.25);
      doc.line(10, yTop - 2.5, pageWidth - 10, yTop - 2.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(15, 23, 42);
      doc.text('DOCUMENTO AUTENTICADO DIGITALMENTE — ECOSSISTEMA PROAD / UERN', 12, yTop + 0.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(51, 65, 85);
      const prefixo = 'Confira a autenticidade deste documento público em: ';
      doc.text(prefixo, 12, yTop + 4.3);
      const prefixWidth = doc.getTextWidth(prefixo);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(29, 78, 216);
      if (typeof (doc as any).textWithLink === 'function') {
        (doc as any).textWithLink(urlBase, 12 + prefixWidth, yTop + 4.3, { url: urlCompleta });
      } else {
        doc.text(urlBase, 12 + prefixWidth, yTop + 4.3);
      }

      const linkWidth = doc.getTextWidth(urlBase);
      doc.setTextColor(15, 23, 42);
      doc.text(` (Código: ${codigo})`, 12 + prefixWidth + linkWidth, yTop + 4.3);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(71, 85, 105);
      doc.text(`Pág. ${i} de ${totalPages}`, pageWidth - 12, yTop + 2.5, { align: 'right' });
    }
  } catch (err) {
    console.warn('[estamparAutenticacaoNoJsPdf]', err);
  }
}

export default function PdfAutenticacaoInit({ modulo = 'SGC_DOCUMENTO' }: { modulo?: string }) {
  useEffect(() => {
    const proto = jsPDF.prototype as any;
    if (proto && !proto.__proadAuthPatched) {
      const originalSave = proto.save;
      proto.save = function (filename?: string, options?: any) {
        estamparAutenticacaoNoJsPdf(this, filename || 'Documento_PROAD_UERN.pdf', modulo);
        return originalSave.call(this, filename, options);
      };
      proto.__proadAuthPatched = true;
    }
  }, [modulo]);

  return null;
}
