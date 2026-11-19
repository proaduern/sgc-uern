import fs from "fs";
import path from "path";
import {
  Paragraph,
  TextRun,
  Header,
  Footer,
  AlignmentType,
  PageNumber,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Document,
  Packer,
} from "docx";

let brasaoBufferCache: Buffer | null = null;

export function obterBufferBrasaoUernSgc(): Buffer | null {
  if (brasaoBufferCache) return brasaoBufferCache;

  const candidatos = [
    path.join(process.cwd(), "public", "brasao-uern.jpg"),
    path.join(__dirname, "..", "..", "..", "public", "brasao-uern.jpg"),
    "C:\\Users\\pedro\\.gemini\\antigravity-ide\\scratch\\sgc-uern\\public\\brasao-uern.jpg",
  ];

  for (const p of candidatos) {
    try {
      if (fs.existsSync(p)) {
        brasaoBufferCache = fs.readFileSync(p);
        return brasaoBufferCache;
      }
    } catch {
      // continua buscando
    }
  }
  return null;
}

export function criarCabecalhoDocxUernSgc(tituloDocumento: string): Header {
  const brasaoBuf = obterBufferBrasaoUernSgc();
  const elementosCabecalho: Paragraph[] = [];

  if (brasaoBuf) {
    elementosCabecalho.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: brasaoBuf,
            transformation: {
              width: 52,
              height: 80,
            },
            type: "jpg",
          }),
        ],
        spacing: { after: 80 },
      }),
    );
  }

  elementosCabecalho.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "ESTADO DO RIO GRANDE DO NORTE",
          bold: true,
          size: 17,
          font: "Arial",
          color: "1E293B",
        }),
      ],
      spacing: { after: 20 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE — UERN",
          bold: true,
          size: 19,
          font: "Arial",
          color: "1E3A8A",
        }),
      ],
      spacing: { after: 20 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "PRÓ-REITORIA DE ADMINISTRAÇÃO — PROAD",
          bold: true,
          size: 16,
          font: "Arial",
          color: "334155",
        }),
      ],
      spacing: { after: 20 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "SETOR DE GESTÃO DE CONTRATOS E ATAS — SGC",
          bold: true,
          size: 15,
          font: "Arial",
          color: "64748B",
        }),
      ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: tituloDocumento.toUpperCase(),
          bold: true,
          size: 21,
          font: "Arial",
          color: "0F172A",
        }),
      ],
      spacing: { after: 140 },
    }),
  );

  return new Header({
    children: elementosCabecalho,
  });
}

export function criarRodapeDocxUernSgc(codigoAutenticacao?: string): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "Documento oficial expedido pelo Sistema Integrado de Gestão de Contratos e Atas (SGC-UERN).",
            size: 14,
            font: "Arial",
            color: "64748B",
            italics: true,
          }),
        ],
        spacing: { after: 20 },
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: codigoAutenticacao
              ? `Código Verificador de Autenticidade: ${codigoAutenticacao} · Página `
              : "Página ",
            size: 14,
            font: "Arial",
            color: "64748B",
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            size: 14,
            font: "Arial",
            color: "64748B",
          }),
          new TextRun({
            text: " de ",
            size: 14,
            font: "Arial",
            color: "64748B",
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            size: 14,
            font: "Arial",
            color: "64748B",
          }),
        ],
      }),
    ],
  });
}

export function criarTituloSecaoDocxSgc(titulo: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    children: [
      new TextRun({
        text: titulo,
        bold: true,
        size: 19,
        font: "Arial",
        color: "1E3A8A",
      }),
    ],
    spacing: { before: 200, after: 80 },
  });
}

export function criarParagrafoDocxSgc(texto: string, negrito = false): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({
        text: texto,
        bold: negrito,
        size: 17,
        font: "Arial",
        color: "1E293B",
      }),
    ],
    spacing: { after: 100, line: 276 },
  });
}

export async function empacotarDocxParaBufferSgc(doc: Document): Promise<Buffer> {
  return Packer.toBuffer(doc);
}
