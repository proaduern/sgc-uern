import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const comprovantes = await prisma.repactuacaoComprovante.findMany({
      where: { repactuacaoId: params.id },
      orderBy: { enviadoEm: 'desc' },
    });

    return NextResponse.json(comprovantes);
  } catch (error: any) {
    console.error('Erro ao listar comprovantes:', error);
    return NextResponse.json({ error: 'Erro ao listar comprovantes' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getSession();
    const body = await request.json();

    const {
      tipoDocumento,
      nomeArquivo,
      arquivoUrl,
      competenciaRef,
      totalComprovado,
      observacoes,
      itensAprovadosIds = [], // Array de IDs de RepactuacaoMemoriaItem aprovados
      itensRejeitadosIds = [],
    } = body;

    // 1. Criar o comprovante se enviado
    if (tipoDocumento && nomeArquivo) {
      await prisma.repactuacaoComprovante.create({
        data: {
          repactuacaoId: params.id,
          tipoDocumento,
          nomeArquivo,
          arquivoUrl: arquivoUrl || '/comprovantes/folha-complementar-retroativo.pdf',
          competenciaRef: competenciaRef || null,
          totalComprovado: totalComprovado ? Number(totalComprovado) : 0,
          statusConferencia: 'HOMOLOGADO',
          observacoes: observacoes || null,
        },
      });
    }

    // 2. Atualizar status dos itens selecionados
    if (itensAprovadosIds.length > 0) {
      await prisma.repactuacaoMemoriaItem.updateMany({
        where: {
          id: { in: itensAprovadosIds },
          repactuacaoId: params.id,
        },
        data: {
          statusComprovacaoRepasse: 'COMPROVADO',
          dataConferenciaFiscal: new Date(),
          observacaoFiscal: `Atestado de repasse conferido pelo fiscal ${currentUser?.nome || 'PROAD'}`,
        },
      });
    }

    if (itensRejeitadosIds.length > 0) {
      await prisma.repactuacaoMemoriaItem.updateMany({
        where: {
          id: { in: itensRejeitadosIds },
          repactuacaoId: params.id,
        },
        data: {
          statusComprovacaoRepasse: 'REJEITADO',
          dataConferenciaFiscal: new Date(),
          observacaoFiscal: 'Comprovante não apresentado ou divergente',
        },
      });
    }

    // 3. Recalcular os totais de compliance trabalhista da Repactuação
    const todosItens = await prisma.repactuacaoMemoriaItem.findMany({
      where: { repactuacaoId: params.id },
    });

    const itensComprovados = todosItens.filter((i) => i.statusComprovacaoRepasse === 'COMPROVADO');
    const valorComprovado = itensComprovados.reduce((acc, cur) => acc + cur.deltaCustoTotalPosto, 0);

    const repactuacaoAtual = await prisma.repactuacaoCalculo.findUnique({
      where: { id: params.id },
    });

    const valorBrutoTotal = repactuacaoAtual?.valorBrutoEfetivoDevido || 0;
    const valorBloqueado = Math.max(0, valorBrutoTotal - valorComprovado);

    let novoStatus: any = 'AGUARDANDO_COMPROVACAO_TRABALHISTA';
    if (itensComprovados.length === todosItens.length && todosItens.length > 0) {
      novoStatus = 'HOMOLOGADO_FISCAL';
    } else if (itensComprovados.length > 0) {
      novoStatus = 'PARCIALMENTE_COMPROVADO';
    }

    const updatedRepactuacao = await prisma.repactuacaoCalculo.update({
      where: { id: params.id },
      data: {
        valorComprovadoTrabalhadores: Number(valorComprovado.toFixed(2)),
        valorBloqueadoPendente: Number(valorBloqueado.toFixed(2)),
        status: novoStatus,
      },
      include: {
        itens: {
          include: { trabalhador: true },
        },
        comprovantes: true,
      },
    });

    return NextResponse.json(updatedRepactuacao);
  } catch (error: any) {
    console.error('Erro ao processar comprovantes e repasses:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar comprovantes de repasse.' },
      { status: 500 }
    );
  }
}
