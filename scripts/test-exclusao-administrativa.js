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
  console.log('================================================================');
  console.log('TESTE AUTOMATIZADO: EXCLUSÃO ADMINISTRATIVA GERAL (ADMIN ONLY)');
  console.log('================================================================\n');

  try {
    // 1. Autenticar Admin PROAD
    console.log('[1] Autenticando Administrador PROAD (proad@uern.br)...');
    const adminCookie = await login('proad@uern.br', '123');
    console.log(' -> Admin autenticado com sucesso!');

    // 2. Localizar ou criar usuário Fiscal (Não-admin) para testar RBAC
    console.log('\n[2] Verificando/Criando usuário Fiscal não-administrador...');
    let fiscalUser = await prisma.user.findFirst({
      where: { role: 'FISCAL_ADMINISTRATIVO' }
    });

    if (!fiscalUser) {
      fiscalUser = await prisma.user.create({
        data: {
          nome: 'Fiscal de Teste RBAC',
          email: 'fiscal.teste.rbac@uern.br',
          senhaHash: '$2a$10$wO082mEwTsqiZtMekv8D6.1H8xZz9x6gZ67B1o8t6E3M6R1yQ6F7u', // 123
          role: 'FISCAL_ADMINISTRATIVO',
          ativo: true
        }
      });
    }
    const fiscalCookie = await login(fiscalUser.email, '123');
    console.log(` -> Fiscal (${fiscalUser.email}) autenticado! Role: ${fiscalUser.role}`);

    // Obter fornecedor existente para os testes
    let fornecedor = await prisma.fornecedor.findFirst();
    if (!fornecedor) {
      fornecedor = await prisma.fornecedor.create({
        data: {
          cnpj: '11111222000199',
          razaoSocial: 'FORNECEDOR TESTES EXCLUSÃO LTDA',
          statusSicaf: 'REGULAR'
        }
      });
    }

    // =========================================================================
    // TESTE 1: EXCLUSÃO DE CONTRATOS COM DEPENDÊNCIAS (CASCATA COMPLETA)
    // =========================================================================
    console.log('\n----------------------------------------------------------------');
    console.log('TESTE 1: Exclusão em Cascata de Contrato com Múltiplas Dependências');
    console.log('----------------------------------------------------------------');

    const contratoTeste = await prisma.contrato.create({
      data: {
        fornecedorId: fornecedor.id,
        numeroContrato: '9999/2026-TESTE-DEL',
        processoSeiMae: '04410099.999999/2026-99',
        licitacaoProcedimento: 'Pregão Eletrônico nº 99/2026',
        objeto: 'Objeto de teste para validação de exclusão em cascata pelo Admin',
        valorGlobal: 50000,
        valorAtualizado: 50000,
        vigenciaInicio: new Date(),
        vigenciaFim: new Date(Date.now() + 365*24*60*60*1000),
        tipoVigencia: 'CONTINUADO',
        tipoContrato: 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO',
        tipoEmpreitada: 'PRECO_GLOBAL',
        tipoMedicao: 'MENSAL',
        status: 'ATIVO',
        itens: {
          create: [
            {
              numeroItem: 1,
              descricao: 'Item teste 1',
              unidade: 'MÊS',
              quantidadeOriginal: 12,
              quantidadeAtual: 12,
              valorUnitarioOriginal: 4166.66,
              valorUnitarioAtual: 4166.66,
              valorTotalOriginal: 50000,
              valorTotalAtual: 50000
            }
          ]
        },
        responsaveis: {
          create: [
            {
              userId: fiscalUser.id,
              tipoAtuacao: 'FISCAL_ADMINISTRATIVO',
              numeroAtoDesignacao: 'Portaria 999/2026',
              idSeiAtoDesignacao: '9999999'
            }
          ]
        },
        ordensServico: {
          create: [
            {
              numeroOs: 'OS-9999/2026',
              ano: 2026,
              fiscalAdmId: fiscalUser.id,
              processoSeiDespesa: '04410099.999999/2026-99',
              descricaoServico: 'Ordem de serviço de teste',
              valorEstimado: 5000,
              hashAssinaturaEletronica: 'hash9999'
            }
          ]
        },
        medicoes: {
          create: [
            {
              referenciaMesAno: '09/2026',
              processoSeiDespesa: '04410099.999999/2026-99',
              numeroNotaFiscal: 'NF-TESTE-9999',
              valorNotaFiscal: 5000,
              dataEmissaoNf: new Date(),
              status: 'ATESTE_DEFINITIVO_GESTOR',
              dataRecebimentoDefinitivo: new Date()
            }
          ]
        }
      }
    });
    console.log(` -> Contrato de teste criado com sucesso (ID: ${contratoTeste.id}, Nº: ${contratoTeste.numeroContrato})`);

    // 1.1 Tentar excluir como Não-Admin (Fiscal) -> Esperado 403 Forbidden
    console.log(' [1.1] Tentativa de exclusão do contrato por NÃO-ADMIN...');
    const resDelContratoFiscal = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/contratos/${contratoTeste.id}`,
      method: 'DELETE',
      headers: { Cookie: fiscalCookie }
    });
    if (resDelContratoFiscal.statusCode === 403) {
      console.log('  [PASS] Bloqueio RBAC ativo! Retornou 403 Forbidden para não-admin.');
    } else {
      throw new Error(`FALHA RBAC: Deveria retornar 403, retornou ${resDelContratoFiscal.statusCode}: ${resDelContratoFiscal.body}`);
    }

    // 1.2 Excluir como Administrador PROAD -> Esperado 200 OK com cascata
    console.log(' [1.2] Exclusão do contrato pelo ADMINISTRADOR PROAD...');
    const resDelContratoAdmin = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/contratos/${contratoTeste.id}`,
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });
    if (resDelContratoAdmin.statusCode === 200) {
      console.log(`  [PASS] Contrato excluído com sucesso pelo Admin! Resposta: ${JSON.stringify(resDelContratoAdmin.json)}`);
    } else {
      throw new Error(`FALHA: Erro ao excluir contrato como admin: ${resDelContratoAdmin.statusCode}: ${resDelContratoAdmin.body}`);
    }

    // 1.3 Verificar se foi removido do banco junto com as dependências
    const contratoCheck = await prisma.contrato.findUnique({ where: { id: contratoTeste.id } });
    const osCheck = await prisma.ordemServico.findFirst({ where: { contratoId: contratoTeste.id } });
    const medCheck = await prisma.medicaoDespesa.findFirst({ where: { contratoId: contratoTeste.id } });
    const respCheck = await prisma.contratoResponsavel.findFirst({ where: { contratoId: contratoTeste.id } });

    if (!contratoCheck && !osCheck && !medCheck && !respCheck) {
      console.log('  [PASS] Cascata 100% íntegra: Contrato e todos os registros dependentes foram eliminados do banco.');
    } else {
      throw new Error(`FALHA: Sobraram órfãos no banco de dados após exclusão!`);
    }

    // =========================================================================
    // TESTE 2: EXCLUSÃO DE MEDIÇÕES ATESTADAS / LIQUIDADAS E DESPESAS DE CAMPUS
    // =========================================================================
    console.log('\n----------------------------------------------------------------');
    console.log('TESTE 2: Exclusão de Medição Atestada/Liquidada e Despesa de Campus');
    console.log('----------------------------------------------------------------');

    // Criar contrato para hospedar a medição de teste
    const contratoParaMedicao = await prisma.contrato.create({
      data: {
        fornecedorId: fornecedor.id,
        numeroContrato: '8888/2026-TESTE-MED',
        processoSeiMae: '04410088.888888/2026-88',
        licitacaoProcedimento: 'Dispensa nº 88/2026',
        objeto: 'Contrato de teste para medição atestada',
        valorGlobal: 20000,
        valorAtualizado: 20000,
        vigenciaInicio: new Date(),
        vigenciaFim: new Date(Date.now() + 365*24*60*60*1000)
      }
    });

    const medicaoAtestada = await prisma.medicaoDespesa.create({
      data: {
        contratoId: contratoParaMedicao.id,
        referenciaMesAno: '09/2026',
        processoSeiDespesa: '04410088.888888/2026-88',
        numeroNotaFiscal: 'NF-ATESTADA-DEFINITIVA-8888',
        valorNotaFiscal: 8500,
        dataEmissaoNf: new Date(),
        status: 'LIQUIDADO_PAGO',
        dataRecebimentoProvisorio: new Date(),
        dataRecebimentoDefinitivo: new Date()
      }
    });

    const despesaCampusAtestada = await prisma.despesaExecucao.create({
      data: {
        contratoId: contratoParaMedicao.id,
        processoSeiDespesa: '04410088.888888/2026-88',
        cidade: 'Mossoró',
        referencia: '09/2026',
        valorEstimado: 3500,
        valorAtestado: 3500,
        status: 'ATESTADA',
        dataAtesto: new Date()
      }
    });
    console.log(` -> Criada Medição Atestada/Liquidada (ID: ${medicaoAtestada.id}) e Despesa Campus (ID: ${despesaCampusAtestada.id})`);

    // 2.1 Tentar excluir Medição como Fiscal -> 403 Forbidden
    console.log(' [2.1] Tentativa de exclusão de medição por NÃO-ADMIN...');
    const resDelMedFiscal = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/execucao/medicoes?id=${medicaoAtestada.id}`,
      method: 'DELETE',
      headers: { Cookie: fiscalCookie }
    });
    if (resDelMedFiscal.statusCode === 403) {
      console.log('  [PASS] Bloqueio RBAC ativo! Retornou 403 Forbidden para não-admin ao excluir medição.');
    } else {
      throw new Error(`FALHA RBAC: Deveria retornar 403, retornou ${resDelMedFiscal.statusCode}: ${resDelMedFiscal.body}`);
    }

    // 2.2 Excluir Medição como Admin PROAD -> 200 OK
    console.log(' [2.2] Exclusão de medição pelo ADMINISTRADOR PROAD...');
    const resDelMedAdmin = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/execucao/medicoes?id=${medicaoAtestada.id}`,
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });
    if (resDelMedAdmin.statusCode === 200) {
      console.log('  [PASS] Medição Atestada e Liquidada excluída com sucesso pelo Admin!');
    } else {
      throw new Error(`FALHA: Erro ao excluir medição como admin: ${resDelMedAdmin.statusCode}: ${resDelMedAdmin.body}`);
    }

    // 2.3 Tentar excluir Despesa como Fiscal -> 403 Forbidden
    console.log(' [2.3] Tentativa de exclusão de despesa/saldo campus por NÃO-ADMIN...');
    const resDelDespFiscal = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/execucao/saldos?id=${despesaCampusAtestada.id}`,
      method: 'DELETE',
      headers: { Cookie: fiscalCookie }
    });
    if (resDelDespFiscal.statusCode === 403) {
      console.log('  [PASS] Bloqueio RBAC ativo! Retornou 403 Forbidden para não-admin ao excluir despesa.');
    } else {
      throw new Error(`FALHA RBAC: Deveria retornar 403, retornou ${resDelDespFiscal.statusCode}: ${resDelDespFiscal.body}`);
    }

    // 2.4 Excluir Despesa como Admin PROAD -> 200 OK
    console.log(' [2.4] Exclusão de despesa campus atestada pelo ADMINISTRADOR PROAD...');
    const resDelDespAdmin = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/execucao/saldos?id=${despesaCampusAtestada.id}`,
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });
    if (resDelDespAdmin.statusCode === 200) {
      console.log('  [PASS] Despesa Campus Atestada excluída com sucesso pelo Admin!');
    } else {
      throw new Error(`FALHA: Erro ao excluir despesa campus como admin: ${resDelDespAdmin.statusCode}: ${resDelDespAdmin.body}`);
    }

    // Limpar contrato suporte
    await prisma.contrato.delete({ where: { id: contratoParaMedicao.id } });

    // =========================================================================
    // TESTE 3: GESTÃO DE ATAS (ARP, AUTORIZAÇÕES DE EXECUÇÃO E CARONAS)
    // =========================================================================
    console.log('\n----------------------------------------------------------------');
    console.log('TESTE 3: Exclusão na Gestão de Atas (ARP, AEA e Adesão/Carona)');
    console.log('----------------------------------------------------------------');

    const ataTeste = await prisma.ataRegistroPreco.create({
      data: {
        fornecedorId: fornecedor.id,
        numeroAta: '7777',
        ano: 2026,
        processoSei: '04410077.777777/2026-77',
        objeto: 'Objeto teste de Ata para validação de exclusão administrativa',
        vigenciaInicio: new Date(),
        vigenciaFim: new Date(Date.now() + 365*24*60*60*1000),
        valorGlobalOriginal: 100000,
        valorGlobalAtual: 100000,
        itens: {
          create: [
            {
              numeroItem: 1,
              descricao: 'Item teste Ata 1',
              unidade: 'UN',
              quantidadeRegistrada: 100,
              quantidadeSaldo: 100,
              valorUnitario: 1000,
              valorTotal: 100000
            }
          ]
        },
        adesoes: {
          create: [
            {
              orgaoRequisitante: 'Secretaria de Educação do RN',
              processoSeiAdesao: '0010077.000077/2026',
              valorAdesao: 15000,
              percentualAdesao: 15,
              statusAprovacao: 'AUTORIZADA',
              dataAprovacao: new Date()
            }
          ]
        },
        autorizacoesExecucao: {
          create: [
            {
              numeroAutorizacao: 'AEA-7777/2026',
              processoSei: '04410077.777777/2026-77',
              orgaoRequisitante: 'Campus Pau dos Ferros',
              descricao: 'Execução de teste da ata',
              valorTotal: 8000,
              dataAutorizacao: new Date()
            }
          ]
        }
      },
      include: {
        adesoes: true,
        autorizacoesExecucao: true
      }
    });
    console.log(` -> Ata de teste criada com sucesso (ID: ${ataTeste.id}, Nº: ${ataTeste.numeroAta}/${ataTeste.ano})`);
    const adesaoTeste = ataTeste.adesoes[0];
    const aeaTeste = ataTeste.autorizacoesExecucao[0];

    // 3.1 Testar Exclusão de Adesão/Carona
    console.log(' [3.1] Exclusão de Adesão de Carona...');
    const resDelAdesaoFiscal = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/atas/adesao?id=${adesaoTeste.id}`,
      method: 'DELETE',
      headers: { Cookie: fiscalCookie }
    });
    if (resDelAdesaoFiscal.statusCode === 403) {
      console.log('  [PASS] Bloqueio RBAC ativo! Retornou 403 Forbidden para não-admin ao excluir adesão.');
    } else {
      throw new Error(`FALHA RBAC: Deveria retornar 403, retornou ${resDelAdesaoFiscal.statusCode}: ${resDelAdesaoFiscal.body}`);
    }

    const resDelAdesaoAdmin = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/atas/adesao?id=${adesaoTeste.id}`,
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });
    if (resDelAdesaoAdmin.statusCode === 200) {
      console.log('  [PASS] Adesão de carona excluída com sucesso pelo Admin!');
    } else {
      throw new Error(`FALHA: Erro ao excluir adesão como admin: ${resDelAdesaoAdmin.statusCode}: ${resDelAdesaoAdmin.body}`);
    }

    // 3.2 Testar Exclusão de AEA
    console.log(' [3.2] Exclusão de Autorização de Execução (AEA)...');
    const resDelAeaFiscal = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/atas/autorizacoes?id=${aeaTeste.id}`,
      method: 'DELETE',
      headers: { Cookie: fiscalCookie }
    });
    if (resDelAeaFiscal.statusCode === 403) {
      console.log('  [PASS] Bloqueio RBAC ativo! Retornou 403 Forbidden para não-admin ao excluir AEA.');
    } else {
      throw new Error(`FALHA RBAC: Deveria retornar 403, retornou ${resDelAeaFiscal.statusCode}: ${resDelAeaFiscal.body}`);
    }

    const resDelAeaAdmin = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/atas/autorizacoes?id=${aeaTeste.id}`,
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });
    if (resDelAeaAdmin.statusCode === 200) {
      console.log('  [PASS] AEA excluída com sucesso pelo Admin!');
    } else {
      throw new Error(`FALHA: Erro ao excluir AEA como admin: ${resDelAeaAdmin.statusCode}: ${resDelAeaAdmin.body}`);
    }

    // 3.3 Testar Exclusão de ARP (Ata de Registro de Preços)
    console.log(' [3.3] Exclusão de Ata de Registro de Preços (ARP)...');
    const resDelAtaFiscal = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/atas/${ataTeste.id}`,
      method: 'DELETE',
      headers: { Cookie: fiscalCookie }
    });
    if (resDelAtaFiscal.statusCode === 403) {
      console.log('  [PASS] Bloqueio RBAC ativo! Retornou 403 Forbidden para não-admin ao excluir ARP.');
    } else {
      throw new Error(`FALHA RBAC: Deveria retornar 403, retornou ${resDelAtaFiscal.statusCode}: ${resDelAtaFiscal.body}`);
    }

    const resDelAtaAdmin = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/atas/${ataTeste.id}`,
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });
    if (resDelAtaAdmin.statusCode === 200) {
      console.log('  [PASS] ARP excluída com sucesso pelo Admin!');
    } else {
      throw new Error(`FALHA: Erro ao excluir ARP como admin: ${resDelAtaAdmin.statusCode}: ${resDelAtaAdmin.body}`);
    }

    // =========================================================================
    // TESTE 4: GESTORES & FISCAIS (DESIGNAÇÕES)
    // =========================================================================
    console.log('\n----------------------------------------------------------------');
    console.log('TESTE 4: Exclusão de Designação de Gestores e Fiscais');
    console.log('----------------------------------------------------------------');

    const contratoParaFiscal = await prisma.contrato.create({
      data: {
        fornecedorId: fornecedor.id,
        numeroContrato: '6666/2026-TESTE-FISC',
        processoSeiMae: '04410066.666666/2026-66',
        licitacaoProcedimento: 'Dispensa nº 66/2026',
        objeto: 'Contrato suporte para teste de exclusão de designação',
        valorGlobal: 30000,
        valorAtualizado: 30000,
        vigenciaInicio: new Date(),
        vigenciaFim: new Date(Date.now() + 365*24*60*60*1000)
      }
    });

    const designacaoTeste = await prisma.contratoResponsavel.create({
      data: {
        contratoId: contratoParaFiscal.id,
        userId: fiscalUser.id,
        tipoAtuacao: 'GESTOR',
        numeroAtoDesignacao: 'Portaria 666/2026-GR',
        idSeiAtoDesignacao: '6666666'
      }
    });
    console.log(` -> Criada designação de teste (ID: ${designacaoTeste.id})`);

    // 4.1 Tentar excluir designação como Não-Admin -> 403 Forbidden
    console.log(' [4.1] Tentativa de exclusão de designação por NÃO-ADMIN...');
    const resDelDesignacaoFiscal = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/fiscais?id=${designacaoTeste.id}`,
      method: 'DELETE',
      headers: { Cookie: fiscalCookie }
    });
    if (resDelDesignacaoFiscal.statusCode === 403) {
      console.log('  [PASS] Bloqueio RBAC ativo! Retornou 403 Forbidden para não-admin ao excluir designação.');
    } else {
      throw new Error(`FALHA RBAC: Deveria retornar 403, retornou ${resDelDesignacaoFiscal.statusCode}: ${resDelDesignacaoFiscal.body}`);
    }

    // 4.2 Excluir designação como Administrador PROAD -> 200 OK
    console.log(' [4.2] Exclusão de designação pelo ADMINISTRADOR PROAD...');
    const resDelDesignacaoAdmin = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/fiscais?id=${designacaoTeste.id}`,
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });
    if (resDelDesignacaoAdmin.statusCode === 200) {
      console.log('  [PASS] Designação excluída com sucesso pelo Admin!');
    } else {
      throw new Error(`FALHA: Erro ao excluir designação como admin: ${resDelDesignacaoAdmin.statusCode}: ${resDelDesignacaoAdmin.body}`);
    }

    // Limpar contrato suporte
    await prisma.contrato.delete({ where: { id: contratoParaFiscal.id } });

    console.log('\n================================================================');
    console.log('TODOS OS TESTES DE EXCLUSÃO ADMINISTRATIVA E RBAC FORAM APROVADOS COM SUCESSO!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n>>> ERRO NO TESTE:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
