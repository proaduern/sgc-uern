const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const XLSX = require('xlsx');
const path = require('path');

const CONTRATO_ID = '6943a96e-047d-4d06-8f3f-12a3c3af1b6d';
const baseScratchDir = 'C:\\Users\\pedro\\.gemini\\antigravity\\brain\\ae4fb885-028f-4fb4-b338-dc5c4fc4fc74\\scratch\\ab_engenharia';

function cleanCpf(cpf) {
  return String(cpf || '').replace(/\D/g, '');
}

async function main() {
  console.log('=== LANÇANDO FATURAMENTOS E REFLEXOS DE SETEMBRO/2026 NO SGC ===');

  // Buscar todos os trabalhadores para mapeamento de CPF
  const workers = await prisma.trabalhadorTerceirizado.findMany({
    where: { contratoId: CONTRATO_ID }
  });
  const workerMap = new Map();
  workers.forEach(w => workerMap.set(cleanCpf(w.cpf), w));

  console.log(`✔ Trabalhadores no banco: ${workers.length}`);

  // 1. Remover lançamentos prévios de Setembro/2026 se existirem (para idempotência)
  await prisma.contaVinculadaMovimentacao.deleteMany({
    where: { contratoId: CONTRATO_ID, competenciaMesAno: '09/2026' }
  });
  await prisma.frequenciaTrabalhador.deleteMany({
    where: { contratoId: CONTRATO_ID, competenciaMesAno: '09/2026' }
  });
  await prisma.medicaoDespesa.deleteMany({
    where: {
      contratoId: CONTRATO_ID,
      referenciaMesAno: { contains: '09/2026' }
    }
  });
  await prisma.despesaExecucao.deleteMany({
    where: {
      contratoId: CONTRATO_ID,
      referencia: { contains: '09/2026' }
    }
  });
  await prisma.imrAvaliacao.deleteMany({
    where: {
      contratoId: CONTRATO_ID,
      mesCompetencia: '09/2026'
    }
  });

  console.log('✔ Limpeza prévia de Setembro/2026 concluída para carga limpa.');

  // 2. Frequências de Setembro/2026
  const frequenciasBatch = [];
  for (const w of workers) {
    if (w.status === 'SUBSTITUIDO' || (w.dataDemissao && w.dataDemissao < new Date('2026-09-01'))) {
      // Trabalhador substituído/demitido antes de setembro não entra na frequência de setembro
      continue;
    }

    let diasPrevistos = 22;
    let diasTrabalhados = 22;
    let faltasInjustificadas = 0;
    let diasSubstituidos = 0;
    let valorGlosaSugerida = 0;
    let obs = 'Frequência regular apurada no mês de setembro/2026 conforme relatório fiscalização.';

    if (cleanCpf(w.cpf) === '05008213482') {
      // José Belmiro da Silva
      diasTrabalhados = 7;
      diasSubstituidos = 15;
      obs = 'Afastado por motivo de doença. 7 dias trabalhados pelo titular e 15 dias cobertos pelo folguista/ferista Lailtson Ferreira de Souza.';
    } else if (cleanCpf(w.cpf) === '00982790414') {
      // Paulo José Pereira de Souza
      diasTrabalhados = 21;
      faltasInjustificadas = 1;
      valorGlosaSugerida = 236.74;
      obs = '21 dias trabalhados (1 falta descontada na fatura de mão de obra de setembro).';
    } else if (cleanCpf(w.cpf) === '70118029414') {
      // Ryan Miqueias Oliveira Mesquita
      diasTrabalhados = 22;
      obs = 'Primeiro mês de atuação no posto de Supervisor substituindo Ícaro Patrick a partir de 01/09/2026. 22 dias trabalhados (100% frequência).';
    }

    frequenciasBatch.push({
      trabalhadorId: w.id,
      contratoId: CONTRATO_ID,
      competenciaMesAno: '09/2026',
      diasPrevistos,
      diasTrabalhados,
      faltasInjustificadas,
      faltasJustificadas: 0,
      diasSubstituidos,
      valorGlosaSugerida,
      statusApuracao: 'CONFERIDO',
      observacoes: obs
    });
  }

  await prisma.frequenciaTrabalhador.createMany({ data: frequenciasBatch });
  console.log(`✔ ${frequenciasBatch.length} Frequências de Setembro/2026 inseridas.`);

  // 3. Conta Vinculada de Setembro/2026
  const fMo = path.join(baseScratchDir, '03. MÃO DE OBRA', '09 - SETEMBRO 2026', 'RELATÓRIO DE FATURAMENTO.xlsx');
  const wbMo = XLSX.readFile(fMo);
  const cvSheet = wbMo.Sheets['RET. CONTA VINCULADA'];
  const cvRows = XLSX.utils.sheet_to_json(cvSheet, { header: 1, defval: '' });

  // Buscar saldo anterior total da Conta Vinculada
  const saldoAggr = await prisma.contaVinculadaMovimentacao.aggregate({
    where: { contratoId: CONTRATO_ID, tipoOperacao: 'RETENCAO_ENTRADA' },
    _sum: { valor: true }
  });
  let runningBalance = saldoAggr._sum.valor || 124136.31;
  console.log(`Saldo acumulado anterior da Conta Vinculada: R$ ${runningBalance.toFixed(2)}`);

  const cvMovimentacoesBatch = [];
  let monthTotalCv = 0;

  for (const row of cvRows) {
    const num = Number(row[0]);
    const nomePlanilha = String(row[1] || '').trim();
    const cpfPlanilha = cleanCpf(row[2]);
    const baseCalc = Number(row[3]);
    if (!Number.isInteger(num) || num < 1 || num > 26 || !nomePlanilha || !baseCalc) continue;

    const feriasTotal = Number(row[4]) || 0; // 12.10%
    const decimoTerceiro = Number(row[5]) || 0; // 8.33%
    const multaFgts = Number(row[6]) || 0; // 5.00%
    const incidenciaSubmodulo = Number(row[7]) || 0; // 7.82%
    const totalWorker = Number(row[8]) || (feriasTotal + decimoTerceiro + multaFgts + incidenciaSubmodulo);

    const worker = workerMap.get(cpfPlanilha);
    if (!worker) {
      throw new Error(`Trabalhador não encontrado para CPF ${cpfPlanilha} (${nomePlanilha}) em Setembro/2026`);
    }

    const feriasPrincipal = feriasTotal * 0.75; // 9.075%
    const tercoFerias = feriasTotal * 0.25;     // 3.025%

    const rubricas = [
      { rubrica: 'FERIAS_8_33', valor: feriasPrincipal },
      { rubrica: 'TERCO_FERIAS_2_78', valor: tercoFerias },
      { rubrica: 'DECIMO_TERCEIRO_8_33', valor: decimoTerceiro },
      { rubrica: 'MULTA_RESCISORIA_FGTS', valor: multaFgts },
      { rubrica: 'FGTS_SOBRE_PROVISOES', valor: incidenciaSubmodulo }
    ];

    for (const r of rubricas) {
      const sAnt = runningBalance;
      const sAtu = runningBalance + r.valor;
      runningBalance = sAtu;
      cvMovimentacoesBatch.push({
        contratoId: CONTRATO_ID,
        trabalhadorId: worker.id,
        competenciaMesAno: '09/2026',
        rubrica: r.rubrica,
        tipoOperacao: 'RETENCAO_ENTRADA',
        valor: r.valor,
        saldoAnterior: sAnt,
        saldoAtual: sAtu,
        numeroOficio: '04410035.002260/2026-43',
        motivoLiberacao: `Base INSS: R$ ${baseCalc.toFixed(2)} | Retenção Oficial Fiscalização UERN (09/2026)`
      });
    }
    monthTotalCv += totalWorker;
  }

  await prisma.contaVinculadaMovimentacao.createMany({ data: cvMovimentacoesBatch });
  console.log(`✔ ${cvMovimentacoesBatch.length} lançamentos analíticos de Conta Vinculada de Setembro inseridos (Total mês: R$ ${monthTotalCv.toFixed(2)} | Novo Acumulado: R$ ${runningBalance.toFixed(2)}).`);

  // 4. Medições de Despesa de Setembro/2026
  const MEDICOES_SETEMBRO = [
    {
      referenciaMesAno: '09/2026 - Mão de Obra Fixa',
      processoSeiDespesa: '04410035.002260/2026-43',
      numeroNotaFiscal: 'NFs Mossoró, Natal, Caicó, Patu, Assú, Pau dos Ferros (Setembro/2026)',
      dataEmissaoNf: new Date('2026-10-10T12:00:00.000Z'),
      valorNotaFiscal: 125044.07,
      valorGlosa: 625.22,
      motivoGlosa: 'Glosa IMR de 0,5% (50 pontos - descumprimento de prazos 10 pts, falta de ferramentas 5 pts, insumos 5 pts, prestação de contas 5 pts, atraso no pagamento de benefícios 25 pts) conforme item 7 do Termo de Referência.',
      valorAtestadoFinal: 124418.85,
      dataRecebimentoProvisorio: new Date('2026-10-20T12:00:00.000Z'),
      dataRecebimentoDefinitivo: new Date('2026-10-28T12:00:00.000Z'),
      status: 'RECEBIMENTO_DEFINITIVO_GESTOR',
      despesasPorCidade: [
        { cidade: 'Mossoró', nf: 'NFs Set/2026', valorBruto: 97362.38, valorAtestado: 96875.57 },
        { cidade: 'Natal', nf: 'NFs Set/2026', valorBruto: 7133.34, valorAtestado: 7097.67 },
        { cidade: 'Caicó', nf: 'NFs Set/2026', valorBruto: 7125.00, valorAtestado: 7089.38 },
        { cidade: 'Patu', nf: 'NFs Set/2026', valorBruto: 3360.41, valorAtestado: 3343.61 },
        { cidade: 'Assú', nf: 'NFs Set/2026', valorBruto: 3354.18, valorAtestado: 3337.41 },
        { cidade: 'Pau dos Ferros', nf: 'NFs Set/2026', valorBruto: 6708.76, valorAtestado: 6675.22 }
      ]
    },
    {
      referenciaMesAno: '09/2026 - Serviços Eventuais',
      processoSeiDespesa: '04410035.002260/2026-43',
      numeroNotaFiscal: 'NFs Serviços Eventuais Setembro/2026',
      dataEmissaoNf: new Date('2026-10-14T12:00:00.000Z'),
      valorNotaFiscal: 55096.92,
      valorGlosa: 0.00,
      motivoGlosa: 'Atesto integral de serviços eventuais nos Campi Mossoró (R$ 41.454,46), Pau dos Ferros (R$ 1.137,27), Caicó (R$ 8.112,19) e Natal (R$ 4.393,00). Nota IMR 5 pontos (tolerância aceitável até 5 pontos, 0% de glosa).',
      valorAtestadoFinal: 55096.92,
      dataRecebimentoProvisorio: new Date('2026-10-22T12:00:00.000Z'),
      dataRecebimentoDefinitivo: new Date('2026-10-29T12:00:00.000Z'),
      status: 'RECEBIMENTO_DEFINITIVO_GESTOR',
      despesasPorCidade: [
        { cidade: 'Mossoró', nf: 'NFs Eventuais Set/2026', valorBruto: 41454.46, valorAtestado: 41454.46 },
        { cidade: 'Pau dos Ferros', nf: 'NFs Eventuais Set/2026', valorBruto: 1137.27, valorAtestado: 1137.27 },
        { cidade: 'Caicó', nf: 'NFs Eventuais Set/2026', valorBruto: 8112.19, valorAtestado: 8112.19 },
        { cidade: 'Natal', nf: 'NFs Eventuais Set/2026', valorBruto: 4393.00, valorAtestado: 4393.00 }
      ]
    },
    {
      referenciaMesAno: '09/2026 - Diárias',
      processoSeiDespesa: '04410035.002260/2026-43',
      numeroNotaFiscal: 'Solicitação de Diárias 04/2026',
      dataEmissaoNf: new Date('2026-09-30T12:00:00.000Z'),
      valorNotaFiscal: 747.60,
      valorGlosa: 0.00,
      motivoGlosa: '5 meias-diárias (R$ 149,52 cada) para deslocamento da equipe (Ryan Miqueias, Tiago, Francisco Antônio, Ivanaldo e Clevanir) à serviço no Campus de Pau dos Ferros.',
      valorAtestadoFinal: 747.60,
      dataRecebimentoProvisorio: new Date('2026-10-05T12:00:00.000Z'),
      dataRecebimentoDefinitivo: new Date('2026-10-15T12:00:00.000Z'),
      status: 'RECEBIMENTO_DEFINITIVO_GESTOR',
      despesasPorCidade: [
        { cidade: 'Pau dos Ferros', nf: 'Solicitação 04/2026', valorBruto: 747.60, valorAtestado: 747.60 }
      ]
    }
  ];

  const medicoesBatch = [];
  const despesasBatch = [];
  let totalSetembro = 0;

  for (const med of MEDICOES_SETEMBRO) {
    medicoesBatch.push({
      contratoId: CONTRATO_ID,
      referenciaMesAno: med.referenciaMesAno,
      processoSeiDespesa: med.processoSeiDespesa,
      numeroNotaFiscal: med.numeroNotaFiscal,
      dataEmissaoNf: med.dataEmissaoNf,
      valorNotaFiscal: med.valorNotaFiscal,
      valorGlosa: med.valorGlosa,
      motivoGlosa: med.motivoGlosa,
      valorAtestadoFinal: med.valorAtestadoFinal,
      dataRecebimentoProvisorio: med.dataRecebimentoProvisorio,
      dataRecebimentoDefinitivo: med.dataRecebimentoDefinitivo,
      status: med.status
    });
    totalSetembro += med.valorAtestadoFinal;

    for (const d of med.despesasPorCidade) {
      despesasBatch.push({
        contratoId: CONTRATO_ID,
        numeroContratoRef: '01/2026',
        processoSeiMaeRef: '04410038.000993/2025-32',
        processoSeiDespesa: med.processoSeiDespesa,
        numeroNotaFiscal: d.nf,
        dataAtesto: med.dataRecebimentoDefinitivo,
        referencia: med.referenciaMesAno,
        cidade: d.cidade,
        valorEstimado: d.valorBruto,
        valorAtestado: d.valorAtestado,
        saldo: 0.0,
        status: 'ATESTADA',
        observacoes: med.motivoGlosa,
        decisaoContabil: 'MANTER',
        anoExercicio: 2026
      });
    }
  }

  await prisma.medicaoDespesa.createMany({ data: medicoesBatch });
  await prisma.despesaExecucao.createMany({ data: despesasBatch });
  console.log(`✔ 3 Medições e ${despesasBatch.length} Despesas por Campus de Setembro/2026 inseridas (Total mês: R$ ${totalSetembro.toFixed(2)}).`);

  // 5. IMR Avaliações de Setembro/2026
  await prisma.imrAvaliacao.create({
    data: {
      contratoId: CONTRATO_ID,
      mesCompetencia: '09/2026',
      localCampus: 'Mossoró / Geral',
      totalPontos: 50,
      percentualGlosa: 0.5,
      valorGlosa: 625.22,
      observacoes: 'Mão de Obra: 50 pontos acumulados no IMR (fator de 99,5% com glosa de R$ 625,22). Atraso no pagamento de benefícios (25 pts), descumprimento de prazos (10 pts), ferramentas (5 pts), insumos (5 pts) e relatórios periódicos (5 pts).',
      fiscalNome: 'Antonio Thyago Teixeira Jales / Erione de Souza Costa',
      fiscalMatricula: '12866-0',
      status: 'CONCLUIDO',
      itens: [
        { item: 'Atraso no pagamento de benefícios previstos em convenção coletiva (25 pts)', pontos: 25 },
        { item: 'Descumprimento de prazo estabelecido para conclusão de serviços (10 pts)', pontos: 10 },
        { item: 'Falta de ferramentas para realização de serviços (5 pts)', pontos: 5 },
        { item: 'Falta de insumos para realização de serviços (5 pts)', pontos: 5 },
        { item: 'Falha no envio de Relatórios Periódicos de Prestação de Contas (5 pts)', pontos: 5 }
      ]
    }
  });

  await prisma.imrAvaliacao.create({
    data: {
      contratoId: CONTRATO_ID,
      mesCompetencia: '09/2026 - Serviços Eventuais',
      localCampus: 'Mossoró / Geral',
      totalPontos: 5,
      percentualGlosa: 0.0,
      valorGlosa: 0.0,
      observacoes: 'Serviços Eventuais: 5 pontos acumulados no IMR (tolerância aceitável até 5 pontos sem glosa financeira). Pontuação por goteiras (2 pts) e calhas (3 pts).',
      fiscalNome: 'Antonio Thyago Teixeira Jales / Erione de Souza Costa',
      fiscalMatricula: '12866-0',
      status: 'CONCLUIDO',
      itens: [
        { item: 'Aparecimento de goteiras em locais recuperados (2 pts)', pontos: 2 },
        { item: 'Vazamento em calhas (3 pts)', pontos: 3 }
      ]
    }
  });

  console.log(`✔ 2 Avaliações de IMR de Setembro/2026 inseridas.`);

  // 6. Recalcular e exibir os novos totais globais no SGC
  const totalMedidoAggr = await prisma.medicaoDespesa.aggregate({
    where: { contratoId: CONTRATO_ID },
    _sum: { valorAtestadoFinal: true }
  });
  const totalExecutadoGeral = totalMedidoAggr._sum.valorAtestadoFinal || 0;
  const saldoDisponivelGeral = 8948360.00 - totalExecutadoGeral;

  console.log('=== RESUMO DOS NOVOS TOTAIS GLOBAIS NO SGC ===');
  console.log(`Valor Global Contrato: R$ 8.948.360,00`);
  console.log(`Total Executado/Faturado (Março a Setembro): R$ ${totalExecutadoGeral.toFixed(2)}`);
  console.log(`Novo Saldo Disponível: R$ ${saldoDisponivelGeral.toFixed(2)}`);
  console.log(`Percentual Consumido: ${((totalExecutadoGeral / 8948360.00) * 100).toFixed(2)}%`);
  console.log(`Saldo Conta Vinculada: R$ ${runningBalance.toFixed(2)}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
