const { PDFParse } = require('pdf-parse');

function parseDateBr(dateStr) {
  if (!dateStr) return null;
  const meses = {
    janeiro: '01', fevereiro: '02', 'março': '03', marco: '03',
    abril: '04', maio: '05', junho: '06', julho: '07',
    agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12'
  };
  
  // Ex: "01º de maio de 2026" ou "1 de maio de 2026"
  const mExtenso = dateStr.match(/(\d{1,2})[ºoª]?\s+de\s+([a-zA-ZçÇ]+)\s+de\s+(\d{4})/i);
  if (mExtenso) {
    const dia = mExtenso[1].padStart(2, '0');
    const mesNome = mExtenso[2].toLowerCase();
    const mes = meses[mesNome] || '01';
    const ano = mExtenso[3];
    return `${ano}-${mes}-${dia}`;
  }

  // Ex: "01/05/2026"
  const mNum = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mNum) {
    const dia = mNum[1].padStart(2, '0');
    const mes = mNum[2].padStart(2, '0');
    const ano = mNum[3];
    return `${ano}-${mes}-${dia}`;
  }
  return null;
}

function parseCurrency(str) {
  if (!str) return 0;
  // Converte "2.518,35" ou "R$ 2.518,35" para float 2518.35
  const clean = str.replace(/[^\d,\.]/g, '').trim();
  if (clean.includes(',') && clean.includes('.')) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
  } else if (clean.includes(',')) {
    return parseFloat(clean.replace(',', '.'));
  }
  return parseFloat(clean) || 0;
}

async function extractTextFromPdf(buffer) {
  const parser = new PDFParse(new Uint8Array(buffer));
  await parser.load();
  const res = await parser.getText();
  return res.text;
}

function parseCctText(text) {
  // 1. Registro MTE
  let numeroRegistroMte = '';
  const mMte = text.match(/NÚMERO DE REGISTRO NO MTE:\s*([A-Z0-9\/]+)/i);
  if (mMte) numeroRegistroMte = mMte[1].trim();

  // 2. Sindicatos
  let sindicatoLaboral = '';
  let sindicatoPatronal = '';
  const mSindicatos = text.match(/SINDICATO\s+DOS\s+TRABALHADORES[^\n\r]+(?:[\n\r]+[^\n\r]+)?/i);
  if (mSindicatos) sindicatoLaboral = mSindicatos[0].replace(/[\n\r]+/g, ' ').trim();

  const mPatronal = text.match(/SINDICATO\s+PATRONAL[^\n\r]+(?:[\n\r]+[^\n\r]+)?/i);
  if (mPatronal) sindicatoPatronal = mPatronal[0].replace(/[\n\r]+/g, ' ').trim();

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
  const salarios = [];
  // Procura cláusula de piso salarial
  const mPiso = text.match(/CLÁUSULA\s+TERCEIRA\s*-\s*PISO\s+SALARIAL([\s\S]*?)(?=CLÁUSULA\s+QUARTA|$)/i);
  if (mPiso) {
    const pisoBloco = mPiso[1];
    // Motoristas condutor de veículos até 3500kg
    const mPiso1 = pisoBloco.match(/piso\s+salarial\s+para\s+os\s+trabalhadores\s+([^\,\.]+).*?R\$\s*([\d\.\,]+)/i);
    if (mPiso1) {
      salarios.push({
        funcao: mPiso1[1].replace(/[\n\r]+/g, ' ').trim(),
        salarioPiso: parseCurrency(mPiso1[2])
      });
    }
    // Parágrafos com outros pisos
    const mParagrafos = pisoBloco.matchAll(/habilitação\s+profissional\s+([A-Z\s\,]+).*?piso\s+salarial\s+de\s+R\$\s*([\d\.\,]+)/gi);
    for (const p of mParagrafos) {
      salarios.push({
        funcao: `Motorista Profissional CNH ${p[1].trim()}`,
        salarioPiso: parseCurrency(p[2])
      });
    }
  }

  // Se nenhum salário for pego pela regex acima, busca genérica por "piso salarial de R$ ..."
  if (salarios.length === 0) {
    const mGenPisos = text.matchAll(/(?:função|cargo|categoria|trabalhadores|empregados)\s+de\s+([^\n\r\,]+).*?piso\s+(?:salarial\s+)?(?:de\s+)?R\$\s*([\d\.\,]+)/gi);
    for (const g of mGenPisos) {
      salarios.push({
        funcao: g[1].trim(),
        salarioPiso: parseCurrency(g[2])
      });
    }
  }

  // 6. Benefícios ao Trabalhador
  const beneficios = [];
  // Vale Alimentação
  const mVAlim = text.match(/CLÁUSULA[^\n\r]*VALE\s+ALIMENTAÇÃO[\s\S]*?valor\s+mensal\s+de\s+R\$\s*([\d\.\,]+)/i);
  if (mVAlim) {
    beneficios.push({
      beneficio: 'Vale Alimentação / Refeição (Cláusula 9ª)',
      valor: parseCurrency(mVAlim[1])
    });
  }
  // Plano de Saúde
  const mSaude = text.match(/CLÁUSULA[^\n\r]*PLANO\s+DE\s+SAÚDE[\s\S]*?valor\s+mensal\s+de\s+R\$\s*([\d\.\,]+)/i);
  if (mSaude) {
    beneficios.push({
      beneficio: 'Auxílio Saúde / Plano de Saúde Coletivo (Cláusula 10ª)',
      valor: parseCurrency(mSaude[1])
    });
  }
  // Plano Odontológico
  const mOdonto = text.match(/CLÁUSULA[^\n\r]*PLANO\s+ODONTOLÓGICO[\s\S]*?valor\s+mensal\s+de\s+R\$\s*([\d\.\,]+)/i);
  if (mOdonto) {
    beneficios.push({
      beneficio: 'Plano Odontológico (Cláusula 11ª)',
      valor: parseCurrency(mOdonto[1])
    });
  }
  // Benefício Assistencial
  const mAssist = text.match(/CLÁUSULA[^\n\r]*BENEFÍCIO\s+ASSISTENCIAL[\s\S]*?valor\s+total\s+de\s+R\$\s*([\d\.\,]+)/i);
  if (mAssist) {
    beneficios.push({
      beneficio: 'Benefício Social Assistencial Sindical (Cláusula 12ª)',
      valor: parseCurrency(mAssist[1])
    });
  }

  // 7. Obrigações com Pagamento (Com Ônus)
  const obrigacoesComPagamento = [];
  // Adicional Noturno
  const mNoturno = text.match(/CLÁUSULA[^\n\r]*ADICIONAL\s+NOTURNO[\s\S]*?será\s+de\s+([\d\.\,]+%)/i);
  if (mNoturno) {
    obrigacoesComPagamento.push({
      descricao: `Adicional Noturno (22h às 5h) de ${mNoturno[1]} sobre a hora normal (Cláusula 7ª)`,
      valor: 0,
      periodicidade: 'Mensal'
    });
  }
  // Adicional de Periculosidade
  const mPeric = text.match(/CLÁUSULA[^\n\r]*ADICIONAL\s+DE\s+PERICULOSIDADE[\s\S]*?será\s+pago\s+adicional\s+de\s+periculosidade\s+de\s+([\d\.\,]+%)/i);
  if (mPeric) {
    obrigacoesComPagamento.push({
      descricao: `Adicional de Periculosidade de ${mPeric[1]} sobre o salário base em área petrolífera (Cláusula 8ª)`,
      valor: 0,
      periodicidade: 'Mensal'
    });
  }
  // Reserva Jovem Aprendiz na Planilha
  const mAprendiz = text.match(/valor\s+mensal\s+mínimo\s+de\s+R\$\s*([\d\.\,]+)[\s\S]*?multiplicado\s+pela\s+quantidade\s+de\s+empregados/i);
  if (mAprendiz) {
    obrigacoesComPagamento.push({
      descricao: 'Cota de Reserva Jovem Aprendiz obrigatória na planilha (Cláusula 16ª)',
      valor: parseCurrency(mAprendiz[1]),
      periodicidade: 'Mensal por Empregado'
    });
  }
  // Diárias de Viagens
  const mDiariaPernoite = text.match(/diária\s+no\s+valor\s+de\s+R\$\s*([\d\.\,]+)/i);
  if (mDiariaPernoite) {
    obrigacoesComPagamento.push({
      descricao: 'Diária de Viagem com Pernoite (>50km do município) (Cláusula 25ª)',
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
  // Exame Toxicológico e CNH
  const mCnh = text.match(/CLÁUSULA[^\n\r]*EXAME\s+TOXICOLÓGICO\s+E\s+CNH/i);
  if (mCnh) {
    obrigacoesComPagamento.push({
      descricao: 'Custeio de Exames Toxicológicos (admissão/demissão/periódico) e Taxas DETRAN/RN de CNH (Cláusula 28ª)',
      valor: 0,
      periodicidade: 'Por Ocorrência'
    });
  }

  // 8. Obrigações sem Pagamento / Regras Operacionais
  const obrigacoesSemPagamento = [];
  // Continuidade dos contratos
  const mContinuidade = text.match(/CLÁUSULA[^\n\r]*CONTINUIDADE\s+DOS\s+CONTRATOS[\s\S]*?contratar\s+pelo\s+menos\s+([\d\.\,]+%[^\.]+)/i);
  if (mContinuidade) {
    obrigacoesSemPagamento.push({
      descricao: `Continuidade Contratual: Obrigação da empresa sucessora contratar pelo menos ${mContinuidade[1].trim()} já lotados (Cláusula 13ª)`
    });
  }
  // Estabilidade Aposentadoria
  const mAposentadoria = text.match(/CLÁUSULA[^\n\r]*APOSENTADORIA[\s\S]*?estabilidade\s+no\s+emprego\s+durante\s+os\s+(\d+\s*\([^\)]+\)\s*meses)/i);
  if (mAposentadoria) {
    obrigacoesSemPagamento.push({
      descricao: `Estabilidade pré-aposentadoria durante os ${mAposentadoria[1]} que antecedem a concessão (Cláusula 19ª)`
    });
  }
  // Jornada e escalas
  const mJornada = text.match(/CLÁUSULA[^\n\r]*JORNADA\s+DE\s+TRABALHO[\s\S]*?escalas\s+([^\.]+)/i);
  if (mJornada) {
    obrigacoesSemPagamento.push({
      descricao: `Jornada e Escalas Autorizadas: 44h semanais, escalas ${mJornada[1].trim()} (Cláusula 20ª)`
    });
  }
  // Intervalo Intrajornada
  const mIntervalo = text.match(/intervalo\s+intrajornada\s+de\s+acordo\s+com\s+o\s+artigo\s+611-A[\s\S]*?mínimo\s+(\d+\s*\([^\)]+\)\s*minutos)/i);
  if (mIntervalo) {
    obrigacoesSemPagamento.push({
      descricao: `Intervalo intrajornada fracionável de no mínimo ${mIntervalo[1]} para repouso e alimentação (Cláusula 20ª, § 6º e 7º)`
    });
  }
  // Fardamento e EPIs
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
    funcoes: salarios.map(s => ({ nomeFuncao: s.funcao, salarioPiso: s.salarioPiso }))
  };
}

module.exports = {
  extractTextFromPdf,
  parseCctText
};

if (require.main === module) {
  const fs = require('fs');
  const buf = fs.readFileSync('tests/fixtures/CCT_MOT.pdf');
  extractTextFromPdf(buf).then(txt => {
    const res = parseCctText(txt);
    console.log('RESULTADO PARSE CCT:');
    console.log(JSON.stringify(res, null, 2));
  });
}
