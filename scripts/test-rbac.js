const http = require('http');

async function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          json
        });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
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
    throw new Error(`Login failed for ${email}: ${res.statusCode} ${res.body}`);
  }

  const cookies = res.headers['set-cookie'];
  const sessionCookie = cookies ? cookies[0].split(';')[0] : '';
  return sessionCookie;
}

async function runTests() {
  console.log('--- INICIANDO BATERIA DE TESTES DE RBAC & ESCOPO (IN 01/2026-PROAD) ---');

  // Test 1: Login Mario Sergio (Fiscal Administrativo)
  console.log('\n[1] Autenticando Mario Sergio (mariosergio@uern.br)...');
  const marioCookie = await login('mariosergio@uern.br', '123');
  console.log('✓ Login realizado com sucesso.');

  // Test 2: /api/auth/me para Mario Sergio
  console.log('\n[2] Verificando perfil e permissões calculadas em /api/auth/me...');
  const meMario = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { Cookie: marioCookie }
  });
  console.log('Dados do usuário:', JSON.stringify(meMario.json, null, 2));

  if (meMario.json.user.isAdmin !== false) throw new Error('Falha: Mario Sergio não deve ser admin');
  if (meMario.json.user.isFiscalAdm !== true) throw new Error('Falha: Mario Sergio deve ser isFiscalAdm');
  if (meMario.json.user.canDefinitiveAttest !== false) throw new Error('Falha: Fiscal Adm não pode emitir ateste definitivo');
  if (meMario.json.user.canProvisionalAttest !== true) throw new Error('Falha: Fiscal Adm deve poder emitir ateste provisório');
  if (meMario.json.user.canIssueOrder !== true) throw new Error('Falha: Fiscal Adm deve poder emitir OS/OC');
  console.log('✓ Permissões calculadas conferem 100% com a matriz RBAC.');

  // Test 3: Listagem de Contratos para Mario Sergio (deve retornar APENAS seus contratos designados)
  console.log('\n[3] Verificando escopo em /api/contratos para Mario Sergio...');
  const contratosMario = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/contratos',
    method: 'GET',
    headers: { Cookie: marioCookie }
  });
  const listC = contratosMario.json.contratos || [];
  console.log(`Total de contratos retornados para Mario: ${listC.length}`);
  listC.forEach(c => console.log(`  - Contrato: ${c.numeroContrato || c.numeroEmpenho} | Objeto: ${c.objeto.slice(0, 40)}...`));
  const contratosOutros = listC.filter(c => !c.numeroContrato?.includes('11/2026'));
  if (contratosOutros.length > 0) {
    throw new Error(`Falha: Mario Sergio viu contratos além do 11/2026: ${contratosOutros.map(c => c.numeroContrato).join(', ')}`);
  }
  console.log('✓ Escopo de contratos estritamente restrito ao Contrato 11/2026.');

  // Test 4: Bloqueio a Atas ARP para Mario Sergio
  console.log('\n[4] Tentativa de acesso a /api/atas por Mario Sergio (deve ser 403)...');
  const atasMario = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/atas',
    method: 'GET',
    headers: { Cookie: marioCookie }
  });
  console.log(`Status /api/atas: ${atasMario.statusCode} (esperado 403)`);
  if (atasMario.statusCode !== 403) throw new Error('Falha: /api/atas não bloqueou fiscal administrativo');
  console.log('✓ Atas ARP bloqueadas com sucesso para usuário não-admin.');

  // Test 5: Bloqueio a Gestão de Usuários para Mario Sergio
  console.log('\n[5] Tentativa de acesso a /api/usuarios por Mario Sergio (deve ser 403)...');
  const usuariosMario = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/usuarios',
    method: 'GET',
    headers: { Cookie: marioCookie }
  });
  console.log(`Status /api/usuarios: ${usuariosMario.statusCode} (esperado 403)`);
  if (usuariosMario.statusCode !== 403) throw new Error('Falha: /api/usuarios não bloqueou fiscal administrativo');
  console.log('✓ Módulo de Usuários bloqueado com sucesso.');

  // Test 6: Ateste Definitivo por Fiscal Administrativo (deve ser rejeitado com 403)
  console.log('\n[6] Tentativa de emitir Ateste Definitivo por Fiscal Administrativo...');
  const resMedicoesMario = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/execucao/medicoes',
    method: 'GET',
    headers: { Cookie: marioCookie }
  });
  let testMedicaoId = resMedicoesMario.json?.medicoes?.[0]?.id;
  if (!testMedicaoId) {
    // Criar medição para teste
    const novaMed = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/execucao/medicoes',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: marioCookie }
    }, {
      contratoId: listC[0].id,
      referenciaMesAno: '03/2026',
      processoSeiDespesa: '04410022.000101/2026-11',
      valorNotaFiscal: '5000'
    });
    testMedicaoId = novaMed.json?.medicao?.id;
  }

  const atesteDefinitivoTentativa = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/execucao/medicoes',
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: marioCookie
    }
  }, {
    medicaoId: testMedicaoId,
    acao: 'ATESTE_DEFINITIVO'
  });
  console.log(`Status PATCH ateste definitivo: ${atesteDefinitivoTentativa.statusCode} - Mensagem: ${atesteDefinitivoTentativa.json?.error}`);
  if (atesteDefinitivoTentativa.statusCode !== 403) {
    throw new Error('Falha: Ateste Definitivo não foi bloqueado para Fiscal Administrativo');
  }
  console.log('✓ Ateste Definitivo bloqueado com sucesso (privativo de Gestor/Admin).');

  // Test 7: Acesso do Administrador PROAD
  console.log('\n[7] Autenticando Administrador PROAD (proad@uern.br)...');
  const proadCookie = await login('proad@uern.br', '123');
  console.log('✓ Login de PROAD realizado.');

  console.log('\n[8] Verificando escopo global em /api/contratos para PROAD...');
  // Criar um contrato adicional como PROAD para validar que PROAD vê todos e Mario só vê o dele
  const resCriarContrato = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/contratos',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: proadCookie }
  }, {
    numeroContrato: '99/2026',
    processoSeiMae: '04410099.009999/2026-99',
    licitacaoProcedimento: 'Pregão Eletrônico nº 05/2026',
    fornecedorNovo: {
      razaoSocial: 'Empresa Teste Global Ltda',
      cnpj: '12.345.678/0001-90',
      email: 'contato@testedaglobal.com.br',
    },
    vigenciaInicio: '2026-01-01',
    vigenciaFim: '2026-12-31',
    valorGlobal: 120000,
    tipoContrato: 'SERVICO_SEM_DEDICACAO',
    tipoEmpreitada: 'PRECO_GLOBAL',
    objeto: 'Contrato exclusivo da PROAD para teste de RBAC',
    itens: [
      {
        numeroItem: 1,
        descricao: 'Item de teste',
        unidade: 'UN',
        quantidade: 10,
        valorUnitario: 12000
      }
    ]
  });
  console.log('Status criar contrato:', resCriarContrato.statusCode, resCriarContrato.body);

  const contratosProad = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/contratos',
    method: 'GET',
    headers: { Cookie: proadCookie }
  });
  const listCProad = contratosProad.json.contratos || [];
  console.log(`Total de contratos retornados para PROAD (global): ${listCProad.length}`);

  // Agora verificar novamente Mario Sergio: ele AINDA deve ver APENAS 1 contrato (11/2026)!
  const contratosMarioRecheck = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/contratos',
    method: 'GET',
    headers: { Cookie: marioCookie }
  });
  const listCMarioRecheck = contratosMarioRecheck.json.contratos || [];
  console.log(`Total de contratos retornados para Mario (deve continuar sendo 1): ${listCMarioRecheck.length}`);

  if (listCProad.length <= listCMarioRecheck.length) {
    throw new Error('Falha: PROAD deveria ver mais contratos que o Fiscal específico.');
  }
  if (listCMarioRecheck.some(c => c.numeroContrato === '99/2026')) {
    throw new Error('Falha de vazamento de dados: Mario Sergio viu o Contrato 99/2026 do qual não é fiscal!');
  }
  console.log('✓ Isolamento perfeito: Mario Sergio NÃO tem acesso ao Contrato 99/2026.');
  console.log('✓ PROAD possui visão global de todos os contratos.');

  console.log('\n[9] Acesso a /api/atas e /api/usuarios por PROAD...');
  const atasProad = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/atas',
    method: 'GET',
    headers: { Cookie: proadCookie }
  });
  console.log(`Status /api/atas para PROAD: ${atasProad.statusCode} (esperado 200)`);
  if (atasProad.statusCode !== 200) throw new Error('Falha: PROAD não conseguiu acessar /api/atas');

  const usuariosProad = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/usuarios',
    method: 'GET',
    headers: { Cookie: proadCookie }
  });
  console.log(`Status /api/usuarios para PROAD: ${usuariosProad.statusCode} (esperado 200)`);
  if (usuariosProad.statusCode !== 200) throw new Error('Falha: PROAD não conseguiu acessar /api/usuarios');
  console.log('✓ PROAD possui acesso irrestrito aos módulos administrativos.');

  console.log('\n======================================================');
  console.log('TODOS OS TESTES DE RBAC E ESCOPO PASSARAM COM SUCESSO!');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('\n❌ ERRO NO TESTE:', err);
  process.exit(1);
});
