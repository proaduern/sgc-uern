const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Seed de Frequências Históricas e Repactuação Conciliada ---');

  // 1. Localizar Contrato 18/2023 (Vigilância)
  const contrato = await prisma.contrato.findFirst({
    where: {
      numeroContrato: { contains: '18/2023' },
    },
    include: {
      trabalhadores: true,
    },
  });

  if (!contrato) {
    console.log('Contrato 18/2023 não encontrado.');
    return;
  }

  console.log(`Contrato localizado: ${contrato.numeroContrato} (${contrato.objeto})`);
  const trabalhadores = contrato.trabalhadores;
  console.log(`Total de trabalhadores: ${trabalhadores.length}`);

  if (trabalhadores.length === 0) {
    console.log('Sem trabalhadores para vincular frequências.');
    return;
  }

  // 2. Garantir Frequências de Jan/2026, Fev/2026 e Mar/2026 com o exemplo do usuário:
  // Em Fevereiro, 5 faltas em um dos postos/trabalhadores!
  const meses = ['01/2026', '02/2026', '03/2026'];

  for (let i = 0; i < trabalhadores.length; i++) {
    const trab = trabalhadores[i];

    for (const mes of meses) {
      let faltas = 0;
      // Simula o caso do áudio do usuário: no mês de fevereiro, o trabalhador 0 teve 5 faltas injustificadas
      if (mes === '02/2026' && i === 0) {
        faltas = 5;
      } else if (mes === '02/2026' && i === 1) {
        faltas = 2;
      }

      const diasPrevistos = 30;
      const diasTrab = Math.max(0, diasPrevistos - faltas);
      const salarioDiario = (trab.salarioBaseCct || 2000) / diasPrevistos;
      const valorGlosa = faltas * salarioDiario;

      await prisma.frequenciaTrabalhador.upsert({
        where: {
          trabalhadorId_competenciaMesAno: {
            trabalhadorId: trab.id,
            competenciaMesAno: mes,
          },
        },
        update: {
          diasPrevistos,
          diasTrabalhados: diasTrab,
          faltasInjustificadas: faltas,
          valorGlosaSugerida: valorGlosa,
          statusApuracao: 'CONFERIDO',
        },
        create: {
          trabalhadorId: trab.id,
          contratoId: contrato.id,
          competenciaMesAno: mes,
          diasPrevistos,
          diasTrabalhados: diasTrab,
          faltasInjustificadas: faltas,
          valorGlosaSugerida: valorGlosa,
          statusApuracao: 'CONFERIDO',
          observacoes: faltas > 0 ? `Apuração de ${faltas} falta(s) injustificada(s) na competência.` : 'Assiduidade regular integral.',
        },
      });

      // 3. Simula que em Jan e Fev já havia sido feita uma retenção de Conta Vinculada básica
      await prisma.contaVinculadaMovimentacao.upsert({
        where: { id: `seed-cv-${trab.id}-${mes}` },
        update: {},
        create: {
          id: `seed-cv-${trab.id}-${mes}`,
          contratoId: contrato.id,
          trabalhadorId: trab.id,
          competenciaMesAno: mes,
          rubrica: 'FERIAS_8_33',
          tipoOperacao: 'RETENCAO_ENTRADA',
          valor: (trab.salarioBaseCct || 2000) * 0.0833, // 8.33% férias
          saldoAnterior: 1000.0,
          saldoAtual: 1000.0 + (trab.salarioBaseCct || 2000) * 0.0833,
          numeroOficio: 'Ofício Mensal Retenção Fatura',
        },
      });
    }
  }

  console.log('Frequências e retenções mensais seedadas com sucesso!');

  // 4. Criar a primeira Repactuação calculada e auditável demonstrando a regra do usuário
  // Deletar anteriores de teste deste contrato
  await prisma.repactuacaoCalculo.deleteMany({
    where: { contratoId: contrato.id },
  });

  const salarioAnt = 2000.0;
  const salarioNov = 2200.0;
  const deltaSal = 200.0;
  const deltaCustoPosto = 370.0; // Delta total com encargos/BDI

  const itens = [];
  let totalTeorico = 0;
  let totalGlosas = 0;
  let totalJaRetido = 0;
  let totalSuplementarCv = 0;
  let totalBrutoEfetivo = 0;

  for (const mes of meses) {
    for (let i = 0; i < trabalhadores.length; i++) {
      const trab = trabalhadores[i];
      let faltas = 0;
      if (mes === '02/2026' && i === 0) faltas = 5;
      else if (mes === '02/2026' && i === 1) faltas = 2;

      const diasTrab = 30 - faltas;
      const fator = diasTrab / 30;

      const glosa = deltaCustoPosto * (faltas / 30);
      const efetivo = deltaCustoPosto * fator;
      const difSal = deltaSal * fator;

      const retencaoJa = (salarioAnt * 0.0833);
      const retencaoNova = (salarioNov * fator * 0.1111);
      const suplementoCv = Math.max(0, retencaoNova - retencaoJa);

      totalTeorico += deltaCustoPosto;
      totalGlosas += glosa;
      totalJaRetido += retencaoJa;
      totalSuplementarCv += suplementoCv;
      totalBrutoEfetivo += efetivo;

      itens.push({
        trabalhadorId: trab.id,
        competenciaMesAno: mes,
        funcao: trab.funcao,
        salarioAnterior: salarioAnt,
        salarioNovo: salarioNov,
        diasPrevistos: 30,
        diasTrabalhados: diasTrab,
        faltasInjustificadas: faltas,
        fatorEfetividade: Number(fator.toFixed(4)),
        deltaSalarioNominal: deltaSal,
        deltaCustoTotalPosto: Number(efetivo.toFixed(2)),
        glosaFaltasRetroativo: Number(glosa.toFixed(2)),
        retencaoCvJaRealizada: Number(retencaoJa.toFixed(2)),
        retencaoCvNovaTotal: Number(retencaoNova.toFixed(2)),
        retencaoCvSuplementarDevida: Number(suplementoCv.toFixed(2)),
        valorDiferencaSalarioDevida: Number(difSal.toFixed(2)),
        statusComprovacaoRepasse: i === 0 && mes === '01/2026' ? 'COMPROVADO' : 'PENDENTE',
        documentoComprovanteUrl: i === 0 && mes === '01/2026' ? '/comprovantes/holerite_jan2026.pdf' : null,
      });
    }
  }

  // O trabalhador 0 em Jan/2026 foi comprovado
  const itemComprovado = itens.find(it => it.statusComprovacaoRepasse === 'COMPROVADO');
  const valorComprovado = itemComprovado ? itemComprovado.deltaCustoTotalPosto : 0;
  const valorBloqueado = totalBrutoEfetivo - valorComprovado;

  const repactuacao = await prisma.repactuacaoCalculo.create({
    data: {
      contratoId: contrato.id,
      processoSei: '04410038.003805/2026-01',
      cctReferencia: 'CCT 2026 - Vigilância e Segurança Privada RN (MTE RN000124/2026)',
      competenciaInicio: '01/2026',
      competenciaFim: '03/2026',
      percentualContaVinculada: 11.11,
      valorNominalTeorico: Number(totalTeorico.toFixed(2)),
      valorGlosasFaltas: Number(totalGlosas.toFixed(2)),
      valorJaRetidoContaVinculada: Number(totalJaRetido.toFixed(2)),
      valorSuplementarContaVinculada: Number(totalSuplementarCv.toFixed(2)),
      valorBrutoEfetivoDevido: Number(totalBrutoEfetivo.toFixed(2)),
      valorComprovadoTrabalhadores: Number(valorComprovado.toFixed(2)),
      valorBloqueadoPendente: Number(valorBloqueado.toFixed(2)),
      status: 'PARCIALMENTE_COMPROVADO',
      fiscalResponsavelNome: 'Pedro Rebouças',
      fiscalResponsavelMatricula: 'UERN-7482',
      observacoes: 'Apuração realizada com aplicação estrita do Fator de Efetividade da IN 05/2017 e desconto de faltas no mês de Fevereiro/2026.',
      itens: {
        create: itens,
      },
      comprovantes: {
        create: [
          {
            tipoDocumento: 'HOLERITE_ASSINADO',
            nomeArquivo: 'Holerite_Complementar_01_2026_Pedro_Silva.pdf',
            arquivoUrl: '/comprovantes/holerite_jan2026.pdf',
            competenciaRef: '01/2026',
            totalComprovado: Number(valorComprovado.toFixed(2)),
            statusConferencia: 'HOMOLOGADO',
            observacoes: 'Comprovante bancário nominal e contracheque devidamente assinados pelo funcionário.',
          },
        ],
      },
    },
  });

  console.log(`Repactuação seedada com sucesso! ID: ${repactuacao.id}`);
  console.log(`- Teórico: R$ ${repactuacao.valorNominalTeorico}`);
  console.log(`- Glosas por Faltas (Economia): R$ ${repactuacao.valorGlosasFaltas}`);
  console.log(`- Líquido Efetivo Devido: R$ ${repactuacao.valorBrutoEfetivoDevido}`);
  console.log(`- Comprovado: R$ ${repactuacao.valorComprovadoTrabalhadores}`);
  console.log(`- Bloqueado Cautelarmente: R$ ${repactuacao.valorBloqueadoPendente}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
