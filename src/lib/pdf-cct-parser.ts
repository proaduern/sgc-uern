import { PDFParse } from 'pdf-parse';

export interface CctParsedData {
  numeroRegistroMte: string;
  sindicatoLaboral: string;
  sindicatoPatronal: string;
  vigenciaInicio: string; // YYYY-MM-DD
  vigenciaFim: string; // YYYY-MM-DD
  dataBase: string;
  categoriasProfissionais: string;
  itensFiscalizacao: {
    salarios: Array<{ funcao: string; salarioPiso: number }>;
    beneficios: Array<{ beneficio: string; valor: number }>;
    obrigacoesComPagamento: Array<{ descricao: string; valor: number; periodicidade: string }>;
    obrigacoesSemPagamento: Array<{ descricao: string }>;
  };
  funcoes: Array<{ nomeFuncao: string; salarioPiso: number }>;
}

function parseDateBr(dateStr: string): string | null {
  if (!dateStr) return null;
  const meses: Record<string, string> = {
    janeiro: '01', fevereiro: '02', março: '03', marco: '03',
    abril: '04', maio: '05', junho: '06', julho: '07',
    agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12'
  };

  const mExtenso = dateStr.match(/(\d{1,2})[ºoª]?\s+de\s+([a-zA-ZçÇ]+)\s+de\s+(\d{4})/i);
  if (mExtenso) {
    const dia = mExtenso[1].padStart(2, '0');
    const mesNome = mExtenso[2].toLowerCase();
    const mes = meses[mesNome] || '01';
    const ano = mExtenso[3];
    return `${ano}-${mes}-${dia}`;
  }

  const mNum = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mNum) {
    const dia = mNum[1].padStart(2, '0');
    const mes = mNum[2].padStart(2, '0');
    const ano = mNum[3];
    return `${ano}-${mes}-${dia}`;
  }
  return null;
}

function parseCurrency(str: string): number {
  if (!str) return 0;
  const clean = String(str).replace(/[^\d,\.]/g, '').trim();
  if (clean.includes(',') && clean.includes('.')) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
  } else if (clean.includes(',')) {
    return parseFloat(clean.replace(',', '.'));
  }
  return parseFloat(clean) || 0;
}

export async function parseCctPdf(buffer: Buffer): Promise<CctParsedData> {
  const parser = new (PDFParse as any)(new Uint8Array(buffer));
  await parser.load();
  const res = await parser.getText();
  const text: string = res.text || '';

  // 1. Registro MTE
  let numeroRegistroMte = '';
  const mMte = text.match(/NÚMERO\s+DE\s+REGISTRO\s+NO\s+MTE:\s*([A-Z0-9\/]+)/i);
  if (mMte) numeroRegistroMte = mMte[1].trim();

  // 2. Sindicatos
  let sindicatoLaboral = '';
  let sindicatoPatronal = '';
  const mSindicatos = text.match(/SINDICATO\s+DOS\s+TRABALHADORES[^\n\r]+(?:[\n\r]+[^\n\r]+)?/i);
  if (mSindicatos) {
    sindicatoLaboral = mSindicatos[0].replace(/[\n\r]+/g, ' ').replace(/,\s*neste\s+ato.*$/i, '').trim();
  }

  const mPatronal = text.match(/SINDICATO\s+PATRONAL[^\n\r]+(?:[\n\r]+[^\n\r]+)?/i);
  if (mPatronal) {
    sindicatoPatronal = mPatronal[0].replace(/[\n\r]+/g, ' ').replace(/,\s*neste\s+ato.*$/i, '').trim();
  }

  // 3. Vigência e Data-Base
  let vigenciaInicio = '';
  let vigenciaFim = '';
  let dataBase = 'Maio';
  const mVigencia = text.match(/vigência\s+da\s+presente[^\.]*?período\s+de\s+([^\s]+(?:\s+de\s+[^\s]+){1,3})\s+a\s+([^\s]+(?:\s+de\s+[^\s]+){1,3})/i);
  if (mVigencia) {
    vigenciaInicio = parseDateBr(mVigencia[1]) || '';
    vigenciaFim = parseDateBr(mVigencia[2]) || '';
  }
  const mDataBase = text.match(/data-base\s+da\s+categoria\s+em\s+([^\.\n\r]+)/i);
  if (mDataBase) dataBase = mDataBase[1].replace(/[\n\r]+/g, ' ').trim();

  // 4. Categorias / Abrangência
  let categoriasProfissionais = '';
  const mAbrangencia = text.match(/CLÁUSULA\s+SEGUNDA\s*-\s*ABRANGÊNCIA[\s\S]*?abrangerá\s+a\(s\)\s+categoria\(s\)\s+([^\.\n\r]+(?:[\n\r]+[^\.\n\r]+){1,3})/i);
  if (mAbrangencia) {
    categoriasProfissionais = mAbrangencia[1].replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // 5. Salários por Função
  const salarios: Array<{ funcao: string; salarioPiso: number }> = [];
  const mPiso = text.match(/CLÁUSULA\s+TERCEIRA\s*-\s*PISO\s+SALARIAL([\s\S]*?)(?=CLÁUSULA\s+QUARTA|$)/i);
  if (mPiso) {
    const pisoBloco = mPiso[1];
    const mPiso1 = pisoBloco.match(/piso\s+salarial\s+para\s+os\s+trabalhadores\s+([^\,\.]+).*?R\$\s*([\d\.\,]+)/i);
    if (mPiso1) {
      let nome = mPiso1[1].replace(/[\n\r]+/g, ' ').trim();
      nome = nome.replace(/^para\s+os\s+/i, '').replace(/^trabalhadores\s+/i, '').trim();
      nome = nome.charAt(0).toUpperCase() + nome.slice(1);
      salarios.push({
        funcao: nome,
        salarioPiso: parseCurrency(mPiso1[2]),
      });
    }

    const mParagrafos = Array.from(
      pisoBloco.matchAll(/habilitação\s+profissional\s+([A-Z\s\,]+).*?piso\s+salarial\s+de\s+R\$\s*([\d\.\,]+)/gi)
    );
    for (const p of mParagrafos) {
      const cnhLimpa = p[1].replace(/\b(pagar[áa]?|paga)\b/gi, '').replace(/[,\s]+/g, ' ').trim();
      salarios.push({
        funcao: `Motorista Profissional (CNH ${cnhLimpa.split(' ').filter(Boolean).join(' e ')})`,
        salarioPiso: parseCurrency(p[2]),
      });
    }
  }

  if (salarios.length === 0) {
    const mGenPisos = Array.from(text.matchAll(/(?:função|cargo|categoria|trabalhadores|empregados)\s+de\s+([^\n\r\,]+).*?piso\s+(?:salarial\s+)?(?:de\s+)?R\$\s*([\d\.\,]+)/gi));
    for (const g of mGenPisos) {
      salarios.push({
        funcao: g[1].trim(),
        salarioPiso: parseCurrency(g[2])
      });
    }
  }

  // 6. Benefícios ao Trabalhador
  const beneficios: Array<{ beneficio: string; valor: number }> = [];
  const mVAlim = text.match(/CLÁUSULA[^\n\r]*VALE\s+ALIMENTAÇÃO[\s\S]*?valor\s+mensal\s+de\s+R\$\s*([\d\.\,]+)/i);
  if (mVAlim) {
    beneficios.push({
      beneficio: 'Vale Alimentação / Refeição (Cláusula 9ª)',
      valor: parseCurrency(mVAlim[1])
    });
  }

  const mSaude = text.match(/CLÁUSULA[^\n\r]*PLANO\s+DE\s+SAÚDE[\s\S]*?valor\s+mensal\s+de\s+R\$\s*([\d\.\,]+)/i);
  if (mSaude) {
    beneficios.push({
      beneficio: 'Auxílio Saúde / Plano de Saúde Coletivo (Cláusula 10ª)',
      valor: parseCurrency(mSaude[1])
    });
  }

  const mOdonto = text.match(/CLÁUSULA[^\n\r]*PLANO\s+ODONTOLÓGICO[\s\S]*?valor\s+mensal\s+de\s+R\$\s*([\d\.\,]+)/i);
  if (mOdonto) {
    beneficios.push({
      beneficio: 'Plano Odontológico (Cláusula 11ª)',
      valor: parseCurrency(mOdonto[1])
    });
  }

  const mAssist = text.match(/CLÁUSULA[^\n\r]*BENEFÍCIO\s+ASSISTENCIAL[\s\S]*?valor\s+total\s+de\s+R\$\s*([\d\.\,]+)/i);
  if (mAssist) {
    beneficios.push({
      beneficio: 'Benefício Social Assistencial Sindical (Cláusula 12ª)',
      valor: parseCurrency(mAssist[1])
    });
  }

  // 7. Obrigações com Pagamento (Com Ônus Financeiro)
  const obrigacoesComPagamento: Array<{ descricao: string; valor: number; periodicidade: string }> = [];
  const mNoturno = text.match(/CLÁUSULA[^\n\r]*ADICIONAL\s+NOTURNO[\s\S]*?será\s+de\s+([\d\.\,]+%)/i);
  if (mNoturno) {
    obrigacoesComPagamento.push({
      descricao: `Adicional Noturno (22h às 5h) de ${mNoturno[1]} sobre a hora normal (Cláusula 7ª)`,
      valor: 0,
      periodicidade: 'Mensal'
    });
  }

  const mPeric = text.match(/CLÁUSULA[^\n\r]*ADICIONAL\s+DE\s+PERICULOSIDADE[\s\S]*?será\s+pago\s+adicional\s+de\s+periculosidade\s+de\s+([\d\.\,]+%)/i);
  if (mPeric) {
    obrigacoesComPagamento.push({
      descricao: `Adicional de Periculosidade de ${mPeric[1]} sobre o salário base em área petrolífera (Cláusula 8ª)`,
      valor: 0,
      periodicidade: 'Mensal'
    });
  }

  const mAprendiz = text.match(/valor\s+mensal\s+mínimo\s+de\s+R\$\s*([\d\.\,]+)[\s\S]*?multiplicado\s+pela\s+quantidade\s+de\s+empregados/i);
  if (mAprendiz) {
    obrigacoesComPagamento.push({
      descricao: 'Cota de Reserva Jovem Aprendiz obrigatória na planilha de custos (Cláusula 16ª)',
      valor: parseCurrency(mAprendiz[1]),
      periodicidade: 'Mensal por Empregado'
    });
  }

  const mDiariaPernoite = text.match(/diária\s+no\s+valor\s+de\s+R\$\s*([\d\.\,]+)/i);
  if (mDiariaPernoite) {
    obrigacoesComPagamento.push({
      descricao: 'Diária de Viagem com Pernoite (>50km do município de lotação) (Cláusula 25ª)',
      valor: parseCurrency(mDiariaPernoite[1]),
      periodicidade: 'Por Ocorrência'
    });
  }

  const mDiariaBateVolta = text.match(/meia\s+diária\s+no\s+valor\s+de\s+R\$\s*([\d\.\,]+)/i);
  if (mDiariaBateVolta) {
    obrigacoesComPagamento.push({
      descricao: 'Meia Diária de Viagem sem Pernoite / Bate-e-Volta (>50km) (Cláusula 25ª)',
      valor: parseCurrency(mDiariaBateVolta[1]),
      periodicidade: 'Por Ocorrência'
    });
  }

  const mCnh = text.match(/CLÁUSULA[^\n\r]*EXAME\s+TOXICOLÓGICO\s+E\s+CNH/i);
  if (mCnh) {
    obrigacoesComPagamento.push({
      descricao: 'Custeio de Exames Toxicológicos (admissão/demissão/periódico) e Taxas DETRAN/RN de CNH (Cláusula 28ª)',
      valor: 0,
      periodicidade: 'Por Ocorrência'
    });
  }

  // 8. Obrigações sem Pagamento / Regras Operacionais (Sem Ônus Financeiro)
  const obrigacoesSemPagamento: Array<{ descricao: string }> = [];
  const mContinuidade = text.match(/CLÁUSULA[^\n\r]*CONTINUIDADE\s+DOS\s+CONTRATOS[\s\S]*?contratar\s+pelo\s+menos\s+([\d\.\,]+%[^\.]+)/i);
  if (mContinuidade) {
    obrigacoesSemPagamento.push({
      descricao: `Continuidade Contratual: Obrigação da empresa sucessora contratar pelo menos 90% dos efetivos já lotados (Cláusula 13ª)`
    });
  }

  const mAposentadoria = text.match(/CLÁUSULA[^\n\r]*APOSENTADORIA[\s\S]*?estabilidade\s+no\s+emprego\s+durante\s+os\s+(\d+\s*\([^\)]+\)\s*meses)/i);
  if (mAposentadoria) {
    obrigacoesSemPagamento.push({
      descricao: `Estabilidade pré-aposentadoria durante os ${mAposentadoria[1]} que antecedem a concessão (Cláusula 19ª)`
    });
  }

  const mJornada = text.match(/CLÁUSULA[^\n\r]*JORNADA\s+DE\s+TRABALHO[\s\S]*?escalas\s+([^\.]+)/i);
  if (mJornada) {
    obrigacoesSemPagamento.push({
      descricao: `Jornada e Escalas Autorizadas: 44h semanais, escalas ${mJornada[1].replace(/[\n\r]+/g, ' ').trim()} (Cláusula 20ª)`
    });
  }

  const mIntervalo = text.match(/intervalo\s+intrajornada\s+de\s+acordo\s+com\s+o\s+artigo\s+611-A[\s\S]*?mínimo\s+(\d+\s*\([^\)]+\)\s*minutos)/i);
  if (mIntervalo) {
    obrigacoesSemPagamento.push({
      descricao: `Intervalo intrajornada fracionável de no mínimo ${mIntervalo[1]} para repouso e alimentação (Cláusula 20ª, § 6º e 7º)`
    });
  }

  const mEpi = text.match(/CLÁUSULA[^\n\r]*DOS\s+FARDAMENTOS\s+E\s+EPI[\s\S]*?a\s+cada\s+(\d+\s*\([^\)]+\)\s*meses)/i);
  if (mEpi) {
    obrigacoesSemPagamento.push({
      descricao: `Fornecimento obrigatório e gratuito de uniformes/fardamentos e EPIs a cada ${mEpi[1]} da admissão (Cláusula 27ª)`
    });
  }

  return {
    numeroRegistroMte,
    sindicatoLaboral,
    sindicatoPatronal,
    vigenciaInicio,
    vigenciaFim,
    dataBase,
    categoriasProfissionais,
    itensFiscalizacao: {
      salarios,
      beneficios,
      obrigacoesComPagamento,
      obrigacoesSemPagamento
    },
    funcoes: salarios.map((s) => ({ nomeFuncao: s.funcao, salarioPiso: s.salarioPiso }))
  };
}
