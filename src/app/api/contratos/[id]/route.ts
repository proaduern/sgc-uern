import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isAdminRole } from '@/lib/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;

    const contrato = await prisma.contrato.findUnique({
      where: { id },
      include: {
        fornecedor: true,
        indicesReajuste: true,
        itens: {
          orderBy: { numeroItem: 'asc' },
        },
        responsaveis: {
          include: {
            user: {
              select: { id: true, nome: true, email: true, matricula: true, role: true },
            },
          },
        },
        planilhasCustos: {
          include: {
            item: true,
          },
          orderBy: { numeroItem: 'asc' },
        },
        _count: {
          select: {
            itens: true,
            trabalhadores: true,
            ordensServico: true,
            medicoes: true,
            penalidades: true,
            planilhasCustos: true,
          },
        },
      },
    });

    if (!contrato) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }

    // Se for fiscal restrito, verificar se possui atribuição neste contrato
    const isRestrictedFiscal =
      session.role !== 'ADMIN_PROAD' &&
      session.role !== 'ADMIN_PARCIAL';

    if (isRestrictedFiscal) {
      const temVinculo = contrato.responsaveis.some(
        (r) => r.userId === session.id && r.ativo
      );
      if (!temVinculo) {
        return NextResponse.json({ error: 'Acesso não autorizado a este contrato' }, { status: 403 });
      }
    }

    return NextResponse.json({ contrato });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!isAdminRole(session.role)) {
      return NextResponse.json(
        { error: 'Você não possui permissão para editar contratos. Apenas Administradores PROAD podem realizar alterações administrativas.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const contratoExistente = await prisma.contrato.findUnique({
      where: { id },
      include: { responsaveis: true },
    });

    if (!contratoExistente) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const {
      numeroContrato,
      numeroEmpenho,
      empenhoSubstituiContrato,
      processoSeiMae,
      licitacaoProcedimento,
      objeto,
      vigenciaInicio,
      vigenciaFim,
      valorGlobal,
      tipoVigencia,
      portariaContinuadosRef,
      portariaContinuadosIdSei,
      portariaContinuadosUrl,
      tipoContrato,
      tipoEmpreitada,
      tipoMedicao,
      dataOrcamentoEstimado,
      status,
      fornecedorId,
      indices,
      itens,
    } = body;

    const limiteLegalPadrao = tipoContrato === 'OBRA' ? 50.0 : 25.0;
    const vGlobal = valorGlobal !== undefined ? (parseFloat(valorGlobal) || 0) : contratoExistente.valorGlobal;

    const contratoAtualizado = await prisma.$transaction(
      async (tx) => {
        // 1. Atualizar campos principais do contrato
        const atualizado = await tx.contrato.update({
          where: { id },
          data: {
            numeroContrato: numeroContrato !== undefined ? (numeroContrato || null) : contratoExistente.numeroContrato,
            numeroEmpenho: numeroEmpenho !== undefined ? (numeroEmpenho || null) : contratoExistente.numeroEmpenho,
            empenhoSubstituiContrato: empenhoSubstituiContrato !== undefined ? !!empenhoSubstituiContrato : contratoExistente.empenhoSubstituiContrato,
            processoSeiMae: processoSeiMae !== undefined ? processoSeiMae : contratoExistente.processoSeiMae,
            licitacaoProcedimento: licitacaoProcedimento !== undefined ? licitacaoProcedimento : contratoExistente.licitacaoProcedimento,
            objeto: objeto !== undefined ? objeto : contratoExistente.objeto,
            vigenciaInicio: vigenciaInicio ? new Date(vigenciaInicio) : contratoExistente.vigenciaInicio,
            vigenciaFim: vigenciaFim ? new Date(vigenciaFim) : contratoExistente.vigenciaFim,
            valorGlobal: vGlobal,
            tipoVigencia: tipoVigencia || contratoExistente.tipoVigencia,
            portariaContinuadosRef: portariaContinuadosRef !== undefined ? portariaContinuadosRef : contratoExistente.portariaContinuadosRef,
            portariaContinuadosIdSei: portariaContinuadosIdSei !== undefined ? portariaContinuadosIdSei : contratoExistente.portariaContinuadosIdSei,
            portariaContinuadosUrl: portariaContinuadosUrl !== undefined ? portariaContinuadosUrl : contratoExistente.portariaContinuadosUrl,
            tipoContrato: tipoContrato || contratoExistente.tipoContrato,
            tipoEmpreitada: tipoEmpreitada || contratoExistente.tipoEmpreitada,
            tipoMedicao: tipoMedicao || contratoExistente.tipoMedicao,
            dataOrcamentoEstimado: dataOrcamentoEstimado ? new Date(dataOrcamentoEstimado) : null,
            status: status || contratoExistente.status,
            fornecedorId: fornecedorId || contratoExistente.fornecedorId,
            updatedAt: new Date(),
          },
        });

        // 2. Atualizar Índices de Reajuste (se enviados)
        if (indices && Array.isArray(indices)) {
          await tx.contratoIndice.deleteMany({ where: { contratoId: id } });
          for (const idx of indices) {
            await tx.contratoIndice.create({
              data: {
                contratoId: id,
                tipoIndice: idx.tipoIndice,
                nomeIndiceSetorial: idx.nomeIndiceSetorial || null,
                justificativaSetorial: idx.justificativaSetorial || null,
                dataBase: atualizado.dataOrcamentoEstimado,
              },
            });
          }
        }

        // 3. Atualizar Itens do Contrato (se enviados)
        if (itens && Array.isArray(itens) && itens.length > 0) {
          await tx.contratoItem.deleteMany({ where: { contratoId: id } });

          const itensParaInserir = itens.map((item: any, i: number) => {
            const qtd = parseFloat(item.quantidade || item.quantidadeAtual || item.quantidadeOriginal) || 0;
            const vUnit = parseFloat(item.valorUnitario || item.valorUnitarioAtual || item.valorUnitarioOriginal) || 0;
            const totalItem = qtd * vUnit;

            return {
              contratoId: id,
              numeroItem: item.numeroItem || (i + 1),
              cidade: item.cidade || 'Mossoró',
              descricao: item.descricao || `Item ${i + 1}`,
              tipoGrupo: item.tipoGrupo || 'ITEM_INDIVIDUAL',
              unidade: item.unidade || 'UN',
              tipoReajuste: item.tipoReajuste || (
                ['MÊS', 'MES', 'POSTO'].includes((item.unidade || '').toUpperCase()) && atualizado.tipoContrato === 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO'
                  ? 'REPACTUACAO_CCT'
                  : 'REAJUSTE_INDICE'
              ),
              indiceReferencia: item.indiceReferencia || null,
              quantidadeOriginal: qtd,
              quantidadeAtual: qtd,
              valorUnitarioOriginal: vUnit,
              valorUnitarioAtual: vUnit,
              valorTotalOriginal: totalItem,
              valorTotalAtual: totalItem,
              limiteAcrescimoPercent: limiteLegalPadrao,
            };
          });

          await tx.contratoItem.createMany({
            data: itensParaInserir,
          });
        }

        return atualizado;
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    return NextResponse.json({ success: true, contrato: contratoAtualizado });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!isAdminRole(session.role)) {
      return NextResponse.json(
        { error: 'Apenas Administradores PROAD podem excluir contratos do sistema.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const contrato = await prisma.contrato.findUnique({
      where: { id },
      select: { id: true, numeroContrato: true, processoSeiMae: true },
    });

    if (!contrato) {
      return NextResponse.json({ error: 'Contrato não encontrado.' }, { status: 404 });
    }

    // Exclusão completa em cascata transacional para higienização segura do sistema
    await prisma.$transaction(async (tx) => {
      // 1. Histórico de alterações e aditivos
      await tx.contratoAlteracao.deleteMany({ where: { contratoId: id } });
      // 2. Alertas vinculados
      await tx.alertaSistema.deleteMany({ where: { contratoId: id } });
      // 3. Planilhas de custo
      await tx.contratoPlanilhaCusto.deleteMany({ where: { contratoId: id } });
      // 4. Lançamentos de despesa por campus
      await tx.despesaExecucao.deleteMany({ where: { contratoId: id } });
      // 5. Medições e faturas (inclusive atestadas)
      await tx.medicaoDespesa.deleteMany({ where: { contratoId: id } });
      // 6. Ordens de Serviço
      await tx.ordemServico.deleteMany({ where: { contratoId: id } });
      // 7. Conta vinculada
      await tx.contaVinculadaMovimentacao.deleteMany({ where: { contratoId: id } });
      // 8. Trabalhadores terceirizados
      await tx.trabalhadorTerceirizado.deleteMany({ where: { contratoId: id } });
      // 9. CCTs e suas funções associadas
      const ccts = await tx.convenioColetivo.findMany({ where: { contratoId: id }, select: { id: true } });
      for (const cct of ccts) {
        await tx.convenioColetivoFuncao.deleteMany({ where: { convenioId: cct.id } });
      }
      await tx.convenioColetivo.deleteMany({ where: { contratoId: id } });
      // 10. Penalidades
      await tx.penalidade.deleteMany({ where: { contratoId: id } });
      // 11. Designações de fiscais e gestores vinculados
      await tx.contratoResponsavel.deleteMany({ where: { contratoId: id } });
      // 12. Itens do contrato
      await tx.contratoItem.deleteMany({ where: { contratoId: id } });
      // 13. Índices de reajuste
      await tx.contratoIndice.deleteMany({ where: { contratoId: id } });
      // 14. O contrato
      await tx.contrato.delete({ where: { id } });
    });

    return NextResponse.json({
      success: true,
      message: `Contrato ${contrato.numeroContrato || contrato.processoSeiMae} e todos os seus lançamentos vinculados foram excluídos com sucesso.`,
    });
  } catch (error: any) {
    console.error('Erro ao excluir contrato:', error);
    return NextResponse.json({ error: error.message || 'Erro ao excluir contrato' }, { status: 500 });
  }
}
