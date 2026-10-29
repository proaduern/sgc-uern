const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ctr = await prisma.contrato.findFirst({ where: { numeroContrato: { contains: '035' } } });
  console.log('Contract:', ctr.id, ctr.numeroContrato);

  const movimentacoes = await prisma.contaVinculadaMovimentacao.findMany({
    where: { contratoId: ctr.id },
    include: {
      contrato: {
        select: {
          id: true,
          numeroContrato: true,
          numeroEmpenho: true,
          objeto: true,
          fornecedor: true,
        },
      },
      trabalhador: true,
    },
    orderBy: [{ competenciaMesAno: 'desc' }, { createdAt: 'desc' }],
  });

  console.log('Total movimentacoes:', movimentacoes.length);

  const mapaMensal = {};
  const liberacoes = [];
  const saldosPorTrabalhador = {};

  for (const mov of movimentacoes) {
    const valor = mov.tipoOperacao === 'RETENCAO_ENTRADA' ? mov.valor : -mov.valor;

    if (mov.trabalhadorId) {
      if (!saldosPorTrabalhador[mov.trabalhadorId]) {
        saldosPorTrabalhador[mov.trabalhadorId] = {
          retido: 0,
          liberado: 0,
          saldo: 0,
          total: 0,
          porRubrica: {
            FERIAS_8_33: 0,
            TERCO_FERIAS_2_78: 0,
            DECIMO_TERCEIRO_8_33: 0,
            FGTS_SOBRE_PROVISOES: 0,
            MULTA_RESCISORIA_FGTS: 0,
          },
        };
      }
      if (mov.tipoOperacao === 'RETENCAO_ENTRADA') {
        saldosPorTrabalhador[mov.trabalhadorId].retido += mov.valor;
        if (saldosPorTrabalhador[mov.trabalhadorId].porRubrica[mov.rubrica] !== undefined) {
          saldosPorTrabalhador[mov.trabalhadorId].porRubrica[mov.rubrica] += mov.valor;
        }
      } else {
        saldosPorTrabalhador[mov.trabalhadorId].liberado += mov.valor;
      }
      saldosPorTrabalhador[mov.trabalhadorId].saldo =
        saldosPorTrabalhador[mov.trabalhadorId].retido - saldosPorTrabalhador[mov.trabalhadorId].liberado;
      saldosPorTrabalhador[mov.trabalhadorId].total = saldosPorTrabalhador[mov.trabalhadorId].saldo;
    }

    if (mov.tipoOperacao === 'LIBERACAO_SAIDA') {
      liberacoes.push({
        ...mov,
        nomeTrabalhador: mov.trabalhador?.nome || 'Não identificado',
        cpfTrabalhador: mov.trabalhador?.cpf || '',
      });
    } else if (mov.tipoOperacao === 'RETENCAO_ENTRADA' && mov.trabalhadorId) {
      const chave = `${mov.competenciaMesAno}_${mov.trabalhadorId}`;
      if (!mapaMensal[chave]) {
        mapaMensal[chave] = {
          id: chave,
          competenciaMesAno: mov.competenciaMesAno,
          trabalhadorId: mov.trabalhadorId,
          trabalhador: mov.trabalhador,
          salarioBase: Number(mov.trabalhador?.salarioBase || 0),
          ferias: 0,
          tercoFerias: 0,
          decimoTerceiro: 0,
          fgtsProvisoes: 0,
          multaFgts: 0,
          totalMes: 0,
          processoSei: mov.contrato?.numeroContrato ? ctr.processoSei || '' : '',
          movimentacaoIds: [],
        };
      }
      mapaMensal[chave].movimentacaoIds.push(mov.id);
      if (mov.rubrica === 'FERIAS_8_33') mapaMensal[chave].ferias += mov.valor;
      else if (mov.rubrica === 'TERCO_FERIAS_2_78') mapaMensal[chave].tercoFerias += mov.valor;
      else if (mov.rubrica === 'DECIMO_TERCEIRO_8_33') mapaMensal[chave].decimoTerceiro += mov.valor;
      else if (mov.rubrica === 'FGTS_SOBRE_PROVISOES') mapaMensal[chave].fgtsProvisoes += mov.valor;
      else if (mov.rubrica === 'MULTA_RESCISORIA_FGTS') mapaMensal[chave].multaFgts += mov.valor;
      mapaMensal[chave].totalMes += mov.valor;
    }
  }

  const lancamentosMensais = Object.values(mapaMensal);
  console.log('lancamentosMensais count:', lancamentosMensais.length);
  const competencias = Array.from(new Set(lancamentosMensais.map(l => l.competenciaMesAno)));
  console.log('Competencias:', competencias);
  console.log('Sample lancamento:', lancamentosMensais[0]);
}

main().catch(console.error).finally(() => prisma.$disconnect());
