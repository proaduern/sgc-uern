import { extractTextFromPdf } from './pdf-extractor';

export interface ServidorDesignado {
  tipoAtuacao: 'GESTOR' | 'SUPLENTE' | 'FISCAL_ADMINISTRATIVO' | 'FISCAL_TECNICO' | 'FISCAL_SETORIAL';
  nome: string;
  matricula: string;
  campusSetor?: string;
  cidade?: string;
}

export interface DesignacaoPdfExtraida {
  numeroAto: string;
  dataAto?: string;
  idSeiAto?: string;
  processoSei: string;
  empresaContratada?: string;
  cnpjContratada?: string;
  empenhos?: string[];
  servidores: ServidorDesignado[];
}

export async function parseDesignacaoPdf(buffer: Buffer): Promise<DesignacaoPdfExtraida> {
  const text = await extractTextFromPdf(buffer);

  // 1. Número do Ato e Data
  let numeroAto = '';
  let dataAto = '';
  const atoMatch = text.match(/ATO\s+N[°º]?\s*([\d\/]+)(?:,\s*DE\s*(\d{1,2}\s+DE\s+[A-ZÇÃÉÊÍÓÔÚ]+\s+DE\s+\d{4}))?/i);
  if (atoMatch) {
    numeroAto = atoMatch[1].trim();
    if (atoMatch[2]) dataAto = atoMatch[2].trim();
  }

  // 2. ID SEI do Ato
  let idSeiAto = '';
  const seiAtoMatch = text.match(/SEI\s+n[°º]?\s*(\d{7,10})/i) || text.match(/Ato\s+\d+\s*\((?:id\s*)?(\d{7,10})\)/i);
  if (seiAtoMatch) {
    idSeiAto = seiAtoMatch[1].trim();
  }

  // 3. Processo SEI
  let processoSei = '';
  const procMatch = text.match(/Processo\s+(?:SEI\s+)?n[°º]?\s*([\d\.\/\-]+)/i);
  if (procMatch) {
    processoSei = procMatch[1].trim();
  }

  // 4. Empresa Contratada e CNPJ
  let empresaContratada = '';
  let cnpjContratada = '';
  const empresaMatch = text.match(/empresa\s+([A-Z0-9\.\-\s]+?),\s*CNPJ(?:\/MF)?\s+n[°º]?\s*([\d\.\/\-]+)/i);
  if (empresaMatch) {
    empresaContratada = empresaMatch[1].replace(/\s+/g, ' ').trim();
    cnpjContratada = empresaMatch[2].replace(/\D/g, '').trim();
  }

  // 5. Notas de Empenho
  const empenhos: string[] = [];
  const neMatches = text.match(/\b\d{4}NE\d{6}\b/gi);
  if (neMatches) {
    neMatches.forEach((ne: string) => {
      if (!empenhos.includes(ne)) empenhos.push(ne);
    });
  }

  // 6. Servidores Designados
  const servidores: ServidorDesignado[] = [];

  // Alínea a: Gestor
  const gestorMatch = text.match(/a\)\s*Designar\s+o\(a\)\s+servidor\(a\)\s+([A-ZÀ-Úa-zà-ú\s]+?),\s*matr[íi]cula\s+n[°º]?\s*([\d\.\-]+).*?Gestor/i);
  if (gestorMatch) {
    servidores.push({
      tipoAtuacao: 'GESTOR',
      nome: gestorMatch[1].replace(/\s+/g, ' ').trim(),
      matricula: gestorMatch[2].trim(),
      campusSetor: 'Reitoria/Mossoró',
    });
  }

  // Alínea b: Suplente
  const suplenteMatch = text.match(/b\)\s*Designar\s+o\(a\)\s+servidor\(a\)\s+([A-ZÀ-Úa-zà-ú\s]+?),\s*matr[íi]cula\s+n[°º]?\s*([\d\.\-]+).*?Suplente/i);
  if (suplenteMatch) {
    servidores.push({
      tipoAtuacao: 'SUPLENTE',
      nome: suplenteMatch[1].replace(/\s+/g, ' ').trim(),
      matricula: suplenteMatch[2].trim(),
      campusSetor: 'Reitoria/Mossoró',
    });
  }

  // Alínea c: Fiscal Administrativo
  const admMatch = text.match(/c\)\s*Designar\s+o\(a\)\s+servidor\(a\)\s+([A-ZÀ-Úa-zà-ú\s]+?),\s*matr[íi]cula\s+n[°º]?\s*([\d\.\-]+).*?Fiscal\s+Administrativo/i);
  if (admMatch) {
    servidores.push({
      tipoAtuacao: 'FISCAL_ADMINISTRATIVO',
      nome: admMatch[1].replace(/\s+/g, ' ').trim(),
      matricula: admMatch[2].trim(),
      campusSetor: 'Reitoria/Mossoró',
    });
  }

  // Alínea d: Fiscais Técnicos (pode ser 1 ou mais)
  const dBlockMatch = text.match(/d\)\s*(?:d\)\s*)?Designar\s+o\(a\)\(s\)\s+servidor\(a\)\(s\)\s+([\s\S]+?)(?:como\s+Fiscais?\s+T[ée]cnico|podendo\s+ser)/i);
  if (dBlockMatch) {
    const dBlock = dBlockMatch[1];
    const tecRegex = /([A-ZÀ-Úa-zà-ú\s]+?),\s*matr[íi]cula\s+n[°º]?\s*([\d\.\-]+)/gi;
    let tm;
    while ((tm = tecRegex.exec(dBlock)) !== null) {
      const nome = tm[1].replace(/\be\b/gi, '').replace(/\s+/g, ' ').trim();
      const matricula = tm[2].trim();
      if (nome && matricula) {
        servidores.push({
          tipoAtuacao: 'FISCAL_TECNICO',
          nome,
          matricula,
          campusSetor: 'Reitoria/Mossoró',
        });
      }
    }
  }

  // Alínea e: Fiscais Setoriais por campus
  const eBlockMatch = text.match(/e\)\s*Designar\s+os\(as\)\s+servidores\(as\)\s+([\s\S]+?)(?:podendo,\s*em\s*caso|As\s+competências|Juntem-se|REGISTRE-SE)/i);
  if (eBlockMatch) {
    const eBlock = eBlockMatch[1];
    const parts = eBlock.split(';').map((p: string) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);

    for (const part of parts) {
      const matMatch = part.match(/(?:matr[íi]cula|Mat\.)\s+n[°º]?\s*([\d\.\-]+)/i);
      const campMatch = part.match(/Campus\s+Avançado\s+de\s+([A-Za-zÀ-ú\s]+?)(?:-RN|\))/i);

      if (matMatch && campMatch) {
        const matIdx = part.indexOf(matMatch[0]);
        let rawNome = part.substring(0, matIdx).replace(/^[,\s]+|[,\s]+$/g, '').trim();
        rawNome = rawNome.replace(/^(?:Designar\s+os\(as\)\s+servidores\(as\)\s+)/i, '').trim();

        const matricula = matMatch[1].trim();
        const cidade = campMatch[1].trim();

        servidores.push({
          tipoAtuacao: 'FISCAL_SETORIAL',
          nome: rawNome,
          matricula,
          cidade,
          campusSetor: `Campus Avançado de ${cidade}`,
        });
      }
    }
  }

  return {
    numeroAto,
    dataAto,
    idSeiAto,
    processoSei,
    empresaContratada,
    cnpjContratada,
    empenhos,
    servidores,
  };
}
