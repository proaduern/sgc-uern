import { extractTextFromPdf } from './pdf-extractor';

export interface ItemContratoExtraido {
  numeroItem: number;
  cidade?: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitarioMensal: number;
  valorUnitarioAnual: number;
  valorTotalAnual: number;
}

export interface ContratoPdfExtraido {
  numeroContrato: string;
  processoSeiMae: string;
  licitacaoProcedimento: string;
  razaoSocial: string;
  cnpj: string;
  endereco?: string;
  nomeRepresentanteLegal: string;
  objeto: string;
  tipoContrato: string;
  tipoVigencia: string;
  tipoEmpreitada: string;
  vigenciaMeses: number;
  vigenciaInicio?: string;
  vigenciaFim?: string;
  valorGlobal: number;
  indiceReajusteSugerido: string;
  itens: ItemContratoExtraido[];
  totalPostos: number;
  somaItens: number;
  conferenciaMatematica: boolean;
  camposPendentes: string[];
  isRascunho: boolean;
}

function parseCurrency(str: string): number {
  if (!str) return 0;
  const clean = str.replace(/R\$\s?/gi, '').replace(/\./g, '').replace(',', '.').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export async function parseContratoPdf(buffer: Buffer): Promise<ContratoPdfExtraido> {
  const text = await extractTextFromPdf(buffer);

  const camposPendentes: string[] = [];

  // 1. Número do Contrato
  let numeroContrato = '';
  const ctrMatch = text.match(/CONTRATO\s+(?:ADMINISTRATIVO\s+)?N[°º]?\s*([\d\/]+(?:-[\w]+)?)/i);
  if (ctrMatch) {
    numeroContrato = ctrMatch[1].trim();
  } else {
    camposPendentes.push('Número do Contrato');
  }

  // 2. Processo SEI Mãe
  let processoSeiMae = '';
  const procMatch = text.match(/Processo\s+(?:SEI\s+)?n[°º]?\s*([\d\.\/\-]+)/i);
  if (procMatch) {
    processoSeiMae = procMatch[1].trim();
  } else {
    camposPendentes.push('Processo SEI Mãe');
  }

  // 3. Procedimento Licitatório (ex: Pregão Eletrônico nº 39/2026)
  let licitacaoProcedimento = 'Pregão Eletrônico';
  const licMatch = text.match(/(Pregão\s+(?:Eletrônico\s+)?n[°º]?\s*[\d\/]+|Dispensa\s+n[°º]?\s*[\d\/]+|Inexigibilidade\s+n[°º]?\s*[\d\/]+)/i);
  if (licMatch) {
    licitacaoProcedimento = licMatch[1].trim();
  }

  // 4. Fornecedor & CNPJ
  let razaoSocial = '';
  let cnpj = '';
  let endereco = '';

  const fornMatch = text.match(/e\s+a\s+empresa\s+([A-Z0-9\.\-\s]+?),\s*inscrit[oa]\(a\)?(?:\s+no|\s+na)?\s*CNPJ(?:\/MF)?\s+sob\s+o\s+n[°º]?\s*([\d\.\/\-]+)/i)
    || text.match(/(?:empresa|CONTRATAD[OA])\s+([A-Z0-9\.\-\s]+?),\s*inscrit[oa][\s\S]*?CNPJ(?:\/MF)?\s+sob\s+o\s+n[°º]?\s*([\d\.\/\-]+)/i);

  if (fornMatch) {
    razaoSocial = fornMatch[1].replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
    cnpj = fornMatch[2].replace(/\D/g, '').trim();
  } else {
    camposPendentes.push('Fornecedor / CNPJ');
  }

  const endMatch = text.match(/sediad[oa]\(a\)?\s+n[ao]\s+([\s\S]+?)(?=,\s*doravante|\s*doravante)/i)
    || text.match(/sediad[oa]\s+n[ao]\s+([^\n,]+,[^\n,]+,[^\n\.,]+)/i);

  if (endMatch) {
    endereco = endMatch[1].replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // 5. Representante Legal
  let nomeRepresentanteLegal = '';
  const repMatch = text.match(/representad[ao]\(a\)?\s+pel[ao]\s+(?:Sr\.|Sra\.|su[ao])\s*([A-ZÀ-Úa-zà-ú\s]+?),/i)
    || text.match(/representad[ao]\s+pel[ao]\s+su[ao]\s+[^,]+,\s*(?:a\s+Sra?\.?|o\s+Sr\.?)\s*([A-ZÀ-Úa-zà-ú\s]+?),/i);

  if (repMatch) {
    nomeRepresentanteLegal = repMatch[1].replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  } else {
    camposPendentes.push('Nome do Representante Legal');
  }

  // 6. Objeto
  let objeto = '';
  const objMatch = text.match(/CLÁUSULA\s+PRIMEIRA\s*–\s*OBJETO[\s\S]*?1\.1\.\s*(?:O\s+objeto\s+do\s+presente\s+instrumento\s+é\s+a\s+)?([\s\S]+?)(?=\n\s*1\.1\.1|\n\s*1\.2|\n\s*CLÁUSULA)/i);
  if (objMatch) {
    objeto = objMatch[1].replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  } else {
    camposPendentes.push('Objeto Contratual');
  }

  // 7. Tipo e Regime
  let tipoContrato = 'FORNECIMENTO_SIMPLES';
  if (/dedicação\s+exclusiva|dedicacao\s+exclusiva/i.test(text)) {
    tipoContrato = 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO';
  } else if (/serviço|prestação de serviços/i.test(text)) {
    tipoContrato = 'SERVICO_SEM_DEDICACAO';
  } else if (/locação|locacao/i.test(text)) {
    tipoContrato = 'LOCACAO_IMOVEL';
  } else if (/obra|engenharia/i.test(text)) {
    tipoContrato = 'OBRA';
  }

  let tipoVigencia = 'CONTINUADO';
  if (/não-continuado|nao continuado/i.test(text)) {
    tipoVigencia = 'NAO_CONTINUADO';
  }

  let tipoEmpreitada = 'PRECO_UNITARIO';
  if (/preço global|preco global/i.test(text)) {
    tipoEmpreitada = 'PRECO_GLOBAL';
  }

  // 8. Vigência e Prazo
  let vigenciaMeses = 12;
  const vigMatch = text.match(/prazo\s+de\s+vigência\s+(?:da\s+contrata[çc][ãa]o\s+)?é\s+de\s*(\d+)\s*meses/i);
  if (vigMatch) {
    vigenciaMeses = parseInt(vigMatch[1], 10);
  }

  // Se datas de início/fim não estiverem no contrato pois dependem de publicação no PNCP:
  let vigenciaInicio = '';
  let vigenciaFim = '';
  const dataInicioMatch = text.match(/vigência\s+de\s*(\d{2}\/\d{2}\/\d{4})\s*(?:à|a|ate)\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (dataInicioMatch) {
    const [d1, m1, y1] = dataInicioMatch[1].split('/');
    const [d2, m2, y2] = dataInicioMatch[2].split('/');
    vigenciaInicio = `${y1}-${m1}-${d1}`;
    vigenciaFim = `${y2}-${m2}-${d2}`;
  } else {
    camposPendentes.push('Data de Início da Vigência (Dependente de Publicação PNCP)');
  }

  // 9. Valor Global
  let valorGlobal = 0;
  const valMatch = text.match(/valor\s+total\s+da\s+contrata[çc][ãa]o\s+é\s+de\s*R\$\s*([\d\.,]+)/i)
                || text.match(/CLÁUSULA\s+SEXTA[\s\S]*?R\$\s*([\d\.,]+)/i);
  if (valMatch) {
    valorGlobal = parseCurrency(valMatch[1]);
  } else {
    camposPendentes.push('Valor Global Contratual');
  }

  // 10. Sugestão de Índice
  const indiceReajusteSugerido = tipoContrato === 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO'
    ? 'CONVENCAO_COLETIVA'
    : 'IPCA';

  // 11. Extração dos Itens da Tabela (Cláusula 1.2)
  const itens: ItemContratoExtraido[] = [];
  let normalizedText = text.replace(/Pau\s+dos[\r\n\t\s]+Ferros/gi, 'Pau dos Ferros');

  const startIdx = normalizedText.indexOf('1.2. \tObjeto da contratação:') !== -1
    ? normalizedText.indexOf('1.2. \tObjeto da contratação:')
    : (normalizedText.indexOf('1.2. Objeto da contratação:') !== -1
      ? normalizedText.indexOf('1.2. Objeto da contratação:')
      : normalizedText.indexOf('1.2.'));

  const endIdx = normalizedText.indexOf('CLÁUSULA SEGUNDA');

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const itemsBlock = normalizedText.substring(startIdx, endIdx);
    const regex = /(\d+)\s+([A-Za-zÀ-ú\s]+)\/RN/g;
    const matches: RegExpExecArray[] = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(itemsBlock)) !== null) {
      matches.push(m);
    }

    for (let i = 0; i < matches.length; i++) {
      const cur = matches[i];
      const num = parseInt(cur[1], 10);
      const cidade = cur[2].replace(/\s+/g, ' ').trim() + '/RN';
      const startPos = cur.index + cur[0].length;
      const endPos = (i + 1 < matches.length) ? matches[i + 1].index : itemsBlock.length;

      let chunk = itemsBlock.substring(startPos, endPos);
      const totalIdx = chunk.indexOf('TOTAL -');
      if (totalIdx !== -1) {
        chunk = chunk.substring(0, totalIdx);
      }

      const rValues: number[] = [];
      const rRegex = /R\$\s*([\d\.,]+)/gi;
      let rm;
      while ((rm = rRegex.exec(chunk)) !== null) {
        rValues.push(parseCurrency(rm[1]));
      }

      const unitMatch = chunk.match(/(Posto|Unidade|Mês|Serviço|Item|Lote)\s*(\d+)/i);
      const unidade = unitMatch ? unitMatch[1] : 'Posto';
      const qtd = unitMatch ? parseInt(unitMatch[2], 10) : 1;

      let desc = chunk;
      if (unitMatch) {
        const uPos = chunk.indexOf(unitMatch[0]);
        desc = chunk.substring(0, uPos);
      }
      desc = desc.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();

      const vMensal = rValues[0] || 0;
      const vAnual = rValues[1] || (vMensal * 12);
      const vTotal = rValues[2] || (vAnual * qtd);

      itens.push({
        numeroItem: num,
        cidade,
        descricao: desc,
        unidade,
        quantidade: qtd,
        valorUnitarioMensal: vMensal,
        valorUnitarioAnual: vAnual,
        valorTotalAnual: vTotal,
      });
    }
  }

  if (itens.length === 0) {
    camposPendentes.push('Itens Contratuais (Necessário inclusão manual ou planilha)');
  }

  const somaItens = itens.reduce((s, it) => s + it.valorTotalAnual, 0);
  const totalPostos = itens.reduce((s, it) => s + it.quantidade, 0);
  const conferenciaMatematica = valorGlobal > 0 && Math.abs(somaItens - valorGlobal) < 1.0;

  return {
    numeroContrato,
    processoSeiMae,
    licitacaoProcedimento,
    razaoSocial,
    cnpj,
    endereco,
    nomeRepresentanteLegal,
    objeto,
    tipoContrato,
    tipoVigencia,
    tipoEmpreitada,
    vigenciaMeses,
    vigenciaInicio,
    vigenciaFim,
    valorGlobal,
    indiceReajusteSugerido,
    itens,
    totalPostos,
    somaItens,
    conferenciaMatematica,
    camposPendentes,
    isRascunho: camposPendentes.length > 0,
  };
}
