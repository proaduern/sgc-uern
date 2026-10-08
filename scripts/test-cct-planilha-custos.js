const http = require('http');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function request(options, data = null, isBinary = false) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let json = null;
        if (!isBinary) {
          try { json = JSON.parse(buffer.toString('utf-8')); } catch (e) {}
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          buffer,
          body: isBinary ? null : buffer.toString('utf-8'),
          json
        });
      });
    });
    req.on('error', reject);
    if (data) {
      if (Buffer.isBuffer(data)) {
        req.write(data);
      } else if (typeof data === 'string') {
        req.write(data);
      } else {
        req.write(JSON.stringify(data));
      }
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

async function runTests() {
  console.log('===============================================================');
  console.log('=== TESTE DE VALIDAÇÃO INTEGRADO: CCT & PLANILHAS DE CUSTOS ===');
  console.log('===============================================================\n');

  try {
    // 1. Download do Modelo Oficial de Planilha de Custos
    console.log('[1] Testando download do modelo oficial de planilha de custos...');
    const downloadRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/modelos-planilhas/custos',
      method: 'GET'
    }, null, true);

    console.log(`    Status: ${downloadRes.statusCode}`);
    console.log(`    Content-Type: ${downloadRes.headers['content-type']}`);
    console.log(`    Content-Disposition: ${downloadRes.headers['content-disposition']}`);
    console.log(`    Tamanho recebido: ${downloadRes.buffer.length} bytes`);

    if (downloadRes.statusCode !== 200 || downloadRes.buffer.length < 1000) {
      throw new Error('Falha no download do modelo oficial de planilha de custos');
    }
    console.log('    -> Modelo oficial baixado com sucesso!\n');

    // 2. Autenticação Admin
    console.log('[2] Autenticando Administrador PROAD...');
    const adminCookie = await login('proad@uern.br', '123');
    console.log('    -> Admin autenticado com sucesso.\n');

    // Obter um contrato existente
    const contratos = await prisma.contrato.findMany({
      take: 2,
      include: {
        itens: true,
        responsaveis: { include: { user: true } }
      }
    });

    if (contratos.length === 0) {
      throw new Error('Nenhum contrato encontrado no banco para teste.');
    }

    const testContrato = contratos[0];
    console.log(`[3] Contrato de teste selecionado: ${testContrato.numeroContrato} (ID: ${testContrato.id})`);
    console.log(`    Itens do contrato: ${testContrato.itens.length}`);

    // 3. Teste de Cadastro e Edição de CCT com os 4 Blocos de Fiscalização
    console.log('\n[4] Testando cadastro de CCT com 4 Blocos de Fiscalização...');
    const cctPayload = {
      contratoId: testContrato.id,
      numeroRegistroMte: 'RN000999/2026',
      sindicatoLaboral: 'SINDILIMP-RN',
      sindicatoPatronal: 'SEAC-RN',
      vigenciaInicio: '2026-01-01',
      vigenciaFim: '2026-12-31',
      dataBase: 'Janeiro',
      categoriasProfissionais: 'Serventes de Limpeza, Encarregados, Porteiros e Vigias',
      itensFiscalizacao: {
        salarios: [
          { funcao: 'Servente de Limpeza', salarioPiso: 1618.00 },
          { funcao: 'Encarregado Geral', salarioPiso: 2450.00 }
        ],
        beneficios: [
          { beneficio: 'Vale-Alimentação / Refeição', valor: 550.00 },
          { beneficio: 'Auxílio Saúde', valor: 95.00 },
          { beneficio: 'Seguro de Vida em Grupo', valor: 15.50 }
        ],
        obrigacoesComPagamento: [
          { descricao: 'Adicional de Insalubridade Médio (20%)', valor: 323.60, periodicidade: 'Mensal' },
          { descricao: 'Indenização de Uniformes e EPIs', valor: 45.00, periodicidade: 'Mensal' }
        ],
        obrigacoesSemPagamento: [
          { descricao: 'Escala 12x36 com intervalo intrajornada garantido de no mínimo 1 hora' },
          { descricao: 'Homologação de rescisão contratual assistida pelo sindicato para contratos com mais de 1 ano' },
          { descricao: 'Estabilidade provisória de 12 meses que antecedem a aposentadoria por tempo de contribuição' }
        ]
      }
    };

    const postCctRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/terceirizacao/cct',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      }
    }, cctPayload);

    console.log(`    Status criação CCT: ${postCctRes.statusCode}`);
    if (postCctRes.statusCode !== 201) {
      throw new Error(`Erro ao criar CCT: ${postCctRes.body}`);
    }
    const createdCct = postCctRes.json.convenio;
    console.log(`    CCT cadastrada ID: ${createdCct.id}`);
    console.log(`    Categorias: ${createdCct.categoriasProfissionais}`);
    console.log(`    Blocos de fiscalização salvos:`, Object.keys(createdCct.itensFiscalizacao || {}));

    // Verificar GET /api/terceirizacao/cct
    console.log('\n[5] Consultando CCTs via GET /api/terceirizacao/cct...');
    const getCctRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/terceirizacao/cct?contratoId=${testContrato.id}`,
      method: 'GET',
      headers: { Cookie: adminCookie }
    });

    const cctList = getCctRes.json.convencoes;
    console.log(`    CCTs retornadas: ${cctList.length}`);
    const foundCct = cctList.find(c => c.id === createdCct.id);
    if (!foundCct) {
      throw new Error('CCT recém-criada não encontrada na listagem.');
    }
    console.log('    Salários cadastrados:', foundCct.itensFiscalizacao.salarios.length);
    console.log('    Benefícios cadastrados:', foundCct.itensFiscalizacao.beneficios.length);
    console.log('    Obrigações c/ pagto:', foundCct.itensFiscalizacao.obrigacoesComPagamento.length);
    console.log('    Regras operacionais:', foundCct.itensFiscalizacao.obrigacoesSemPagamento.length);

    // 4. Teste de Cadastro de Múltiplas Planilhas de Composição de Custos
    console.log('\n[6] Testando cadastro de Planilha de Composição de Custos por Função/Item...');
    
    // Garantir que o contrato tem pelo menos 1 item
    let itemId = null;
    if (testContrato.itens && testContrato.itens.length > 0) {
      itemId = testContrato.itens[0].id;
    } else {
      const newItem = await prisma.contratoItem.create({
        data: {
          contratoId: testContrato.id,
          numeroItem: 1,
          descricao: 'Prestação de serviços de apoio operacional e limpeza',
          unidade: 'MÊS',
          quantidadeOriginal: 10,
          quantidadeAtual: 10,
          valorUnitarioOriginal: 3500.00,
          valorUnitarioAtual: 3500.00,
          valorTotalOriginal: 35000.00,
          valorTotalAtual: 35000.00
        }
      });
      itemId = newItem.id;
    }
    console.log(`    Item de contrato associado: ${itemId}`);

    // A) Inserir Planilha 1 (Servente de Limpeza) via JSON
    const planilha1Payload = {
      contratoId: testContrato.id,
      itemId: itemId,
      funcao: 'Servente de Limpeza',
      cbo: '5143-20',
      municipio: 'Mossoró/RN',
      jornada: '44 horas semanais',
      cctReferencia: 'SINDILIMP-RN 2026/2026',
      quantidadePostos: 8,
      mesesExecucao: 12,
      salarioBase: 1618.00,
      totalModulo1: 1618.00,
      totalModulo2: 595.42,
      totalModulo3: 124.59,
      totalModulo4: 80.90,
      totalModulo5: 110.00,
      custosIndiretosPercent: 3.0,
      lucroPercent: 3.2,
      tributosPercent: 14.25
    };

    const postPlanilha1Res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/contratos/planilhas-custos',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      }
    }, planilha1Payload);

    console.log(`    Status criação Planilha 1: ${postPlanilha1Res.statusCode}`);
    if (postPlanilha1Res.statusCode !== 201) {
      throw new Error(`Erro ao cadastrar Planilha 1: ${postPlanilha1Res.body}`);
    }
    const p1 = postPlanilha1Res.json.planilha;
    console.log(`    -> Planilha 1 criada com sucesso!`);
    console.log(`       Função: ${p1.funcao}`);
    console.log(`       Preço Unitário/Empregado: R$ ${p1.precoTotalEmpregado.toFixed(2)}`);
    console.log(`       Valor Mensal Total (${p1.quantidadePostos} postos): R$ ${p1.valorMensalTotal.toFixed(2)}`);
    console.log(`       Fator K calculado: ${p1.fatorK.toFixed(4)}`);

    // B) Inserir Planilha 2 (Encarregado Operacional) no mesmo contrato
    const planilha2Payload = {
      contratoId: testContrato.id,
      itemId: itemId,
      funcao: 'Encarregado Operacional',
      cbo: '5143-25',
      municipio: 'Mossoró/RN',
      jornada: '44 horas semanais',
      cctReferencia: 'SINDILIMP-RN 2026/2026',
      quantidadePostos: 2,
      mesesExecucao: 12,
      salarioBase: 2450.00,
      totalModulo1: 2450.00,
      totalModulo2: 901.60,
      totalModulo3: 188.65,
      totalModulo4: 122.50,
      totalModulo5: 150.00,
      custosIndiretosPercent: 3.0,
      lucroPercent: 3.2,
      tributosPercent: 14.25
    };

    const postPlanilha2Res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/contratos/planilhas-custos',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      }
    }, planilha2Payload);

    console.log(`    Status criação Planilha 2: ${postPlanilha2Res.statusCode}`);
    if (postPlanilha2Res.statusCode !== 201) {
      throw new Error(`Erro ao cadastrar Planilha 2: ${postPlanilha2Res.body}`);
    }
    const p2 = postPlanilha2Res.json.planilha;
    console.log(`    -> Planilha 2 criada com sucesso!`);
    console.log(`       Função: ${p2.funcao}`);
    console.log(`       Preço Unitário/Empregado: R$ ${p2.precoTotalEmpregado.toFixed(2)}`);
    console.log(`       Valor Mensal Total (${p2.quantidadePostos} postos): R$ ${p2.valorMensalTotal.toFixed(2)}`);
    console.log(`       Fator K calculado: ${p2.fatorK.toFixed(4)}`);

    // C) Consultar listagem de planilhas do contrato
    console.log('\n[7] Consultando planilhas de custos do contrato via GET...');
    const getPlanilhasRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/contratos/planilhas-custos?contratoId=${testContrato.id}`,
      method: 'GET',
      headers: { Cookie: adminCookie }
    });

    const planilhasData = getPlanilhasRes.json;
    console.log(`    Quantidade de planilhas cadastradas para o contrato: ${planilhasData.planilhas.length}`);
    console.log(`    Total Mensal Global de todas as planilhas: R$ ${planilhasData.totais.totalMensalGeral.toFixed(2)}`);
    console.log(`    Total Global Anual: R$ ${planilhasData.totais.totalGlobalGeral.toFixed(2)}`);
    console.log(`    Total de Trabalhadores Contratados: ${planilhasData.totais.totalEmpregados}`);

    if (planilhasData.planilhas.length < 2) {
      throw new Error('Deveriam existir pelo menos 2 planilhas cadastradas no contrato.');
    }

    // D) Consultar detalhes do contrato via GET /api/contratos/[id]
    console.log('\n[8] Verificando integração no GET /api/contratos/[id]...');
    const getContratoRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/contratos/${testContrato.id}`,
      method: 'GET',
      headers: { Cookie: adminCookie }
    });

    const contratoDetalhe = getContratoRes.json.contrato;
    console.log(`    Planilhas retornadas no contrato: ${contratoDetalhe.planilhasCustos ? contratoDetalhe.planilhasCustos.length : 0}`);
    if (!contratoDetalhe.planilhasCustos || contratoDetalhe.planilhasCustos.length < 2) {
      throw new Error('GET /api/contratos/[id] não retornou o array de planilhasCustos esperado.');
    }

    // 5. Teste de Upload do Arquivo Modelo Oficial (.xlsx)
    console.log('\n[9] Testando importação direta do arquivo Excel oficial via upload...');
    const excelPath = path.join(process.cwd(), 'public', 'docs', 'Planilha_de_custos_e_formacao_de_precos.xlsx');
    const excelBuffer = fs.readFileSync(excelPath);

    // Montar multipart/form-data
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const crlf = '\r\n';

    let bodyBuffer = Buffer.concat([
      Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="contratoId"${crlf}${crlf}${testContrato.id}${crlf}`),
      Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="itemId"${crlf}${crlf}${itemId}${crlf}`),
      Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="quantidadePostos"${crlf}${crlf}5${crlf}`),
      Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="arquivo"; filename="Planilha_de_custos_e_formacao_de_precos.xlsx"${crlf}Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet${crlf}${crlf}`),
      excelBuffer,
      Buffer.from(`${crlf}--${boundary}--${crlf}`)
    ]);

    const uploadRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/contratos/planilhas-custos',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length,
        Cookie: adminCookie
      }
    }, bodyBuffer);

    console.log(`    Status do upload do arquivo Excel: ${uploadRes.statusCode}`);
    if (uploadRes.statusCode !== 201) {
      throw new Error(`Falha no upload do Excel: ${uploadRes.body}`);
    }
    const uploadedPlanilha = uploadRes.json.planilha;
    console.log(`    -> Planilha importada com sucesso do arquivo Excel!`);
    console.log(`       Função extraída: "${uploadedPlanilha.funcao}"`);
    console.log(`       Município: "${uploadedPlanilha.municipio}"`);
    console.log(`       Salário Base extraído: R$ ${uploadedPlanilha.salarioBase}`);
    console.log(`       Módulo 1: R$ ${uploadedPlanilha.totalModulo1}`);
    console.log(`       Módulo 2: R$ ${uploadedPlanilha.totalModulo2}`);
    console.log(`       Módulo 3: R$ ${uploadedPlanilha.totalModulo3}`);
    console.log(`       Módulo 4: R$ ${uploadedPlanilha.totalModulo4}`);
    console.log(`       Módulo 5: R$ ${uploadedPlanilha.totalModulo5}`);
    console.log(`       Módulo 6: R$ ${uploadedPlanilha.totalModulo6}`);
    console.log(`       Preço por Empregado: R$ ${uploadedPlanilha.precoTotalEmpregado}`);
    console.log(`       Fator K extraído: ${uploadedPlanilha.fatorK}`);

    // Limpeza de teste
    console.log('\n[10] Limpando dados de teste...');
    await prisma.contratoPlanilhaCusto.deleteMany({
      where: { id: { in: [p1.id, p2.id, uploadedPlanilha.id] } }
    });
    await prisma.convenioColetivo.deleteMany({
      where: { id: createdCct.id }
    });
    console.log('    -> Registros temporários de teste removidos com sucesso.');

    console.log('\n===============================================================');
    console.log('>>> TODOS OS TESTES PASSARAM COM 100% DE SUCESSO! <<<');
    console.log('===============================================================\n');

  } catch (err) {
    console.error('\n❌ ERRO DURANTE A EXECUÇÃO DOS TESTES:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
