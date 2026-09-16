import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isAdminRole, canIssueOrder, getUserDesignatedContext } from '@/lib/rbac';
import crypto from 'crypto';

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
          return NextResponse.json({ ordens: [] });
        }
        whereClause.contratoId = contratoId;
      } else {
        whereClause.contratoId = { in: contractIds };
      }
    } else if (contratoId) {
      whereClause.contratoId = contratoId;
    }

    const ordens = await prisma.ordemServico.findMany({
      where: whereClause,
      include: {
        contrato: {
          select: {
            id: true,
            numeroContrato: true,
            numeroEmpenho: true,
            objeto: true,
            processoSeiMae: true,
            tipoContrato: true,
            fornecedor: true,
          },
        },
        fiscalAdm: {
          select: { id: true, nome: true, email: true, matricula: true, role: true },
        },
        medicoes: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ ordens });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar ordens de serviço' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const { contratoId, numeroOs, ano, processoSeiDespesa, descricaoServico, valorEstimado, tipoOrdem } = body;

    if (!contratoId || !numeroOs || !processoSeiDespesa || !descricaoServico || !valorEstimado) {
      return NextResponse.json(
        { error: 'Contrato, Número do documento, Processo SEI, Descrição e Valor Estimado são obrigatórios.' },
        { status: 400 }
      );
    }

    // Buscar contrato e validar tipo (Bens vs Serviços/Obras)
    const contrato = await prisma.contrato.findUnique({
      where: { id: contratoId },
      select: { id: true, tipoContrato: true, numeroContrato: true, numeroEmpenho: true },
    });

    if (!contrato) {
      return NextResponse.json({ error: 'Contrato não encontrado.' }, { status: 404 });
    }

    const isAquisicao =
      contrato.tipoContrato === 'FORNECIMENTO_SIMPLES' ||
      contrato.tipoContrato === 'FORNECIMENTO_CONTINUADO';

    if (tipoOrdem === 'ORDEM_COMPRA' && !isAquisicao) {
      return NextResponse.json(
        {
          error:
            'Apenas contratos de aquisição de bens/materiais (fornecimento) podem receber Ordem de Compra (OC). Para serviços e obras, emita uma Ordem de Serviço (OS).',
        },
        { status: 400 }
      );
    }

    if (tipoOrdem === 'ORDEM_SERVICO' && isAquisicao) {
      return NextResponse.json(
        {
          error:
            'Contratos de aquisição de bens/materiais devem receber Ordem de Compra (OC), não Ordem de Serviço (OS).',
        },
        { status: 400 }
      );
    }

    // Verificar se usuário tem permissão para emitir OS/OC e se está vinculado ao contrato
    if (!isAdminRole(session.role)) {
      if (!canIssueOrder(session.role)) {
        return NextResponse.json(
          { error: 'Seu perfil não possui permissão para emitir Ordem de Serviço ou de Compra.' },
          { status: 403 }
        );
      }

      const resp = await prisma.contratoResponsavel.findFirst({
        where: {
          contratoId,
          userId: session.id,
          ativo: true,
        },
      });

      if (!resp) {
        return NextResponse.json(
          { error: 'Apenas Gestores ou Fiscais vinculados a este contrato podem emitir Ordem de Serviço/Compra.' },
          { status: 403 }
        );
      }

      if (
        resp.tipoAtuacao &&
        !['GESTOR', 'SUPLENTE', 'FISCAL_ADMINISTRATIVO'].includes(resp.tipoAtuacao)
      ) {
        return NextResponse.json(
          { error: 'Apenas o Gestor ou Fiscal Administrativo deste contrato possui competência regimental para emitir Ordens de Serviço ou Compra.' },
          { status: 403 }
        );
      }
    }

    const prefixoDoc = tipoOrdem === 'ORDEM_COMPRA' ? 'UERN-OC' : 'UERN-OS';

    // Gerar Hash Criptográfico de Assinatura Eletrônica Institucional
    const timestamp = new Date().toISOString();
    const hashData = `${contratoId}:${numeroOs}:${processoSeiDespesa}:${session.id}:${timestamp}`;
    const hashAssinatura = crypto.createHash('sha256').update(hashData).digest('hex').slice(0, 32).toUpperCase();

    const ordem = await prisma.ordemServico.create({
      data: {
        contratoId,
        numeroOs,
        ano: ano ? parseInt(ano) : new Date().getFullYear(),
        fiscalAdmId: session.id,
        processoSeiDespesa,
        descricaoServico,
        valorEstimado: parseFloat(valorEstimado),
        hashAssinaturaEletronica: `${prefixoDoc}-${hashAssinatura}`,
        status: 'EMITIDA',
      },
      include: {
        contrato: true,
        fiscalAdm: true,
      },
    });

    return NextResponse.json({ success: true, ordem }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao emitir OS/OC:', error);
    return NextResponse.json({ error: error.message || 'Erro ao emitir ordem' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!isAdminRole(session.role)) {
      return NextResponse.json(
        { error: 'Apenas administradores da PROAD podem editar Ordens emitidas.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, numeroOs, ano, processoSeiDespesa, descricaoServico, valorEstimado, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID da Ordem é obrigatório.' }, { status: 400 });
    }

    const existing = await prisma.ordemServico.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Ordem não encontrada.' }, { status: 404 });
    }

    const updated = await prisma.ordemServico.update({
      where: { id },
      data: {
        ...(numeroOs && { numeroOs }),
        ...(ano && { ano: parseInt(ano) }),
        ...(processoSeiDespesa && { processoSeiDespesa }),
        ...(descricaoServico && { descricaoServico }),
        ...(valorEstimado !== undefined && { valorEstimado: parseFloat(valorEstimado) }),
        ...(status && { status }),
      },
      include: {
        contrato: true,
        fiscalAdm: true,
      },
    });

    return NextResponse.json({ success: true, ordem: updated });
  } catch (error: any) {
    console.error('Erro ao atualizar OS/OC:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar ordem' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json(
        { error: 'Apenas administradores podem excluir Ordens de Serviço ou Compra.' },
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
      return NextResponse.json({ error: 'ID da Ordem é obrigatório.' }, { status: 400 });
    }

    const existing = await prisma.ordemServico.findUnique({
      where: { id },
      include: {
        medicoes: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Ordem de serviço/compra não encontrada.' }, { status: 404 });
    }

    // Regra: Bloquear se houver medições com ateste definitivo ou liquidação
    const temMedicaoAtestada = existing.medicoes?.some(
      (m) => m.dataRecebimentoDefinitivo !== null || m.status === 'LIQUIDADO_PAGO'
    );

    if (temMedicaoAtestada) {
      return NextResponse.json(
        {
          error:
            'Não é permitido excluir ordens que já possuem medições/faturas atestadas definitivamente ou liquidadas.',
        },
        { status: 400 }
      );
    }

    // Se houver medições vinculadas ainda não atestadas, desvincular da OS
    await prisma.$transaction(async (tx) => {
      await tx.medicaoDespesa.updateMany({
        where: { ordemServicoId: id },
        data: { ordemServicoId: null },
      });
      await tx.ordemServico.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, message: 'Ordem excluída com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao excluir OS/OC:', error);
    return NextResponse.json({ error: error.message || 'Erro ao excluir ordem' }, { status: 500 });
  }
}


