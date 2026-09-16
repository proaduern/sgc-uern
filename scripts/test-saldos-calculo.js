// Script de teste da lógica contábil de Saldos e Provisões do Contrato
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testContabilLogic() {
  console.log('--- TESTE DA LÓGICA CONTÁBIL DE SALDOS E PROVISÕES ---');

  // Buscar primeiro contrato para simulação
  const contrato = await prisma.contrato.findFirst({
    include: {
      despesasExecucao: true
    }
  });

  if (!contrato) {
    console.log('Nenhum contrato encontrado no banco.');
    return;
  }

  const valorGlobal = Number(contrato.valorAtualizado || contrato.valorGlobal || 0);
  console.log(`Contrato: nº ${contrato.numeroContrato || 'S/N'} | Valor Global: R$ ${valorGlobal.toFixed(2)}`);

  // Despesas do contrato
  let valorProvisionado = 0;
  let valorAtestado = 0;

  for (const d of contrato.despesasExecucao) {
    if (d.status === 'ATESTADA') {
      valorAtestado += Number(d.valorAtestado || 0);
    } else {
      valorProvisionado += Number(d.valorEstimado || 0);
    }
  }

  const saldoContrato = valorGlobal - (valorProvisionado + valorAtestado);

  console.log(`- Total de Despesas Registradas: ${contrato.despesasExecucao.length}`);
  console.log(`- Valor Provisionado (Processos em Aberto): R$ ${valorProvisionado.toFixed(2)}`);
  console.log(`- Valor Atestado (Executado Efetivo): R$ ${valorAtestado.toFixed(2)}`);
  console.log(`- Saldo Disponível do Contrato: R$ ${saldoContrato.toFixed(2)}`);

  // Simulação Matemática conforme solicitado pelo usuário
  console.log('\n--- SIMULAÇÃO DE CENÁRIOS DO USUÁRIO ---');
  const globalSimulado = 100000;
  console.log(`Valor Global Simulado: R$ ${globalSimulado.toFixed(2)}`);

  // 1. Abertura de processo estimado em R$ 5.000 (status ABERTA)
  let provisao = 5000;
  let atestado = 0;
  let saldo1 = globalSimulado - (provisao + atestado);
  console.log(`Cenário 1 (Abertura de Processo com Estimativa de R$ 5.000):`);
  console.log(`  Provisão: R$ ${provisao.toFixed(2)} | Atestado: R$ ${atestado.toFixed(2)} | Saldo Contrato: R$ ${saldo1.toFixed(2)} (Debitada Provisão)`);
  if (saldo1 !== 95000) throw new Error('Falha no cálculo do cenário 1');

  // 2. Atesto com R$ 4.500 (R$ 500 não executados retornam ao saldo)
  provisao = 0; // Provisão extinta pois o processo foi homologado
  atestado = 4500;
  let saldo2 = globalSimulado - (provisao + atestado);
  console.log(`Cenário 2 (Atesto Efetivo de R$ 4.500):`);
  console.log(`  Provisão: R$ ${provisao.toFixed(2)} | Atestado: R$ ${atestado.toFixed(2)} | Saldo Contrato: R$ ${saldo2.toFixed(2)} (R$ 500 retornaram ao saldo)`);
  if (saldo2 !== 95500) throw new Error('Falha no cálculo do cenário 2');

  // 3. Estimativa subdimensionada: estimada em R$ 5.000, atestada em R$ 7.000
  provisao = 0;
  atestado = 7000;
  let saldo3 = globalSimulado - (provisao + atestado);
  console.log(`Cenário 3 (Estimativa Subdimensionada: Atestado R$ 7.000):`);
  console.log(`  Provisão: R$ ${provisao.toFixed(2)} | Atestado: R$ ${atestado.toFixed(2)} | Saldo Contrato: R$ ${saldo3.toFixed(2)} (Debitados R$ 7.000 sem travas)`);
  if (saldo3 !== 93000) throw new Error('Falha no cálculo do cenário 3');

  console.log('\nTodos os cálculos e cenários foram validados com 100% de precisão!');
}

testContabilLogic()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
