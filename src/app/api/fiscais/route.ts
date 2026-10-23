import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';
import { isAdminRole, getUserDesignatedContext } from '@/lib/rbac';
import {
  buscarUnidadesOficiais,
  buscarServidoresPortal,
  normalizarCidadeCampus,
} from '@/lib/unidades-uern';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const contratoId = searchParams.get('contratoId');

    const whereClause: any = { ativo: true };

    if (!isAdminRole(session.role)) {
      const { contractIds } = await getUserDesignatedContext(session.id);
      if (contratoId) {
        if (!contractIds.includes(contratoId)) return NextResponse.json({ designacoes: [] });
        whereClause.contratoId = contratoId;
      } else {
        whereClause.contratoId = { in: contractIds };
      }
    } else if (contratoId) {
      whereClause.contratoId = contratoId;
    }

    const designacoes = await prisma.contratoResponsavel.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
            matricula: true,
            role: true,
            deveTrocarSenha: true,
          },
        },
        contrato: {
          select: {
            id: true,
            numeroContrato: true,
            numeroEmpenho: true,
            objeto: true,
            processoSeiMae: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Lista de todos os servidores cadastrados e unidades para o seletor dinâmico
    let servidores: any[] = [];
    const unidades = await buscarUnidadesOficiais();

    if (isAdminRole(session.role)) {
      const [dbUsers, portalUsers] = await Promise.all([
        prisma.user.findMany({
          where: { ativo: true },
          select: {
            id: true,
            nome: true,
            email: true,
            matricula: true,
            role: true,
            unidadeId: true,
            unidadeSigla: true,
            unidadeNome: true,
            campus: true,
            _count: {
              select: {
                contratosDesignados: {
                  where: { ativo: true },
                },
              },
            },
          },
          orderBy: { nome: 'asc' },
        }),
        buscarServidoresPortal(),
      ]);

      const mapServidores = new Map<string, any>();

      // Insere usuários do SGC
      dbUsers.forEach((u) => {
        const emailKey = u.email.toLowerCase().trim();
        mapServidores.set(emailKey, {
          id: u.id,
          nome: u.nome,
          email: u.email,
          matricula: u.matricula,
          role: u.role,
          unidadeId: u.unidadeId,
          unidadeSigla: u.unidadeSigla,
          unidadeNome: u.unidadeNome,
          campus: u.campus || normalizarCidadeCampus(u.unidadeSigla || u.unidadeNome),
          totalDesignacoes: u._count?.contratosDesignados || 0,
          origem: 'SGC',
        });
      });

      // Mescla com diretório corporativo do Portal PROAD
      portalUsers.forEach((pu) => {
        const emailKey = pu.email.toLowerCase().trim();
        if (!mapServidores.has(emailKey)) {
          mapServidores.set(emailKey, {
            id: pu.id,
            nome: pu.nome,
            email: pu.email,
            matricula: pu.matricula,
            role: 'USUARIO',
            unidadeId: pu.unidadeId,
            unidadeSigla: pu.unidadeSigla,
            unidadeNome: pu.unidadeNome,
            campus: pu.campus || normalizarCidadeCampus(pu.unidadeSigla || pu.unidadeNome),
            totalDesignacoes: 0,
            origem: 'PORTAL_PROAD',
          });
        } else {
          const existing = mapServidores.get(emailKey)!;
          if (!existing.campus && pu.campus) existing.campus = pu.campus;
          if (!existing.unidadeSigla && pu.unidadeSigla) existing.unidadeSigla = pu.unidadeSigla;
          if (!existing.unidadeNome && pu.unidadeNome) existing.unidadeNome = pu.unidadeNome;
        }
      });

      servidores = Array.from(mapServidores.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    }

    return NextResponse.json({ designacoes, servidores, unidades });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao listar fiscais e gestores' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json(
        { error: 'Apenas administradores da PROAD podem designar fiscais por ato/portaria.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      userId,
      contratoId,
      nomeCompleto,
      email,
      matricula,
      unidadeId,
      unidadeSigla,
      unidadeNome,
      campus,
      tipoAtuacao, // GESTOR, SUPLENTE, FISCAL_ADMINISTRATIVO, FISCAL_TECNICO, FISCAL_SETORIAL
      numeroAtoDesignacao,
      idSeiAtoDesignacao,
      campusSetor,
    } = body;

    if (!contratoId || !tipoAtuacao || !numeroAtoDesignacao || !idSeiAtoDesignacao) {
      return NextResponse.json(
        { error: 'Contrato, papel de atuação, número do ato e ID SEI são obrigatórios.' },
        { status: 400 }
      );
    }

    let user = null;

    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user && email) {
        user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      }
      if (!user && nomeCompleto && email) {
        // Usuário pré-cadastrado no Portal PROAD: cria e sincroniza no SGC
        const defaultPasswordHash = await hashPassword('123');
        user = await prisma.user.create({
          data: {
            nome: nomeCompleto.trim(),
            email: email.trim().toLowerCase(),
            matricula: matricula?.trim() || null,
            unidadeId: unidadeId || null,
            unidadeSigla: unidadeSigla || null,
            unidadeNome: unidadeNome || null,
            campus: campus ? normalizarCidadeCampus(campus) : null,
            senhaHash: defaultPasswordHash,
            role: tipoAtuacao,
            deveTrocarSenha: true,
            ativo: true,
          },
        });
      } else if (!user) {
        return NextResponse.json(
          { error: 'Servidor selecionado não foi encontrado no sistema.' },
          { status: 404 }
        );
      } else {
        // Atualiza unidade/campus se ainda não definidos
        if ((unidadeSigla && !user.unidadeSigla) || (campus && !user.campus)) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              ...(unidadeId ? { unidadeId } : {}),
              ...(unidadeSigla ? { unidadeSigla } : {}),
              ...(unidadeNome ? { unidadeNome } : {}),
              ...(campus ? { campus: normalizarCidadeCampus(campus) } : {}),
            },
          });
        }
      }
    } else {
      if (!nomeCompleto || !email) {
        return NextResponse.json(
          { error: 'Nome completo e e-mail institucional são obrigatórios para novo servidor.' },
          { status: 400 }
        );
      }

      const cleanEmail = email.trim().toLowerCase();
      user = await prisma.user.findUnique({ where: { email: cleanEmail } });

      if (!user) {
        const defaultPasswordHash = await hashPassword('123');
        user = await prisma.user.create({
          data: {
            nome: nomeCompleto.trim(),
            email: cleanEmail,
            matricula: matricula?.trim() || null,
            unidadeId: unidadeId || null,
            unidadeSigla: unidadeSigla || null,
            unidadeNome: unidadeNome || null,
            campus: campus ? normalizarCidadeCampus(campus) : null,
            senhaHash: defaultPasswordHash,
            role: tipoAtuacao,
            deveTrocarSenha: true,
            ativo: true,
          },
        });
      } else if (unidadeSigla || campus) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            ...(unidadeId ? { unidadeId } : {}),
            ...(unidadeSigla ? { unidadeSigla } : {}),
            ...(unidadeNome ? { unidadeNome } : {}),
            ...(campus ? { campus: normalizarCidadeCampus(campus) } : {}),
          },
        });
      }
    }

    // Normaliza a cidade/campus para o Fiscal Setorial
    let campusSetorFinal = campusSetor || null;
    if (tipoAtuacao === 'FISCAL_SETORIAL') {
      const cidadeAlvo = campusSetor || user.campus || '';
      campusSetorFinal = normalizarCidadeCampus(cidadeAlvo);
    }

    // 2. Criar ou atualizar designação vinculada ao contrato
    const designacao = await prisma.contratoResponsavel.upsert({
      where: {
        contratoId_userId_tipoAtuacao: {
          contratoId,
          userId: user.id,
          tipoAtuacao,
        },
      },
      update: {
        numeroAtoDesignacao,
        idSeiAtoDesignacao,
        campusSetor: campusSetorFinal,
        ativo: true,
      },
      create: {
        contratoId,
        userId: user.id,
        tipoAtuacao,
        numeroAtoDesignacao,
        idSeiAtoDesignacao,
        campusSetor: campusSetorFinal,
        ativo: true,
      },
      include: {
        user: true,
        contrato: true,
      },
    });

    return NextResponse.json({ success: true, designacao }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao designar fiscal:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar designação' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: 'Apenas administradores da PROAD podem editar designações de fiscais.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      tipoAtuacao,
      numeroAtoDesignacao,
      idSeiAtoDesignacao,
      campusSetor,
      ativo,
      nomeCompleto,
      matricula,
      unidadeSigla,
      unidadeNome,
      campus,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID da designação é obrigatório.' }, { status: 400 });
    }

    const designacaoExistente = await prisma.contratoResponsavel.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!designacaoExistente) {
      return NextResponse.json({ error: 'Designação não encontrada.' }, { status: 404 });
    }

    // Se nome, matrícula ou unidade foram informados, atualiza também o usuário
    if (nomeCompleto || matricula !== undefined || unidadeSigla || campus) {
      await prisma.user.update({
        where: { id: designacaoExistente.userId },
        data: {
          ...(nomeCompleto ? { nome: nomeCompleto } : {}),
          ...(matricula !== undefined ? { matricula } : {}),
          ...(unidadeSigla ? { unidadeSigla } : {}),
          ...(unidadeNome ? { unidadeNome } : {}),
          ...(campus ? { campus: normalizarCidadeCampus(campus) } : {}),
        },
      });
    }

    let campusSetorFinal = campusSetor;
    const tipoFinal = tipoAtuacao || designacaoExistente.tipoAtuacao;
    if (tipoFinal === 'FISCAL_SETORIAL' && campusSetor) {
      campusSetorFinal = normalizarCidadeCampus(campusSetor);
    }

    const updated = await prisma.contratoResponsavel.update({
      where: { id },
      data: {
        ...(tipoAtuacao ? { tipoAtuacao } : {}),
        ...(numeroAtoDesignacao ? { numeroAtoDesignacao } : {}),
        ...(idSeiAtoDesignacao ? { idSeiAtoDesignacao } : {}),
        ...(campusSetor !== undefined ? { campusSetor: campusSetorFinal } : {}),
        ...(ativo !== undefined ? { ativo: Boolean(ativo) } : {}),
      },
      include: {
        user: true,
        contrato: true,
      },
    });

    return NextResponse.json({ success: true, designacao: updated });
  } catch (error: any) {
    console.error('Erro ao atualizar designação de fiscal:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar designação' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json(
        { error: 'Apenas administradores da PROAD podem excluir designações de fiscais.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch (e) {}
    }

    if (!id) {
      return NextResponse.json({ error: 'ID da designação é obrigatório.' }, { status: 400 });
    }

    const existing = await prisma.contratoResponsavel.findUnique({
      where: { id },
      include: {
        user: true,
        contrato: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Designação não encontrada.' }, { status: 404 });
    }

    await prisma.contratoResponsavel.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Designação de ${existing.user?.nome} no Contrato ${existing.contrato?.numeroContrato || existing.contrato?.processoSeiMae} excluída com sucesso.`,
    });
  } catch (error: any) {
    console.error('Erro ao excluir designação de fiscal:', error);
    return NextResponse.json({ error: error.message || 'Erro ao excluir designação' }, { status: 500 });
  }
}

