import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isAdminRole, getUserDesignatedContext } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const now = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const isAdmin = isAdminRole(session.role);
    let contractWhere: any = { status: 'ATIVO' };
    let cctWhere: any = { vigenciaFim: { gte: now } };
    let terceirizadosWhere: any = { status: 'ATIVO' };

    if (!isAdmin) {
      const { contractIds } = await getUserDesignatedContext(session.id);
      contractWhere = {
        status: 'ATIVO',
        id: { in: contractIds },
      };
      cctWhere = {
        vigenciaFim: { gte: now },
        contratoId: { in: contractIds },
      };
      terceirizadosWhere = {
        status: 'ATIVO',
        contratoId: { in: contractIds },
      };
    }

    // 1. Contratos Ativos
    const contratosAtivosCount = await prisma.contrato.count({
      where: contractWhere,
    });

    // 2. Soma de Valor Global Sob Gestão
    const valorSoma = await prisma.contrato.aggregate({
      where: contractWhere,
      _sum: { valorAtualizado: true },
    });
    const valorGlobalTotal = valorSoma._sum.valorAtualizado || 0;

    // 3. Atas Vigentes (Apenas contadas para admin)
    const atasVigentesCount = isAdmin
      ? await prisma.ataRegistroPreco.count({ where: { status: 'VIGENTE' } })
      : 0;

    // 4. Terceirizados Ativos
    const terceirizadosCount = await prisma.trabalhadorTerceirizado.count({
      where: terceirizadosWhere,
    });

    // 5. Alertas de Vigência (Vencendo nos próximos 90 dias)
    const contratosVencendo = await prisma.contrato.findMany({
      where: {
        ...contractWhere,
        vigenciaFim: {
          gte: now,
          lte: ninetyDaysFromNow,
        },
      },
      include: { fornecedor: true },
      orderBy: { vigenciaFim: 'asc' },
      take: 5,
    });

    const alertas = [];

    // Formatar alertas reais de vigência
    for (const c of contratosVencendo) {
      const diasRestantes = Math.ceil(
        (new Date(c.vigenciaFim).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      alertas.push({
        id: `vigencia-${c.id}`,
        tipo: 'VIGENCIA',
        titulo: `Contrato nº ${c.numeroContrato || c.numeroEmpenho || 'S/N'} - ${c.fornecedor?.razaoSocial || 'Fornecedor'}`,
        badge: `Faltam ${diasRestantes} dias`,
        descricao: `Vigência expira em ${new Date(c.vigenciaFim).toLocaleDateString('pt-BR')}. Proceder com a abertura tempestiva de processo SEI para termo aditivo ou nova contratação conforme Art. 8º da IN 01/2026.`,
        nivel: diasRestantes <= 30 ? 'CRITICO' : 'ATENCAO',
        link: `/contratos`,
      });
    }

    // 6. Alertas de CCT (Convenções Coletivas com prazo de repactuação)
    const ccts = await prisma.convenioColetivo.findMany({
      where: {
        vigenciaFim: { gte: now },
      },
      include: { contrato: { include: { fornecedor: true } } },
      take: 3,
    });

    for (const cct of ccts) {
      if (cct.dataAssinatura) {
        const dataLimite = new Date(cct.dataAssinatura);
        dataLimite.setDate(dataLimite.getDate() + 90);
        if (dataLimite >= now) {
          const dias = Math.ceil((dataLimite.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          alertas.push({
            id: `cct-${cct.id}`,
            tipo: 'CCT',
            titulo: `CCT ${cct.sindicatoLaboral || 'Categoria'} - Prazo Decadencial de Repactuação`,
            badge: `${dias} dias restantes`,
            descricao: `Conforme Art. 64, §2º da IN 01/2026, a contratada tem até 90 dias da assinatura para protocolar o pedido de repactuação com efeitos retroativos.`,
            nivel: 'INFORMATIVO',
            link: `/terceirizacao`,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        contratosAtivos: contratosAtivosCount,
        valorGlobalTotal: valorGlobalTotal,
        atasVigentes: atasVigentesCount,
        alertasVigencia: contratosVencendo.length,
        alertasSaldoMedio: 0,
        terceirizadosAtivos: terceirizadosCount,
      },
      alertas,
    });
  } catch (error: any) {
    console.error('Erro ao buscar dados do dashboard:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar dados do dashboard' },
      { status: 500 }
    );
  }
}
