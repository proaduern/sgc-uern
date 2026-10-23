import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isAdminRole, canManageTerceirizacao, getUserDesignatedContext } from '@/lib/rbac';
import { normalizarCidadeCampus } from '@/lib/cidades-constantes';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const contratoId = searchParams.get('contratoId');
    const competencia = searchParams.get('competencia'); // MM/AAAA

    if (!contratoId) {
      return NextResponse.json({ error: 'contratoId é obrigatório.' }, { status: 400 });
    }

    let whereTrabalhador: any = { contratoId, status: { not: 'DEMITIDO' } };

    if (!isAdminRole(session.role)) {
      const { contractIds } = await getUserDesignatedContext(session.id);
      if (!contractIds.includes(contratoId)) {
        return NextResponse.json({ error: 'Não autorizado para este contrato.' }, { status: 403 });
      }

      // Restrição de competência legal para Fiscal Setorial
      const desigSetorial = await prisma.contratoResponsavel.findFirst({
        where: {
          userId: session.id,
          contratoId,
          tipoAtuacao: 'FISCAL_SETORIAL',
          ativo: true,
        },
      });

      const desigGlobal = await prisma.contratoResponsavel.findFirst({
        where: {
          userId: session.id,
          contratoId,
          tipoAtuacao: { in: ['GESTOR', 'SUPLENTE', 'FISCAL_ADMINISTRATIVO', 'FISCAL_TECNICO'] },
          ativo: true,
        },
      });

      if (desigSetorial?.campusSetor && !desigGlobal) {
        const cidadeNorm = normalizarCidadeCampus(desigSetorial.campusSetor);
        whereTrabalhador.OR = [
          { campus: { contains: cidadeNorm, mode: 'insensitive' } },
          { campus: { contains: desigSetorial.campusSetor, mode: 'insensitive' } },
        ];
      }
    }

    // 1. Busca trabalhadores ativos do contrato (respeitando o escopo do fiscal setorial se aplicável)
    const trabalhadores = await prisma.trabalhadorTerceirizado.findMany({
      where: whereTrabalhador,
      orderBy: { nomeCompleto: 'asc' },
    });

    // 2. Busca frequências da competência selecionada
    const whereFreq: any = {
      contratoId,
      trabalhadorId: { in: trabalhadores.map((t) => t.id) },
    };
    if (competencia) {
      whereFreq.competenciaMesAno = competencia;
    }

    const frequencias = await prisma.frequenciaTrabalhador.findMany({
      where: whereFreq,
      include: {
        trabalhador: {
          select: {
            id: true,
            nomeCompleto: true,
            cpf: true,
            funcao: true,
            salarioBaseCct: true,
            campus: true,
            setorLotacao: true,
          },
        },
      },
      orderBy: { trabalhador: { nomeCompleto: 'asc' } },
    });

    const totalGlosa = frequencias.reduce((acc, f) => acc + (f.valorGlosaSugerida || 0), 0);
    const totalFaltas = frequencias.reduce((acc, f) => acc + (f.faltasInjustificadas || 0), 0);

    return NextResponse.json({
      trabalhadores,
      frequencias,
      resumo: {
        totalTrabalhadores: trabalhadores.length,
        totalApurados: frequencias.length,
        totalFaltasInjustificadas: totalFaltas,
        totalGlosaSugerida: totalGlosa,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao buscar frequências' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!isAdminRole(session.role) && !canManageTerceirizacao(session.role)) {
      return NextResponse.json({ error: 'Permissão insuficiente.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      contratoId,
      trabalhadorId,
      competenciaMesAno,
      diasPrevistos = 30,
      diasTrabalhados = 30,
      faltasInjustificadas = 0,
      faltasJustificadas = 0,
      diasSubstituidos = 0,
      statusApuracao = 'CONFERIDO',
      observacoes,
    } = body;

    if (!contratoId || !trabalhadorId || !competenciaMesAno) {
      return NextResponse.json(
        { error: 'contratoId, trabalhadorId e competenciaMesAno são obrigatórios.' },
        { status: 400 }
      );
    }

    // Busca trabalhador para calcular glosa sugerida
    const trabalhador = await prisma.trabalhadorTerceirizado.findUnique({
      where: { id: trabalhadorId },
      select: { salarioBaseCct: true },
    });

    const salario = trabalhador?.salarioBaseCct || 0;
    const diasBase = diasPrevistos > 0 ? diasPrevistos : 30;
    // Glosa por falta não reposta: (salário / diasBase) * faltasInjustificadas
    const valorGlosa = parseFloat(((salario / diasBase) * (Number(faltasInjustificadas) || 0)).toFixed(2));

    const frequencia = await prisma.frequenciaTrabalhador.upsert({
      where: {
        trabalhadorId_competenciaMesAno: {
          trabalhadorId,
          competenciaMesAno,
        },
      },
      create: {
        contratoId,
        trabalhadorId,
        competenciaMesAno,
        diasPrevistos: Number(diasPrevistos),
        diasTrabalhados: Number(diasTrabalhados),
        faltasInjustificadas: Number(faltasInjustificadas),
        faltasJustificadas: Number(faltasJustificadas),
        diasSubstituidos: Number(diasSubstituidos),
        valorGlosaSugerida: valorGlosa,
        statusApuracao,
        observacoes: observacoes || null,
      },
      update: {
        diasPrevistos: Number(diasPrevistos),
        diasTrabalhados: Number(diasTrabalhados),
        faltasInjustificadas: Number(faltasInjustificadas),
        faltasJustificadas: Number(faltasJustificadas),
        diasSubstituidos: Number(diasSubstituidos),
        valorGlosaSugerida: valorGlosa,
        statusApuracao,
        observacoes: observacoes !== undefined ? observacoes : undefined,
      },
    });

    return NextResponse.json({ success: true, frequencia }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao registrar frequência' }, { status: 500 });
  }
}
