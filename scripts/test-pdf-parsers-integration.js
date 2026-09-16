const http = require('http');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (e) {}
        resolve({ statusCode: res.statusCode, headers: res.headers, body, json });
      });
    });
    req.on('error', reject);
    if (data) {
      if (Buffer.isBuffer(data)) req.write(data);
      else if (typeof data === 'string') req.write(data);
      else req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function login(email, senha) {
  const res = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email, senha });

  if (res.statusCode !== 200) {
    throw new Error(`Falha no login de ${email}: ${res.statusCode} ${res.body}`);
  }
  const cookies = res.headers['set-cookie'];
  return cookies ? cookies[0].split(';')[0] : '';
}

function buildMultipartFormData(fields, fileField, fileName, fileBuffer) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const crlf = '\r\n';
  const parts = [];

  for (const [key, val] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="${key}"${crlf}${crlf}${val}${crlf}`));
  }

  parts.push(Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="${fileField}"; filename="${fileName}"${crlf}Content-Type: application/pdf${crlf}${crlf}`));
  parts.push(fileBuffer);
  parts.push(Buffer.from(`${crlf}--${boundary}--${crlf}`));

  const payload = Buffer.concat(parts);
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    contentLength: payload.length,
    payload
  };
}

async function runTests() {
  console.log('====================================================================');
  console.log('=== TESTE DE VALIDAÇÃO: PARSER INTELIGENTE DE CCT E PLANILHA PDF ===');
  console.log('====================================================================\n');

  try {
    console.log('[1] Autenticando Administrador PROAD...');
    const adminCookie = await login('proad@uern.br', '123');
    console.log('    -> Admin autenticado com sucesso.\n');

    // 1. Testar Parser da CCT (CCT_MOT.pdf)
    console.log('[2] Testando endpoint POST /api/terceirizacao/cct/parse-pdf com CCT_MOT.pdf...');
    const cctPdfPath = path.join(process.cwd(), 'tests', 'fixtures', 'CCT_MOT.pdf');
    const cctBuffer = fs.readFileSync(cctPdfPath);

    const cctMultipart = buildMultipartFormData({}, 'arquivo', 'CCT_MOT.pdf', cctBuffer);

    const parseCctRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/terceirizacao/cct/parse-pdf',
      method: 'POST',
      headers: {
        'Content-Type': cctMultipart.contentType,
        'Content-Length': cctMultipart.contentLength,
        Cookie: adminCookie
      }
    }, cctMultipart.payload);

    console.log(`    Status retornado: ${parseCctRes.statusCode}`);
    if (parseCctRes.statusCode !== 200) {
      throw new Error(`Falha no parse da CCT: ${parseCctRes.body}`);
    }

    const cctData = parseCctRes.json.dados;
    console.log(`    -> Registro MTE extraído: "${cctData.numeroRegistroMte}"`);
    console.log(`    -> Vigência: ${cctData.vigenciaInicio} a ${cctData.vigenciaFim} (Data-base: ${cctData.dataBase})`);
    console.log(`    -> Sindicato Laboral: ${cctData.sindicatoLaboral?.slice(0, 60)}...`);
    console.log(`    -> Sindicato Patronal: ${cctData.sindicatoPatronal?.slice(0, 60)}...`);
    console.log(`    -> Pisos Salariais (${cctData.itensFiscalizacao.salarios.length}):`, cctData.itensFiscalizacao.salarios);
    console.log(`    -> Benefícios ao Trabalhador (${cctData.itensFiscalizacao.beneficios.length}):`, cctData.itensFiscalizacao.beneficios);
    console.log(`    -> Obrigações Financeiras c/ Ônus (${cctData.itensFiscalizacao.obrigacoesComPagamento.length}):`, cctData.itensFiscalizacao.obrigacoesComPagamento);
    console.log(`    -> Regras Operacionais s/ Ônus (${cctData.itensFiscalizacao.obrigacoesSemPagamento.length}):`, cctData.itensFiscalizacao.obrigacoesSemPagamento);

    // Validações rigorosas de negócio da CCT
    if (cctData.numeroRegistroMte !== 'RN000267/2026') {
      throw new Error(`Registro MTE incorreto: esperado RN000267/2026, obtido ${cctData.numeroRegistroMte}`);
    }
    if (cctData.vigenciaInicio !== '2026-05-01' || cctData.vigenciaFim !== '2027-04-30') {
      throw new Error(`Vigência incorreta: ${cctData.vigenciaInicio} a ${cctData.vigenciaFim}`);
    }
    if (cctData.itensFiscalizacao.salarios.length < 2) {
      throw new Error('Deveria ter extraído pelo menos 2 pisos salariais da CCT.');
    }
    if (cctData.itensFiscalizacao.beneficios.length < 4) {
      throw new Error('Deveria ter extraído pelo menos 4 benefícios da CCT (Alimentação, Saúde, Odonto, Assistencial).');
    }
    if (cctData.itensFiscalizacao.obrigacoesComPagamento.length < 5) {
      throw new Error('Deveria ter extraído pelo menos 5 obrigações com ônus (Noturno, Periculosidade, Aprendiz, Diárias, etc.).');
    }
    if (cctData.itensFiscalizacao.obrigacoesSemPagamento.length < 4) {
      throw new Error('Deveria ter extraído pelo menos 4 regras operacionais (Continuidade, Aposentadoria, Jornada, EPIs).');
    }
    console.log('    ✓ Validação da CCT concluída com 100% de sucesso!\n');

    // 2. Testar Parser da Planilha de Custos (PLANILHA_COMP_CUSTOS.pdf)
    console.log('[3] Testando endpoint POST /api/contratos/planilhas-custos/parse-pdf com PLANILHA_COMP_CUSTOS.pdf...');
    const planilhaPdfPath = path.join(process.cwd(), 'tests', 'fixtures', 'PLANILHA_COMP_CUSTOS.pdf');
    const planilhaBuffer = fs.readFileSync(planilhaPdfPath);

    const planilhaMultipart = buildMultipartFormData({}, 'arquivo', 'PLANILHA_COMP_CUSTOS.pdf', planilhaBuffer);

    const parsePlanilhaRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/contratos/planilhas-custos/parse-pdf',
      method: 'POST',
      headers: {
        'Content-Type': planilhaMultipart.contentType,
        'Content-Length': planilhaMultipart.contentLength,
        Cookie: adminCookie
      }
    }, planilhaMultipart.payload);

    console.log(`    Status retornado: ${parsePlanilhaRes.statusCode}`);
    if (parsePlanilhaRes.statusCode !== 200) {
      throw new Error(`Falha no parse da Planilha de Custos: ${parsePlanilhaRes.body}`);
    }

    const pData = parsePlanilhaRes.json.dados;
    console.log(`    -> Função: "${pData.funcao}" | CBO: "${pData.cbo}"`);
    console.log(`    -> Município: "${pData.municipio}" | Jornada: "${pData.jornada}"`);
    console.log(`    -> CCT Ref: "${pData.cctReferencia}" | Meses: ${pData.mesesExecucao} | Postos: ${pData.quantidadePostos}`);
    console.log(`    -> Salário-Base: R$ ${pData.salarioBase}`);
    console.log(`    -> Módulos IN 05/2017:`);
    console.log(`       M1 (Remuneração): R$ ${pData.totalModulo1}`);
    console.log(`       M2 (Encargos/Benefícios): R$ ${pData.totalModulo2}`);
    console.log(`       M3 (Rescisão): R$ ${pData.totalModulo3}`);
    console.log(`       M4 (Reposição Ausente): R$ ${pData.totalModulo4}`);
    console.log(`       M5 (Insumos Diversos): R$ ${pData.totalModulo5}`);
    console.log(`       M6 (Custos Ind./Lucro/Trib): R$ ${pData.totalModulo6} (Tributos: ${pData.tributosPercent}%)`);
    console.log(`    -> Preço Unitário por Empregado: R$ ${pData.precoTotalEmpregado}`);
    console.log(`    -> Valor Mensal: R$ ${pData.valorMensalTotal}`);
    console.log(`    -> Valor Global: R$ ${pData.valorGlobalTotal}`);
    console.log(`    -> Fator K: ${pData.fatorK}`);

    // Validações rigorosas de negócio da Planilha
    if (pData.funcao !== 'Supervisor Operacional') {
      throw new Error(`Função incorreta: esperado "Supervisor Operacional", obtido "${pData.funcao}"`);
    }
    if (pData.totalModulo1 !== 2389.81) {
      throw new Error(`Módulo 1 incorreto: esperado 2389.81, obtido ${pData.totalModulo1}`);
    }
    if (pData.totalModulo2 !== 1497.04) {
      throw new Error(`Módulo 2 incorreto: esperado 1497.04, obtido ${pData.totalModulo2}`);
    }
    if (pData.totalModulo3 !== 170.01) {
      throw new Error(`Módulo 3 incorreto: esperado 170.01, obtido ${pData.totalModulo3}`);
    }
    if (pData.totalModulo4 !== 339.69) {
      throw new Error(`Módulo 4 incorreto: esperado 339.69, obtido ${pData.totalModulo4}`);
    }
    if (pData.totalModulo5 !== 0.20) {
      throw new Error(`Módulo 5 incorreto: esperado 0.20, obtido ${pData.totalModulo5}`);
    }
    if (pData.totalModulo6 !== 592.03) {
      throw new Error(`Módulo 6 incorreto: esperado 592.03, obtido ${pData.totalModulo6}`);
    }
    if (pData.precoTotalEmpregado !== 4988.78) {
      throw new Error(`Preço total incorreto: esperado 4988.78, obtido ${pData.precoTotalEmpregado}`);
    }
    if (pData.fatorK !== 2.087522) {
      throw new Error(`Fator K incorreto: esperado 2.087522, obtido ${pData.fatorK}`);
    }
    console.log('    ✓ Validação da Planilha de Custos concluída com 100% de sucesso!\n');

    console.log('====================================================================');
    console.log('>>> TODOS OS TESTES DE LEITURA INTELIGENTE DE PDF PASSARAM! <<<');
    console.log('====================================================================\n');

  } catch (err) {
    console.error('\n❌ ERRO NA EXECUÇÃO DOS TESTES:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
