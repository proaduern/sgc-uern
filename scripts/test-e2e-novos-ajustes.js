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

function createMultipartBody(boundary, fields, files) {
  const crlf = '\r\n';
  const parts = [];

  for (const [key, val] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="${key}"${crlf}${crlf}${val}${crlf}`));
  }

  for (const [field, file] of Object.entries(files)) {
    parts.push(Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="${field}"; filename="${file.filename}"${crlf}Content-Type: ${file.contentType}${crlf}${crlf}`));
    parts.push(file.content);
    parts.push(Buffer.from(crlf));
  }

  parts.push(Buffer.from(`--${boundary}--${crlf}`));
  return Buffer.concat(parts);
}

async function runTests() {
  console.log('======================================================================');
  console.log('=== TESTE DE VALIDAÇÃO E2E: 6 NOVOS AJUSTES DO SISTEMA SGC-UERN ===');
  console.log('======================================================================\n');

  try {
    // 1. Autenticar Admin
    console.log('[1] Autenticando Administrador PROAD...');
    const adminCookie = await login('proad@uern.br', '123');
    console.log('    -> Login realizado com sucesso.');

    // 2. Testar Item 1: Contrato sem CPF de Responsável Legal
    console.log('\n[2] Testando Item 1: Criação de Contrato sem exigência de CPF do Responsável Legal...');
    const contratoSemCpfPayload = {
      numeroContrato: 'Contrato nº 99/2026',
      licitacaoProcedimento: 'Pregão Eletrônico nº 05/2026',
      tipoContrato: 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO',
      tipoVigencia: 'CONTINUADO',
      objeto: 'Prestação de serviços de apoio administrativo sem CPF do responsável legal',
      processoSeiMae: '04410024.009999/2026-11',
      fornecedorNovo: {
        razaoSocial: 'EMPRESA SERVICOS INTEGRADOS LTDA',
        cnpj: '11222333000144',
        email: 'contato@integrados.com.br',
        nomeRepresentanteLegal: 'Carlos Eduardo Oliveira', // Apenas nome, sem CPF
        telefoneRepresentanteLegal: '(84) 98888-7777',
      },
      vigenciaInicio: '2026-01-01',
      vigenciaFim: '2027-01-01',
      valorGlobal: 600000.00,
      valorMensal: 50000.00,
      prazoPagamentoDias: 30,
      exigeContaVinculada: true
    };

    const resCriacao = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/contratos',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      }
    }, contratoSemCpfPayload);

    console.log(`    Status criação contrato: ${resCriacao.statusCode}`);
    if (resCriacao.statusCode !== 201) {
      throw new Error(`Falha ao criar contrato sem CPF: ${resCriacao.body}`);
    }
    const contratoCriado = resCriacao.json.contrato;
    console.log(`    -> Contrato criado com sucesso: ID ${contratoCriado.id}`);
    console.log(`    -> Fornecedor: "${contratoCriado.fornecedor?.razaoSocial}"`);
    console.log(`    -> Representante Legal cadastrado: "${contratoCriado.fornecedor?.nomeRepresentanteLegal}"`);
    console.log(`    -> CPF do Representante Legal (não obrigatório / null): "${contratoCriado.fornecedor?.cpfRepresentanteLegal}"`);
    console.log(`    -> Base de cálculo inicial de aditivos: R$ ${contratoCriado.valorBaseCalculoAditivos || contratoCriado.valorGlobal}`);

    // 3. Testar Item 2: Upload de Planilha em Lote de 45 Colunas (MODELO_CADASTRO_DE_CONTRATOS.xlsx)
    console.log('\n[3] Testando Item 2: Importação em Lote via Planilha Modelo Oficial 45 Colunas...');
    const excelPath = path.join(__dirname, '..', 'tests', 'fixtures', 'MODELO_CADASTRO_DE_CONTRATOS.xlsx');
    const excelBuffer = fs.readFileSync(excelPath);

    const boundaryExcel = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const bodyExcel = createMultipartBody(boundaryExcel, {}, {
      file: {
        filename: 'MODELO_CADASTRO_DE_CONTRATOS.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        content: excelBuffer
      }
    });

    const resLote = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/contratos/importar-lote',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundaryExcel}`,
        'Content-Length': bodyExcel.length,
        Cookie: adminCookie
      }
    }, bodyExcel);

    console.log(`    Status importação lote: ${resLote.statusCode}`);
    if (resLote.statusCode !== 200 && resLote.statusCode !== 201) {
      throw new Error(`Falha na importação em lote: ${resLote.body}`);
    }
    console.log(`    -> Resposta: ${JSON.stringify(resLote.json.resumo || resLote.json)}`);

    // Verificar se rascunho foi salvo no banco
    const rascunhos = await prisma.contratoRascunho.findMany({
      orderBy: { createdAt: 'desc' },
      take: 2
    });
    console.log(`    -> Total de rascunhos recentes: ${rascunhos.length}`);
    if (rascunhos.length > 0) {
      const r = rascunhos[0];
      console.log(`       Último rascunho ID: ${r.id}, Origem: ${r.origemImportacao}, Fornecedor: ${r.fornecedorNome}`);
      console.log(`       Status: ${r.statusRascunho}`);
      const dadosExtraidos = r.dadosExtraidos || {};
      if (dadosExtraidos.fiscaisImportados) {
        console.log(`       Fiscais identificados na planilha: ${dadosExtraidos.fiscaisImportados.length}`);
        dadosExtraidos.fiscaisImportados.forEach(f => {
          console.log(`         - ${f.funcao} (${f.campus || 'Geral'}): ${f.nome} (Matrícula: ${f.matricula})`);
        });
      }
    }

    // 4. Testar Item 3: Upload Inteligente de Contratos via PDF (Contrato_EXEMPLO.pdf)
    console.log('\n[4] Testando Item 3: Upload Inteligente de Contrato via PDF (50 itens + metadados)...');
    const pdfContratoPath = path.join(__dirname, '..', 'tests', 'fixtures', 'Contrato_EXEMPLO.pdf');
    const pdfContratoBuffer = fs.readFileSync(pdfContratoPath);

    const boundaryPdfContrato = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const bodyPdfContrato = createMultipartBody(boundaryPdfContrato, {}, {
      file: {
        filename: 'Contrato_EXEMPLO.pdf',
        contentType: 'application/pdf',
        content: pdfContratoBuffer
      }
    });

    const resPdfContrato = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/contratos/upload-pdf',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundaryPdfContrato}`,
        'Content-Length': bodyPdfContrato.length,
        Cookie: adminCookie
      }
    }, bodyPdfContrato);

    console.log(`    Status upload PDF contrato: ${resPdfContrato.statusCode}`);
    if (resPdfContrato.statusCode !== 200 && resPdfContrato.statusCode !== 201) {
      throw new Error(`Falha no upload do contrato PDF: ${resPdfContrato.body}`);
    }

    const pdfContratoJson = resPdfContrato.json;
    console.log(`    -> Contrato identificado: ${pdfContratoJson.numeroContrato}`);
    console.log(`    -> Processo SEI: ${pdfContratoJson.processoSei}`);
    console.log(`    -> Fornecedor: ${pdfContratoJson.fornecedor} (${pdfContratoJson.cnpj})`);
    console.log(`    -> Total de itens/postos extraídos: ${pdfContratoJson.totalItensExtraidos}`);
    console.log(`    -> Campos pendentes identificados:`, pdfContratoJson.camposPendentes);
    console.log(`    -> Rascunho criado com ID: ${pdfContratoJson.rascunhoId}`);

    if (pdfContratoJson.totalItensExtraidos !== 50) {
      throw new Error(`Esperado 50 itens extraídos do Contrato_EXEMPLO.pdf, mas obteve ${pdfContratoJson.totalItensExtraidos}`);
    }

    // 5. Testar Item 4: Upload Inteligente de Designação de Fiscais via PDF (ATO_DESIGNACAO_EXEMPLO.pdf)
    console.log('\n[5] Testando Item 4: Upload Inteligente de Designação de Fiscais via PDF...');
    const pdfDesignacaoPath = path.join(__dirname, '..', 'tests', 'fixtures', 'ATO_DESIGNACAO_EXEMPLO.pdf');
    const pdfDesignacaoBuffer = fs.readFileSync(pdfDesignacaoPath);

    const boundaryPdfDesignacao = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const bodyPdfDesignacao = createMultipartBody(boundaryPdfDesignacao, {
      contratoId: contratoCriado.id
    }, {
      file: {
        filename: 'ATO_DESIGNACAO_EXEMPLO.pdf',
        contentType: 'application/pdf',
        content: pdfDesignacaoBuffer
      }
    });

    const resPdfDesignacao = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/fiscais/upload-designacao',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundaryPdfDesignacao}`,
        'Content-Length': bodyPdfDesignacao.length,
        Cookie: adminCookie
      }
    }, bodyPdfDesignacao);

    console.log(`    Status upload designação: ${resPdfDesignacao.statusCode}`);
    if (resPdfDesignacao.statusCode !== 200 && resPdfDesignacao.statusCode !== 201) {
      throw new Error(`Falha no upload do ato de designação: ${resPdfDesignacao.body}`);
    }

    const pdfDesignacaoJson = resPdfDesignacao.json;
    console.log(`    -> Ato identificado: ${pdfDesignacaoJson.numeroAto}`);
    console.log(`    -> Processo SEI: ${pdfDesignacaoJson.processoSei}`);
    console.log(`    -> Contrato Vinculado: ${pdfDesignacaoJson.contratoVinculado?.numeroContrato || contratoCriado.id}`);
    console.log(`    -> Total de servidores identificados e vinculados: ${pdfDesignacaoJson.totalDesignados}`);
    pdfDesignacaoJson.servidores.forEach(s => {
      console.log(`       * [${s.tipoAtuacao}] ${s.nome} (Matrícula: ${s.matricula}) - ${s.campusSetor}`);
    });

    if (pdfDesignacaoJson.servidores.length !== 10) {
      throw new Error(`Esperado 10 servidores extraídos de ATO_DESIGNACAO_EXEMPLO.pdf, mas obteve ${pdfDesignacaoJson.servidores.length}`);
    }

    // 6. Testar Item 5: Alterações Contratuais, Atualização de Base de 25% e Resíduo Retroativo
    console.log('\n[6] Testando Item 5: Registro de Alteração Contratual com Atualização de Base de 25% e Cálculo Residual...');
    
    // Inserir despesas anteriores atestadas para testar o cálculo do resíduo proporcional
    console.log('    Inserindo 2 despesas atestadas no período retroativo para simulação de resíduo...');
    const despesa1 = await prisma.despesaExecucao.create({
      data: {
        contratoId: contratoCriado.id,
        numeroNotaFiscal: 'NF-1001',
        processoSeiDespesa: '04410024.001111/2026-33',
        referencia: '02/2026',
        cidade: 'Mossoró',
        dataAtesto: new Date('2026-02-15'),
        valorAtestado: 50000.00,
        valorEstimado: 50000.00,
        saldo: 0.0,
        status: 'ATESTADA'
      }
    });

    const despesa2 = await prisma.despesaExecucao.create({
      data: {
        contratoId: contratoCriado.id,
        numeroNotaFiscal: 'NF-1002',
        processoSeiDespesa: '04410024.001111/2026-33',
        referencia: '03/2026',
        cidade: 'Mossoró',
        dataAtesto: new Date('2026-03-15'),
        valorAtestado: 50000.00,
        valorEstimado: 50000.00,
        saldo: 0.0,
        status: 'ATESTADA'
      }
    });

    console.log(`    Despesas criadas: NF-1001 (R$ 50.000) e NF-1002 (R$ 50.000)`);

    // Criar alteração de repactuação com data retroativa a 01/02/2026
    const alteracaoPayload = {
      tipoAlteracao: 'REPACTUACAO_APOSTILAMENTO',
      instrumento: 'APOSTILAMENTO',
      numeroTermo: 'Apostilamento nº 01/2026',
      processoSei: '04410024.008888/2026-22',
      documentoSeiId: '0987654',
      dataAssinatura: '2026-04-01',
      possuiEfeitoRetroativo: true,
      dataRetroatividade: '2026-02-01',
      percentualReajuste: 10.0, // 10% de reajuste
      novoValorGlobalManual: 660000.00,
      justificativa: 'Repactuação decorrente da CCT 2026 com efeitos financeiros retroativos a 01/02/2026 conforme Art. 135 da Lei 14.133/2021.'
    };

    const resAlteracao = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/contratos/${contratoCriado.id}/alteracoes`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      }
    }, alteracaoPayload);

    console.log(`    Status criação alteração: ${resAlteracao.statusCode}`);
    if (resAlteracao.statusCode !== 201) {
      throw new Error(`Falha ao registrar alteração contratual: ${resAlteracao.body}`);
    }

    const alteracaoJson = resAlteracao.json;
    console.log(`    -> Alteração registrada com ID: ${alteracaoJson.alteracao.id}`);
    console.log(`    -> Novo valor global do contrato: R$ ${alteracaoJson.contrato.valorAtualizado}`);
    console.log(`    -> Nova Base de Cálculo dos 25%: R$ ${alteracaoJson.contrato.valorBaseCalculoAditivos}`);
    console.log(`    -> Procedimento registrado no contrato: "${alteracaoJson.contrato.ultimoProcedimentoAtualizacao}"`);
    console.log(`    -> Cálculo do Resíduo Retroativo Proporcional:`);
    console.log(`       Valor Retroativo Calculado: R$ ${alteracaoJson.calculoResidual.valorResidualTotal.toFixed(2)}`);
    console.log(`       Faturas consideradas: ${alteracaoJson.calculoResidual.totalFaturasAtestadas}`);
    console.log(`       Faturas recalculadas:`, alteracaoJson.calculoResidual.faturasRecalculadas);

    // Conferir se a nova base foi de fato atualizada para 660.000
    if (alteracaoJson.contrato.valorBaseCalculoAditivos !== 660000) {
      throw new Error(`A nova base de cálculo para aditivos deveria ser 660.000, mas retornou ${alteracaoJson.contrato.valorBaseCalculoAditivos}`);
    }

    // Conferir se resíduo calculado foi de 10% sobre 100.000 = 10.000
    if (Math.abs(alteracaoJson.calculoResidual.valorResidualTotal - 10000.00) > 0.01) {
      throw new Error(`Valor retroativo esperado era R$ 10.000,00, mas retornou R$ ${alteracaoJson.calculoResidual.valorResidualTotal}`);
    }

    // Conferir se alerta foi gerado no sistema
    const alertas = await prisma.alertaSistema.findMany({
      where: { contratoId: contratoCriado.id }
    });
    console.log(`    -> Alertas de sistema gerados: ${alertas.length}`);
    alertas.forEach(a => console.log(`       * [${a.tipoAlerta}] ${a.mensagem}`));

    // 7. Testar Item 6: Geração de Minutas SEI Padronizadas
    console.log('\n[7] Testando Item 6: Geração de Minutas SEI Padronizadas (Ofício e Solicitações de Providências)...');

    // 7.1 Ofício de Anuência
    const resOficio = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/contratos/${contratoCriado.id}/gerar-documento`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      }
    }, {
      tipoDocumento: 'OFICIO_PRORROGACAO',
      parametros: {
        numeroOficio: '123',
        mesesProrrogacao: 12
      }
    });

    console.log(`    Status geração Ofício de Anuência: ${resOficio.statusCode}`);
    if (resOficio.statusCode !== 200) {
      throw new Error(`Falha ao gerar Ofício: ${resOficio.body}`);
    }
    console.log(`    -> Ofício gerado com sucesso!`);
    console.log(`    -> Conteúdo HTML possui tamanho: ${resOficio.json.html.length} caracteres`);

    // 7.2 Solicitação de Providências - Prorrogação
    const resSolProrrogacao = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/contratos/${contratoCriado.id}/gerar-documento`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      }
    }, {
      tipoDocumento: 'SOLICITACAO_PRORROGACAO',
      parametros: {
        numeroSolicitacao: '456',
        mesesProrrogacao: 12,
        justificativa: 'Demonstrada vantajosidade econômica para prorrogação conforme Art. 107 da Lei 14.133/2021.'
      }
    });

    console.log(`    Status geração Solicitação Prorrogação: ${resSolProrrogacao.statusCode}`);
    if (resSolProrrogacao.statusCode !== 200) {
      throw new Error(`Falha ao gerar Solicitação Prorrogação: ${resSolProrrogacao.body}`);
    }
    console.log(`    -> Solicitação Prorrogação gerada com sucesso!`);

    // 7.3 Solicitação de Providências - Repactuação (Tabela 01 e Tabela 02)
    const resSolRepactuacao = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/contratos/${contratoCriado.id}/gerar-documento`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      }
    }, {
      tipoDocumento: 'SOLICITACAO_REPACTUACAO',
      parametros: {
        numeroSolicitacao: '789',
        cctReferencia: 'CCT SINDILIMP-RN 2026/2026',
        dataHomologacaoCct: '10/02/2026',
        dataRetroatividade: '01/02/2026',
        percentualReajuste: 10.0
      }
    });

    console.log(`    Status geração Solicitação Repactuação: ${resSolRepactuacao.statusCode}`);
    if (resSolRepactuacao.statusCode !== 200) {
      throw new Error(`Falha ao gerar Solicitação Repactuação: ${resSolRepactuacao.body}`);
    }
    const htmlRepactuacao = resSolRepactuacao.json.html;
    console.log(`    -> Solicitação Repactuação gerada com sucesso!`);
    console.log(`    -> Contém Tabela 01 (Comparativa): ${htmlRepactuacao.includes('TABELA 01')}`);
    console.log(`    -> Contém Tabela 02 (Resíduos Pro-Rata): ${htmlRepactuacao.includes('TABELA 02')}`);
    console.log(`    -> Contém Cabeçalho Oficial PROAD/UERN: ${htmlRepactuacao.includes('UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE')}`);

    if (!htmlRepactuacao.includes('TABELA 01') || !htmlRepactuacao.includes('TABELA 02')) {
      throw new Error('Minuta SEI de Repactuação não contém a Tabela 01 ou Tabela 02 esperada.');
    }

    // 8. Limpeza de Testes
    console.log('\n[8] Realizando limpeza dos registros criados no teste...');
    await prisma.alertaSistema.deleteMany({ where: { contratoId: contratoCriado.id } });
    await prisma.contratoAlteracao.deleteMany({ where: { contratoId: contratoCriado.id } });
    await prisma.despesaExecucao.deleteMany({ where: { id: { in: [despesa1.id, despesa2.id] } } });
    await prisma.contratoResponsavel.deleteMany({ where: { contratoId: contratoCriado.id } });
    await prisma.contrato.delete({ where: { id: contratoCriado.id } });
    console.log('    -> Limpeza concluída.');

    console.log('\n======================================================================');
    console.log('>>> TODOS OS 6 NOVOS AJUSTES FORAM VALIDADOS COM 100% DE SUCESSO! <<<');
    console.log('======================================================================\n');

  } catch (err) {
    console.error('\n❌ ERRO NA EXECUÇÃO DO TESTE E2E:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
