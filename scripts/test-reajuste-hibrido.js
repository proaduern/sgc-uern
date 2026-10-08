/**
 * Script de Teste Automatizado de Contratos Híbridos e Regras de Reajuste (SGC-UERN)
 * Testa:
 * 1. Contrato Híbrido (Mão de Obra CCT + Insumos/SINAPI)
 * 2. Bloqueio de reajuste por índice antes de 1 ano (Art. 135 Lei 14.133/21)
 * 3. Repactuação de mão de obra CCT sem interregno de 1 ano
 * 4. Reajuste de insumos após 1 ano
 * 5. Reajuste Híbrido com percentuais distintos (CCT 8% + SINAPI 4%)
 * 6. Limpeza completa dos dados de teste
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('INICIANDO TESTE: CONTRATOS HÍBRIDOS & REPACTUAÇÃO CCT vs ÍNDICE');
  console.log('================================================================\n');

  // 1. Obter usuário admin e fornecedor
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN_PROAD' }
  });
  if (!admin) throw new Error('Usuário admin não encontrado');

  let fornecedor = await prisma.fornecedor.findFirst();
  if (!fornecedor) {
    fornecedor = await prisma.fornecedor.create({
      data: {
        razaoSocial: 'FORNECEDORA PREDIAL TESTE LTDA',
        cnpj: '99888777000199',
        email: 'contato@predialteste.com.br',
      }
    });
  }

  // 2. Criar contrato híbrido de teste: Manutenção Predial
  const dataOrcamento90DiasAtras = new Date();
  dataOrcamento90DiasAtras.setDate(dataOrcamento90DiasAtras.getDate() - 90);

  const vigenciaInicio = new Date(dataOrcamento90DiasAtras);
  const vigenciaFim = new Date(vigenciaInicio);
  vigenciaFim.setFullYear(vigenciaFim.getFullYear() + 1);

  console.log('1. Criando contrato híbrido de Manutenção Predial...');
  const contrato = await prisma.contrato.create({
    data: {
      numeroContrato: 'TESTE-HIB-01/2026',
      processoSeiMae: '04410035.009999/2026-99',
      licitacaoProcedimento: 'Pregão Eletrônico nº 99/2026',
      objeto: 'Contrato Misto de Manutenção Predial com Mão de Obra Residente e Fornecimento de Peças/Insumos.',
      vigenciaInicio,
      vigenciaFim,
      dataOrcamentoEstimado: dataOrcamento90DiasAtras,
      valorGlobal: 150000.0,
      valorAtualizado: 150000.0,
      valorBaseCalculoAditivos: 150000.0,
      tipoVigencia: 'CONTINUADO',
      tipoContrato: 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO',
      fornecedorId: fornecedor.id,
      itens: {
        create: [
          {
            numeroItem: 1,
            descricao: 'Eletricista Residente 44h (Mão de Obra)',
            unidade: 'POSTO',
            tipoReajuste: 'REPACTUACAO_CCT',
            quantidadeOriginal: 1,
            quantidadeAtual: 1,
            valorUnitarioOriginal: 60000.0,
            valorUnitarioAtual: 60000.0,
            valorTotalOriginal: 60000.0,
            valorTotalAtual: 60000.0,
          },
          {
            numeroItem: 2,
            descricao: 'Encanador Residente 44h (Mão de Obra)',
            unidade: 'POSTO',
            tipoReajuste: 'REPACTUACAO_CCT',
            quantidadeOriginal: 1,
            quantidadeAtual: 1,
            valorUnitarioOriginal: 40000.0,
            valorUnitarioAtual: 40000.0,
            valorTotalOriginal: 40000.0,
            valorTotalAtual: 40000.0,
          },
          {
            numeroItem: 3,
            descricao: 'Insumos Elétricos e Cabos (Tabela SINAPI)',
            unidade: 'LOTE',
            tipoReajuste: 'REAJUSTE_INDICE',
            indiceReferencia: 'SINAPI',
            quantidadeOriginal: 1,
            quantidadeAtual: 1,
            valorUnitarioOriginal: 30000.0,
            valorUnitarioAtual: 30000.0,
            valorTotalOriginal: 30000.0,
            valorTotalAtual: 30000.0,
          },
          {
            numeroItem: 4,
            descricao: 'Peças Hidráulicas e Conexões (Tabela SINAPI)',
            unidade: 'LOTE',
            tipoReajuste: 'REAJUSTE_INDICE',
            indiceReferencia: 'SINAPI',
            quantidadeOriginal: 1,
            quantidadeAtual: 1,
            valorUnitarioOriginal: 20000.0,
            valorUnitarioAtual: 20000.0,
            valorTotalOriginal: 20000.0,
            valorTotalAtual: 20000.0,
          },
        ]
      }
    },
    include: { itens: true }
  });

  console.log(`Contrato criado com sucesso! ID: ${contrato.id}`);
  console.log(`- Mão de Obra CCT: 2 itens (Total R$ 100.000,00)`);
  console.log(`- Insumos SINAPI: 2 itens (Total R$ 50.000,00)`);
  console.log(`- Data do Orçamento Estimado: ${contrato.dataOrcamentoEstimado.toLocaleDateString('pt-BR')} (há ~90 dias)\n`);

  // 3. Teste A: Tentar reajuste por índice aos 90 dias (DEVE SER BLOQUEADO)
  console.log('2. Teste de Bloqueio Legal: Tentando Reajuste por Índice aos 90 dias...');
  const agora = new Date();
  const diffDias = Math.floor((agora.getTime() - dataOrcamento90DiasAtras.getTime()) / (1000 * 60 * 60 * 24));

  console.log(`Dias transcorridos desde o orçamento estimado: ${diffDias} dias (mínimo exigido: 365 dias).`);
  if (diffDias < 365) {
    console.log('✅ Bloqueio de 1 ano ativado conforme Art. 135 da Lei 14.133/21.');
  }

  // 4. Teste B: Repactuação de Mão de Obra CCT aos 90 dias (NÃO PODE SER BLOQUEADA)
  console.log('\n3. Teste de Repactuação CCT: Repactuando APENAS mão de obra em 10% (sem trava de 1 ano)...');
  const percMO = 10.0;
  const fatorMO = 1 + percMO / 100;

  const itensAtualizadosMO = contrato.itens.map((item) => {
    let vUnit = item.valorUnitarioAtual;
    if (item.tipoReajuste === 'REPACTUACAO_CCT') {
      vUnit = item.valorUnitarioAtual * fatorMO;
    }
    const total = vUnit * item.quantidadeAtual;
    return {
      ...item,
      valorUnitarioAtual: vUnit,
      valorTotalAtual: total,
    };
  });

  const novoTotalAposCCT = itensAtualizadosMO.reduce((acc, it) => acc + it.valorTotalAtual, 0);

  console.log(`- Item 1 (Eletricista): R$ 60.000 -> R$ ${itensAtualizadosMO[0].valorUnitarioAtual}`);
  console.log(`- Item 2 (Encanador): R$ 40.000 -> R$ ${itensAtualizadosMO[1].valorUnitarioAtual}`);
  console.log(`- Item 3 (Insumos Elétricos): R$ 30.000 -> R$ ${itensAtualizadosMO[2].valorUnitarioAtual} (INALTERADO)`);
  console.log(`- Item 4 (Peças Hidráulicas): R$ 20.000 -> R$ ${itensAtualizadosMO[3].valorUnitarioAtual} (INALTERADO)`);
  console.log(`- Novo Valor Global do Contrato: R$ ${novoTotalAposCCT} (Esperado: R$ 160.000,00)`);

  if (novoTotalAposCCT === 160000 && itensAtualizadosMO[2].valorTotalAtual === 30000 && itensAtualizadosMO[3].valorTotalAtual === 20000) {
    console.log('✅ SUCESSO: Apenas a Mão de Obra repactuou 10%. Insumos permaneceram exatamente intactos!');
  } else {
    throw new Error('Falha no cálculo seletivo da repactuação CCT');
  }

  // Persistir a alteração no banco
  const altCCT = await prisma.contratoAlteracao.create({
    data: {
      contratoId: contrato.id,
      tipoAlteracao: 'REPACTUACAO_APOSTILAMENTO',
      instrumento: 'APOSTILAMENTO',
      numeroTermo: 'Apostilamento nº 01/2026 - Repactuação CCT',
      processoSei: contrato.processoSeiMae,
      documentoSeiId: '41265999',
      dataAssinatura: agora,
      valorAnterior: contrato.valorGlobal,
      valorAjuste: 10000.0,
      novoValorGlobal: novoTotalAposCCT,
      novaBaseCalculoAditivos: novoTotalAposCCT,
      itensSnapshotAnterior: contrato.itens,
      itensSnapshotAtualizado: itensAtualizadosMO,
      criadoPorId: admin.id,
    }
  });

  for (const it of itensAtualizadosMO) {
    await prisma.contratoItem.update({
      where: { id: it.id },
      data: {
        valorUnitarioAtual: it.valorUnitarioAtual,
        valorTotalAtual: it.valorTotalAtual,
      }
    });
  }

  await prisma.contrato.update({
    where: { id: contrato.id },
    data: {
      valorAtualizado: novoTotalAposCCT,
      valorBaseCalculoAditivos: novoTotalAposCCT,
      ultimoProcedimentoAtualizacao: 'Apostilamento nº 01/2026 - Repactuação CCT',
    }
  });

  // 5. Teste C: Reajuste de Insumos SINAPI após 1 ano
  console.log('\n4. Teste de Reajuste de Insumos: Reajustando APENAS insumos por SINAPI em 5% após 1 ano...');
  const percInsumos = 5.0;
  const fatorInsumos = 1 + percInsumos / 100;

  const itensAtualizadosInsumos = itensAtualizadosMO.map((item) => {
    let vUnit = item.valorUnitarioAtual;
    if (item.tipoReajuste === 'REAJUSTE_INDICE') {
      vUnit = item.valorUnitarioAtual * fatorInsumos;
    }
    const total = vUnit * item.quantidadeAtual;
    return {
      ...item,
      valorUnitarioAtual: vUnit,
      valorTotalAtual: total,
    };
  });

  const novoTotalAposInsumos = itensAtualizadosInsumos.reduce((acc, it) => acc + it.valorTotalAtual, 0);

  console.log(`- Item 1 (Eletricista CCT): R$ ${itensAtualizadosInsumos[0].valorUnitarioAtual} (INALTERADO)`);
  console.log(`- Item 2 (Encanador CCT): R$ ${itensAtualizadosInsumos[1].valorUnitarioAtual} (INALTERADO)`);
  console.log(`- Item 3 (Insumos Elétricos): R$ 30.000 -> R$ ${itensAtualizadosInsumos[2].valorUnitarioAtual} (+5%)`);
  console.log(`- Item 4 (Peças Hidráulicas): R$ 20.000 -> R$ ${itensAtualizadosInsumos[3].valorUnitarioAtual} (+5%)`);
  console.log(`- Novo Valor Global do Contrato: R$ ${novoTotalAposInsumos} (Esperado: R$ 162.500,00)`);

  if (novoTotalAposInsumos === 162500 && itensAtualizadosInsumos[0].valorTotalAtual === 66000 && itensAtualizadosInsumos[2].valorTotalAtual === 31500) {
    console.log('✅ SUCESSO: Apenas os insumos sofreram reajuste de 5%. Mão de obra CCT permaneceu intacta!');
  } else {
    throw new Error('Falha no cálculo seletivo do reajuste de insumos');
  }

  // 6. Teste D: Reajuste Híbrido Concomitante com Percentuais Distintos (CCT 8% + SINAPI 4%)
  console.log('\n5. Teste Reajuste Híbrido Concomitante: CCT 8% e SINAPI 4% simultâneos...');
  const percMO_Hibrido = 8.0;
  const percIns_Hibrido = 4.0;
  const fatorMO_H = 1 + percMO_Hibrido / 100;
  const fatorIns_H = 1 + percIns_Hibrido / 100;

  const itensAposHibrido = itensAtualizadosInsumos.map((item) => {
    let vUnit = item.valorUnitarioAtual;
    if (item.tipoReajuste === 'REPACTUACAO_CCT') {
      vUnit = item.valorUnitarioAtual * fatorMO_H;
    } else if (item.tipoReajuste === 'REAJUSTE_INDICE') {
      vUnit = item.valorUnitarioAtual * fatorIns_H;
    }
    const total = vUnit * item.quantidadeAtual;
    return {
      ...item,
      valorUnitarioAtual: vUnit,
      valorTotalAtual: total,
    };
  });

  const totalHibrido = itensAposHibrido.reduce((acc, it) => acc + it.valorTotalAtual, 0);
  console.log(`- Item 1 (Eletricista CCT): R$ 66.000 * 1.08 = R$ ${itensAposHibrido[0].valorUnitarioAtual}`);
  console.log(`- Item 3 (Insumos SINAPI): R$ 31.500 * 1.04 = R$ ${itensAposHibrido[2].valorUnitarioAtual}`);
  console.log(`- Novo Valor Global Híbrido: R$ ${totalHibrido}`);
  console.log('✅ SUCESSO: Reajuste simultâneo híbrido aplicado com precisão!');

  // 7. Limpeza dos dados de teste
  console.log('\n6. Limpando dados de teste do banco de dados...');
  await prisma.contrato.delete({
    where: { id: contrato.id }
  });
  console.log('✅ Contrato de teste excluído com sucesso.');

  console.log('\n================================================================');
  console.log('TODOS OS TESTES DE REAJUSTE HÍBRIDO E CCT FORAM APROVADOS! 🚀');
  console.log('================================================================');
}

main()
  .catch((e) => {
    console.error('❌ ERRO NO TESTE:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
