import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isAdminRole } from '@/lib/rbac';
import { registrarAuditoria } from '@/lib/auditClient';
import { notificarPcaExecucao } from '@/lib/pca-integration-client';

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

function parseAndValidateDate(val: any, fieldLabel: string): Date {
  if (!val) throw new Error(`Campo ${fieldLabel} é obrigatório.`);

  let str = String(val).trim();

  // Trata formato DD/MM/YYYY
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,6})/);
  if (brMatch) {
    const dia = brMatch[1].padStart(2, '0');
    const mes = brMatch[2].padStart(2, '0');
    let ano = brMatch[3];
    if (ano.length === 2) ano = `20${ano}`;
    str = `${ano}-${mes}-${dia}`;
  }

  // Trata ano com erro de digitação/estouro de dígitos (ex: +020026 -> 2026, 20026 -> 2026, 02026 -> 2026)
  const isoMatch = str.match(/^(\+?\d+)-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    let anoRaw = isoMatch[1].replace(/^\+/, '');
    const mes = isoMatch[2].padStart(2, '0');
    const dia = isoMatch[3].padStart(2, '0');

    if (anoRaw.length === 5 && (anoRaw.startsWith('200') || anoRaw.startsWith('020'))) {
      anoRaw = anoRaw.replace(/^0+/, '');
      if (anoRaw.length === 5 && anoRaw.startsWith('200')) {
        anoRaw = '20' + anoRaw.slice(3);
      }
    } else if (anoRaw.length > 4) {
      anoRaw = anoRaw.slice(0, 4);
    }

    const anoNum = parseInt(anoRaw, 10);
    if (isNaN(anoNum) || anoNum < 1950 || anoNum > 2100) {
      throw new Error(`Data de ${fieldLabel} inválida: o ano (${anoNum}) deve estar entre 1950 e 2100.`);
    }

    str = `${anoRaw.padStart(4, '0')}-${mes}-${dia}T00:00:00.000Z`;
  }

  const d = new Date(str);
  if (isNaN(d.getTime())) {
    throw new Error(`Data de ${fieldLabel} inválida ("${val}").`);
  }

  const anoFinal = d.getUTCFullYear();
  if (anoFinal < 1950 || anoFinal > 2100) {
    throw new Error(`Data de ${fieldLabel} inválida: o ano (${anoFinal}) deve estar entre 1950 e 2100.`);
  }

  return d;
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
      regimeExecucao,
      tipoEmpreitada,
      tipoMedicao,
      dataOrcamentoEstimado,
      status,
      fornecedorId,
      indices,
      itens,
      // Conta Vinculada
      retencaoContaVinculadaAtiva,
      nivelContaVinculada,
      percentualDecimoTerceiro,
      percentualFerias,
      percentualTercoConstitucional,
      percentualMultaFgts,
      percentualEncargosSubmodulo,
      percentualTotalRetencao,
      normativoContaVinculadaRef,
      justificativaAlteracaoAliquota,
    } = body;

    let dInicioAtualizado = contratoExistente.vigenciaInicio;
    let dFimAtualizado = contratoExistente.vigenciaFim;
    let dOrcamentoAtualizado = contratoExistente.dataOrcamentoEstimado;

    try {
      if (vigenciaInicio) dInicioAtualizado = parseAndValidateDate(vigenciaInicio, 'Início da Vigência');
      if (vigenciaFim) dFimAtualizado = parseAndValidateDate(vigenciaFim, 'Fim da Vigência');
      if (dataOrcamentoEstimado) dOrcamentoAtualizado = parseAndValidateDate(dataOrcamentoEstimado, 'Data-Base do Orçamento');
    } catch (dateErr: any) {
      return NextResponse.json({ error: dateErr.message }, { status: 400 });
    }

    const limiteLegalPadrao = tipoContrato === 'OBRA' ? 50.0 : 25.0;
    const vGlobal = valorGlobal !== undefined ? (parseFloat(valorGlobal) || 0) : contratoExistente.valorGlobal;

    const anosVigenciaContrato = contratoExistente.anosVigencia || 1;

    // Verificar se houve alteração nas alíquotas de Conta Vinculada para auditoria
    const mudouAliquotas = (
      retencaoContaVinculadaAtiva !== undefined && retencaoContaVinculadaAtiva !== contratoExistente.retencaoContaVinculadaAtiva
    ) || (
      percentualTotalRetencao !== undefined && parseFloat(percentualTotalRetencao) !== contratoExistente.percentualTotalRetencao
    ) || (
      nivelContaVinculada !== undefined && nivelContaVinculada !== contratoExistente.nivelContaVinculada
    ) || (
      percentualDecimoTerceiro !== undefined && parseFloat(percentualDecimoTerceiro) !== contratoExistente.percentualDecimoTerceiro
    ) || (
      percentualFerias !== undefined && parseFloat(percentualFerias) !== contratoExistente.percentualFerias
    ) || (
      percentualTercoConstitucional !== undefined && parseFloat(percentualTercoConstitucional) !== contratoExistente.percentualTercoConstitucional
    ) || (
      percentualMultaFgts !== undefined && parseFloat(percentualMultaFgts) !== contratoExistente.percentualMultaFgts
    ) || (
      percentualEncargosSubmodulo !== undefined && parseFloat(percentualEncargosSubmodulo) !== contratoExistente.percentualEncargosSubmodulo
    );

    let historicoAliquotasAtualizado = contratoExistente.historicoAliquotasJson;
    if (mudouAliquotas) {
      const historicoAnterior = Array.isArray(contratoExistente.historicoAliquotasJson)
        ? (contratoExistente.historicoAliquotasJson as any[])
        : [];
      historicoAliquotasAtualizado = [
        ...historicoAnterior,
        {
          data: new Date().toISOString(),
          usuario: session.nome || session.email || 'Usuário PROAD',
          motivo: justificativaAlteracaoAliquota || 'Alteração de alíquota / enquadramento normativo',
          normativoRef: normativoContaVinculadaRef || contratoExistente.normativoContaVinculadaRef,
          aliquotas: {
            nivel: nivelContaVinculada ?? contratoExistente.nivelContaVinculada,
            decimoTerceiro: percentualDecimoTerceiro !== undefined ? parseFloat(percentualDecimoTerceiro) : contratoExistente.percentualDecimoTerceiro,
            ferias: percentualFerias !== undefined ? parseFloat(percentualFerias) : contratoExistente.percentualFerias,
            tercoConstitucional: percentualTercoConstitucional !== undefined ? parseFloat(percentualTercoConstitucional) : contratoExistente.percentualTercoConstitucional,
            multaFgts: percentualMultaFgts !== undefined ? parseFloat(percentualMultaFgts) : contratoExistente.percentualMultaFgts,
            encargosSubmodulo: percentualEncargosSubmodulo !== undefined ? parseFloat(percentualEncargosSubmodulo) : contratoExistente.percentualEncargosSubmodulo,
            total: percentualTotalRetencao !== undefined ? parseFloat(percentualTotalRetencao) : contratoExistente.percentualTotalRetencao,
          }
        }
      ];
    }

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
            vigenciaInicio: dInicioAtualizado,
            vigenciaFim: dFimAtualizado,
            valorGlobal: vGlobal,
            tipoVigencia: tipoVigencia || contratoExistente.tipoVigencia,
            portariaContinuadosRef: portariaContinuadosRef !== undefined ? portariaContinuadosRef : contratoExistente.portariaContinuadosRef,
            portariaContinuadosIdSei: portariaContinuadosIdSei !== undefined ? portariaContinuadosIdSei : contratoExistente.portariaContinuadosIdSei,
            portariaContinuadosUrl: portariaContinuadosUrl !== undefined ? portariaContinuadosUrl : contratoExistente.portariaContinuadosUrl,
            tipoContrato: tipoContrato || contratoExistente.tipoContrato,
            regimeExecucao: regimeExecucao !== undefined ? regimeExecucao : contratoExistente.regimeExecucao,
            tipoEmpreitada: tipoEmpreitada || contratoExistente.tipoEmpreitada,
            tipoMedicao: tipoMedicao || contratoExistente.tipoMedicao,
            dataOrcamentoEstimado: dOrcamentoAtualizado,
            status: status || contratoExistente.status,
            fornecedorId: fornecedorId || contratoExistente.fornecedorId,
            // Parâmetros de Conta Vinculada (IN 02/2024 SEAD/RN)
            retencaoContaVinculadaAtiva: retencaoContaVinculadaAtiva !== undefined ? !!retencaoContaVinculadaAtiva : contratoExistente.retencaoContaVinculadaAtiva,
            nivelContaVinculada: nivelContaVinculada !== undefined ? nivelContaVinculada : contratoExistente.nivelContaVinculada,
            percentualDecimoTerceiro: percentualDecimoTerceiro !== undefined ? parseFloat(percentualDecimoTerceiro) : contratoExistente.percentualDecimoTerceiro,
            percentualFerias: percentualFerias !== undefined ? parseFloat(percentualFerias) : contratoExistente.percentualFerias,
            percentualTercoConstitucional: percentualTercoConstitucional !== undefined ? parseFloat(percentualTercoConstitucional) : contratoExistente.percentualTercoConstitucional,
            percentualMultaFgts: percentualMultaFgts !== undefined ? parseFloat(percentualMultaFgts) : contratoExistente.percentualMultaFgts,
            percentualEncargosSubmodulo: percentualEncargosSubmodulo !== undefined ? parseFloat(percentualEncargosSubmodulo) : contratoExistente.percentualEncargosSubmodulo,
            percentualTotalRetencao: percentualTotalRetencao !== undefined ? parseFloat(percentualTotalRetencao) : contratoExistente.percentualTotalRetencao,
            normativoContaVinculadaRef: normativoContaVinculadaRef !== undefined ? normativoContaVinculadaRef : contratoExistente.normativoContaVinculadaRef,
            justificativaAlteracaoAliquota: justificativaAlteracaoAliquota !== undefined ? justificativaAlteracaoAliquota : contratoExistente.justificativaAlteracaoAliquota,
            historicoAliquotasJson: (historicoAliquotasAtualizado as any) ?? undefined,
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

          const regimeFinal = atualizado.regimeExecucao || 'SEM_DEDICACAO_EXCLUSIVA';

          const itensParaInserir = itens.map((item: any, i: number) => {
            const isDemo = item.categoriaItem === 'DEMO' || (
              item.categoriaItem !== 'NAO_DEMO' && (
                regimeFinal === 'DEDICACAO_EXCLUSIVA' ||
                atualizado.tipoContrato === 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO'
              )
            );

            const vUnit = parseFloat(item.valorUnitario || item.valorUnitarioAtual || item.valorUnitarioOriginal) || 0;
            let qtd = parseFloat(item.quantidade || item.quantidadeAtual || item.quantidadeOriginal) || 0;
            let qtdAnual = parseFloat(item.quantidadeAnual) || 0;

            let totalAnual = 0;
            let totalPlurianual = 0;
            let totalItemEfetivo = 0;

            if (isDemo) {
              totalAnual = qtd * vUnit * 12;
              totalPlurianual = anosVigenciaContrato > 1 ? totalAnual * anosVigenciaContrato : 0;
              totalItemEfetivo = anosVigenciaContrato > 1 ? totalPlurianual : totalAnual;
            } else {
              if (qtdAnual === 0 && qtd > 0) {
                qtdAnual = qtd;
              }
              qtd = anosVigenciaContrato > 1 ? qtdAnual * anosVigenciaContrato : qtdAnual;
              totalAnual = qtdAnual * vUnit;
              totalPlurianual = anosVigenciaContrato > 1 ? qtdAnual * vUnit * anosVigenciaContrato : 0;
              totalItemEfetivo = anosVigenciaContrato > 1 ? totalPlurianual : totalAnual;
            }

            return {
              contratoId: id,
              numeroItem: item.numeroItem || (i + 1),
              cidade: item.cidade || 'Mossoró',
              descricao: item.descricao || `Item ${i + 1}`,
              tipoGrupo: item.tipoGrupo || 'ITEM_INDIVIDUAL',
              unidade: item.unidade || (isDemo ? 'MÊS' : 'UN'),
              categoriaItem: isDemo ? 'DEMO' : 'NAO_DEMO',
              quantidadeAnual: qtdAnual,
              tipoReajuste: item.tipoReajuste || (isDemo ? 'REPACTUACAO_CCT' : 'REAJUSTE_INDICE'),
              indiceReferencia: item.cctVinculada || item.indiceReferencia || null,
              cctVinculada: isDemo ? (item.cctVinculada || item.indiceReferencia || null) : null,
              quantidadeOriginal: qtd,
              quantidadeAtual: qtd,
              valorUnitarioOriginal: vUnit,
              valorUnitarioAtual: vUnit,
              valorTotalAnual: totalAnual,
              valorTotalPlurianual: totalPlurianual,
              valorTotalOriginal: totalItemEfetivo,
              valorTotalAtual: totalItemEfetivo,
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

    // Despachar log de alteração com diff
    registrarAuditoria({
      sistema: 'SGC',
      acao: 'EDICAO',
      entidade: 'Contrato',
      entidadeId: id,
      entidadeNome: `Contrato nº ${contratoAtualizado.numeroContrato || contratoExistente.numeroContrato}`,
      descricao: `Alteração dos dados do contrato nº ${contratoAtualizado.numeroContrato || contratoExistente.numeroContrato}`,
      usuario: {
        id: session.id,
        nome: session.nome,
        email: session.email,
        role: session.role,
      },
      dadosAnteriores: {
        numeroContrato: contratoExistente.numeroContrato,
        tipoContrato: contratoExistente.tipoContrato,
        objeto: contratoExistente.objeto,
        valorGlobal: contratoExistente.valorGlobal,
        vigenciaInicio: contratoExistente.vigenciaInicio,
        vigenciaFim: contratoExistente.vigenciaFim,
        status: contratoExistente.status,
      },
      dadosNovos: {
        numeroContrato: contratoAtualizado.numeroContrato,
        tipoContrato: contratoAtualizado.tipoContrato,
        objeto: contratoAtualizado.objeto,
        valorGlobal: contratoAtualizado.valorGlobal,
        vigenciaInicio: contratoAtualizado.vigenciaInicio,
        vigenciaFim: contratoAtualizado.vigenciaFim,
        status: contratoAtualizado.status,
      },
      rota: `/api/contratos/${id}`,
    });

    // Retroalimentação para o PCA caso o contrato tenha se originado de licitação do PCA
    try {
      if (contratoAtualizado.numeroContrato) {
        const contratoCompleto = await prisma.contrato.findUnique({
          where: { id: contratoAtualizado.id },
          include: { itens: true, fornecedor: true },
        });
        if (
          contratoCompleto &&
          (contratoCompleto.origemPcaConsolidacaoId || contratoCompleto.itens.some((i) => i.origemPcaItemId))
        ) {
          notificarPcaExecucao({
            contratoId: contratoCompleto.id,
            numeroContrato: contratoCompleto.numeroContrato!,
            fornecedorNome: contratoCompleto.fornecedor.razaoSocial,
            fornecedorCnpj: contratoCompleto.fornecedor.cnpj,
            origemPcaConsolidacaoId: contratoCompleto.origemPcaConsolidacaoId,
            itensOrigemPcaIds: contratoCompleto.itens.map((i) => i.origemPcaItemId),
            statusExecucao: "CONTRATADO",
          }).catch((e) => console.warn("Aviso ao notificar formalização ao PCA:", e));
        }
      }
    } catch (e) {
      console.warn("Falha silenciosa ao sincronizar formalização do contrato com o PCA:", e);
    }

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

    // Despachar log de exclusão
    registrarAuditoria({
      sistema: 'SGC',
      acao: 'EXCLUSAO',
      entidade: 'Contrato',
      entidadeId: id,
      entidadeNome: `Contrato ${contrato.numeroContrato || contrato.processoSeiMae}`,
      descricao: `Exclusão permanente do contrato ${contrato.numeroContrato || contrato.processoSeiMae} e seus lançamentos vinculados`,
      usuario: {
        id: session.id,
        nome: session.nome,
        email: session.email,
        role: session.role,
      },
      dadosAnteriores: {
        id: contrato.id,
        numeroContrato: contrato.numeroContrato,
        processoSeiMae: contrato.processoSeiMae,
      },
      rota: `/api/contratos/${id}`,
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
