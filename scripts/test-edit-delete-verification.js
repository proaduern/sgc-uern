const http = require('http');
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
  console.log('=== TESTE DE VALIDAÇÃO: EDIÇÃO E EXCLUSÃO DE USUÁRIOS E FATURAS/EXECUÇÕES ===\n');

  try {
    // 1. Autenticar Admin
    console.log('[1] Autenticando Administrador PROAD...');
    const adminCookie = await login('proad@uern.br', '123');
    const meAdmin = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/me',
      method: 'GET',
      headers: { Cookie: adminCookie }
    });
    const adminUser = meAdmin.json.user;
    console.log(`✓ Admin autenticado: ${adminUser.nome} (ID: ${adminUser.id}, Role: ${adminUser.role})`);

    // 2. Teste de Gestão de Usuários: Criação, Edição, Proteção de Auto-exclusão e Exclusão
    console.log('\n[2] Teste de Gestão de Usuários:');
    await prisma.user.deleteMany({ where: { email: { contains: 'teste.delete' } } });
    
    // Criar usuário temporário para teste
    const testEmail = `teste.delete.${Date.now()}@uern.br`;
    const createRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/usuarios',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      }
    }, {
      nome: 'Servidor Teste Delete',
      email: testEmail,
      matricula: '112233',
      role: 'FISCAL_ADMINISTRATIVO',
      ativo: true
    });
    console.log(`- Criação de usuário: status ${createRes.statusCode}`);
    if (createRes.statusCode !== 201 && createRes.statusCode !== 200) {
      throw new Error(`Falha ao criar usuário: ${createRes.body}`);
    }
    const tempUser = createRes.json.usuario || createRes.json;
    console.log(`✓ Usuário criado: ID ${tempUser.id} - ${tempUser.nome}`);

    // Edição de usuário: alterar nome, matrícula, role para GESTOR_ATA e solicitar reset de senha
    const updateRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/usuarios/${tempUser.id}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      }
    }, {
      nome: 'Servidor Teste Editado',
      email: 'teste.delete@uern.br',
      matricula: '998877',
      role: 'GESTOR_ATA',
      ativo: true,
      resetPassword: true
    });
    console.log(`- Edição do usuário: status ${updateRes.statusCode}`);
    if (updateRes.statusCode !== 200) {
      throw new Error(`Falha ao editar usuário: ${updateRes.body}`);
    }
    const updatedUser = updateRes.json.user || updateRes.json;
    console.log(`✓ Usuário editado: ${updatedUser.nome}, Role: ${updatedUser.role}, Matrícula: ${updatedUser.matricula}, Reset: ${updatedUser.deveTrocarSenha}`);

    // Testar bloqueio de auto-exclusão do admin
    const selfDeleteRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/usuarios/${adminUser.id}`,
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });
    console.log(`- Tentativa de auto-exclusão do admin: status ${selfDeleteRes.statusCode}`);
    if (selfDeleteRes.statusCode === 400) {
      console.log(`✓ Auto-exclusão bloqueada com segurança: "${selfDeleteRes.json.error}"`);
    } else {
      throw new Error(`Esperava status 400 ao tentar auto-exclusão, recebeu: ${selfDeleteRes.statusCode}`);
    }

    // Exclusão bem-sucedida do usuário temporário
    const deleteRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/usuarios/${tempUser.id}`,
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });
    console.log(`- Exclusão do usuário temporário: status ${deleteRes.statusCode}`);
    if (deleteRes.statusCode === 200) {
      console.log(`✓ Usuário excluído com sucesso: "${deleteRes.json.message}"`);
    } else {
      throw new Error(`Falha ao excluir usuário: ${deleteRes.body}`);
    }

    // 3. Teste de Execução & Medições: Saldos de Contratos & Despesas Abertas
    console.log('\n[3] Teste em Saldos de Contratos & Despesas Abertas:');
    const contrato = await prisma.contrato.findFirst();
    if (!contrato) throw new Error('Nenhum contrato encontrado no banco para testes');

    // 3.1 Criar despesa em aberto
    const despesaAberta = await prisma.despesaExecucao.create({
      data: {
        contratoId: contrato.id,
        processoSeiDespesa: '04410022.999999/2026-01',
        cidade: 'Mossoró',
        referencia: 'TESTE/2026',
        valorEstimado: 1250.00,
        status: 'ABERTA',
        valorAtestado: 0
      }
    });
    console.log(`- Criada despesa aberta de teste ID: ${despesaAberta.id}`);

    // Excluir despesa em aberto via DELETE /api/execucao/saldos?id=...
    const delDespesaRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/execucao/saldos?id=${despesaAberta.id}`,
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });
    console.log(`- Exclusão de despesa aberta: status ${delDespesaRes.statusCode}`);
    if (delDespesaRes.statusCode === 200) {
      console.log(`✓ Despesa aberta excluída com sucesso: "${delDespesaRes.json.message}"`);
    } else {
      throw new Error(`Falha ao excluir despesa aberta: ${delDespesaRes.body}`);
    }

    // 3.2 Criar despesa já ATESTADA/PAGA para testar bloqueio
    const despesaAtestada = await prisma.despesaExecucao.create({
      data: {
        contratoId: contrato.id,
        processoSeiDespesa: '04410022.999999/2026-02',
        cidade: 'Natal',
        referencia: 'ATESTADA/2026',
        valorEstimado: 5000.00,
        valorAtestado: 5000.00,
        status: 'PAGO',
        dataAtesto: new Date()
      }
    });
    const blockDelDespesaRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/execucao/saldos?id=${despesaAtestada.id}`,
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });
    console.log(`- Tentativa de excluir despesa atestada/paga: status ${blockDelDespesaRes.statusCode}`);
    if (blockDelDespesaRes.statusCode === 400) {
      console.log(`✓ Bloqueio de segurança funcionou: "${blockDelDespesaRes.json.error}"`);
    } else {
      throw new Error(`Esperava bloqueio 400 para despesa atestada, recebeu ${blockDelDespesaRes.statusCode}`);
    }
    // Limpar despesa atestada de teste
    await prisma.despesaExecucao.delete({ where: { id: despesaAtestada.id } });

    // 4. Teste em Controle de Saldo & Atestes (Medições/Faturas):
    console.log('\n[4] Teste em Controle de Saldo & Atestes (Medições/Faturas):');
    
    // 4.1 Criar medição não atestada
    const medicaoAberta = await prisma.medicaoDespesa.create({
      data: {
        contratoId: contrato.id,
        numeroNotaFiscal: 'NF-TESTE-999',
        referenciaMesAno: '09/2026',
        valorNotaFiscal: 3400.00,
        valorGlosa: 0,
        status: 'EM_CONFERENCIA_ADM',
        processoSeiDespesa: '04410022.999999/2026-99',
        dataRecebimentoDefinitivo: null
      }
    });
    console.log(`- Criada medição não atestada ID: ${medicaoAberta.id}`);

    // Excluir medição não atestada via DELETE /api/execucao/medicoes?id=...
    const delMedicaoRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/execucao/medicoes?id=${medicaoAberta.id}`,
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });
    console.log(`- Exclusão de medição não atestada: status ${delMedicaoRes.statusCode}`);
    if (delMedicaoRes.statusCode === 200) {
      console.log(`✓ Medição excluída com sucesso: "${delMedicaoRes.json.message}"`);
    } else {
      throw new Error(`Falha ao excluir medição não atestada: ${delMedicaoRes.body}`);
    }

    // 4.2 Criar medição já ATESTADA com recebimento definitivo para testar bloqueio
    const medicaoAtestada = await prisma.medicaoDespesa.create({
      data: {
        contratoId: contrato.id,
        numeroNotaFiscal: 'NF-ATESTADA-888',
        referenciaMesAno: '08/2026',
        valorNotaFiscal: 7500.00,
        valorGlosa: 0,
        status: 'ATESTE_DEFINITIVO_GESTOR',
        processoSeiDespesa: '04410022.999999/2026-99',
        dataRecebimentoDefinitivo: new Date()
      }
    });
    const blockDelMedicaoRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/execucao/medicoes?id=${medicaoAtestada.id}`,
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });
    console.log(`- Tentativa de excluir medição já atestada: status ${blockDelMedicaoRes.statusCode}`);
    if (blockDelMedicaoRes.statusCode === 400) {
      console.log(`✓ Bloqueio de segurança funcionou: "${blockDelMedicaoRes.json.error}"`);
    } else {
      throw new Error(`Esperava bloqueio 400 para medição atestada, recebeu ${blockDelMedicaoRes.statusCode}`);
    }
    // Limpar medição atestada de teste
    await prisma.medicaoDespesa.delete({ where: { id: medicaoAtestada.id } });

    // 5. Teste em Ordens de Serviço Emitidas
    console.log('\n[5] Teste em Ordens de Serviços Emitidas:');
    
    // 5.1 Criar OS sem medições atestadas
    const osAberta = await prisma.ordemServico.create({
      data: {
        contratoId: contrato.id,
        numeroOs: '999',
        ano: 2026,
        fiscalAdmId: adminUser.id,
        processoSeiDespesa: '04410022.999999/2026-99',
        descricaoServico: 'Serviço de Teste para Exclusão',
        valorEstimado: 2200.00,
        hashAssinaturaEletronica: 'OS-TESTE-HASH-123',
        status: 'EMITIDA'
      }
    });
    console.log(`- Criada OS de teste ID: ${osAberta.id}`);

    // Excluir OS via DELETE /api/execucao/os?id=...
    const delOsRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/execucao/os?id=${osAberta.id}`,
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });
    console.log(`- Exclusão de OS sem medições atestadas: status ${delOsRes.statusCode}`);
    if (delOsRes.statusCode === 200) {
      console.log(`✓ OS excluída com sucesso: "${delOsRes.json.message}"`);
    } else {
      throw new Error(`Falha ao excluir OS: ${delOsRes.body}`);
    }

    // 5.2 Criar OS vinculada a medição atestada para testar bloqueio
    const osBloqueada = await prisma.ordemServico.create({
      data: {
        contratoId: contrato.id,
        numeroOs: '888',
        ano: 2026,
        fiscalAdmId: adminUser.id,
        processoSeiDespesa: '04410022.999999/2026-99',
        descricaoServico: 'Serviço com Fatura Atestada',
        valorEstimado: 9000.00,
        hashAssinaturaEletronica: 'OS-TESTE-HASH-456',
        status: 'EMITIDA'
      }
    });
    const medicaoVinculadaAtestada = await prisma.medicaoDespesa.create({
      data: {
        contratoId: contrato.id,
        ordemServicoId: osBloqueada.id,
        numeroNotaFiscal: 'NF-VINC-777',
        referenciaMesAno: '07/2026',
        valorNotaFiscal: 9000.00,
        status: 'ATESTE_DEFINITIVO_GESTOR',
        processoSeiDespesa: '04410022.999999/2026-99',
        dataRecebimentoDefinitivo: new Date()
      }
    });

    const blockDelOsRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/execucao/os?id=${osBloqueada.id}`,
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });
    console.log(`- Tentativa de excluir OS com medição atestada: status ${blockDelOsRes.statusCode}`);
    if (blockDelOsRes.statusCode === 400) {
      console.log(`✓ Bloqueio de segurança funcionou: "${blockDelOsRes.json.error}"`);
    } else {
      throw new Error(`Esperava bloqueio 400 para OS com medições atestadas, recebeu ${blockDelOsRes.statusCode}`);
    }

    // Limpar medição e OS de teste
    await prisma.medicaoDespesa.delete({ where: { id: medicaoVinculadaAtestada.id } });
    await prisma.ordemServico.delete({ where: { id: osBloqueada.id } });

    console.log('\n======================================================');
    console.log(' TODOS OS TESTES FORAM CONCLUÍDOS COM 100% DE SUCESSO! ');
    console.log('======================================================');

  } catch (err) {
    console.error('❌ Erro durante a bateria de testes:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
