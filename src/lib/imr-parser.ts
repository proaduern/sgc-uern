import * as XLSX from 'xlsx';

export interface ImrItemOcorrencia {
  indicador: string;
  servico: string;
  descricao: string;
  pontuacaoPrevista: number;
  ocorreu: boolean; // SIM ou NAO
  pontuacaoAplicada: number;
  documentoSei?: string;
}

export interface ImrResultadoCalculado {
  contratoNumero?: string;
  objetoContratual?: string;
  contratada?: string;
  mesCompetencia?: string;
  localCampus?: string;
  totalPontos: number;
  percentualGlosa: number;
  grauAceitacao: string;
  requerProcessoSancionatorio: boolean;
  observacoes?: string;
  fiscalNome?: string;
  dataAvaliacao?: string;
  itens: ImrItemOcorrencia[];
}

/**
 * Calcula a faixa de glosa oficial da UERN com base no Anexo E / Termo de Referência
 */
export function calcularGlosaImr(pontos: number): { percentual: number; grau: string; sancionatorio: boolean } {
  if (pontos <= 5) {
    return { percentual: 0.0, grau: 'Totalmente Aceitável (Sem glosa)', sancionatorio: false };
  } else if (pontos <= 10) {
    return { percentual: 0.1, grau: 'Aceitável (Glosa de 0,1% da fatura)', sancionatorio: false };
  } else if (pontos <= 20) {
    return { percentual: 0.2, grau: 'Parcialmente Aceitável (Glosa de 0,2% da fatura)', sancionatorio: false };
  } else if (pontos <= 30) {
    return { percentual: 0.3, grau: 'Nem aceitável, nem inaceitável (Glosa de 0,3% da fatura)', sancionatorio: false };
  } else if (pontos <= 50) {
    return { percentual: 0.5, grau: 'Parcialmente Inaceitável (Glosa de 0,5% da fatura)', sancionatorio: false };
  } else if (pontos <= 70) {
    return { percentual: 1.0, grau: 'Inaceitável (Glosa de 1,0% da fatura)', sancionatorio: true };
  } else {
    return {
      percentual: 5.0,
      grau: 'Totalmente Inaceitável (Glosa de 5,0% em fatura e abertura de processo de apuração/rescisão)',
      sancionatorio: true
    };
  }
}

/**
 * Faz o parsing inteligente da planilha IMR (.xlsx ou .ods)
 */
export function parseImrSpreadsheet(buffer: Buffer): ImrResultadoCalculado {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let contratoNumero = '';
  let objetoContratual = '';
  let contratada = '';
  let mesCompetencia = '';
  let localCampus = '';
  let observacoes = '';
  let fiscalNome = '';
  let dataAvaliacao = '';

  const itens: ImrItemOcorrencia[] = [];
  let currentIndicador = 'Indicador nº 01 - Execução dos serviços';
  let currentServico = 'GERAL';

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const col0 = String(row[0] || '').trim();
    const col1 = String(row[1] || '').trim();
    const col2 = String(row[2] || '').trim();
    const col3 = String(row[3] || '').trim();
    const col4 = String(row[4] || '').trim();
    const col5 = row[5];
    const col6 = String(row[6] || '').trim();

    // Metadados do Cabeçalho
    if (col0.toLowerCase().includes('objeto contratual:')) {
      objetoContratual = col0.replace(/objeto contratual:/i, '').trim() || col1;
    } else if (col0.toLowerCase().includes('contrato nº:') || col0.toLowerCase().includes('contrato n:')) {
      contratoNumero = col0.replace(/contrato n[°º]?:/i, '').trim() || col1;
    } else if (col0.toLowerCase().includes('contratada:')) {
      contratada = col0.replace(/contratada:/i, '').trim() || col1;
    } else if (col0.toLowerCase().includes('mês de competência:') || col0.toLowerCase().includes('competência:')) {
      mesCompetencia = col0.replace(/mês de competência:/i, '').trim() || col1;
    } else if (col0.toLowerCase().includes('local/campus:') || col0.toLowerCase().includes('campus:')) {
      localCampus = col0.replace(/local\/campus:/i, '').trim() || col1;
    } else if (col0.toLowerCase().includes('total de pontos:')) {
      continue;
    } else if (col0.toLowerCase().includes('observações:')) {
      observacoes = col0.replace(/observações:/i, '').trim() || col1;
    } else if (col0.toLowerCase().includes('fiscal (nome e matrícula):')) {
      fiscalNome = col0.replace(/fiscal \(nome e matrícula\):/i, '').trim() || col1;
    } else if (col0.toLowerCase().includes('local/data:')) {
      dataAvaliacao = col0.replace(/local\/data:/i, '').trim() || col1;
    }

    // Identificação de Indicador
    if (col0.toLowerCase().startsWith('indicador')) {
      currentIndicador = col0;
    }
    if (col1 && !col2 && !col3 && !col0.toLowerCase().startsWith('indicador')) {
      currentServico = col1;
    }

    // Detecção de linha de ocorrência do IMR
    const pontuacaoPrevistaStr = col3 || (row[2] && typeof row[2] === 'number' ? String(row[2]) : '');
    const descricaoOcorrencia = col2 || (col1 && pontuacaoPrevistaStr ? col1 : '');

    if (descricaoOcorrencia && pontuacaoPrevistaStr && pontuacaoPrevistaStr.toLowerCase().includes('ponto')) {
      const numMatch = pontuacaoPrevistaStr.replace(',', '.').match(/[\d.]+/);
      const pontuacaoPrevista = numMatch ? parseFloat(numMatch[0]) : 0;

      const respSimNao = (col4 || '').toUpperCase().trim();
      const pontuacaoAplicadaVal = typeof col5 === 'number' ? col5 : parseFloat(String(col5 || 0).replace(',', '.'));

      const ocorreu =
        respSimNao === 'SIM' ||
        respSimNao === 'S' ||
        respSimNao === 'X' ||
        respSimNao === '1' ||
        pontuacaoAplicadaVal > 0;

      const pontuacaoAplicada = ocorreu ? (pontuacaoAplicadaVal > 0 ? pontuacaoAplicadaVal : pontuacaoPrevista) : 0;

      itens.push({
        indicador: currentIndicador,
        servico: col1 || currentServico,
        descricao: descricaoOcorrencia,
        pontuacaoPrevista,
        ocorreu,
        pontuacaoAplicada,
        documentoSei: col6 || undefined,
      });
    }
  }

  const totalPontos = itens.reduce((acc, it) => acc + it.pontuacaoAplicada, 0);
  const glosaInfo = calcularGlosaImr(totalPontos);

  return {
    contratoNumero,
    objetoContratual,
    contratada,
    mesCompetencia,
    localCampus,
    totalPontos,
    percentualGlosa: glosaInfo.percentual,
    grauAceitacao: glosaInfo.grau,
    requerProcessoSancionatorio: glosaInfo.sancionatorio,
    observacoes,
    fiscalNome,
    dataAvaliacao,
    itens,
  };
}
