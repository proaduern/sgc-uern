const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ctr = await prisma.contrato.findFirst({ where: { numeroContrato: { contains: '035' } } });
  console.log('Contract found:', ctr.id, ctr.numeroContrato);
  
  // Test what GET /api/conta-vinculada returns:
  const movimentacoes = await prisma.contaVinculadaMovimentacao.findMany({
    where: { contratoId: ctr.id },
    include: { trabalhador: true },
    orderBy: { dataReferenciaCompetencia: 'desc' },
  });
  console.log('Movimentacoes count:', movimentacoes.length);

  // Group by worker and competence
  const mapaLancamentos = new Map();
  for (const mov of movimentacoes) {
    if (!mov.trabalhadorId) continue;
    const mes = mov.dataReferenciaCompetencia ? String(mov.dataReferenciaCompetencia.getUTCMonth() + 1).padStart(2, '0') : '00';
    const ano = mov.dataReferenciaCompetencia ? mov.dataReferenciaCompetencia.getUTCFullYear() : '0000';
    const comp = `${mes}/${ano}`;
    const key = `${comp}_${mov.trabalhadorId}`;
    if (!mapaLancamentos.has(key)) {
      mapaLancamentos.set(key, {
        key,
        competenciaMesAno: comp,
        dataReferencia: mov.dataReferenciaCompetencia,
        trabalhadorId: mov.trabalhadorId,
        nomeTrabalhador: mov.trabalhador?.nome || 'Não identificado',
        cpfTrabalhador: mov.trabalhador?.cpf || '',
        funcaoTrabalhador: mov.trabalhador?.funcao || '',
        salarioBase: Number(mov.salarioBaseCalculo || 0),
        ferias: 0,
        tercoFerias: 0,
        decimoTerceiro: 0,
        fgtsProvisoes: 0,
        multaFgts: 0,
        totalGeralRetido: 0,
        processoSei: mov.processoSei || '',
        movimentacaoIds: [],
      });
    }
    const item = mapaLancamentos.get(key);
    item.movimentacaoIds.push(mov.id);
    const val = Number(mov.valorRetencaoCalculado || 0);
    if (mov.tipoRubrica === 'FERIAS_8_33') item.ferias += val;
    else if (mov.tipoRubrica === 'TERCO_FERIAS_2_78') item.tercoFerias += val;
    else if (mov.tipoRubrica === 'DECIMO_TERCEIRO_8_33') item.decimoTerceiro += val;
    else if (mov.tipoRubrica === 'FGTS_SOBRE_PROVISOES') item.fgtsProvisoes += val;
    else if (mov.tipoRubrica === 'MULTA_RESCISORIA_FGTS') item.multaFgts += val;
    item.totalGeralRetido += val;
  }
  const lancamentosMensais = Array.from(mapaLancamentos.values());
  console.log('Lancamentos mensais count:', lancamentosMensais.length);
  const comps = Array.from(new Set(lancamentosMensais.map(l => l.competenciaMesAno)));
  console.log('Competencias:', comps);
  console.log('First 2 lancamentos:', lancamentosMensais.slice(0, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
