import * as XLSX from 'xlsx';

export interface ResponsavelExtraido {
  tipoAtuacao: 'GESTOR' | 'SUPLENTE' | 'FISCAL_ADMINISTRATIVO' | 'FISCAL_TECNICO' | 'FISCAL_SETORIAL';
  nome: string;
  contato?: string;
  matricula?: string;
  cidade?: string;
  campusSetor?: string;
}

export interface ContratoImportado {
  objeto: string;
  descricaoObjeto?: string;
  tipoContrato: string;
  tipoEmpreitada: string;
  tipoVigencia: string;
  processoSeiMae: string;
  dfdIdSei?: string;
  riscosIdSei?: string;
  etpIdSei?: string;
  trIdSei?: string;
  editalIdSei?: string;
  licitacaoProcedimento: string;
  numeroContrato: string;
  idSeiContrato?: string;
  razaoSocial: string;
  cnpj: string;
  email: string;
  endereco: string;
  nomePreposto?: string;
  contatoPreposto?: string;
  nomeRepresentanteLegal?: string;
  cpfRepresentanteLegal?: string;
  telefoneRepresentanteLegal?: string;
  emailRepresentanteLegal?: string;
  numeroAtoDesignacao?: string;
  idSeiAtoDesignacao?: string;
  vigenciaInicio?: string;
  vigenciaFim?: string;
  valorGlobal: number;
  empenho?: string;
  responsaveis: ResponsavelExtraido[];
}

export function parseExcelDate(val: any): string {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel base date: Dec 30 1899
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  const str = String(val).trim();
  // Formato DD/MM/AAAA ou DD-MM-AAAA
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }
  // Formato AAAA-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  return str;
}

export function parseBrazilianNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  let str = String(val).trim().replace(/R\$\s?/gi, '');
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function cleanNameAndContact(raw: string): { nome: string; contato: string } {
  if (!raw || raw.trim() === '-' || raw.trim() === '') return { nome: '', contato: '' };
  const str = raw.trim();
  // Formato: Nome da Pessoa (5584999999999) ou Nome (PRAE) (5584999999999)
  const phoneMatch = str.match(/\((55\d{10,11}|\d{10,11})\)/);
  let contato = '';
  let nome = str;
  if (phoneMatch) {
    contato = phoneMatch[1];
    nome = str.replace(phoneMatch[0], '').replace(/\s+/g, ' ').trim();
  }
  return { nome, contato };
}

export function parseContratosWorkbook(buffer: Buffer): ContratoImportado[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  // Procura primeira aba com 'CONTRATOS' ou usa a primeira
  const sheetName = workbook.SheetNames.find(s => s.toUpperCase().includes('CONTRATO')) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!matrix || matrix.length === 0) return [];

  // Encontra a linha de cabeçalho
  let headerRowIdx = matrix.findIndex(row =>
    row.some(cell => {
      const s = String(cell).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return s.includes('OBJETO') || s.includes('CTR') || s.includes('FORNECEDOR') || s.includes('CONTRATO');
    })
  );

  if (headerRowIdx === -1) {
    headerRowIdx = 0;
  }

  const headerRow = matrix[headerRowIdx].map(c =>
    String(c).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  );

  // Mapeamento de índices do modelo oficial de 45 colunas ou por proximidade de nomes
  const col = (keywordList: string[], exact = false): number => {
    return headerRow.findIndex(h => {
      if (exact) return keywordList.some(k => h === k);
      return keywordList.some(k => h.includes(k));
    });
  };

  const results: ContratoImportado[] = [];

  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.every(cell => cell === '')) continue;

    // Detecta se é o modelo oficial com 45 colunas baseado nos headers
    const isModelo45 = headerRow.some(h => h.includes('FISCAL SETORIAL') || h.includes('PROCESSO MAE'));

    if (isModelo45) {
      // 0: OBJETO
      // 1: TIPO
      // 2: Empreitada
      // 3: REGIME
      // 4: Processo MÃE
      // 5: DFD ID SEI
      // 6: RISCOS ID SEI
      // 7: ETP ID SEI
      // 8: TR ID SEI
      // 9: EDITAL ID SEI
      // 10: PROCEDIMENTO LICITATÓRIO
      // 11: DESCRIÇÃO DO OBJETO
      // 12: Nº CTR - ID SEI
      // 13: NOME FORNECEDOR
      // 14: CNPJ / CPF
      // 15: E-MAIL FORNECEDOR
      // 16: ENDEREÇO FORNECEDOR
      // 17: PREPOSTO FORNECEDOR
      // 18: CONTATO EMPRESA/PREPOSTO
      // 19: Nº ATO DE DESIGNAÇÃO DE GESTOR E FISCAIS (id SEI)
      // 20: GESTOR (contato)
      // 21: MATRÍCULA (Gestor)
      // 22: GESTOR SUPLENTE (contato)
      // 23: MATRÍCULA (Suplente)
      // 24: FISCAL ADM (contato)
      // 25: MATRÍCULA (Adm)
      // 26: FISCAL TÉCNICO
      // 27: MATRÍCULA (Técnico)
      // 28: FISCAL SETORIAL ASSU
      // 29: MATRÍCULA (Assu)
      // 30: FISCAL SETORIAL CAICÓ
      // 31: MATRÍCULA (Caicó)
      // 32: FISCAL SETORIAL NATAL
      // 33: MATRÍCULA (Natal)
      // 34: FISCAL SETORIAL PATU
      // 35: MATRÍCULA (Patu)
      // 36: FISCAL SETORIAL PAU DOS FERROS
      // 37: MATRÍCULA (Pau dos Ferros)
      // 38: Início
      // 39: Prazo
      // 40: Valor
      // 41: PENALIDADES
      // 42: EMPENHO 2026
      // 43: DFD 2027

      const rawNumCtr = String(row[12] || '').trim();
      let numeroContrato = rawNumCtr;
      let idSeiContrato = '';
      const ctrMatch = rawNumCtr.match(/^([\d\/]+)(?:\s*(?:id|SEI)\s*(\d+))?/i);
      if (ctrMatch) {
        numeroContrato = ctrMatch[1].trim();
        if (ctrMatch[2]) idSeiContrato = ctrMatch[2].trim();
      }

      const rawAto = String(row[19] || '').trim();
      let numeroAto = rawAto;
      let idSeiAto = '';
      const atoMatch = rawAto.match(/^(?:Ato\s*)?([\d\/]+)(?:\s*\((?:id\s*)?(\d+)\))?/i);
      if (atoMatch) {
        numeroAto = atoMatch[1].trim();
        if (atoMatch[2]) idSeiAto = atoMatch[2].trim();
      }

      const responsaveis: ResponsavelExtraido[] = [];

      // Gestor
      const g = cleanNameAndContact(String(row[20] || ''));
      const matG = String(row[21] || '').trim();
      if (g.nome) {
        responsaveis.push({
          tipoAtuacao: 'GESTOR',
          nome: g.nome,
          contato: g.contato,
          matricula: matG,
          campusSetor: 'Reitoria/Central',
        });
      }

      // Suplente
      const s = cleanNameAndContact(String(row[22] || ''));
      const matS = String(row[23] || '').trim();
      if (s.nome) {
        responsaveis.push({
          tipoAtuacao: 'SUPLENTE',
          nome: s.nome,
          contato: s.contato,
          matricula: matS,
          campusSetor: 'Reitoria/Central',
        });
      }

      // Fiscal Adm
      const fa = cleanNameAndContact(String(row[24] || ''));
      const matFa = String(row[25] || '').trim();
      if (fa.nome) {
        responsaveis.push({
          tipoAtuacao: 'FISCAL_ADMINISTRATIVO',
          nome: fa.nome,
          contato: fa.contato,
          matricula: matFa,
          campusSetor: 'Reitoria/Central',
        });
      }

      // Fiscal Técnico
      const ft = cleanNameAndContact(String(row[26] || ''));
      const matFt = String(row[27] || '').trim();
      if (ft.nome) {
        responsaveis.push({
          tipoAtuacao: 'FISCAL_TECNICO',
          nome: ft.nome,
          contato: ft.contato,
          matricula: matFt,
          campusSetor: 'Reitoria/Central',
        });
      }

      // Fiscais Setoriais com cidades explícitas
      const setoriaisConfig = [
        { colNome: 28, colMat: 29, cidade: 'Assú', campus: 'Campus Avançado de Assú' },
        { colNome: 30, colMat: 31, cidade: 'Caicó', campus: 'Campus Avançado de Caicó' },
        { colNome: 32, colMat: 33, cidade: 'Natal', campus: 'Campus Avançado de Natal' },
        { colNome: 34, colMat: 35, cidade: 'Patu', campus: 'Campus Avançado de Patu' },
        { colNome: 36, colMat: 37, cidade: 'Pau dos Ferros', campus: 'Campus Avançado de Pau dos Ferros' },
      ];

      for (const set of setoriaisConfig) {
        const valNome = String(row[set.colNome] || '').trim();
        if (valNome && valNome !== '-') {
          const fSet = cleanNameAndContact(valNome);
          const matSet = String(row[set.colMat] || '').trim();
          responsaveis.push({
            tipoAtuacao: 'FISCAL_SETORIAL',
            nome: fSet.nome,
            contato: fSet.contato,
            matricula: matSet,
            cidade: set.cidade,
            campusSetor: set.campus,
          });
        }
      }

      // Mapeia tipo e vigência
      const tipoTxt = String(row[1] || '').toUpperCase();
      let tipoContrato = 'FORNECIMENTO_SIMPLES';
      if (tipoTxt.includes('DEDICACAO EXCLUSIVA')) {
        tipoContrato = 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO';
      } else if (tipoTxt.includes('SEM DEDICACAO')) {
        tipoContrato = 'SERVICO_SEM_DEDICACAO';
      } else if (tipoTxt.includes('LOCACAO')) {
        tipoContrato = 'LOCACAO_IMOVEL';
      } else if (tipoTxt.includes('OBRA')) {
        tipoContrato = 'OBRA';
      }

      const empTxt = String(row[2] || '').toUpperCase();
      let tipoEmpreitada = 'PRECO_UNITARIO';
      if (empTxt.includes('GLOBAL')) tipoEmpreitada = 'PRECO_GLOBAL';
      else if (empTxt.includes('INTEGRAL')) tipoEmpreitada = 'EMPREITADA_INTEGRAL';

      const regTxt = String(row[3] || '').toUpperCase();
      const tipoVigencia = regTxt.includes('CONTINUADO') ? 'CONTINUADO' : 'NAO_CONTINUADO';

      results.push({
        objeto: String(row[0] || '').trim(),
        descricaoObjeto: String(row[11] || '').trim(),
        tipoContrato,
        tipoEmpreitada,
        tipoVigencia,
        processoSeiMae: String(row[4] || '').trim(),
        dfdIdSei: String(row[5] || '').trim(),
        riscosIdSei: String(row[6] || '').trim(),
        etpIdSei: String(row[7] || '').trim(),
        trIdSei: String(row[8] || '').trim(),
        editalIdSei: String(row[9] || '').trim(),
        licitacaoProcedimento: String(row[10] || '').trim() || 'Pregão Eletrônico',
        numeroContrato,
        idSeiContrato,
        razaoSocial: String(row[13] || '').trim() || 'Fornecedor Pendente',
        cnpj: String(row[14] || '').replace(/\D/g, '').trim(),
        email: String(row[15] || '').trim() || 'contato@fornecedor.com',
        endereco: String(row[16] || '').trim(),
        nomePreposto: String(row[17] || '').trim(),
        contatoPreposto: String(row[18] || '').trim(),
        numeroAtoDesignacao: numeroAto,
        idSeiAtoDesignacao: idSeiAto,
        vigenciaInicio: parseExcelDate(row[38]),
        vigenciaFim: parseExcelDate(row[39]),
        valorGlobal: parseBrazilianNumber(row[40]),
        empenho: String(row[42] || '').trim(),
        responsaveis,
      });
    } else {
      // Fallback para modelos simplificados por correspondência de padrão nos cabeçalhos
      const getVal = (keywords: string[]) => {
        const idx = col(keywords);
        return idx !== -1 ? row[idx] : '';
      };

      const numContrato = String(getVal(['CONTRATO', 'NUM CONTRATO', 'NUMERO']) || '').trim();
      const sei = String(getVal(['SEI', 'PROCESSO']) || '').trim();
      const obj = String(getVal(['OBJETO', 'DESCRICAO']) || '').trim();
      const forn = String(getVal(['FORNECEDOR', 'EMPRESA', 'RAZAO SOCIAL']) || '').trim();
      const cnpj = String(getVal(['CNPJ', 'CPF/CNPJ']) || '').replace(/\D/g, '').trim();
      const email = String(getVal(['EMAIL', 'E-MAIL']) || '').trim();
      const valor = parseBrazilianNumber(getVal(['VALOR', 'GLOBAL', 'TOTAL']));
      const inicio = parseExcelDate(getVal(['INICIO', 'DATA INICIO']));
      const fim = parseExcelDate(getVal(['FIM', 'DATA FIM', 'PRAZO']));

      results.push({
        objeto: obj,
        tipoContrato: 'FORNECIMENTO_SIMPLES',
        tipoEmpreitada: 'PRECO_UNITARIO',
        tipoVigencia: 'CONTINUADO',
        processoSeiMae: sei,
        licitacaoProcedimento: 'Pregão Eletrônico',
        numeroContrato: numContrato,
        razaoSocial: forn || 'Fornecedor Pendente',
        cnpj,
        email: email || 'contato@fornecedor.com',
        endereco: '',
        vigenciaInicio: inicio,
        vigenciaFim: fim,
        valorGlobal: valor,
        responsaveis: [],
      });
    }
  }

  return results;
}
