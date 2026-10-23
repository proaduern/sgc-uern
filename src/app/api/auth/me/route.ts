import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  isAdminRole,
  isGestorAtaRole,
  canManageAtas,
  canPerformDefinitiveAttest,
  canPerformProvisionalAttest,
  canPerformAdministrativeReceipt,
  canIssueOrder,
  canManageContaVinculada,
  canManageTerceirizacao,
  getUserDesignatedContext,
} from '@/lib/rbac';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { contractIds, campusSetor } = await getUserDesignatedContext(session.id);
    const isAdmin = isAdminRole(session.role);
    const isGestorAta = isGestorAtaRole(session.role);

    // Consulta dados cadastrais atualizados do usuário (lotação e campus oficiais)
    const dbUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        unidadeId: true,
        unidadeSigla: true,
        unidadeNome: true,
        campus: true,
      },
    });

    // Consulta os papéis dinâmicos que o usuário exerce em cada contrato ativo
    const designacoes = await prisma.contratoResponsavel.findMany({
      where: { userId: session.id, ativo: true },
      select: { contratoId: true, tipoAtuacao: true, campusSetor: true },
    });

    const rolesNoUsuario = Array.from(new Set(designacoes.map((d) => d.tipoAtuacao.toString())));
    const hasGestor = rolesNoUsuario.includes('GESTOR') || rolesNoUsuario.includes('SUPLENTE');
    const hasFiscalAdm = rolesNoUsuario.includes('FISCAL_ADMINISTRATIVO');
    const hasFiscalTecnico = rolesNoUsuario.includes('FISCAL_TECNICO');
    const hasFiscalSetorial = rolesNoUsuario.includes('FISCAL_SETORIAL');

    return NextResponse.json({
      user: {
        id: session.id,
        nome: session.nome,
        email: session.email,
        matricula: session.matricula,
        role: session.role,
        isAdmin,
        isGestorAta,
        isGestor: isAdmin || session.role === 'GESTOR' || session.role === 'SUPLENTE' || hasGestor,
        isFiscalAdm: isAdmin || session.role === 'FISCAL_ADMINISTRATIVO' || hasFiscalAdm,
        isFiscalTecnico: isAdmin || session.role === 'FISCAL_TECNICO' || hasFiscalTecnico,
        isFiscalSetorial: isAdmin || session.role === 'FISCAL_SETORIAL' || hasFiscalSetorial,
        canManageAtas: canManageAtas(session.role),
        // Nomenclatura aderente à Lei 14.133/2021
        canDefinitiveAttest: isAdmin || canPerformDefinitiveAttest(session.role, rolesNoUsuario),
        canDefinitiveReceipt: isAdmin || canPerformDefinitiveAttest(session.role, rolesNoUsuario),
        canProvisionalAttest: isAdmin || canPerformProvisionalAttest(session.role, rolesNoUsuario),
        canTechnicalReceipt: isAdmin || canPerformProvisionalAttest(session.role, rolesNoUsuario),
        canAdministrativeReceipt: isAdmin || canPerformAdministrativeReceipt(session.role, rolesNoUsuario),
        // O Fiscal Administrativo e Gestor podem emitir OS e gerir Conta Vinculada
        canIssueOrder: isAdmin || canIssueOrder(session.role, rolesNoUsuario),
        canManageContaVinculada: isAdmin || canManageContaVinculada(session.role, rolesNoUsuario),
        canManageTerceirizacao: isAdmin || canManageTerceirizacao(session.role, rolesNoUsuario),
        designatedContractIds: contractIds,
        designacoes,
        campusSetor: campusSetor || dbUser?.campus || null,
        unidadeId: dbUser?.unidadeId || null,
        unidadeSigla: dbUser?.unidadeSigla || null,
        unidadeNome: dbUser?.unidadeNome || null,
        campus: dbUser?.campus || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao obter dados do usuário' }, { status: 500 });
  }
}
