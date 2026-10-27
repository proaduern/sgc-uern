import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isAdminRole, getUserDesignatedContext } from '@/lib/rbac';
import { parsePlanilhaCustosBuffer } from '@/lib/planilha-custos-parser';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const fd = await request.formData();
    const contratoId = fd.get('contratoId') as string;
    const isPreview = fd.get('preview') === 'true';
    const vincularItens = fd.get('vincularItens') !== 'false';
    const file = (fd.get('arquivo') || fd.get('file')) as File | null;

    if (!contratoId || !file) {
      return NextResponse.json({ error: 'Contrato e arquivo são obrigatórios.' }, { status: 400 });
    }

    if (!isAdminRole(session.role)) {
      const { contractIds } = await getUserDesignatedContext(session.id);
      if (!contractIds.includes(contratoId)) {
        return NextResponse.json({ error: 'Acesso negado para este contrato.' }, { status: 403 });
      }
    }

    const contrato = await prisma.contrato.findUnique({
      where: { id: contratoId },
      include: {
        itens: {
          select: {
            id: true,
            numeroItem: true,
            cidade: true,
            descricao: true,
            valorUnitarioAtual: true,
            quantidadeAtual: true,
          },
        },
      },
    });

    if (!contrato) {
      return NextResponse.json({ error: 'Contrato não encontrado.' }, { status: 404 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const resultado = parsePlanilhaCustosBuffer(buffer);

    if (!resultado.itens || resultado.itens.length === 0) {
      return NextResponse.json(
        { error: 'Não foi possível extrair dados válidos da planilha enviada.' },
        { status: 400 }
      );
    }

    // Se for apenas visualização/prévia (preview), retorna os dados sem gravar
    if (isPreview) {
      return NextResponse.json({
        success: true,
        preview: true,
        resultado,
        itensContratoExistentes: contrato.itens.length,
      });
    }

    // Gravação definitiva em lote
    // Exclui planilhas de custos anteriores deste contrato se for substituição completa do anexo
    await prisma.contratoPlanilhaCusto.deleteMany({
      where: { contratoId },
    });

    // Mapeamento e criação das planilhas
    const criadas = await prisma.$transaction(
      resultado.itens.map((p) => {
        // Tenta associar com item de contrato existente (por número ou descrição/cidade)
        let itemId: string | null = null;
        if (vincularItens && contrato.itens.length > 0) {
          const match = contrato.itens.find(
            (it) =>
              it.numeroItem === p.numeroItem ||
              (it.cidade &&
                p.cidade &&
                it.cidade.toLowerCase().includes(p.cidade.toLowerCase()) &&
                it.descricao.toLowerCase().includes(p.funcao.toLowerCase()))
          );
          if (match) itemId = match.id;
        }

        return prisma.contratoPlanilhaCusto.create({
          data: {
            contratoId,
            itemId,
            numeroItem: p.numeroItem,
            funcao: p.funcao,
            cbo: p.cbo,
            municipio: p.cidade,
            jornada: p.jornada,
            cctReferencia: p.cctReferencia || null,
            mesesExecucao: p.mesesExecucao || 12,
            quantidadeEmpregados: p.quantidadeEmpregados || 1,
            quantidadePostos: p.quantidadePostos || 1,
            salarioBase: p.salarioBase,
            totalModulo1: p.totalModulo1,
            totalModulo2: p.totalModulo2,
            totalModulo3: p.totalModulo3,
            totalModulo4: p.totalModulo4,
            totalModulo5: p.totalModulo5,
            totalModulo6: p.totalModulo6,
            custosIndiretosPercent: p.custosIndiretosPercent,
            lucroPercent: p.lucroPercent,
            tributosPercent: p.tributosPercent,
            precoTotalEmpregado: p.precoTotalEmpregado,
            valorMensalTotal: p.valorMensalTotal,
            valorGlobalTotal: p.valorGlobalTotal,
            fatorK: p.fatorK,
            arquivoOriginalNome: file.name,
            dadosDetalhados: p.detalhes,
          },
        });
      })
    );

    return NextResponse.json({
      success: true,
      mensagem: `${criadas.length} planilhas de postos e composição de custos gravadas com sucesso!`,
      totalImportadas: criadas.length,
      totais: {
        totalPostos: resultado.totalPostos,
        totalMensalGeral: resultado.totalMensalGeral,
        totalAnualGeral: resultado.totalAnualGeral,
      },
    });
  } catch (error: any) {
    console.error('Erro na importação em lote da planilha de custos:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao processar planilha de custos.' },
      { status: 500 }
    );
  }
}
