import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const contratoId = searchParams.get('contratoId');

    const whereContrato = contratoId ? { id: contratoId } : { tipoContrato: 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO' as any };

    // 1. Busca contratos de terceirização
    const contratosTerceirizacao = await prisma.contrato.findMany({
      where: whereContrato,
      select: {
        id: true,
        numeroContrato: true,
        numeroEmpenho: true,
        objeto: true,
        status: true,
        fornecedor: {
          select: {
            id: true,
            razaoSocial: true,
            cnpj: true,
          },
        },
        _count: {
          select: {
            trabalhadores: true,
            convencoesColetivas: true,
            planilhasCustos: true,
            movimentacoesContaVinculada: true,
          },
        },
      },
    });

    // 2. Busca contagem de trabalhadores ativos
    const whereTrab = contratoId ? { contratoId } : {};
    const totalTrabalhadores = await prisma.trabalhadorTerceirizado.count({
      where: whereTrab,
    });
    const totalAtivos = await prisma.trabalhadorTerceirizado.count({
      where: { ...whereTrab, status: 'ATIVO' },
    });

    // 3. Documentos pendentes de homologação
    const documentosPendentes = await prisma.documentoTrabalhador.count({
      where: {
        statusConferencia: 'PENDENTE',
        ...(contratoId ? { trabalhador: { contratoId } } : {}),
      },
    });

    // 4. Saldo em conta vinculada
    const movimentacoes = await prisma.contaVinculadaMovimentacao.findMany({
      where: contratoId ? { contratoId } : {},
      select: { tipoOperacao: true, valor: true },
    });

    let saldoContaVinculada = 0;
    movimentacoes.forEach((m) => {
      if (m.tipoOperacao === 'RETENCAO_ENTRADA') saldoContaVinculada += m.valor;
      else if (m.tipoOperacao === 'LIBERACAO_SAIDA') saldoContaVinculada -= m.valor;
    });

    // 5. Faltas e glosas apuradas
    const frequencias = await prisma.frequenciaTrabalhador.findMany({
      where: contratoId ? { contratoId } : {},
      select: { faltasInjustificadas: true, valorGlosaSugerida: true },
    });

    const totalFaltas = frequencias.reduce((acc, f) => acc + (f.faltasInjustificadas || 0), 0);
    const totalGlosa = frequencias.reduce((acc, f) => acc + (f.valorGlosaSugerida || 0), 0);

    return NextResponse.json({
      contratos: contratosTerceirizacao,
      metricas: {
        totalTrabalhadores,
        totalAtivos,
        documentosPendentes,
        saldoContaVinculada,
        totalFaltas,
        totalGlosa,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao gerar resumo de terceirização' }, { status: 500 });
  }
}
