import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const contratoId = searchParams.get('contratoId');

    const whereClause: any = {};
    if (contratoId) whereClause.contratoId = contratoId;

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
