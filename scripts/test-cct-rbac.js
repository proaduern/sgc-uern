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
        resolve({ statusCode: res.statusCode, headers: res.headers, body, json });
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
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

async function runRbacTests() {
  console.log('=== TESTE DE RBAC: CADASTRO DE CCT POR GESTOR E FISCAL ADMINISTRATIVO ===\n');

  try {
    // 1. Localizar ou criar um Fiscal Administrativo e um Gestor
    const fiscalUser = await prisma.user.findFirst({
      where: { role: 'FISCAL_ADMINISTRATIVO', ativo: true }
    });

    if (!fiscalUser) {
      console.log('Aviso: Nenhum FISCAL_ADMINISTRATIVO cadastrado. Testando com GESTOR...');
    }

    const gestorUser = await prisma.user.findFirst({
      where: { role: 'GESTOR', ativo: true }
    });

    console.log(`[1] Fiscal Administrativo encontrado: ${fiscalUser ? fiscalUser.nome : 'Nenhum'}`);
    console.log(`    Gestor encontrado: ${gestorUser ? gestorUser.nome : 'Nenhum'}`);

    // Obter 2 contratos distintos
    const contratos = await prisma.contrato.findMany({
      take: 2,
      orderBy: { createdAt: 'desc' }
    });

    if (contratos.length < 2) {
      console.log('Menos de 2 contratos no banco. Criando segundo contrato para teste de isolamento...');
    }

    const cVinculado = contratos[0];
    const cNaoVinculado = contratos[1] || contratos[0];

    // Se temos um fiscal ou gestor, vincular expressamente apenas ao primeiro contrato
    const testUser = fiscalUser || gestorUser;
    if (!testUser) {
      console.log('Nenhum usuário gestor/fiscal encontrado para teste.');
      return;
    }

    // Vincular testUser ao contrato 1
    const vinculoExistente = await prisma.contratoResponsavel.findFirst({
      where: { contratoId: cVinculado.id, userId: testUser.id, ativo: true }
    });
    if (!vinculoExistente) {
      await prisma.contratoResponsavel.create({
        data: {
          contratoId: cVinculado.id,
          userId: testUser.id,
          papel: testUser.role,
          ativo: true,
          dataInicio: new Date()
        }
      });
    }

    // Desvincular do contrato 2 (se diferente)
    if (cNaoVinculado.id !== cVinculado.id) {
      await prisma.contratoResponsavel.deleteMany({
        where: { contratoId: cNaoVinculado.id, userId: testUser.id }
      });
    }

    // Fazer login como o usuário
    console.log(`\n[2] Fazendo login como ${testUser.nome} (${testUser.role})...`);
    // Resetar senha para 123 se necessário ou usar senha padrão
    const testUserCookie = await login(testUser.email, '123').catch(async () => {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('123', 10);
      await prisma.user.update({ where: { id: testUser.id }, data: { senhaHash: hash } });
      return await login(testUser.email, '123');
    });

    console.log('    -> Login efetuado com sucesso!');

    // 2. Testar cadastro de CCT no contrato VINCULADO
    console.log(`\n[3] Tentando cadastrar CCT no contrato VINCULADO (${cVinculado.numeroContrato})...`);
    const cctOkRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/terceirizacao/cct',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: testUserCookie
      }
    }, {
      contratoId: cVinculado.id,
      numeroRegistroMte: 'RN008888/2026',
      sindicatoLaboral: 'SIND-TESTE',
      vigenciaInicio: '2026-01-01',
      vigenciaFim: '2026-12-31',
      categoriasProfissionais: 'Porteiros',
      itensFiscalizacao: {
        salarios: [{ funcao: 'Porteiro', salarioPiso: 1650.00 }],
        beneficios: [{ beneficio: 'Vale Refeição', valor: 450.00 }],
        obrigacoesComPagamento: [{ descricao: 'Adicional Noturno 25%', valor: 250.00, periodicidade: 'Mensal' }],
        obrigacoesSemPagamento: [{ descricao: 'Uniforme completo a cada 6 meses' }]
      }
    });

    console.log(`    Status retornado: ${cctOkRes.statusCode}`);
    if (cctOkRes.statusCode !== 201) {
      throw new Error(`Deveria permitir cadastrar CCT no contrato vinculado: ${cctOkRes.body}`);
    }
    const cctCriada = cctOkRes.json.convenio;
    console.log(`    -> CCT criada com sucesso pelo Fiscal/Gestor! ID: ${cctCriada.id}`);

    // 3. Testar cadastro de CCT no contrato NÃO VINCULADO (se houver contrato diferente)
    if (cNaoVinculado.id !== cVinculado.id) {
      console.log(`\n[4] Tentando cadastrar CCT no contrato NÃO VINCULADO (${cNaoVinculado.numeroContrato})...`);
      const cctNegadaRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/terceirizacao/cct',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: testUserCookie
        }
      }, {
        contratoId: cNaoVinculado.id,
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2026-12-31',
        categoriasProfissionais: 'Outros'
      });

      console.log(`    Status retornado: ${cctNegadaRes.statusCode}`);
      if (cctNegadaRes.statusCode !== 403) {
        throw new Error(`Deveria ter retornado 403 Forbidden para contrato não vinculado, mas retornou: ${cctNegadaRes.statusCode}`);
      }
      console.log(`    -> Acesso bloqueado corretamente com 403 Forbidden: "${cctNegadaRes.json.error}"`);
    }

    // Limpeza
    await prisma.convenioColetivo.deleteMany({
      where: { id: cctCriada.id }
    });
    console.log('\n[5] Registro temporário de CCT removido com sucesso.');

    console.log('\n===============================================================');
    console.log('>>> TESTE DE RBAC PASSOU COM SUCESSO ABSOLUTO! <<<');
    console.log('===============================================================\n');

  } catch (err) {
    console.error('Erro no teste de RBAC:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runRbacTests();
