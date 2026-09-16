import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isAdminRole, canManageTerceirizacao, getUserDesignatedContext } from '@/lib/rbac';

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
        if (!contractIds.includes(contratoId)) return NextResponse.json({ convencoes: [] });
        whereClause.contratoId = contratoId;
      } else {
        whereClause.contratoId = { in: contractIds };
      }
    } else if (contratoId) {
      whereClause.contratoId = contratoId;
    }

    const convencoes = await prisma.convenioColetivo.findMany({
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
        funcoes: true,
      },
      orderBy: { vigenciaInicio: 'desc' },
    });

    return NextResponse.json({ convencoes });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar convenções coletivas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!isAdminRole(session.role) && !canManageTerceirizacao(session.role)) {
      return NextResponse.json(
        { error: 'Seu perfil não possui permissão para cadastrar Convenção Coletiva.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      contratoId,
      numeroRegistroMte,
      sindicatoLaboral,
      sindicatoPatronal,
      vigenciaInicio,
      vigenciaFim,
      arquivoPdfUrl,
      funcoes, // Array<{ nomeFuncao, salarioPiso, beneficioAlimentacao?, beneficioTransporte? }>
    } = body;

    if (!contratoId || !vigenciaInicio || !vigenciaFim) {
      return NextResponse.json(
        { error: 'Contrato e Vigência são obrigatórios para a CCT.' },
        { status: 400 }
      );
    }

    if (!isAdminRole(session.role)) {
      const { contractIds } = await getUserDesignatedContext(session.id);
      if (!contractIds.includes(contratoId)) {
        return NextResponse.json({ error: 'Não autorizado para este contrato.' }, { status: 403 });
      }
    }

    const cct = await prisma.$transaction(async (tx) => {
      const conv = await tx.convenioColetivo.create({
        data: {
          contratoId,
          numeroRegistroMte: numeroRegistroMte || null,
          sindicatoLaboral: sindicatoLaboral || null,
          sindicatoPatronal: sindicatoPatronal || null,
          vigenciaInicio: new Date(vigenciaInicio),
          vigenciaFim: new Date(vigenciaFim),
          arquivoPdfUrl: arquivoPdfUrl || null,
        },
      });

      if (funcoes && Array.isArray(funcoes)) {
        for (const f of funcoes) {
          await tx.convenioColetivoFuncao.create({
            data: {
              convenioId: conv.id,
              nomeFuncao: f.nomeFuncao,
              salarioPiso: parseFloat(f.salarioPiso),
              beneficioAlimentacao: f.beneficioAlimentacao ? parseFloat(f.beneficioAlimentacao) : null,
              beneficioTransporte: f.beneficioTransporte ? parseFloat(f.beneficioTransporte) : null,
              outrosBeneficios: f.outrosBeneficios || null,
            },
          });
        }
      }

      return conv;
    });

    return NextResponse.json({ success: true, convenio: cct }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar CCT:', error);
    return NextResponse.json({ error: error.message || 'Erro ao cadastrar CCT' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: 'Apenas administradores da PROAD podem editar Convenções Coletivas.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      numeroRegistroMte,
      sindicatoLaboral,
      sindicatoPatronal,
      vigenciaInicio,
      vigenciaFim,
      arquivoPdfUrl,
      funcoes,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID da CCT é obrigatório.' }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const cct = await tx.convenioColetivo.update({
        where: { id },
        data: {
          ...(numeroRegistroMte !== undefined ? { numeroRegistroMte } : {}),
          ...(sindicatoLaboral !== undefined ? { sindicatoLaboral } : {}),
          ...(sindicatoPatronal !== undefined ? { sindicatoPatronal } : {}),
          ...(vigenciaInicio ? { vigenciaInicio: new Date(vigenciaInicio) } : {}),
          ...(vigenciaFim ? { vigenciaFim: new Date(vigenciaFim) } : {}),
          ...(arquivoPdfUrl !== undefined ? { arquivoPdfUrl } : {}),
        },
      });

      if (funcoes && Array.isArray(funcoes)) {
        await tx.convenioColetivoFuncao.deleteMany({
          where: { convenioId: id },
        });

        for (const f of funcoes) {
          await tx.convenioColetivoFuncao.create({
            data: {
              convenioId: id,
              nomeFuncao: f.nomeFuncao,
              salarioPiso: parseFloat(f.salarioPiso),
              beneficioAlimentacao: f.beneficioAlimentacao ? parseFloat(f.beneficioAlimentacao) : null,
              beneficioTransporte: f.beneficioTransporte ? parseFloat(f.beneficioTransporte) : null,
              outrosBeneficios: f.outrosBeneficios || null,
            },
          });
        }
      }

      return cct;
    });

    return NextResponse.json({ success: true, convenio: updated });
  } catch (error: any) {
    console.error('Erro ao atualizar CCT:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar CCT' }, { status: 500 });
  }
}
