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
            tipoContrato: true,
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
      categoriasProfissionais,
      arquivoPdfUrl,
      itensFiscalizacao, // { salarios: [], beneficios: [], obrigacoesComPagamento: [], obrigacoesSemPagamento: [] }
      funcoes,
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
        return NextResponse.json({ error: 'Você não possui permissão para gerenciar a CCT deste contrato.' }, { status: 403 });
      }
    }

    let fiscalPayload = itensFiscalizacao;
    if (!fiscalPayload && (body.salarios || body.beneficios || body.obrigacoesComPagamento || body.obrigacoesPagamento || body.obrigacoesSemPagamento || body.regrasOperacionais)) {
      fiscalPayload = {
        salarios: body.salarios || [],
        beneficios: body.beneficios || [],
        obrigacoesComPagamento: body.obrigacoesComPagamento || body.obrigacoesPagamento || [],
        obrigacoesSemPagamento: body.obrigacoesSemPagamento || body.regrasOperacionais || [],
      };
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
          categoriasProfissionais: categoriasProfissionais || null,
          arquivoPdfUrl: arquivoPdfUrl || null,
          itensFiscalizacao: fiscalPayload || null,
        },
      });

      // Extrair funções a partir de funcoes ou itensFiscalizacao.salarios
      let listaFuncoes = funcoes;
      if (!listaFuncoes && fiscalPayload?.salarios && Array.isArray(fiscalPayload.salarios)) {
        listaFuncoes = fiscalPayload.salarios.map((s: any) => ({
          nomeFuncao: s.funcao || s.nomeFuncao,
          salarioPiso: s.salarioPiso || s.salario || 0,
        }));
      }

      if (listaFuncoes && Array.isArray(listaFuncoes)) {
        for (const f of listaFuncoes) {
          if (f.nomeFuncao || f.funcao) {
            await tx.convenioColetivoFuncao.create({
              data: {
                convenioId: conv.id,
                nomeFuncao: f.nomeFuncao || f.funcao,
                salarioPiso: parseFloat(f.salarioPiso || f.salario || 0),
                beneficioAlimentacao: f.beneficioAlimentacao ? parseFloat(f.beneficioAlimentacao) : null,
                beneficioTransporte: f.beneficioTransporte ? parseFloat(f.beneficioTransporte) : null,
                outrosBeneficios: f.outrosBeneficios || null,
              },
            });
          }
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
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!isAdminRole(session.role) && !canManageTerceirizacao(session.role)) {
      return NextResponse.json({ error: 'Seu perfil não possui permissão para editar Convenções Coletivas.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      numeroRegistroMte,
      sindicatoLaboral,
      sindicatoPatronal,
      vigenciaInicio,
      vigenciaFim,
      categoriasProfissionais,
      arquivoPdfUrl,
      itensFiscalizacao,
      funcoes,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID da CCT é obrigatório.' }, { status: 400 });
    }

    const cctExistente = await prisma.convenioColetivo.findUnique({
      where: { id },
      select: { contratoId: true },
    });

    if (!cctExistente) {
      return NextResponse.json({ error: 'CCT não encontrada.' }, { status: 404 });
    }

    if (!isAdminRole(session.role)) {
      const { contractIds } = await getUserDesignatedContext(session.id);
      if (!contractIds.includes(cctExistente.contratoId)) {
        return NextResponse.json({ error: 'Você não possui permissão para editar a CCT deste contrato.' }, { status: 403 });
      }
    }

    let fiscalPayload = itensFiscalizacao;
    if (!fiscalPayload && (body.salarios || body.beneficios || body.obrigacoesComPagamento || body.obrigacoesPagamento || body.obrigacoesSemPagamento || body.regrasOperacionais)) {
      fiscalPayload = {
        salarios: body.salarios || [],
        beneficios: body.beneficios || [],
        obrigacoesComPagamento: body.obrigacoesComPagamento || body.obrigacoesPagamento || [],
        obrigacoesSemPagamento: body.obrigacoesSemPagamento || body.regrasOperacionais || [],
      };
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
          ...(categoriasProfissionais !== undefined ? { categoriasProfissionais } : {}),
          ...(arquivoPdfUrl !== undefined ? { arquivoPdfUrl } : {}),
          ...(fiscalPayload !== undefined ? { itensFiscalizacao: fiscalPayload } : {}),
        },
      });

      let listaFuncoes = funcoes;
      if (!listaFuncoes && itensFiscalizacao?.salarios && Array.isArray(itensFiscalizacao.salarios)) {
        listaFuncoes = itensFiscalizacao.salarios.map((s: any) => ({
          nomeFuncao: s.funcao || s.nomeFuncao,
          salarioPiso: s.salarioPiso || s.salario || 0,
        }));
      }

      if (listaFuncoes && Array.isArray(listaFuncoes)) {
        await tx.convenioColetivoFuncao.deleteMany({
          where: { convenioId: id },
        });

        for (const f of listaFuncoes) {
          if (f.nomeFuncao || f.funcao) {
            await tx.convenioColetivoFuncao.create({
              data: {
                convenioId: id,
                nomeFuncao: f.nomeFuncao || f.funcao,
                salarioPiso: parseFloat(f.salarioPiso || f.salario || 0),
                beneficioAlimentacao: f.beneficioAlimentacao ? parseFloat(f.beneficioAlimentacao) : null,
                beneficioTransporte: f.beneficioTransporte ? parseFloat(f.beneficioTransporte) : null,
                outrosBeneficios: f.outrosBeneficios || null,
              },
            });
          }
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

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!isAdminRole(session.role) && !canManageTerceirizacao(session.role)) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID não informado' }, { status: 400 });

    const cct = await prisma.convenioColetivo.findUnique({
      where: { id },
      select: { contratoId: true },
    });

    if (!cct) return NextResponse.json({ error: 'CCT não encontrada' }, { status: 404 });

    if (!isAdminRole(session.role)) {
      const { contractIds } = await getUserDesignatedContext(session.id);
      if (!contractIds.includes(cct.contratoId)) {
        return NextResponse.json({ error: 'Acesso não autorizado a este contrato' }, { status: 403 });
      }
    }

    await prisma.convenioColetivo.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Convenção excluída com sucesso' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao excluir CCT' }, { status: 500 });
  }
}
