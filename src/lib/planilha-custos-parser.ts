import * as XLSX from 'xlsx';
import { normalizarCidadeCampus } from './cidades-constantes';

export interface PostoCustoParsed {
  numeroItem: number;
  cidade: string;
  funcao: string;
  cbo: string;
  jornada: string;
  cctReferencia: string;
  mesesExecucao: number;
  quantidadeEmpregados: number;
  quantidadePostos: number;
  salarioBase: number;
  totalModulo1: number; // Remuneração
  totalModulo2: number; // Encargos Sociais
  totalModulo3: number; // Indenizações / Rescisão
  totalModulo4: number; // Demais Componentes (Despesas Adm + Lucro)
  totalModulo5: number; // Insumos Diversos (Uniformes, EPIs, VT, VA)
  totalModulo6: number; // Tributos (PIS, COFINS, ISS)
  custosIndiretosPercent: number;
  lucroPercent: number;
  tributosPercent: number;
  precoTotalEmpregado: number;
  valorMensalTotal: number;
  valorGlobalTotal: number;
  fatorK: number;
  detalhes: any;
}

export interface ResumoCampusParsed {
  campus: string;
  quantidadePostos: number;
  quantidadeItens: number;
  totalMensal: number;
  totalAnual: number;
}

export interface ResultadoParsePlanilhaCustos {
  tipo: 'ANEXO_I_MULTI_ABAS' | 'IN05_INDIVIDUAL';
  titulo?: string;
  totalItens: number;
  totalPostos: number;
  totalMensalGeral: number;
  totalAnualGeral: number;
  resumoPorCampus: ResumoCampusParsed[];
  itens: PostoCustoParsed[];
}

/**
 * Motor de extração inteligente de planilhas de composição de custos
 * Suporta o Anexo I Multi-Abas da UERN (57 abas) e planilhas individuais da IN 05/2017
 */
export function parsePlanilhaCustosBuffer(buffer: Buffer): ResultadoParsePlanilhaCustos {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetNames = wb.SheetNames;
  const hasResumo = sheetNames.some((s) => s.toUpperCase() === 'RESUMO');
  const numberedSheets = sheetNames.filter((s) => /^\d+$/.test(s.trim()));

  // 1. CASO MULTI-ABAS (ANEXO I OFICIAL DA UERN COM 50+ POSTOS)
  if (hasResumo && numberedSheets.length > 0) {
    const resumoName = sheetNames.find((s) => s.toUpperCase() === 'RESUMO')!;
    const resumoWs = wb.Sheets[resumoName];
    const resumoRows: any[][] = XLSX.utils.sheet_to_json(resumoWs, { header: 1, defval: '' });

    const itemsResumo: any[] = [];
    for (let r = 2; r < resumoRows.length; r++) {
      const row = resumoRows[r];
      if (!row || typeof row[0] !== 'number') continue;
      itemsResumo.push({
        numeroItem: Number(row[0]),
        cidade: normalizarCidadeCampus(String(row[1] || '').trim()) || String(row[1] || '').trim(),
        descricao: String(row[2] || '').trim(),
        valorMensalEmpregado: Number(row[3]) || 0,
        qtdEmpregadosPorPosto: Number(row[4]) || 1,
        unidade: String(row[5] || 'Posto').trim(),
        quantidadePostos: Number(row[6]) || 1,
        valorMensalPosto: Number(row[7]) || 0,
        meses: Number(row[8]) || 12,
        valorAnualPosto: Number(row[9]) || 0,
        valorTotal12Meses: Number(row[10]) || 0,
      });
    }

    const postosParsed: PostoCustoParsed[] = [];

    for (const itemResumo of itemsResumo) {
      const shName = String(itemResumo.numeroItem);
      const ws = wb.Sheets[shName];
      let dadosFuncao: PostoCustoParsed;

      if (ws) {
        dadosFuncao = extrairDadosAbaFuncao(ws, itemResumo);
      } else {
        dadosFuncao = criarDadosFallback(itemResumo);
      }
      postosParsed.push(dadosFuncao);
    }

    // Agrupamento por campus
    const mapCampus = new Map<string, ResumoCampusParsed>();
    for (const p of postosParsed) {
      const c = p.cidade || 'Mossoró';
      if (!mapCampus.has(c)) {
        mapCampus.set(c, {
          campus: c,
          quantidadePostos: 0,
          quantidadeItens: 0,
          totalMensal: 0,
          totalAnual: 0,
        });
      }
      const entry = mapCampus.get(c)!;
      entry.quantidadePostos += p.quantidadePostos;
      entry.quantidadeItens += 1;
      entry.totalMensal += p.valorMensalTotal;
      entry.totalAnual += p.valorGlobalTotal;
    }

    const totalPostos = postosParsed.reduce((acc, p) => acc + (p.quantidadePostos || 1), 0);
    const totalMensalGeral = parseFloat(
      postosParsed.reduce((acc, p) => acc + (p.valorMensalTotal || 0), 0).toFixed(2)
    );
    const totalAnualGeral = parseFloat(
      postosParsed.reduce((acc, p) => acc + (p.valorGlobalTotal || 0), 0).toFixed(2)
    );

    return {
      tipo: 'ANEXO_I_MULTI_ABAS',
      titulo: 'Anexo I - Planilhas de Custos e Formação de Preços (UERN)',
      totalItens: postosParsed.length,
      totalPostos,
      totalMensalGeral,
      totalAnualGeral,
      resumoPorCampus: Array.from(mapCampus.values()),
      itens: postosParsed,
    };
  }

  // 2. CASO ABA INDIVIDUAL (MODELO PADRÃO IN 05/2017 COM 1 FUNÇÃO)
  const firstSheetName = sheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  const singleParsed = extrairDadosAbaIndividual(ws, firstSheetName);

  return {
    tipo: 'IN05_INDIVIDUAL',
    titulo: singleParsed.funcao || 'Planilha Individual de Custos',
    totalItens: 1,
    totalPostos: singleParsed.quantidadePostos,
    totalMensalGeral: singleParsed.valorMensalTotal,
    totalAnualGeral: singleParsed.valorGlobalTotal,
    resumoPorCampus: [
      {
        campus: singleParsed.cidade,
        quantidadePostos: singleParsed.quantidadePostos,
        quantidadeItens: 1,
        totalMensal: singleParsed.valorMensalTotal,
        totalAnual: singleParsed.valorGlobalTotal,
      },
    ],
    itens: [singleParsed],
  };
}

/**
 * Extrai os dados analíticos de uma aba numerada correspondente a um item do Anexo I
 */
function extrairDadosAbaFuncao(ws: XLSX.WorkSheet, resumo: any): PostoCustoParsed {
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  let cidade = resumo.cidade;
  let funcao = resumo.descricao;
  let cct = '';
  let cbo = '5143-20';
  let jornada = '44 horas semanais';
  let mesesExecucao = resumo.meses || 12;
  let salarioBase = 0;
  let m1 = 0;
  let m2 = 0;
  let m3 = 0;
  let m4 = 0;
  let m5 = 0;
  let sub23 = 0;
  let precoTotalEmpregado = resumo.valorMensalEmpregado || 0;
  let quantidadePostos = resumo.quantidadePostos || 1;
  let despesasAdmPercent = 0.75;
  let lucroPercent = 0.71;
  let tributosPercent = 11.55;

  const detalhesModulo2 = { submodulo21: 0, submodulo22: 0, submodulo23: 0, submodulo24: 0 };
  const detalhesModulo3: any = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const rText = row.map((c) => String(c).trim()).join(' | ');

    if (i === 0 && row[0]) {
      const cid = normalizarCidadeCampus(String(row[0]).trim());
      if (cid) cidade = cid;
    }
    if (rText.includes('ITEM') && row[2]) {
      funcao = String(row[2]).trim();
    }
    if (rText.includes('Acordo, Convenção') || rText.includes('Dissídio')) {
      const parts = row.slice(2).filter(Boolean).map((c) => String(c).trim());
      if (parts.length > 0) cct = parts.join(' - ');
    }
    if (rText.includes('Classificação Brasileira de Ocupação') || rText.includes('CBO')) {
      const match = rText.match(/(\d{4}-\d{2})/);
      if (match) cbo = match[1];
    }
    if (rText.includes('Jornada') && row[2]) {
      jornada = String(row[2]).trim();
    }
    if (rText.includes('Salário Normativo')) {
      const n = row.find((c) => typeof c === 'number' && c > 100);
      if (n) salarioBase = n;
    }

    // MÓDULO 1: REMUNERAÇÃO
    if (rText.includes('Total(Valor da Remuneção') || rText.includes('Valor da Remuneração')) {
      const n = row.find((c) => typeof c === 'number' && c > 100);
      if (n && !m1) m1 = n;
    }

    // MÓDULO 2: ENCARGOS SOCIAIS
    if (rText.includes('Total Submódulo 2.1') || rText.includes('Total Submodulo 2.1')) {
      const n = row[row.length - 1];
      if (typeof n === 'number') detalhesModulo2.submodulo21 = n;
    }
    if (rText.includes('Total Submódulo 2.2') || rText.includes('Total Submodulo 2.2')) {
      const n = row[row.length - 1];
      if (typeof n === 'number') detalhesModulo2.submodulo22 = n;
    }
    if (rText.includes('Total Submódulo 2.3') || rText.includes('Total Submodulo 2.3')) {
      const n = row[row.length - 1];
      if (typeof n === 'number') {
        detalhesModulo2.submodulo23 = n;
        sub23 = n;
      }
    }
    if (rText.includes('Incidência dos Encargos do Grupo A')) {
      const n = row[row.length - 1];
      if (typeof n === 'number') detalhesModulo2.submodulo24 = n;
    }
    if (rText.includes('Valor dos Encargos Sociais')) {
      const n = row.find((c) => typeof c === 'number' && c > 100);
      if (n) m2 = n;
    }

    // MÓDULO 3: INSUMOS
    if (rText.includes('Uniformes (custo mensal')) {
      detalhesModulo3.uniformes = Number(row[row.length - 1]) || 0;
    }
    if (rText.includes('EPIs (custo mensal')) {
      detalhesModulo3.epis = Number(row[row.length - 1]) || 0;
    }
    if (rText.includes('Ferramentas (custo mensal')) {
      detalhesModulo3.ferramentas = Number(row[row.length - 1]) || 0;
    }
    if (rText.includes('Ticket ou Vale Alimentação')) {
      detalhesModulo3.valeAlimentacao = Number(row[row.length - 1]) || 0;
    }
    if (rText.includes('Seguro de Vida')) {
      detalhesModulo3.seguroVida = Number(row[row.length - 1]) || 0;
    }
    if (rText.includes('Auxílio Saúde')) {
      detalhesModulo3.auxilioSaude = Number(row[row.length - 1]) || 0;
    }
    if (rText.includes('Benefício Social Sindical')) {
      detalhesModulo3.beneficioSocial = Number(row[row.length - 1]) || 0;
    }
    if (rText.includes('Total (A + B + C +D + E + F + G + H') || (rText.includes('MÓDULO 3') && rText.includes('Total'))) {
      const n = row.find((c) => typeof c === 'number' && c > 0);
      if (n) m3 = n;
    }

    // MÓDULO 4: DEMAIS COMPONENTES
    if (rText.includes('Despesas administrativas/operacionais')) {
      if (typeof row[2] === 'number') despesasAdmPercent = parseFloat((row[2] * 100).toFixed(2));
    }
    if (rText.includes('Lucro') && !rText.includes('LUCRO REAL') && !rText.includes('LUCRO PRESUMIDO')) {
      if (typeof row[2] === 'number') lucroPercent = parseFloat((row[2] * 100).toFixed(2));
    }
    if (rText.includes('Total do Módulo 4') || rText.includes('Total do Modulo 4')) {
      const val = row[3] || row[row.length - 1];
      if (typeof val === 'number') m4 = val;
    }

    // MÓDULO 5: TRIBUTOS
    if (rText.includes('Total Módulo 5 (B+C)') || rText.includes('Total Modulo 5 (B+C)')) {
      const val = row[row.length - 1];
      if (typeof val === 'number' && val > 0) m5 = val;
    }

    // QUADRO RESUMO DO CUSTO POR FUNCIONÁRIO (Conferência definitiva)
    if (row[0] === 3 && rText.includes('INSUMOS')) {
      const val = row[row.length - 1] || row[3];
      if (typeof val === 'number') m3 = val;
    }
    if (row[0] === 4 && rText.includes('DEMAIS COMPONENTES')) {
      const val = row[row.length - 1] || row[3];
      if (typeof val === 'number') m4 = val;
    }
    if (row[0] === 5 && rText.includes('TRIBUTOS')) {
      const val = row[row.length - 1] || row[3];
      if (typeof val === 'number') m5 = val;
    }
    if (rText.includes('Valor Total do Empregado Mensal')) {
      const n = row.find((c) => typeof c === 'number' && c > 100);
      if (n) precoTotalEmpregado = n;
    }
  }

  if (!salarioBase && m1) salarioBase = m1;
  if (!m1 && salarioBase) m1 = salarioBase;
  if (!m2 && detalhesModulo2.submodulo21) {
    m2 = detalhesModulo2.submodulo21 + detalhesModulo2.submodulo22 + detalhesModulo2.submodulo23 + detalhesModulo2.submodulo24;
  }
  if (!precoTotalEmpregado) {
    precoTotalEmpregado = m1 + m2 + m3 + m4 + m5;
  }

  const fatorK = salarioBase > 0 ? parseFloat((precoTotalEmpregado / salarioBase).toFixed(4)) : 0;
  const valorMensalTotal = resumo.valorTotal12Meses
    ? parseFloat((resumo.valorTotal12Meses / 12).toFixed(2))
    : parseFloat((precoTotalEmpregado * quantidadePostos).toFixed(2));
  const valorGlobalTotal = resumo.valorTotal12Meses || parseFloat((valorMensalTotal * mesesExecucao).toFixed(2));

  return {
    numeroItem: resumo.numeroItem,
    cidade,
    funcao,
    cbo: cbo || '5143-20',
    jornada,
    cctReferencia: cct,
    mesesExecucao,
    quantidadeEmpregados: resumo.qtdEmpregadosPorPosto || 1,
    quantidadePostos,
    salarioBase,
    totalModulo1: parseFloat(m1.toFixed(2)),
    totalModulo2: parseFloat(m2.toFixed(2)),
    totalModulo3: parseFloat(sub23.toFixed(2)),
    totalModulo4: parseFloat(m4.toFixed(2)),
    totalModulo5: parseFloat(m3.toFixed(2)),
    totalModulo6: parseFloat(m5.toFixed(2)),
    custosIndiretosPercent: despesasAdmPercent,
    lucroPercent,
    tributosPercent,
    precoTotalEmpregado: parseFloat(precoTotalEmpregado.toFixed(2)),
    valorMensalTotal,
    valorGlobalTotal,
    fatorK,
    detalhes: {
      origem: 'ANEXO_I_MULTI_ABAS',
      numeroItem: resumo.numeroItem,
      cidade,
      funcao,
      cbo,
      jornada,
      cct,
      mesesExecucao,
      quantidadePostos,
      salarioBase,
      modulo1: { salarioBase, total: m1 },
      modulo2: detalhesModulo2,
      modulo3: detalhesModulo3,
      modulo4: { despesasAdmPercent, lucroPercent, total: m4 },
      modulo5: { tributosPercent, total: m5 },
      quadroResumo: {
        custoMensalEmpregado: precoTotalEmpregado,
        quantidadePostos,
        totalMensalPosto: valorMensalTotal,
        totalAnualPosto: valorGlobalTotal,
      },
    },
  };
}

/**
 * Fallback em caso de aba ausente
 */
function criarDadosFallback(resumo: any): PostoCustoParsed {
  const precoTotal = resumo.valorMensalEmpregado || 3500;
  const qtdPostos = resumo.quantidadePostos || 1;
  const valorMensal = resumo.valorTotal12Meses ? resumo.valorTotal12Meses / 12 : precoTotal * qtdPostos;
  const valorGlobal = resumo.valorTotal12Meses || valorMensal * 12;

  return {
    numeroItem: resumo.numeroItem,
    cidade: resumo.cidade || 'Mossoró',
    funcao: resumo.descricao || 'Função Terceirizada',
    cbo: '5143-20',
    jornada: '44 horas semanais',
    cctReferencia: '',
    mesesExecucao: resumo.meses || 12,
    quantidadeEmpregados: resumo.qtdEmpregadosPorPosto || 1,
    quantidadePostos: qtdPostos,
    salarioBase: parseFloat((precoTotal * 0.45).toFixed(2)),
    totalModulo1: parseFloat((precoTotal * 0.45).toFixed(2)),
    totalModulo2: parseFloat((precoTotal * 0.3).toFixed(2)),
    totalModulo3: parseFloat((precoTotal * 0.05).toFixed(2)),
    totalModulo4: parseFloat((precoTotal * 0.02).toFixed(2)),
    totalModulo5: parseFloat((precoTotal * 0.12).toFixed(2)),
    totalModulo6: parseFloat((precoTotal * 0.06).toFixed(2)),
    custosIndiretosPercent: 3.0,
    lucroPercent: 3.2,
    tributosPercent: 11.55,
    precoTotalEmpregado: precoTotal,
    valorMensalTotal: parseFloat(valorMensal.toFixed(2)),
    valorGlobalTotal: parseFloat(valorGlobal.toFixed(2)),
    fatorK: 2.2,
    detalhes: { origem: 'RESUMO_FALLBACK', resumo },
  };
}

/**
 * Extrai dados de uma planilha individual (1 função)
 */
function extrairDadosAbaIndividual(ws: XLSX.WorkSheet, sheetName: string): PostoCustoParsed {
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  let funcao = sheetName !== '1' && sheetName !== 'Sheet1' ? sheetName : '';
  let municipio = 'Mossoró/RN';
  let cbo = '';
  let jornada = '44 horas semanais';
  let cctReferencia = '';
  let mesesExecucao = 12;
  let salarioBase = 0;
  let m1 = 0;
  let m2 = 0;
  let m3 = 0;
  let m4 = 0;
  let m5 = 0;
  let m6 = 0;
  let precoTotalEmpregado = 0;
  let valorMensalTotal = 0;
  let valorGlobalTotal = 0;
  let fatorK = 0;
  let custosIndiretosPercent = 3.0;
  let lucroPercent = 3.2;
  let tributosPercent = 14.25;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const rText = row.map((c) => String(c).trim()).join(' | ');

    if (rText.includes('Item') && row[2] && !funcao) {
      funcao = String(row[2]).trim();
    }
    if (rText.includes('Município') && row[2]) {
      municipio = String(row[2]).trim();
    }
    if (rText.includes('Classificação Brasileira de Ocupações') && row[2]) {
      cbo = String(row[2]).trim();
    }
    if (rText.includes('Jornada') && row[2]) {
      jornada = String(row[2]).trim();
    }
    if (rText.includes('Acordo, Convenção ou Dissídio') && row[2]) {
      cctReferencia = String(row[2]).trim();
    }
    if (rText.includes('Salário Normativo') && (row[1] || row[2])) {
      salarioBase = parseFloat(row[2] || row[1]) || 0;
    }
    if (rText.includes('meses de execução contratual') && (row[1] || row[2])) {
      mesesExecucao = parseInt(row[2] || row[1], 10) || 12;
    }

    if (rText.toUpperCase().includes('TOTAL DO MÓDULO 1') || rText.toUpperCase().includes('TOTAL DO MODULO 1')) {
      m1 = parseFloat(row[row.length - 1] || row[1]) || 0;
    }
    if (rText.toUpperCase().includes('TOTAL DO MÓDULO 2') || rText.toUpperCase().includes('TOTAL DO MODULO 2')) {
      m2 = parseFloat(row[row.length - 1] || row[1]) || 0;
    }
    if (rText.toUpperCase().includes('TOTAL DO MÓDULO 3') || rText.toUpperCase().includes('TOTAL DO MODULO 3')) {
      m3 = parseFloat(row[row.length - 1] || row[1]) || 0;
    }
    if (rText.toUpperCase().includes('TOTAL DO MÓDULO 4') || rText.toUpperCase().includes('TOTAL DO MODULO 4')) {
      m4 = parseFloat(row[row.length - 1] || row[1]) || 0;
    }
    if (rText.toUpperCase().includes('TOTAL DO MÓDULO 5') || rText.toUpperCase().includes('TOTAL DO MODULO 5')) {
      m5 = parseFloat(row[row.length - 1] || row[2] || row[1]) || 0;
    }
    if (rText.toUpperCase().includes('TOTAL DO MÓDULO 6') || rText.toUpperCase().includes('TOTAL DO MODULO 6')) {
      m6 = parseFloat(row[row.length - 1] || row[1]) || 0;
    }

    if (rText.toUpperCase().includes('PREÇO TOTAL POR EMPREGADO') || rText.toUpperCase().includes('PRECO TOTAL POR EMPREGADO')) {
      precoTotalEmpregado = parseFloat(row[row.length - 1] || row[1]) || 0;
    }
    if (rText.toUpperCase().includes('VALOR MENSAL DOS SERVIÇOS') || rText.toUpperCase().includes('VALOR MENSAL DOS SERVICOS')) {
      valorMensalTotal = parseFloat(row[row.length - 1] || row[1]) || 0;
    }
    if (rText.toUpperCase().includes('VALOR GLOBAL DA PROPOSTA') && row.some((c) => typeof c === 'number' && c > 100)) {
      valorGlobalTotal = parseFloat(row.find((c) => typeof c === 'number' && c > 100)) || 0;
    }
    if (rText.toUpperCase().includes('FATOR K')) {
      fatorK = parseFloat(row[row.length - 1] || row[1]) || 0;
    }
  }

  if (salarioBase === 0 && m1 > 0) salarioBase = m1;
  if (m1 === 0 && salarioBase > 0) m1 = salarioBase;
  if (precoTotalEmpregado === 0) {
    precoTotalEmpregado = m1 + m2 + m3 + m4 + m5 + m6;
  }
  if (valorMensalTotal === 0) valorMensalTotal = precoTotalEmpregado;
  if (valorGlobalTotal === 0) valorGlobalTotal = valorMensalTotal * mesesExecucao;
  if (fatorK === 0 && salarioBase > 0) {
    fatorK = parseFloat((precoTotalEmpregado / salarioBase).toFixed(4));
  }

  return {
    numeroItem: 1,
    cidade: normalizarCidadeCampus(municipio) || 'Mossoró',
    funcao: funcao || 'Função Terceirizada',
    cbo,
    jornada,
    cctReferencia,
    mesesExecucao,
    quantidadeEmpregados: 1,
    quantidadePostos: 1,
    salarioBase,
    totalModulo1: m1,
    totalModulo2: m2,
    totalModulo3: m3,
    totalModulo4: m4,
    totalModulo5: m5,
    totalModulo6: m6,
    custosIndiretosPercent,
    lucroPercent,
    tributosPercent,
    precoTotalEmpregado,
    valorMensalTotal,
    valorGlobalTotal,
    fatorK,
    detalhes: { origem: 'IN05_INDIVIDUAL' },
  };
}
