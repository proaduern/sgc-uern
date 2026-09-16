import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  isAdminRole,
  isGestorAtaRole,
  canManageAtas,
  canPerformDefinitiveAttest,
  canPerformProvisionalAttest,
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

    return NextResponse.json({
      user: {
        id: session.id,
        nome: session.nome,
        email: session.email,
        matricula: session.matricula,
        role: session.role,
        isAdmin,
        isGestorAta,
        isGestor: session.role === 'GESTOR' || session.role === 'SUPLENTE',
        isFiscalAdm: session.role === 'FISCAL_ADMINISTRATIVO',
        isFiscalTecnico: session.role === 'FISCAL_TECNICO',
        isFiscalSetorial: session.role === 'FISCAL_SETORIAL',
        canManageAtas: canManageAtas(session.role),
        canDefinitiveAttest: canPerformDefinitiveAttest(session.role),
        canProvisionalAttest: canPerformProvisionalAttest(session.role),
        canIssueOrder: canIssueOrder(session.role),
        canManageContaVinculada: canManageContaVinculada(session.role),
        canManageTerceirizacao: canManageTerceirizacao(session.role),
        designatedContractIds: contractIds,
        campusSetor,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao obter dados do usuário' }, { status: 500 });
  }
}
