import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  isAdminRole,
  canPerformDefinitiveAttest,
  canPerformProvisionalAttest,
  getUserDesignatedContext,
} from '@/lib/rbac';
import { registrarAuditoria } from '@/lib/auditClient';
import { notificarPcaExecucao } from '@/lib/pca-integration-client';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const contratoId = searchParams.get('contratoId');

    const whereClause: any = {};

    if (!isAdminRole(session.role)) {
      const { contractIds } = await getUserDesignatedContext(session.id);
      if (contratoId) {
        if (!contractIds.includes(contratoId)) {
          return NextResponse.json({ medicoes: [] });
        }
        whereClause.contratoId = contratoId;
      } else {
        whereClause.contratoId = { in: contractIds };
      }
    } else if (contratoId) {
      whereClause.contratoId = contratoId;
    }

    const medicoes = await prisma.medicaoDespesa.findMany({
      where: whereClause,
      include: {
        contrato: {
          select: {
            id: true,
            numeroContrato: true,
            numeroEmpenho: true,
            objeto: true,
            processoSeiMae: true,
            valorGlobal: true,
            valorAtualizado: true,
            fornecedor: true,
          },
        },
        ordemServico: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ medicoes });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar medições' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const {
      contratoId,
      ordemServicoId,
      referenciaMesAno,
      processoSeiDespesa,
      numeroNotaFiscal,
      dataEmissaoNf,
      valorNotaFiscal,
      valorGlosa,
      motivoGlosa,
    } = body;

    if (!contratoId || !referenciaMesAno || !processoSeiDespesa || !valorNotaFiscal) {
      return NextResponse.json(
        { error: 'Contrato, Referência (Mês/Ano), Processo SEI e Valor da NF são obrigatórios.' },
        { status: 400 }
      );
    }

    if (!isAdminRole(session.role)) {
      const { contractIds } = await getUserDesignatedContext(session.id);
      if (!contractIds.includes(contratoId)) {
        return NextResponse.json(
          { error: 'Você só pode lançar medições em contratos dos quais seja gestor ou fiscal designado.' },
          { status: 403 }
        );
      }
    }

    const valorNfFloat = parseFloat(valorNotaFiscal);
    const valorGlosaFloat = valorGlosa ? parseFloat(valorGlosa) : 0.0;
    const valorAtestadoFinal = Math.max(0, valorNfFloat - valorGlosaFloat);

    const medicao = await prisma.medicaoDespesa.create({
      data: {
        contratoId,
        ordemServicoId: ordemServicoId || null,
        referenciaMesAno,
        processoSeiDespesa,
        numeroNotaFiscal: numeroNotaFiscal || null,
        dataEmissaoNf: dataEmissaoNf ? new Date(dataEmissaoNf) : null,
        valorNotaFiscal: valorNfFloat,
        valorGlosa: valorGlosaFloat,
        motivoGlosa: motivoGlosa || null,
        valorAtestadoFinal,
        status: 'EM_CONFERENCIA_ADM',
      },
      include: {
        contrato: true,
      },
    });

    registrarAuditoria({
      sistema: 'SGC',
      acao: 'MEDICAO',
      entidade: 'MedicaoDespesa',
      entidadeId: medicao.id,
      entidadeNome: `Medição ${medicao.referenciaMesAno} - NF ${medicao.numeroNotaFiscal || 'S/N'} (${medicao.contrato.numeroContrato || 'Contrato'})`,
      descricao: `Lançamento de medição/fatura ref. ${medicao.referenciaMesAno} no valor de R$ ${medicao.valorNotaFiscal}`,
      usuario: {
        id: session.id,
        nome: session.nome,
        email: session.email,
        role: session.role,
      },
      dadosNovos: {
        contratoId: medicao.contratoId,
        referenciaMesAno: medicao.referenciaMesAno,
        processoSeiDespesa: medicao.processoSeiDespesa,
        numeroNotaFiscal: medicao.numeroNotaFiscal,
        valorNotaFiscal: medicao.valorNotaFiscal,
        valorGlosa: medicao.valorGlosa,
        valorAtestadoFinal: medicao.valorAtestadoFinal,
        status: medicao.status,
      },
      rota: '/api/execucao/medicoes',
    });

    return NextResponse.json({ success: true, medicao }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar medição:', error);
    return NextResponse.json({ error: error.message || 'Erro ao registrar medição' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const { medicaoId, acao, motivoGlosa, valorGlosa } = body;

    if (!medicaoId || !acao) {
      return NextResponse.json({ error: 'ID da medição e ação são obrigatórios.' }, { status: 400 });
    }

    const medicao = await prisma.medicaoDespesa.findUnique({
      where: { id: medicaoId },
      include: { contrato: { include: { responsaveis: true } } },
    });

    if (!medicao) {
      return NextResponse.json({ error: 'Medição não encontrada.' }, { status: 404 });
    }

    if (!isAdminRole(session.role)) {
      const { contractIds } = await getUserDesignatedContext(session.id);
      if (!contractIds.includes(medicao.contratoId)) {
        return NextResponse.json(
          { error: 'Você não tem permissão para atestar despesas deste contrato.' },
          { status: 403 }
        );
      }
    }

    // Ações: ATESTE_PROVISORIO (Fiscal Técnico), ATESTE_DEFINITIVO (Gestor), ENVIAR_PAGAMENTO
    const updateData: any = {};

    if (acao === 'ATESTE_PROVISORIO') {
      if (!canPerformProvisionalAttest(session.role)) {
        return NextResponse.json(
          { error: 'Você não possui permissão para emitir Ateste Provisório.' },
          { status: 403 }
        );
      }
      updateData.dataRecebimentoProvisorio = new Date();
      updateData.status = 'ATESTE_PROVISORIO_TECNICO';
      if (valorGlosa !== undefined) {
        const glosa = parseFloat(valorGlosa) || 0;
        updateData.valorGlosa = glosa;
        updateData.motivoGlosa = motivoGlosa || null;
        updateData.valorAtestadoFinal = Math.max(0, (medicao.valorNotaFiscal || 0) - glosa);
      }
    } else if (acao === 'ATESTE_DEFINITIVO') {
      if (!canPerformDefinitiveAttest(session.role)) {
        return NextResponse.json(
          { error: 'O Ateste Definitivo é privativo do Gestor do Contrato (ou PROAD).' },
          { status: 403 }
        );
      }
      updateData.dataRecebimentoDefinitivo = new Date();
      updateData.status = 'ATESTE_DEFINITIVO_GESTOR';
    } else if (acao === 'ENVIAR_PAGAMENTO' || acao === 'LIQUIDAR') {
      if (!isAdminRole(session.role) && session.role !== 'GESTOR') {
        return NextResponse.json(
          { error: 'Apenas a PROAD ou o Gestor do Contrato podem encaminhar para liquidação/pagamento.' },
          { status: 403 }
        );
      }
      if (acao === 'ENVIAR_PAGAMENTO') updateData.status = 'ENVIADO_PAGAMENTO_PROPLAN';
      if (acao === 'LIQUIDAR') updateData.status = 'LIQUIDADO_PAGO';
    }

    const updated = await prisma.medicaoDespesa.update({
      where: { id: medicaoId },
      data: updateData,
    });

    // Retroalimentação em tempo real para o PCA (interoperabilidade sistêmica)
    try {
      const contrato = await prisma.contrato.findUnique({
        where: { id: medicao.contratoId },
        include: { itens: true, fornecedor: true },
      });
      if (contrato && (contrato.origemPcaConsolidacaoId || contrato.itens.some((i) => i.origemPcaItemId))) {
        let statusExecucao: "RECEBIDO_PROVISORIO" | "RECEBIDO_DEFINITIVO" | "PAGO" | "EM_EXECUCAO" = "EM_EXECUCAO";
        if (acao === "ATESTE_PROVISORIO") statusExecucao = "RECEBIDO_PROVISORIO";
        else if (acao === "ATESTE_DEFINITIVO") statusExecucao = "RECEBIDO_DEFINITIVO";
        else if (acao === "LIQUIDAR") statusExecucao = "PAGO";

        notificarPcaExecucao({
          contratoId: contrato.id,
          numeroContrato: contrato.numeroContrato || undefined,
          fornecedorNome: contrato.fornecedor.razaoSocial,
          fornecedorCnpj: contrato.fornecedor.cnpj,
          origemPcaConsolidacaoId: contrato.origemPcaConsolidacaoId,
          itensOrigemPcaIds: contrato.itens.map((i) => i.origemPcaItemId),
          statusExecucao,
          dataRecebimentoProv: updated.dataRecebimentoProvisorio,
          dataRecebimentoDef: updated.dataRecebimentoDefinitivo,
          dataAtesto: updated.dataRecebimentoDefinitivo || updated.dataRecebimentoProvisorio,
          numeroNotaFiscal: updated.numeroNotaFiscal,
        }).catch((e) => console.warn("Aviso ao notificar PCA:", e));
      }
    } catch (e) {
      console.warn("Falha silenciosa ao sincronizar execução com o PCA:", e);
    }

    return NextResponse.json({ success: true, medicao: updated });
  } catch (error: any) {
    console.error('Erro ao atualizar medição:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar ateste' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!isAdminRole(session.role)) {
      return NextResponse.json(
        { error: 'Apenas administradores da PROAD podem editar medições já registradas.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      id,
      referenciaMesAno,
      processoSeiDespesa,
      numeroNotaFiscal,
      dataEmissaoNf,
      valorNotaFiscal,
      valorGlosa,
      motivoGlosa,
      status,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID da medição é obrigatório.' }, { status: 400 });
    }

    const existing = await prisma.medicaoDespesa.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Medição não encontrada.' }, { status: 404 });
    }

    const vNf = valorNotaFiscal !== undefined ? parseFloat(valorNotaFiscal) : (existing.valorNotaFiscal || 0);
    const vGlosa = valorGlosa !== undefined ? parseFloat(valorGlosa) : (existing.valorGlosa || 0);
    const vAtestado = Math.max(0, vNf - vGlosa);

    const updated = await prisma.medicaoDespesa.update({
      where: { id },
      data: {
        ...(referenciaMesAno && { referenciaMesAno }),
        ...(processoSeiDespesa && { processoSeiDespesa }),
        ...(numeroNotaFiscal !== undefined && { numeroNotaFiscal }),
        ...(dataEmissaoNf !== undefined && {
          dataEmissaoNf: dataEmissaoNf ? new Date(dataEmissaoNf) : null,
        }),
        valorNotaFiscal: vNf,
        valorGlosa: vGlosa,
        ...(motivoGlosa !== undefined && { motivoGlosa }),
        valorAtestadoFinal: vAtestado,
        ...(status && { status }),
      },
      include: {
        contrato: {
          select: {
            id: true,
            numeroContrato: true,
            numeroEmpenho: true,
            objeto: true,
            processoSeiMae: true,
            valorGlobal: true,
            valorAtualizado: true,
            fornecedor: true,
          },
        },
        ordemServico: true,
      },
    });

    return NextResponse.json({ success: true, medicao: updated });
  } catch (error: any) {
    console.error('Erro ao editar medição:', error);
    return NextResponse.json({ error: error.message || 'Erro ao editar medição' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json(
        { error: 'Apenas administradores podem excluir medições/faturas.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch (e) {
        // body may be empty if called with query param
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'ID da medição é obrigatório.' }, { status: 400 });
    }

    const existing = await prisma.medicaoDespesa.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Medição não encontrada.' }, { status: 404 });
    }

    // O Administrador tem permissão irrestrita para exclusão de medições/faturas (inclusive atestadas ou liquidadas)
    await prisma.medicaoDespesa.delete({ where: { id } });

    registrarAuditoria({
      sistema: 'SGC',
      acao: 'EXCLUSAO',
      entidade: 'MedicaoDespesa',
      entidadeId: id,
      entidadeNome: `Medição ${existing.referenciaMesAno} - NF ${existing.numeroNotaFiscal || 'S/N'}`,
      descricao: `Exclusão de medição/fatura ref. ${existing.referenciaMesAno}`,
      usuario: {
        id: session.id,
        nome: session.nome,
        email: session.email,
        role: session.role,
      },
      dadosAnteriores: {
        id: existing.id,
        contratoId: existing.contratoId,
        referenciaMesAno: existing.referenciaMesAno,
        valorNotaFiscal: existing.valorNotaFiscal,
        status: existing.status,
      },
      rota: '/api/execucao/medicoes',
    });

    return NextResponse.json({ success: true, message: 'Medição/fatura excluída com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao excluir medição:', error);
    return NextResponse.json({ error: error.message || 'Erro ao excluir medição' }, { status: 500 });
  }
}


