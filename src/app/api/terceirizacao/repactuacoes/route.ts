import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function gerarMesesIntervalo(inicio: string, fim: string): string[] {
  // inicio e fim no formato MM/AAAA
  const [mesIni, anoIni] = inicio.split('/').map(Number);
  const [mesFim, anoFim] = fim.split('/').map(Number);

  const meses: string[] = [];
  let a = anoIni;
  let m = mesIni;

  while (a < anoFim || (a === anoFim && m <= mesFim)) {
    meses.push(`${String(m).padStart(2, '0')}/${a}`);
    m++;
    if (m > 12) {
      m = 1;
      a++;
    }
  }

  return meses;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const contratoId = searchParams.get('contratoId');

    if (!contratoId) {
      return NextResponse.json({ error: 'contratoId é obrigatório' }, { status: 400 });
    }

    const repactuacoes = await prisma.repactuacaoCalculo.findMany({
      where: { contratoId },
      include: {
        itens: {
          include: {
            trabalhador: true,
          },
        },
        comprovantes: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(repactuacoes);
  } catch (error: any) {
    console.error('Erro ao listar repactuações:', error);
    return NextResponse.json({ error: 'Erro ao listar repactuações' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getSession();
    const body = await request.json();

    const {
      contratoId,
      processoSei,
      cctReferencia,
      competenciaInicio,
      competenciaFim,
      percentualContaVinculada = 11.11,
      salarioAnterior,
      salarioNovo,
      custoTotalAnterior,
      custoTotalNovo,
      observacoes,
    } = body;

    if (!contratoId || !competenciaInicio || !competenciaFim) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios ausentes (contratoId, competenciaInicio, competenciaFim).' },
        { status: 400 }
      );
    }

    const sAnt = Number(salarioAnterior) || 2000.0;
    const sNov = Number(salarioNovo) || 2200.0;
    const cAnt = Number(custoTotalAnterior) || (sAnt * 1.85);
    const cNov = Number(custoTotalNovo) || (sNov * 1.85);
    const pCv = Number(percentualContaVinculada) || 11.11;

    const meses = gerarMesesIntervalo(competenciaInicio, competenciaFim);

    // Carregar trabalhadores ativos do contrato
    const trabalhadores = await prisma.trabalhadorTerceirizado.findMany({
      where: { contratoId, status: 'ATIVO' },
    });

    if (trabalhadores.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum trabalhador ativo cadastrado no contrato selecionado.' },
        { status: 400 }
      );
    }

    // Carregar frequências gravadas nos meses
    const frequencias = await prisma.frequenciaTrabalhador.findMany({
      where: {
        contratoId,
        competenciaMesAno: { in: meses },
      },
    });

    // Carregar movimentações de Conta Vinculada para verificar o que já foi retido
    const movimentacoesCv = await prisma.contaVinculadaMovimentacao.findMany({
      where: {
        contratoId,
        competenciaMesAno: { in: meses },
        tipoOperacao: 'RETENCAO_ENTRADA',
      },
    });

    let totalNominalTeorico = 0;
    let totalGlosasFaltas = 0;
    let totalJaRetidoCv = 0;
    let totalSuplementarCv = 0;
    let totalBrutoEfetivoDevido = 0;

    const itensParaCriar: any[] = [];

    const deltaCustoNominalMensal = cNov - cAnt;
    const deltaSalarioNominal = sNov - sAnt;

    for (const mes of meses) {
      for (const trab of trabalhadores) {
        // Encontrar frequência apurada
        const freq = frequencias.find(
          (f) => f.trabalhadorId === trab.id && f.competenciaMesAno === mes
        );

        const diasPrevistos = freq?.diasPrevistos || 30;
        const faltasInjust = freq?.faltasInjustificadas || 0;
        const diasTrab = freq?.diasTrabalhados ?? Math.max(0, diasPrevistos - faltasInjust);

        const fatorEfetividade = Math.max(0, Math.min(1, diasTrab / diasPrevistos));

        // Encontrar o que já foi retido na Conta Vinculada para este funcionário nesta competência
        const retencoesDesteMes = movimentacoesCv.filter(
          (m) => m.trabalhadorId === trab.id && m.competenciaMesAno === mes
        );
        const retencaoJaRealizada = retencoesDesteMes.reduce((acc, cur) => acc + cur.valor, 0);

        // Nova provisão de Conta Vinculada com o novo salário proporcional aos dias trabalhados
        const retencaoCvNovaTotal = (sNov * fatorEfetividade) * (pCv / 100);

        // Diferença suplementar devida à Conta Vinculada (nunca menor que zero, evitando dupla retenção)
        const retencaoCvSuplementarDevida = Math.max(0, retencaoCvNovaTotal - retencaoJaRealizada);

        // Custos e Glosas
        const glosaFaltasRetroativo = deltaCustoNominalMensal * (faltasInjust / diasPrevistos);
        const deltaCustoTotalEfetivo = deltaCustoNominalMensal * fatorEfetividade;
        const valorDiferencaSalarioDevida = deltaSalarioNominal * fatorEfetividade;

        totalNominalTeorico += deltaCustoNominalMensal;
        totalGlosasFaltas += glosaFaltasRetroativo;
        totalJaRetidoCv += retencaoJaRealizada;
        totalSuplementarCv += retencaoCvSuplementarDevida;
        totalBrutoEfetivoDevido += deltaCustoTotalEfetivo;

        itensParaCriar.push({
          trabalhadorId: trab.id,
          competenciaMesAno: mes,
          funcao: trab.funcao,
          salarioAnterior: sAnt,
          salarioNovo: sNov,
          diasPrevistos,
          diasTrabalhados: diasTrab,
          faltasInjustificadas: faltasInjust,
          fatorEfetividade: Number(fatorEfetividade.toFixed(4)),
          deltaSalarioNominal,
          deltaCustoTotalPosto: Number(deltaCustoTotalEfetivo.toFixed(2)),
          glosaFaltasRetroativo: Number(glosaFaltasRetroativo.toFixed(2)),
          retencaoCvJaRealizada: Number(retencaoJaRealizada.toFixed(2)),
          retencaoCvNovaTotal: Number(retencaoCvNovaTotal.toFixed(2)),
          retencaoCvSuplementarDevida: Number(retencaoCvSuplementarDevida.toFixed(2)),
          valorDiferencaSalarioDevida: Number(valorDiferencaSalarioDevida.toFixed(2)),
          statusComprovacaoRepasse: 'PENDENTE',
        });
      }
    }

    // Criar a apuração completa no banco de dados
    const novaRepactuacao = await prisma.repactuacaoCalculo.create({
      data: {
        contratoId,
        processoSei: processoSei || '04410038.003805/2026-01',
        cctReferencia: cctReferencia || 'CCT 2026 - MTE',
        competenciaInicio,
        competenciaFim,
        percentualContaVinculada: pCv,
        valorNominalTeorico: Number(totalNominalTeorico.toFixed(2)),
        valorGlosasFaltas: Number(totalGlosasFaltas.toFixed(2)),
        valorJaRetidoContaVinculada: Number(totalJaRetidoCv.toFixed(2)),
        valorSuplementarContaVinculada: Number(totalSuplementarCv.toFixed(2)),
        valorBrutoEfetivoDevido: Number(totalBrutoEfetivoDevido.toFixed(2)),
        valorComprovadoTrabalhadores: 0.0,
        valorBloqueadoPendente: Number(totalBrutoEfetivoDevido.toFixed(2)), // Cautelarmente bloqueado até comprovação
        status: 'AGUARDANDO_COMPROVACAO_TRABALHISTA',
        observacoes: observacoes || null,
        fiscalResponsavelNome: currentUser?.nome || 'Fiscal da PROAD',
        fiscalResponsavelMatricula: currentUser?.matricula || 'UERN-7482',
        itens: {
          create: itensParaCriar,
        },
      },
      include: {
        itens: {
          include: { trabalhador: true },
        },
      },
    });

    return NextResponse.json(novaRepactuacao, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao calcular repactuação:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao processar cálculo de repactuação.' },
      { status: 500 }
    );
  }
}
