import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { TipoAlteracaoContratual } from '@prisma/client';
import { registrarAuditoria } from '@/lib/auditClient';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const contratoId = resolvedParams.id;

    const contrato = await prisma.contrato.findUnique({
      where: { id: contratoId },
      include: {
        itens: { orderBy: { numeroItem: 'asc' } },
        fornecedor: true,
        alteracoes: {
          orderBy: { dataAssinatura: 'desc' },
          include: { criadoPor: { select: { id: true, nome: true, email: true, matricula: true } } },
        },
      },
    });

    if (!contrato) {
      return NextResponse.json({ error: 'Contrato não encontrado.' }, { status: 404 });
    }

    // Calcula limites vigentes de 25% / 50%
    const baseCalculo = contrato.valorBaseCalculoAditivos && contrato.valorBaseCalculoAditivos > 0
      ? contrato.valorBaseCalculoAditivos
      : contrato.valorGlobal;

    const isObra = contrato.tipoContrato === 'OBRA';
    const percentualMaximo = isObra ? 0.50 : 0.25;
    const limiteDisponivelAcrescimo = baseCalculo * percentualMaximo;
    const limiteDisponivelSupressao = baseCalculo * percentualMaximo;

    // Soma aditivos de acréscimo e supressão já realizados sob a base atual
    const acrescimosRealizados = contrato.alteracoes
      .filter((a) => a.tipoAlteracao === 'ACRESCIMO_ADITIVO' && a.status === 'ATIVO')
      .reduce((acc, a) => acc + (a.valorAjuste > 0 ? a.valorAjuste : 0), 0);

    const supressoesRealizadas = contrato.alteracoes
      .filter((a) => a.tipoAlteracao === 'SUPRESSAO_ADITIVO' && a.status === 'ATIVO')
      .reduce((acc, a) => acc + Math.abs(a.valorAjuste), 0);

    const saldoDisponivelAcrescimo = Math.max(0, limiteDisponivelAcrescimo - acrescimosRealizados);
    const saldoDisponivelSupressao = Math.max(0, limiteDisponivelSupressao - supressoesRealizadas);

    return NextResponse.json({
      contrato: {
        id: contrato.id,
        numeroContrato: contrato.numeroContrato,
        objeto: contrato.objeto,
        vigenciaInicio: contrato.vigenciaInicio,
        vigenciaFim: contrato.vigenciaFim,
        valorGlobalOriginal: contrato.valorGlobal,
        valorGlobalAtualizado: contrato.valorAtualizado,
        valorBaseCalculoAditivos: baseCalculo,
        ultimoProcedimentoAtualizacao: contrato.ultimoProcedimentoAtualizacao,
        tipoContrato: contrato.tipoContrato,
      },
      limitesLegais: {
        baseCalculo,
        percentualMaximo: percentualMaximo * 100,
        limiteMaximoAcrescimo: limiteDisponivelAcrescimo,
        limiteMaximoSupressao: limiteDisponivelSupressao,
        acrescimosRealizados,
        supressoesRealizadas,
        saldoDisponivelAcrescimo,
        saldoDisponivelSupressao,
      },
      itens: contrato.itens,
      alteracoes: contrato.alteracoes,
    });
  } catch (error: any) {
    console.error('Erro ao consultar alterações contratuais:', error);
    return NextResponse.json({ error: error.message || 'Falha ao buscar alterações' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const contratoId = resolvedParams.id;

    const body = await request.json();
    const {
      tipoAlteracao,
      instrumento,
      numeroTermo,
      processoSei,
      documentoSeiId,
      dataAssinatura,
      possuiEfeitoRetroativo,
      dataRetroatividade,
      novaVigenciaFim,
      justificativa,
      novosItens,
      percentualReajuste,
      escopoReajuste, // 'APENAS_MAO_DE_OBRA' | 'APENAS_INSUMOS' | 'HIBRIDO_DISTINTO' | 'TODOS_ITENS'
      percentualMaoDeObra,
      percentualInsumos,
      ignorarAvisoInterregno,
    } = body;

    if (!tipoAlteracao || !numeroTermo || !processoSei || !documentoSeiId || !dataAssinatura) {
      return NextResponse.json({
        error: 'Preencha todos os campos obrigatórios: tipo de alteração, número do termo, processo SEI, ID SEI do documento e data de assinatura.',
      }, { status: 400 });
    }

    const contrato = await prisma.contrato.findUnique({
      where: { id: contratoId },
      include: {
        itens: { orderBy: { numeroItem: 'asc' } },
        responsaveis: { include: { user: true } },
        alteracoes: {
          where: { status: 'ATIVO' },
          orderBy: { dataAssinatura: 'desc' },
        },
      },
    });

    if (!contrato) {
      return NextResponse.json({ error: 'Contrato não encontrado.' }, { status: 404 });
    }

    const itensCCT = contrato.itens?.filter((i: any) => i.tipoReajuste === 'REPACTUACAO_CCT') || [];
    const itensIndice = contrato.itens?.filter((i: any) => i.tipoReajuste === 'REAJUSTE_INDICE' || !i.tipoReajuste) || [];

    // VALIDAÇÃO JURÍDICA DO INTERREGNO DE 01 ANO (Art. 135 da Lei 14.133/2021)
    // 1. Mão de Obra CCT (Repactuação): NÃO se submete ao interregno de 1 ano.
    // 2. Insumos / Serviços com índice (Reajuste em sentido estrito): EXIGE interregno mínimo de 1 ano (365 dias).
    const afetaItensIndice =
      tipoAlteracao === 'REAJUSTE_APOSTILAMENTO' ||
      escopoReajuste === 'APENAS_INSUMOS' ||
      (escopoReajuste === 'HIBRIDO_DISTINTO' && percentualInsumos && parseFloat(percentualInsumos) !== 0) ||
      (escopoReajuste === 'TODOS_ITENS' && itensIndice.length > 0 && percentualReajuste && parseFloat(percentualReajuste) !== 0);

    const isExclusivoCCT =
      tipoAlteracao === 'REPACTUACAO_APOSTILAMENTO' ||
      escopoReajuste === 'APENAS_MAO_DE_OBRA';

    if (afetaItensIndice && !isExclusivoCCT) {
      // Determina a data-base inicial de contagem do interregno
      const ultimoReajusteIndice = contrato.alteracoes?.find(
        (a: any) => a.tipoAlteracao === 'REAJUSTE_APOSTILAMENTO'
      );

      const dataBaseReferencia = ultimoReajusteIndice
        ? new Date(ultimoReajusteIndice.dataAssinatura)
        : (contrato.dataOrcamentoEstimado ? new Date(contrato.dataOrcamentoEstimado) : new Date(contrato.vigenciaInicio));

      const dtAssinatura = new Date(dataAssinatura);
      const diffTime = dtAssinatura.getTime() - dataBaseReferencia.getTime();
      const diasTranscorridos = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diasTranscorridos < 365 && !ignorarAvisoInterregno) {
        const dataBaseFmt = dataBaseReferencia.toLocaleDateString('pt-BR');
        return NextResponse.json({
          error: `Interregno mínimo de 01 ano não atingido para reajuste por índice de preços (Art. 135 da Lei 14.133/2021). A data-base de referência é ${dataBaseFmt}, tendo transcorrido apenas ${diasTranscorridos} dias (mínimo legal exigido: 365 dias).`,
          bloqueioInterregno: true,
          diasTranscorridos,
          diasFaltantes: 365 - diasTranscorridos,
          dataBaseReferencia: dataBaseFmt,
          sugestao: itensCCT.length > 0
            ? "Para contratos híbridos, a mão de obra referente à Convenção Coletiva (CCT) NÃO se submete ao interregno de 1 ano. Caso queira reajustar apenas a mão de obra, selecione o escopo 'Apenas Mão de Obra (CCT)' ou o tipo 'Repactuação'."
            : "Aguarde o transcurso do interregno de 1 ano da data-base do orçamento estimado ou marque a confirmação com justificativa administrativa.",
        }, { status: 400 });
      }
    }

    const valorAnterior = contrato.valorAtualizado;
    const baseCalculoAnterior = contrato.valorBaseCalculoAditivos && contrato.valorBaseCalculoAditivos > 0
      ? contrato.valorBaseCalculoAditivos
      : contrato.valorGlobal;

    // Snapshot dos itens antes da alteração
    const itensSnapshotAnterior = contrato.itens.map((it) => ({
      id: it.id,
      numeroItem: it.numeroItem,
      descricao: it.descricao,
      unidade: it.unidade,
      tipoReajuste: it.tipoReajuste,
      indiceReferencia: it.indiceReferencia,
      quantidade: it.quantidadeAtual,
      valorUnitario: it.valorUnitarioAtual,
      valorTotal: it.valorTotalAtual,
    }));

    // Determina se altera preços/itens
    let novoValorGlobal = valorAnterior;
    let itensAtualizadosPayload: any[] = [];

    const percGlobal = percentualReajuste ? parseFloat(percentualReajuste) : 0;
    const percMO = percentualMaoDeObra ? parseFloat(percentualMaoDeObra) : (percGlobal || 0);
    const percIns = percentualInsumos ? parseFloat(percentualInsumos) : (percGlobal || 0);

    const fatorMO = 1 + (percMO / 100);
    const fatorIns = 1 + (percIns / 100);

    if (novosItens && Array.isArray(novosItens) && novosItens.length > 0) {
      let somaTotal = 0;
      itensAtualizadosPayload = contrato.itens.map((item) => {
        const itemNovo = novosItens.find((ni: any) => ni.id === item.id || ni.numeroItem === item.numeroItem);
        const vUnit = itemNovo && itemNovo.novoValorUnitario !== undefined
          ? parseFloat(itemNovo.novoValorUnitario)
          : item.valorUnitarioAtual;
        const qtd = itemNovo && itemNovo.novaQuantidade !== undefined
          ? parseFloat(itemNovo.novaQuantidade)
          : item.quantidadeAtual;
        const total = vUnit * qtd;
        somaTotal += total;
        return {
          id: item.id,
          numeroItem: item.numeroItem,
          descricao: item.descricao,
          unidade: item.unidade,
          tipoReajuste: item.tipoReajuste,
          indiceReferencia: item.indiceReferencia,
          quantidadeAtual: qtd,
          valorUnitarioAtual: vUnit,
          valorTotalAtual: total,
        };
      });
      novoValorGlobal = somaTotal;
    } else if (body.novoValorGlobalManual && parseFloat(body.novoValorGlobalManual) > 0) {
      novoValorGlobal = parseFloat(body.novoValorGlobalManual);
    } else if (
      (percGlobal !== 0 || percMO !== 0 || percIns !== 0) &&
      (tipoAlteracao === 'REAJUSTE_APOSTILAMENTO' || tipoAlteracao === 'REPACTUACAO_APOSTILAMENTO' || tipoAlteracao === 'REEQUILIBRIO_ADITIVO')
    ) {
      if (contrato.itens && contrato.itens.length > 0) {
        let somaTotal = 0;
        itensAtualizadosPayload = contrato.itens.map((item) => {
          let vUnit = item.valorUnitarioAtual;

          if (item.tipoReajuste === 'NAO_REAJUSTAVEL') {
            // Item de preço fixo não sofre reajuste
            vUnit = item.valorUnitarioAtual;
          } else if (item.tipoReajuste === 'REPACTUACAO_CCT') {
            // Mão de Obra Terceirizada (CCT)
            if (escopoReajuste === 'APENAS_INSUMOS') {
              vUnit = item.valorUnitarioAtual; // Permanece inalterado
            } else {
              vUnit = item.valorUnitarioAtual * fatorMO;
            }
          } else {
            // Insumos / Serviços com índice (ex: SINAPI, IPCA)
            if (escopoReajuste === 'APENAS_MAO_DE_OBRA' || tipoAlteracao === 'REPACTUACAO_APOSTILAMENTO') {
              vUnit = item.valorUnitarioAtual; // Permanece inalterado
            } else {
              vUnit = item.valorUnitarioAtual * fatorIns;
            }
          }

          const total = vUnit * item.quantidadeAtual;
          somaTotal += total;
          return {
            id: item.id,
            numeroItem: item.numeroItem,
            descricao: item.descricao,
            unidade: item.unidade,
            tipoReajuste: item.tipoReajuste,
            indiceReferencia: item.indiceReferencia,
            quantidadeAtual: item.quantidadeAtual,
            valorUnitarioAtual: vUnit,
            valorTotalAtual: total,
          };
        });
        novoValorGlobal = somaTotal;
      } else {
        const fatorGenerico = tipoAlteracao === 'REPACTUACAO_APOSTILAMENTO' ? fatorMO : fatorIns;
        novoValorGlobal = valorAnterior * fatorGenerico;
      }
    }

    const valorAjuste = novoValorGlobal - valorAnterior;

    // REGRA DA BASE DE CÁLCULO PARA LIMITES DE 25% (ou 50% obras):
    // Se for Reajuste, Repactuação ou Reequilíbrio Econômico-Financeiro:
    // O valor atualizado é a NOVA BASE para fins de acréscimos e supressões!
    let novaBaseCalculoAditivos = baseCalculoAnterior;
    if (
      tipoAlteracao === 'REAJUSTE_APOSTILAMENTO' ||
      tipoAlteracao === 'REPACTUACAO_APOSTILAMENTO' ||
      tipoAlteracao === 'REEQUILIBRIO_ADITIVO'
    ) {
      novaBaseCalculoAditivos = novoValorGlobal;
    }

    // Se for Acréscimo ou Supressão, validação do limite legal de 25% (ou 50% para obras)
    const isObra = contrato.tipoContrato === 'OBRA';
    const limitePercent = isObra ? 0.50 : 0.25;
    const tetoLegal = novaBaseCalculoAditivos * limitePercent;

    if (tipoAlteracao === 'ACRESCIMO_ADITIVO') {
      if (valorAjuste > tetoLegal) {
        return NextResponse.json({
          error: `O acréscimo de R$ ${valorAjuste.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ultrapassa o limite legal de ${limitePercent * 100}% (R$ ${tetoLegal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) sobre a base atualizada de R$ ${novaBaseCalculoAditivos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
        }, { status: 400 });
      }
    }

    // CÁLCULO RESIDUAL RETROATIVO AUTOMÁTICO
    let calculoResidualJson: any = null;
    let valorResidualTotal = 0;

    if (possuiEfeitoRetroativo && dataRetroatividade) {
      const dtRetro = new Date(dataRetroatividade);
      const dtAssinatura = new Date(dataAssinatura);

      // Localiza medições e despesas atestadas no período retroativo
      const despesasAtestadas = await prisma.despesaExecucao.findMany({
        where: {
          contratoId,
          dataAtesto: {
            gte: dtRetro,
            lte: dtAssinatura,
          },
        },
        orderBy: { dataAtesto: 'asc' },
      });

      const percentualVariacao = percentualReajuste && parseFloat(percentualReajuste) !== 0
        ? parseFloat(percentualReajuste) / 100
        : (valorAnterior > 0 ? (novoValorGlobal - valorAnterior) / valorAnterior : 0);

      const faturasRecalculadas = despesasAtestadas.map((d) => {
        const valAtestado = d.valorAtestado || 0;
        const residuo = valAtestado * percentualVariacao;
        valorResidualTotal += residuo;

        return {
          despesaId: d.id,
          processoSeiDespesa: d.processoSeiDespesa,
          referencia: d.referencia,
          cidade: d.cidade,
          dataAtesto: d.dataAtesto,
          valorOriginalAtestado: valAtestado,
          percentualVariacao: percentualVariacao * 100,
          valorResidualDevido: residuo,
        };
      });

      calculoResidualJson = {
        dataRetroatividade,
        dataRegistroAssinatura: dataAssinatura,
        percentualGeralReajuste: percentualVariacao * 100,
        totalFaturasAtestadas: despesasAtestadas.length,
        valorResidualTotal,
        faturasRecalculadas,
      };
    }

    // Formatação do rótulo do último procedimento
    const dataAssinaturaFmt = new Date(dataAssinatura).toLocaleDateString('pt-BR');
    const retroFmt = dataRetroatividade ? new Date(dataRetroatividade).toLocaleDateString('pt-BR') : '';
    const descProcedimento = `${numeroTermo} em ${dataAssinaturaFmt}${possuiEfeitoRetroativo && retroFmt ? `, retroagindo a ${retroFmt}` : ''}`;

    // Execução em transação no Prisma
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Cria o registro imutável da alteração
      const alteracao = await tx.contratoAlteracao.create({
        data: {
          contratoId,
          tipoAlteracao: tipoAlteracao as TipoAlteracaoContratual,
          instrumento: instrumento || (tipoAlteracao.includes('APOSTILAMENTO') ? 'APOSTILAMENTO' : 'TERMO_ADITIVO'),
          numeroTermo,
          processoSei,
          documentoSeiId,
          dataAssinatura: new Date(dataAssinatura),
          possuiEfeitoRetroativo: !!possuiEfeitoRetroativo,
          dataRetroatividade: dataRetroatividade ? new Date(dataRetroatividade) : null,
          valorAnterior,
          valorAjuste,
          novoValorGlobal,
          novaBaseCalculoAditivos,
          vigenciaAnterior: contrato.vigenciaFim,
          novaVigenciaFim: novaVigenciaFim ? new Date(novaVigenciaFim) : null,
          justificativa: justificativa || null,
          itensSnapshotAnterior: itensSnapshotAnterior as any,
          itensSnapshotAtualizado: itensAtualizadosPayload as any,
          calculoResidualJson: calculoResidualJson as any,
          valorResidualTotal,
          status: 'ATIVO',
          criadoPorId: session.id,
        },
      });

      // 2. Atualiza os itens do contrato com os novos valores unitários e totais
      if (itensAtualizadosPayload.length > 0) {
        for (const it of itensAtualizadosPayload) {
          await tx.contratoItem.update({
            where: { id: it.id },
            data: {
              quantidadeAtual: it.quantidadeAtual,
              valorUnitarioAtual: it.valorUnitarioAtual,
              valorTotalAtual: it.valorTotalAtual,
            },
          });
        }
      }

      // 3. Atualiza o contrato com o novo valor global, a nova base de aditivos e o último procedimento
      const contratoAtualizado = await tx.contrato.update({
        where: { id: contratoId },
        data: {
          valorAtualizado: novoValorGlobal,
          valorBaseCalculoAditivos: novaBaseCalculoAditivos,
          ultimoProcedimentoAtualizacao: descProcedimento,
          ...(novaVigenciaFim && { vigenciaFim: new Date(novaVigenciaFim) }),
        },
      });

      // 4. Se houver resíduo retroativo apurado, notifica gestores e fiscais administrativos
      if (valorResidualTotal > 0) {
        const fiscaisParaNotificar = contrato.responsaveis.filter(
          (r) => r.tipoAtuacao === 'GESTOR' || r.tipoAtuacao === 'FISCAL_ADMINISTRATIVO'
        );

        for (const f of fiscaisParaNotificar) {
          await tx.alertaSistema.create({
            data: {
              contratoId,
              destinatarioId: f.userId,
              tipoAlerta: 'RESIDUO_RETROATIVO_REPACTUACAO',
              nivel: 'ALERTA',
              titulo: `Resíduo Retroativo Calculado: ${numeroTermo}`,
              mensagem: `Foi apurado um valor residual de R$ ${valorResidualTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} referente aos efeitos retroativos desde ${retroFmt} no Contrato nº ${contrato.numeroContrato || contrato.processoSeiMae}. Verifique as providências de atesto complementar e empenho.`,
            },
          });
        }
      }

      return { alteracao, contratoAtualizado };
    });

    registrarAuditoria({
      sistema: 'SGC',
      acao: 'ADITIVO',
      entidade: 'TermoAditivo',
      entidadeId: resultado.alteracao.id,
      entidadeNome: `${numeroTermo} (${contrato.numeroContrato || contrato.processoSeiMae})`,
      descricao: `${numeroTermo} registrado: ${descProcedimento}. Ajuste de R$ ${valorAjuste}`,
      usuario: {
        id: session.id,
        nome: session.nome,
        email: session.email,
        role: session.role,
      },
      dadosAnteriores: {
        valorGlobal: contrato.valorAtualizado || contrato.valorGlobal,
        vigenciaFim: contrato.vigenciaFim,
      },
      dadosNovos: {
        valorGlobal: resultado.contratoAtualizado.valorAtualizado,
        vigenciaFim: resultado.contratoAtualizado.vigenciaFim,
        numeroTermo,
        tipoAlteracao,
      },
      rota: `/api/contratos/${contratoId}/alteracoes`,
    });

    return NextResponse.json({
      success: true,
      mensagem: `${numeroTermo} registrado com sucesso! Nova base de cálculo para aditivos atualizada para R$ ${novaBaseCalculoAditivos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      alteracao: resultado.alteracao,
      contrato: resultado.contratoAtualizado,
      calculoResidual: calculoResidualJson,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao registrar alteração contratual:', error);
    return NextResponse.json({ error: error.message || 'Falha ao registrar alteração contratual' }, { status: 500 });
  }
}
