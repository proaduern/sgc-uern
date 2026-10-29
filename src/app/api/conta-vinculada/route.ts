import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isAdminRole, canManageContaVinculada, getUserDesignatedContext } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const contratoId = searchParams.get('contratoId');

    const whereClause: any = {};

    if (!isAdminRole(session.role)) {
      const designacoes = await prisma.contratoResponsavel.findMany({
        where: {
          userId: session.id,
          ativo: true,
          tipoAtuacao: { in: ['GESTOR', 'SUPLENTE', 'FISCAL_ADMINISTRATIVO'] },
        },
        select: { contratoId: true },
      });
      const authorizedContractIds = Array.from(new Set(designacoes.map((d) => d.contratoId)));

      if (contratoId) {
        if (!authorizedContractIds.includes(contratoId)) {
          return NextResponse.json({
            movimentacoes: [],
            lancamentosMensais: [],
            liberacoes: [],
            saldosPorRubrica: {
              FERIAS_8_33: 0,
              TERCO_FERIAS_2_78: 0,
              DECIMO_TERCEIRO_8_33: 0,
              FGTS_SOBRE_PROVISOES: 0,
              MULTA_RESCISORIA_FGTS: 0,
            },
            saldoTotal: 0,
            saldosPorTrabalhador: {},
            trabalhadores: [],
            contratoConfig: null,
          });
        }
        whereClause.contratoId = contratoId;
      } else {
        whereClause.contratoId = { in: authorizedContractIds };
      }
    } else if (contratoId) {
      whereClause.contratoId = contratoId;
    }

    const movimentacoes = await prisma.contaVinculadaMovimentacao.findMany({
      where: whereClause,
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

    // Calcular saldos acumulados por rubrica e por trabalhador
    const saldosPorRubrica: Record<string, number> = {
      FERIAS_8_33: 0,
      TERCO_FERIAS_2_78: 0,
      DECIMO_TERCEIRO_8_33: 0,
      FGTS_SOBRE_PROVISOES: 0,
      MULTA_RESCISORIA_FGTS: 0,
    };

    const saldosPorTrabalhador: Record<
      string,
      { retido: number; liberado: number; saldo: number; total: number; porRubrica: Record<string, number> }
    > = {};
    let saldoTotal = 0;

    // Agrupamento estruturado de retenções mensais (visão matricial idêntica à planilha)
    const mapaMensal: Record<string, any> = {};
    const liberacoes: any[] = [];

    for (const mov of movimentacoes) {
      const valor = mov.tipoOperacao === 'RETENCAO_ENTRADA' ? mov.valor : -mov.valor;
      saldosPorRubrica[mov.rubrica] = (saldosPorRubrica[mov.rubrica] || 0) + valor;
      saldoTotal += valor;

      if (mov.tipoOperacao === 'LIBERACAO_SAIDA') {
        liberacoes.push({
          id: mov.id,
          contratoId: mov.contratoId,
          trabalhadorId: mov.trabalhadorId,
          trabalhadorNome: mov.trabalhador?.nomeCompleto || 'Liberação Global / Contrato',
          trabalhadorCpf: mov.trabalhador?.cpf || '-',
          campus: mov.trabalhador?.campus || '-',
          funcao: mov.trabalhador?.funcao || '-',
          competenciaMesAno: mov.competenciaMesAno,
          rubrica: mov.rubrica,
          valor: mov.valor,
          numeroOficio: mov.numeroOficio || '-',
          motivoLiberacao: mov.motivoLiberacao || '',
          data: mov.createdAt,
        });
      }

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
        } else {
          saldosPorTrabalhador[mov.trabalhadorId].liberado += mov.valor;
        }
        saldosPorTrabalhador[mov.trabalhadorId].saldo += valor;
        saldosPorTrabalhador[mov.trabalhadorId].total += valor;
        saldosPorTrabalhador[mov.trabalhadorId].porRubrica[mov.rubrica] =
          (saldosPorTrabalhador[mov.trabalhadorId].porRubrica[mov.rubrica] || 0) + valor;
      }

      // Agrupamento para a visão por mês (matriz nominal por competência)
      if (mov.tipoOperacao === 'RETENCAO_ENTRADA') {
        const trabId = mov.trabalhadorId || 'GLOBAL';
        const key = `${trabId}_${mov.competenciaMesAno}`;

        if (!mapaMensal[key]) {
          mapaMensal[key] = {
            id: key,
            contratoId: mov.contratoId,
            trabalhadorId: mov.trabalhadorId,
            trabalhadorNome: mov.trabalhador?.nomeCompleto || 'Rateio Global da Fatura',
            trabalhadorCpf: mov.trabalhador?.cpf || '-',
            campus: mov.trabalhador?.campus || '-',
            funcao: mov.trabalhador?.funcao || 'Técnico em Assuntos Educacionais',
            salarioBase: mov.trabalhador?.salarioBaseCct || 0,
            statusTrabalhador: mov.trabalhador?.status || 'ATIVO',
            dataAdmissao: mov.trabalhador?.dataAdmissao || null,
            dataDemissao: mov.trabalhador?.dataDemissao || null,
            banco: mov.trabalhador?.banco || null,
            agencia: mov.trabalhador?.agencia || null,
            contaCorrente: mov.trabalhador?.contaCorrente || null,
            competenciaMesAno: mov.competenciaMesAno,
            numeroOficio: mov.numeroOficio || '-',
            motivoLiberacao: mov.motivoLiberacao || '',
            comentario: '',
            ferias: 0,
            tercoFerias: 0,
            feriasTotal: 0,
            decimoTerceiro: 0,
            multaFgts: 0,
            encargos: 0,
            total: 0,
            movimentacaoIds: [],
          };
        }

        mapaMensal[key].movimentacaoIds.push(mov.id);
        if (mov.numeroOficio && (!mapaMensal[key].numeroOficio || mapaMensal[key].numeroOficio === '-')) {
          mapaMensal[key].numeroOficio = mov.numeroOficio;
        }
        if (mov.motivoLiberacao) {
          mapaMensal[key].motivoLiberacao = mov.motivoLiberacao;
        }

        if (mov.rubrica === 'FERIAS_8_33') {
          mapaMensal[key].ferias += mov.valor;
        } else if (mov.rubrica === 'TERCO_FERIAS_2_78') {
          mapaMensal[key].tercoFerias += mov.valor;
        } else if (mov.rubrica === 'DECIMO_TERCEIRO_8_33') {
          mapaMensal[key].decimoTerceiro += mov.valor;
        } else if (mov.rubrica === 'MULTA_RESCISORIA_FGTS') {
          mapaMensal[key].multaFgts += mov.valor;
        } else if (mov.rubrica === 'FGTS_SOBRE_PROVISOES') {
          mapaMensal[key].encargos += mov.valor;
        }

        mapaMensal[key].total += mov.valor;
        mapaMensal[key].feriasTotal = Number((mapaMensal[key].ferias + mapaMensal[key].tercoFerias).toFixed(2));
      }
    }

    const lancamentosMensais = Object.values(mapaMensal).sort((a: any, b: any) => {
      if (a.competenciaMesAno !== b.competenciaMesAno) {
        return b.competenciaMesAno.localeCompare(a.competenciaMesAno);
      }
      return a.trabalhadorNome.localeCompare(b.trabalhadorNome);
    });

    const trabalhadores = contratoId
      ? await prisma.trabalhadorTerceirizado.findMany({
          where: { contratoId },
          orderBy: [{ status: 'asc' }, { nomeCompleto: 'asc' }],
        })
      : [];

    const contratoConfig = contratoId
      ? await prisma.contrato.findUnique({
          where: { id: contratoId },
          select: {
            id: true,
            numeroContrato: true,
            numeroEmpenho: true,
            processoSeiMae: true,
            objeto: true,
            retencaoContaVinculadaAtiva: true,
            nivelContaVinculada: true,
            percentualDecimoTerceiro: true,
            percentualFerias: true,
            percentualTercoConstitucional: true,
            percentualMultaFgts: true,
            percentualEncargosSubmodulo: true,
            percentualTotalRetencao: true,
            normativoContaVinculadaRef: true,
            justificativaAlteracaoAliquota: true,
            historicoAliquotasJson: true,
            contaVinculadaBanco: true,
            contaVinculadaAgencia: true,
            contaVinculadaNumeroConta: true,
            contaVinculadaDataAbertura: true,
            contaVinculadaOficioAbertura: true,
            contaVinculadaProcessoSei: true,
            contaVinculadaStatusConta: true,
            contaVinculadaObservacoes: true,
            fornecedor: {
              select: {
                id: true,
                razaoSocial: true,
                cnpj: true,
              },
            },
          },
        })
      : null;

    return NextResponse.json({
      movimentacoes,
      lancamentosMensais,
      liberacoes,
      saldosPorRubrica,
      saldoTotal,
      saldosPorTrabalhador,
      trabalhadores,
      contratoConfig,
    });
  } catch (error: any) {
    console.error('Erro ao buscar dados da Conta Vinculada:', error);
    return NextResponse.json({ error: 'Erro ao buscar dados da Conta Vinculada' }, { status: 500 });
  }
}

// Criar liberação, processar retenção em lote ou cadastrar dados bancários
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const {
      contratoId,
      competenciaMesAno,
      tipoOperacao,
      rubrica,
      valor,
      trabalhadorId,
      numeroOficio,
      motivoLiberacao,
      liberacoes,
    } = body;

    if (!contratoId) {
      return NextResponse.json({ error: 'Contrato ID é obrigatório.' }, { status: 400 });
    }

    if (!isAdminRole(session.role)) {
      const resp = await prisma.contratoResponsavel.findFirst({
        where: {
          contratoId,
          userId: session.id,
          ativo: true,
          tipoAtuacao: { in: ['GESTOR', 'SUPLENTE', 'FISCAL_ADMINISTRATIVO'] },
        },
      });

      if (!resp) {
        return NextResponse.json(
          { error: 'Acesso restrito ao Gestor, Suplente e Fiscal Administrativo deste contrato.' },
          { status: 403 }
        );
      }
    }

    // 1. Liberação Individual Pontual de Trabalhador (Férias, 13º, Rescisão)
    if (tipoOperacao === 'LIBERACAO_INDIVIDUAL' || (tipoOperacao === 'LIBERACAO_SAIDA' && trabalhadorId)) {
      const valFloat = parseFloat(valor);
      if (!valFloat || valFloat <= 0) {
        return NextResponse.json({ error: 'Informe um valor válido para a liberação.' }, { status: 400 });
      }
      if (!rubrica) {
        return NextResponse.json({ error: 'A rubrica da liberação é obrigatória.' }, { status: 400 });
      }

      const trab = await prisma.trabalhadorTerceirizado.findUnique({
        where: { id: trabalhadorId },
      });

      if (!trab) {
        return NextResponse.json({ error: 'Trabalhador não encontrado.' }, { status: 404 });
      }

      const mov = await prisma.contaVinculadaMovimentacao.create({
        data: {
          contratoId,
          trabalhadorId,
          competenciaMesAno: competenciaMesAno || `${new Date().getMonth() + 1 < 10 ? '0' : ''}${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
          rubrica,
          tipoOperacao: 'LIBERACAO_SAIDA',
          valor: valFloat,
          saldoAnterior: 0,
          saldoAtual: 0,
          numeroOficio: numeroOficio || 'Ofício Bancário',
          motivoLiberacao: motivoLiberacao || `Liberação de ${rubrica} para ${trab.nomeCompleto}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Liberação de ${valFloat.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} registrada com sucesso para ${trab.nomeCompleto}.`,
        movimentacao: mov,
      });
    }

    // 2. Liberação Coletiva em Lote via Ofício Bancário
    if (tipoOperacao === 'LIBERACAO_OFICIO_LOTE') {
      if (!Array.isArray(liberacoes) || liberacoes.length === 0) {
        return NextResponse.json({ error: 'Nenhuma liberação de trabalhador selecionada.' }, { status: 400 });
      }

      const registrosCriados = await prisma.$transaction(async (tx) => {
        const registros = [];
        for (const item of liberacoes) {
          const valFloat = parseFloat(item.valor) || 0;
          if (valFloat > 0) {
            const m = await tx.contaVinculadaMovimentacao.create({
              data: {
                contratoId,
                trabalhadorId: item.trabalhadorId || null,
                competenciaMesAno: competenciaMesAno || `${new Date().getMonth() + 1 < 10 ? '0' : ''}${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
                rubrica: item.rubrica || rubrica || 'DECIMO_TERCEIRO_8_33',
                tipoOperacao: 'LIBERACAO_SAIDA',
                valor: valFloat,
                saldoAnterior: 0,
                saldoAtual: 0,
                numeroOficio: numeroOficio || 'OFÍCIO-PROAD/2026',
                motivoLiberacao: motivoLiberacao || `Liberação via ${numeroOficio || 'Ofício Bancário'}`,
              },
            });
            registros.push(m);
          }
        }
        return registros;
      });

      return NextResponse.json({
        success: true,
        message: `${registrosCriados.length} saídas debitadas por funcionário com sucesso.`,
        movimentacoes: registrosCriados,
      });
    }

    // 3. Liberação Manual Simples Global
    if (tipoOperacao === 'LIBERACAO_SAIDA') {
      if (!valor || !rubrica) {
        return NextResponse.json({ error: 'Rubrica e Valor são obrigatórios para liberação.' }, { status: 400 });
      }

      const valFloat = parseFloat(valor);
      const mov = await prisma.contaVinculadaMovimentacao.create({
        data: {
          contratoId,
          trabalhadorId: trabalhadorId || null,
          competenciaMesAno: competenciaMesAno || '03/2026',
          rubrica,
          tipoOperacao: 'LIBERACAO_SAIDA',
          valor: valFloat,
          saldoAnterior: 0,
          saldoAtual: 0,
          numeroOficio: numeroOficio || 'OFÍCIO-PROAD/2026',
          motivoLiberacao: motivoLiberacao || 'Autorização de saque de provisão',
        },
      });

      return NextResponse.json({ success: true, movimentacao: mov });
    }

    // 4. Cálculo e Aplicação Mensal Automática de Retenções
    if (!competenciaMesAno) {
      return NextResponse.json({ error: 'Competência (MM/AAAA) é obrigatória.' }, { status: 400 });
    }

    const contrato = await prisma.contrato.findUnique({
      where: { id: contratoId },
      select: {
        id: true,
        numeroContrato: true,
        percentualDecimoTerceiro: true,
        percentualFerias: true,
        percentualTercoConstitucional: true,
        percentualMultaFgts: true,
        percentualEncargosSubmodulo: true,
      },
    });

    const trabalhadores = await prisma.trabalhadorTerceirizado.findMany({
      where: { contratoId, status: 'ATIVO' },
    });

    if (trabalhadores.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum trabalhador ativo cadastrado neste contrato para cálculo de retenções.' },
        { status: 400 }
      );
    }

    const pFerias = (contrato?.percentualFerias ?? 8.33) / 100;
    const pTerco = (contrato?.percentualTercoConstitucional ?? 2.78) / 100;
    const pDecimo = (contrato?.percentualDecimoTerceiro ?? 8.33) / 100;
    const pMultaFgts = (contrato?.percentualMultaFgts ?? 4.0) / 100;
    const pEncargos = (contrato?.percentualEncargosSubmodulo ?? 8.1) / 100;

    const retencoesCriadas = [];

    for (const t of trabalhadores) {
      const salario = t.salarioBaseCct || 2626.71;

      const ferias = parseFloat((salario * pFerias).toFixed(2));
      const terco = parseFloat((salario * pTerco).toFixed(2));
      const decimo = parseFloat((salario * pDecimo).toFixed(2));
      const fgtsProvisoes = parseFloat((salario * pEncargos).toFixed(2));
      const multaFgts = parseFloat((salario * pMultaFgts).toFixed(2));

      const rubricas = [
        { rubrica: 'FERIAS_8_33', valor: ferias },
        { rubrica: 'TERCO_FERIAS_2_78', valor: terco },
        { rubrica: 'DECIMO_TERCEIRO_8_33', valor: decimo },
        { rubrica: 'FGTS_SOBRE_PROVISOES', valor: fgtsProvisoes },
        { rubrica: 'MULTA_RESCISORIA_FGTS', valor: multaFgts },
      ];

      for (const r of rubricas) {
        if (r.valor > 0) {
          const m = await prisma.contaVinculadaMovimentacao.create({
            data: {
              contratoId,
              trabalhadorId: t.id,
              competenciaMesAno,
              rubrica: r.rubrica as any,
              tipoOperacao: 'RETENCAO_ENTRADA',
              valor: r.valor,
              saldoAnterior: 0,
              saldoAtual: 0,
              numeroOficio: numeroOficio || 'Retenção Automática',
              motivoLiberacao: motivoLiberacao || `fatura de ${competenciaMesAno}`,
            },
          });
          retencoesCriadas.push(m);
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalTrabalhadores: trabalhadores.length,
      retencoesCriadas: retencoesCriadas.length,
    });
  } catch (error: any) {
    console.error('Erro em POST Conta Vinculada:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar retenção' }, { status: 500 });
  }
}

// Atualizar retenção mensal por trabalhador ou atualizar dados bancários do contrato
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json(
        { error: 'Apenas administradores e fiscais designados podem editar movimentações da conta vinculada.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    // 1. Atualizar Dados Bancários Oficiais da Conta Vinculada do Contrato
    if (action === 'UPDATE_DADOS_BANCARIOS') {
      const {
        contratoId,
        contaVinculadaBanco,
        contaVinculadaAgencia,
        contaVinculadaNumeroConta,
        contaVinculadaDataAbertura,
        contaVinculadaOficioAbertura,
        contaVinculadaProcessoSei,
        contaVinculadaStatusConta,
        contaVinculadaObservacoes,
      } = body;

      if (!contratoId) {
        return NextResponse.json({ error: 'Contrato ID é obrigatório.' }, { status: 400 });
      }

      const updated = await prisma.contrato.update({
        where: { id: contratoId },
        data: {
          contaVinculadaBanco: contaVinculadaBanco !== undefined ? contaVinculadaBanco : undefined,
          contaVinculadaAgencia: contaVinculadaAgencia !== undefined ? contaVinculadaAgencia : undefined,
          contaVinculadaNumeroConta: contaVinculadaNumeroConta !== undefined ? contaVinculadaNumeroConta : undefined,
          contaVinculadaDataAbertura: contaVinculadaDataAbertura ? new Date(contaVinculadaDataAbertura) : undefined,
          contaVinculadaOficioAbertura: contaVinculadaOficioAbertura !== undefined ? contaVinculadaOficioAbertura : undefined,
          contaVinculadaProcessoSei: contaVinculadaProcessoSei !== undefined ? contaVinculadaProcessoSei : undefined,
          contaVinculadaStatusConta: contaVinculadaStatusConta !== undefined ? contaVinculadaStatusConta : undefined,
          contaVinculadaObservacoes: contaVinculadaObservacoes !== undefined ? contaVinculadaObservacoes : undefined,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Dados bancários da conta vinculada atualizados com sucesso.',
        contrato: updated,
      });
    }

    // 2. Editar Retenção Mensal de um Trabalhador (Linha da Planilha)
    if (action === 'EDIT_RETENCAO_MENSAL') {
      const {
        contratoId,
        trabalhadorId,
        competenciaMesAno,
        processoSei,
        salarioBase,
        ferias,
        tercoFerias,
        decimoTerceiro,
        multaFgts,
        encargos,
        comentario,
      } = body;

      if (!contratoId || !competenciaMesAno) {
        return NextResponse.json({ error: 'Contrato e Competência são obrigatórios.' }, { status: 400 });
      }

      // Remover movimentações de retenção existentes dessa competência para esse trabalhador
      await prisma.contaVinculadaMovimentacao.deleteMany({
        where: {
          contratoId,
          trabalhadorId: trabalhadorId || null,
          competenciaMesAno,
          tipoOperacao: 'RETENCAO_ENTRADA',
        },
      });

      // Recriar com os valores corrigidos
      const rubricas = [
        { rubrica: 'FERIAS_8_33', valor: parseFloat(ferias) || 0 },
        { rubrica: 'TERCO_FERIAS_2_78', valor: parseFloat(tercoFerias) || 0 },
        { rubrica: 'DECIMO_TERCEIRO_8_33', valor: parseFloat(decimoTerceiro) || 0 },
        { rubrica: 'FGTS_SOBRE_PROVISOES', valor: parseFloat(encargos) || 0 },
        { rubrica: 'MULTA_RESCISORIA_FGTS', valor: parseFloat(multaFgts) || 0 },
      ];

      const criadas = [];
      for (const r of rubricas) {
        if (r.valor > 0) {
          const m = await prisma.contaVinculadaMovimentacao.create({
            data: {
              contratoId,
              trabalhadorId: trabalhadorId || null,
              competenciaMesAno,
              rubrica: r.rubrica as any,
              tipoOperacao: 'RETENCAO_ENTRADA',
              valor: r.valor,
              saldoAnterior: 0,
              saldoAtual: 0,
              numeroOficio: processoSei || 'Ajustado pelo Fiscal',
              motivoLiberacao: comentario ? `fatura de ${competenciaMesAno} (${comentario})` : `fatura de ${competenciaMesAno}`,
            },
          });
          criadas.push(m);
        }
      }

      // Se informou salário base e tem trabalhadorId, atualiza o cadastro dele
      if (salarioBase && trabalhadorId) {
        await prisma.trabalhadorTerceirizado.update({
          where: { id: trabalhadorId },
          data: { salarioBaseCct: parseFloat(salarioBase) },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Lançamento mensal de retenção atualizado com sucesso.',
        registros: criadas.length,
      });
    }

    // 3. Edição Simples de Movimentação Individual por ID
    const { id, competenciaMesAno, rubrica, tipoOperacao, valor, numeroOficio, motivoLiberacao } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID da movimentação é obrigatório.' }, { status: 400 });
    }

    const updated = await prisma.contaVinculadaMovimentacao.update({
      where: { id },
      data: {
        ...(competenciaMesAno ? { competenciaMesAno } : {}),
        ...(rubrica ? { rubrica } : {}),
        ...(tipoOperacao ? { tipoOperacao } : {}),
        ...(valor !== undefined ? { valor: parseFloat(valor) } : {}),
        ...(numeroOficio !== undefined ? { numeroOficio } : {}),
        ...(motivoLiberacao !== undefined ? { motivoLiberacao } : {}),
      },
    });

    return NextResponse.json({ success: true, movimentacao: updated });
  } catch (error: any) {
    console.error('Erro em PUT Conta Vinculada:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar movimentação' }, { status: 500 });
  }
}

// Excluir movimentação
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json(
        { error: 'Apenas administradores e fiscais podem excluir movimentações.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID da movimentação é obrigatório.' }, { status: 400 });
    }

    await prisma.contaVinculadaMovimentacao.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Movimentação excluída com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao excluir movimentação:', error);
    return NextResponse.json({ error: error.message || 'Erro ao excluir' }, { status: 500 });
  }
}
