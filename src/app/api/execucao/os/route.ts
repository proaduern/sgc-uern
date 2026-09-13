import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const contratoId = searchParams.get('contratoId');

    const whereClause: any = {};
    if (contratoId) whereClause.contratoId = contratoId;

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
            fornecedor: true,
          },
        },
        fiscalAdm: {
          select: { id: true, nome: true, email: true, matricula: true },
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
    const { contratoId, numeroOs, ano, processoSeiDespesa, descricaoServico, valorEstimado } = body;

    if (!contratoId || !numeroOs || !processoSeiDespesa || !descricaoServico || !valorEstimado) {
      return NextResponse.json(
        { error: 'Contrato, Número da OS, Processo SEI, Descrição e Valor Estimado são obrigatórios.' },
        { status: 400 }
      );
    }

    // Verificar se fiscal administrativo está vinculado ao contrato (ou se é ADMIN_PROAD)
    if (session.role !== 'ADMIN_PROAD' && session.role !== 'ADMIN_PARCIAL') {
      const resp = await prisma.contratoResponsavel.findFirst({
        where: {
          contratoId,
          userId: session.id,
          tipoAtuacao: 'FISCAL_ADMINISTRATIVO',
          ativo: true,
        },
      });

      if (!resp) {
        return NextResponse.json(
          { error: 'Apenas o Fiscal Administrativo vinculado a este contrato pode emitir Ordem de Serviço.' },
          { status: 403 }
        );
      }
    }

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
        hashAssinaturaEletronica: `UERN-OS-${hashAssinatura}`,
        status: 'EMITIDA',
      },
      include: {
        contrato: true,
        fiscalAdm: true,
      },
    });

    return NextResponse.json({ success: true, ordem }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao emitir OS:', error);
    return NextResponse.json({ error: error.message || 'Erro ao emitir ordem de serviço' }, { status: 500 });
  }
}
