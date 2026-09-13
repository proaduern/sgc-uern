import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const contratoId = searchParams.get('contratoId');

    const whereClause: any = { ativo: true };
    if (contratoId) {
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

    return NextResponse.json({ designacoes });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao listar fiscais e gestores' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN_PROAD' && session.role !== 'ADMIN_PARCIAL' && session.role !== 'GESTOR')) {
      return NextResponse.json(
        { error: 'Apenas a PROAD ou Gestor do Contrato podem designar fiscais.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      contratoId,
      nomeCompleto,
      email,
      matricula,
      tipoAtuacao, // GESTOR, SUPLENTE, FISCAL_ADMINISTRATIVO, FISCAL_TECNICO, FISCAL_SETORIAL
      numeroAtoDesignacao,
      idSeiAtoDesignacao,
      campusSetor,
    } = body;

    if (!contratoId || !nomeCompleto || !email || !tipoAtuacao || !numeroAtoDesignacao || !idSeiAtoDesignacao) {
      return NextResponse.json(
        { error: 'Todos os campos de identificação, atuação e ato de designação são obrigatórios.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Localizar ou criar o usuário com senha padrão '123' e deveTrocarSenha = true
    let user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    if (!user) {
      const defaultPasswordHash = await hashPassword('123');
      user = await prisma.user.create({
        data: {
          nome: nomeCompleto,
          email: cleanEmail,
          matricula: matricula || null,
          senhaHash: defaultPasswordHash,
          role: tipoAtuacao,
          deveTrocarSenha: true,
          ativo: true,
        },
      });
    }

    // 2. Criar designação vinculada ao contrato
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
        campusSetor: campusSetor || null,
        ativo: true,
      },
      create: {
        contratoId,
        userId: user.id,
        tipoAtuacao,
        numeroAtoDesignacao,
        idSeiAtoDesignacao,
        campusSetor: campusSetor || null,
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
