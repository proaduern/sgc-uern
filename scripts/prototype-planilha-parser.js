const { PDFParse } = require('pdf-parse');

function parseCurrency(str) {
  if (!str) return 0;
  const clean = String(str).replace(/[^\d,\.]/g, '').trim();
  if (clean.includes(',') && clean.includes('.')) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
  } else if (clean.includes(',')) {
    return parseFloat(clean.replace(',', '.'));
  }
  return parseFloat(clean) || 0;
}

function parsePlanilhaCustosText(text) {
  // 1. Dados do Posto
  let funcao = '';
  const mItem = text.match(/Item\s+([^\n\r\t]+)/i);
  if (mItem) {
    funcao = mItem[1].trim();
  }

  let cbo = '';
  const mCbo = text.match(/Classificação\s+Brasileira\s+de\s+Ocupações\s*\(CBO\)\s*([^\n\r\t]+)/i);
  if (mCbo) {
    cbo = mCbo[1].trim();
  }

  let jornada = '44 horas semanais';
  const mJornada = text.match(/Jornada\s+([^\n\r\t]+)/i);
  if (mJornada) {
    jornada = mJornada[1].trim();
  }

  let municipio = 'Mossoró/RN';
  const mMunicipio = text.match(/(Mossoró|Natal|Caicó|Pau dos Ferros|Assú|Currais Novos)\s*[\/\-]?\s*RN/i);
  if (mMunicipio) {
    municipio = mMunicipio[0].trim();
  }

  let cctReferencia = '';
  const mCct = text.match(/(?:Acordo,\s*Convenção|CCT|Dissídio)[^\n\r\t]*?([A-Z0-9\/]{8,20})/i);
  if (mCct) {
    cctReferencia = mCct[1].trim();
  } else {
    const mCct2 = text.match(/RN\d{6}\/\d{4}/);
    if (mCct2) cctReferencia = mCct2[0];
  }

  let mesesExecucao = 12;
  const mMeses = text.match(/Nº\s+de\s+meses\s+de\s+execução\s+contratual\s*(\d+)/i);
  if (mMeses) {
    mesesExecucao = parseInt(mMeses[1], 10);
  }

  let salarioBase = 0;
  const mSalNorm = text.match(/Salário\s+Normativo[^\n\r\t]*?R\$\s*([\d\.\,]+)/i);
  if (mSalNorm) {
    salarioBase = parseCurrency(mSalNorm[1]);
  }

  // 2. Extração dos Módulos A, B, C, D, E, F do Quadro Resumo do Custo por Empregado
  // O PDF text do resumo tem:
  // A \t 2.389,81
  // B \t 1.497,04
  // C \t 170,01
  // D \t 339,69
  // E \t 0,20
  // ...
  // F \t 592,03
  // 4.988,78
  let totalModulo1 = salarioBase;
  let totalModulo2 = 0;
  let totalModulo3 = 0;
  let totalModulo4 = 0;
  let totalModulo5 = 0;
  let totalModulo6 = 0;

  const mBlocoModulos = text.match(/VALOR\s*\(R\$\)[\s\r\n]+A\s+([\d\.\,]+)[\s\r\n]+B\s+([\d\.\,]+)[\s\r\n]+C\s+([\d\.\,]+)[\s\r\n]+D\s+([\d\.\,]+)[\s\r\n]+E\s+([\d\.\,]+)[\s\r\n]+(?:[\d\.\,]+[\s\r\n]+)?F\s+([\d\.\,]+)/i);
  if (mBlocoModulos) {
    totalModulo1 = parseCurrency(mBlocoModulos[1]);
    totalModulo2 = parseCurrency(mBlocoModulos[2]);
    totalModulo3 = parseCurrency(mBlocoModulos[3]);
    totalModulo4 = parseCurrency(mBlocoModulos[4]);
    totalModulo5 = parseCurrency(mBlocoModulos[5]);
    totalModulo6 = parseCurrency(mBlocoModulos[6]);
    if (salarioBase === 0) salarioBase = totalModulo1;
  } else {
    // Fallback individual
    const mM1 = text.match(/TOTAL\s+DO\s+MÓDULO\s+1[\s\S]*?([\d\.\,]{4,})/i);
    if (mM1) totalModulo1 = parseCurrency(mM1[1]);

    const mM2 = text.match(/TOTAL\s+DO\s+MÓDULO\s+2[\s\S]*?([\d\.\,]{4,})/i);
    if (mM2) totalModulo2 = parseCurrency(mM2[1]);

    const mM3 = text.match(/TOTAL\s+DO\s+MÓDULO\s+3[\s\S]*?([\d\.\,]{2,})/i);
    if (mM3) totalModulo3 = parseCurrency(mM3[1]);

    const mM4 = text.match(/TOTAL\s+DO\s+MÓDULO\s+4[\s\S]*?([\d\.\,]{2,})/i);
    if (mM4) totalModulo4 = parseCurrency(mM4[1]);

    const mM5 = text.match(/TOTAL\s+DO\s+MÓDULO\s+5[\s\S]*?([\d\.\,]+)/i);
    if (mM5) totalModulo5 = parseCurrency(mM5[1]);

    const mM6 = text.match(/TOTAL\s+DO\s+MÓDULO\s+6[\s\S]*?([\d\.\,]{3,})/i);
    if (mM6) totalModulo6 = parseCurrency(mM6[1]);
  }

  // Tributos e Percentuais
  // No texto da Soll: "a) \t 11,85%"
  let tributosPercent = 14.25;
  const mTrib = text.match(/a\)\s+([\d\.\,]+)%/i) || text.match(/Tributos\s*%\s*=\s*To\s*=[^\d]*([\d\.\,]+)%?/i);
  if (mTrib) {
    tributosPercent = parseCurrency(mTrib[1]);
  }

  let custosIndiretosPercent = 3.0;
  const mInd = text.match(/Custos\s+Indiretos\s+([\d\.\,]+)%/i);
  if (mInd) {
    custosIndiretosPercent = parseCurrency(mInd[1]);
  }

  let lucroPercent = 3.2;
  const mLucro = text.match(/Lucro\s+([\d\.\,]+)%/i);
  if (mLucro) {
    lucroPercent = parseCurrency(mLucro[1]);
  }

  // Preço por Empregado
  let precoTotalEmpregado = 0;
  const mPrecoEmp = text.match(/PREÇO\s+TOTAL\s+POR\s+EMPREGADO[\s\S]*?([\d\.\,]{4,})/i) ||
                    text.match(/Po\s*\/\s*\(1\s*-\s*To\)\s*=\s*P1\s*=[^\d]*([\d\.\,]{4,})/i) ||
                    text.match(/c\)\s+([\d\.\,]{4,})/i);
  if (mPrecoEmp) {
    precoTotalEmpregado = parseCurrency(mPrecoEmp[1]);
  }

  // Quantidade de Postos
  // No quadro resumo mensal:
  // "Qde Postos \n (E) \n 4.988,78 \t 1 \t 4.988,78"
  let quantidadePostos = 1;
  const mPostoRow = text.match(/([\d\.\,]{4,})\s+(\d+)\s+([\d\.\,]{4,})/);
  if (mPostoRow && parseCurrency(mPostoRow[1]) === precoTotalEmpregado) {
    quantidadePostos = parseInt(mPostoRow[2], 10);
  }

  // Valor Mensal Total
  let valorMensalTotal = precoTotalEmpregado * quantidadePostos;
  const mVMensal = text.match(/VALOR\s+MENSAL\s+DOS\s+SERVIÇOS[\s\S]*?([\d\.\,]{4,})/i);
  if (mVMensal) {
    valorMensalTotal = parseCurrency(mVMensal[1]);
  }

  // Valor Global Total
  let valorGlobalTotal = valorMensalTotal * mesesExecucao;
  const mVGlobal = text.match(/VALOR\s+GLOBAL\s+DA\s+PROPOSTA[\s\S]*?([\d\.\,]{5,})/i) ||
                   text.match(/Valor\s+Global\s+da\s+Proposta[^\n\r]*?([\d\.\,]{5,})/i);
  if (mVGlobal) {
    valorGlobalTotal = parseCurrency(mVGlobal[1]);
  }

  // Fator K
  let fatorK = 0;
  const mFatorK = text.match(/FATOR\s+K[^\d]*([\d\.\,]+)/i);
  if (mFatorK) {
    fatorK = parseCurrency(mFatorK[1]);
  } else if (salarioBase > 0 && precoTotalEmpregado > 0) {
    fatorK = parseFloat((precoTotalEmpregado / salarioBase).toFixed(6));
  }

  return {
    funcao: funcao || 'Supervisor Operacional',
    cbo,
    municipio,
    jornada,
    cctReferencia,
    mesesExecucao,
    quantidadePostos,
    salarioBase,
    totalModulo1,
    totalModulo2,
    totalModulo3,
    totalModulo4,
    totalModulo5,
    totalModulo6,
    custosIndiretosPercent,
    lucroPercent,
    tributosPercent,
    precoTotalEmpregado,
    valorMensalTotal,
    valorGlobalTotal,
    fatorK
  };
}

module.exports = {
  parsePlanilhaCustosText
};

if (require.main === module) {
  const fs = require('fs');
  const buf = fs.readFileSync('tests/fixtures/PLANILHA_COMP_CUSTOS.pdf');
  const parser = new PDFParse(new Uint8Array(buf));
  parser.load().then(() => parser.getText()).then(res => {
    const r = parsePlanilhaCustosText(res.text);
    console.log('RESULTADO PLANILHA CUSTOS REFINADO:');
    console.log(JSON.stringify(r, null, 2));
  });
}
