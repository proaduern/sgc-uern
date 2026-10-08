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
  const ctrMatch = text.match(/CONTRATO\s+(?:ADMINISTRATIVO\s+)?N[°º]?\s*([\d\/]+)/i);
  if (ctrMatch) {
    numeroContrato = ctrMatch[1].trim();
  } else {
    camposPendentes.push('Número do Contrato');
  }

  // 2. Processo SEI
  let processoSeiMae = '';
  const procMatch = text.match(/Processo\s+(?:SEI\s+)?n[°º]?\s*([\d\.\/\-]+)/i);
  if (procMatch) {
    processoSeiMae = procMatch[1].trim();
  } else {
    camposPendentes.push('Processo SEI Mãe');
  }

  // 3. Procedimento Licitatório (ex: Pregão Eletrônico nº 38/2025)
  let licitacaoProcedimento = 'Pregão Eletrônico';
  const licMatch = text.match(/(Pregão\s+(?:Eletrônico\s+)?n[°º]?\s*[\d\/]+|Dispensa\s+n[°º]?\s*[\d\/]+|Inexigibilidade\s+n[°º]?\s*[\d\/]+)/i);
  if (licMatch) {
    licitacaoProcedimento = licMatch[1].trim();
  }

  // 4. Fornecedor & CNPJ
  let razaoSocial = '';
  let cnpj = '';
  let endereco = '';
  const fornMatch = text.match(/(?:empresa|CONTRATAD[OA])\s+([A-Z0-9\.\-\s]+?),\s*inscrit[oa].*?CNPJ(?:\/MF)?\s+sob\s+o\s+n[°º]?\s*([\d\.\/\-]+)/i);
  if (fornMatch) {
    razaoSocial = fornMatch[1].replace(/\s+/g, ' ').trim();
    cnpj = fornMatch[2].replace(/\D/g, '').trim();
  } else {
    camposPendentes.push('Fornecedor / CNPJ');
  }

  const endMatch = text.match(/sediad[oa]\s+n[ao]\s+([^\n,]+,[^\n,]+,[^\n\.,]+)/i);
  if (endMatch) {
    endereco = endMatch[1].replace(/\s+/g, ' ').trim();
  }

  // 5. Representante Legal (Apenas nome completo - SEM EXIGIR CPF)
  let nomeRepresentanteLegal = '';
  const repMatch = text.match(/representad[ao]\s+pel[ao]\s+su[ao]\s+[^,]+,\s*(?:a\s+Sra?\.?|o\s+Sr\.?)\s*([A-ZÀ-Úa-zà-ú\s]+?),/i);
  if (repMatch) {
    nomeRepresentanteLegal = repMatch[1].replace(/\s+/g, ' ').trim();
  } else {
    camposPendentes.push('Nome do Representante Legal');
  }

  // 6. Objeto
  let objeto = '';
  const objMatch = text.match(/CLÁUSULA PRIMEIRA\s*–\s*OBJETO[\s\S]*?1\.1\.\s*(?:O\s+objeto\s+do\s+presente\s+instrumento\s+é\s+a\s+)?([\s\S]+?)(?=\n\s*1\.1\.1|\n\s*1\.2|\n\s*CLÁUSULA)/i);
  if (objMatch) {
    objeto = objMatch[1].replace(/\s+/g, ' ').trim();
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
  const startIdx = text.indexOf('1.2. \tObjeto da contratação:');
  const endIdx = text.indexOf('CLÁUSULA SEGUNDA');

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    let itemsBlock = text.substring(startIdx, endIdx);
    // Normaliza quebras de linha no nome da cidade (Pau dos\nFerros/RN)
    itemsBlock = itemsBlock.replace(/Pau\s+dos[\r\n\t\s]+Ferros/gi, 'Pau dos Ferros');
    // Insere delimitador único antes de cada item (1 a 50)
    itemsBlock = itemsBlock.replace(/(\d+)\s*(?:[\r\n\t]+|\s+)(Assu|Caicó|Mossoró|Natal|Patu|Pau dos Ferros)\/RN/gi, '\nITEM_START_$1\t$2/RN\t');

    const rawBlocks = itemsBlock.split('ITEM_START_').filter((b: string) => b.trim());

    for (const b of rawBlocks) {
      const firstTab = b.indexOf('\t');
      if (firstTab === -1) continue;
      const numStr = b.substring(0, firstTab).trim();
      const num = parseInt(numStr, 10);
      if (isNaN(num)) continue;

      const remainder = b.substring(firstTab + 1);
      const campMatch = remainder.match(/^(Assu\/RN|Caicó\/RN|Mossoró\/RN|Natal\/RN|Patu\/RN|Pau dos Ferros\/RN)/i);
      if (!campMatch) continue;

      const cidade = campMatch[1];
      const rawText = remainder.substring(cidade.length).trim();

      processItemBlock({ numeroItem: num, cidade, rawText }, itens);
    }
  }

  if (itens.length === 0) {
    camposPendentes.push('Itens Contratuais (Necessário inclusão manual ou planilha)');
  }

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
    camposPendentes,
    isRascunho: camposPendentes.length > 0,
  };
}

function processItemBlock(
  item: { numeroItem: number; cidade: string; rawText: string },
  itens: ItemContratoExtraido[]
) {
  const rMatches = item.rawText.match(/R\$\s*([\d\.,]+)/g) || [];
  const unitMatch = item.rawText.match(/(Posto|Unidade|Mês|Serviço|Item|Lote)\s*(\d+)/i);
  const qtd = unitMatch ? parseInt(unitMatch[2], 10) : 1;
  const unidade = unitMatch ? unitMatch[1] : 'Posto';

  let desc = item.rawText;
  if (unitMatch) {
    const uIdx = item.rawText.indexOf(unitMatch[0]);
    desc = item.rawText.substring(0, uIdx).replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim();
  } else {
    // Remove R$ matches from description
    desc = desc.replace(/R\$\s*[\d\.,]+/g, '').replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const vMensal = rMatches[0] ? parseCurrency(rMatches[0]) : 0;
  const vAnual = rMatches[1] ? parseCurrency(rMatches[1]) : 0;
  const vTotal = rMatches[2] ? parseCurrency(rMatches[2]) : (vAnual * qtd || vMensal * 12 * qtd);

  itens.push({
    numeroItem: item.numeroItem,
    cidade: item.cidade,
    descricao: desc,
    unidade,
    quantidade: qtd,
    valorUnitarioMensal: vMensal,
    valorUnitarioAnual: vAnual,
    valorTotalAnual: vTotal,
  });
}
