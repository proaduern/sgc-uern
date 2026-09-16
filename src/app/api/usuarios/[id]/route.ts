import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';
import { isAdminRole } from '@/lib/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        matricula: true,
        role: true,
        deveTrocarSenha: true,
        ativo: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar usuário' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN_PROAD') {
      return NextResponse.json(
        { error: 'Apenas Administradores Gerais da PROAD podem editar usuários.' },
        { status: 403 }
      );
    }

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    const body = await request.json();
    const { nome, email, matricula, role, ativo, resetPassword } = body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Se alterou e-mail, verificar se já pertence a outro usuário
    if (email && email.trim().toLowerCase() !== existing.email.toLowerCase()) {
      const emailEmUso = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
      if (emailEmUso) {
        return NextResponse.json(
          { error: 'Este e-mail já está sendo utilizado por outro usuário.' },
          { status: 409 }
        );
      }
    }

    const dataToUpdate: any = {};
    if (nome) dataToUpdate.nome = nome.trim();
    if (email) dataToUpdate.email = email.trim().toLowerCase();
    if (matricula !== undefined) dataToUpdate.matricula = matricula ? matricula.trim() : null;
    if (role) dataToUpdate.role = role;
    if (ativo !== undefined) dataToUpdate.ativo = Boolean(ativo);

    // Resetar senha para o padrão institucional '123'
    if (resetPassword) {
      dataToUpdate.senhaHash = await hashPassword('123');
      dataToUpdate.deveTrocarSenha = true;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        nome: true,
        email: true,
        matricula: true,
        role: true,
        deveTrocarSenha: true,
        ativo: true,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar usuário' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN_PROAD') {
      return NextResponse.json(
        { error: 'Apenas Administradores Gerais da PROAD podem excluir usuários.' },
        { status: 403 }
      );
    }

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    // Proteção contra auto-exclusão do administrador logado
    if (session.id === id) {
      return NextResponse.json(
        { error: 'Você não pode excluir sua própria conta de administrador.' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      include: {
        ordensServico: { select: { id: true } },
        atasGerenciadas: { select: { id: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Se o usuário já assinou Ordens de Serviço ou gerencia Atas oficiais,
    // preservamos a rastreabilidade e sugerimos inativação.
    if (existing.ordensServico && existing.ordensServico.length > 0) {
      return NextResponse.json(
        {
          error:
            'Este usuário possui Ordens de Serviço/Compra emitidas com chancela eletrônica. Para manter a auditoria da UERN, desative a conta em vez de excluí-la.',
        },
        { status: 400 }
      );
    }

    if (existing.atasGerenciadas && existing.atasGerenciadas.length > 0) {
      return NextResponse.json(
        {
          error:
            'Este usuário está designado como Gestor titular de Atas de Registro de Preço vigentes. Transfira a ata para outro gestor antes de excluí-lo.',
        },
        { status: 400 }
      );
    }

    // Exclusão segura em transação (removendo designações e alertas)
    await prisma.$transaction(async (tx) => {
      await tx.contratoResponsavel.deleteMany({ where: { userId: id } });
      await tx.alertaSistema.deleteMany({ where: { destinatarioId: id } });
      await tx.contratoRascunho.deleteMany({ where: { usuarioId: id } });
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, message: 'Usuário excluído com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao excluir usuário:', error);
    return NextResponse.json({ error: error.message || 'Erro ao excluir usuário' }, { status: 500 });
  }
}
