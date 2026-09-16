import prisma from '@/lib/prisma';
import { UserSession } from '@/lib/auth';

export interface UserPermissions {
  isAdmin: boolean;
  isGestor: boolean;
  isGestorAta: boolean;
  isFiscalAdm: boolean;
  isFiscalTecnico: boolean;
  isFiscalSetorial: boolean;
  canManageAtas: boolean;
  designatedContractIds: string[];
  campusSetor: string | null;
}

export function isAdminRole(role: string): boolean {
  return role === 'ADMIN_PROAD' || role === 'ADMIN_PARCIAL';
}

export function isGestorAtaRole(role: string): boolean {
  return role === 'GESTOR_ATA';
}

export function canManageAtas(role: string): boolean {
  return isAdminRole(role) || role === 'GESTOR_ATA';
}

export function canPerformDefinitiveAttest(role: string): boolean {
  return isAdminRole(role) || role === 'GESTOR' || role === 'SUPLENTE';
}

export function canPerformProvisionalAttest(role: string): boolean {
  return (
    isAdminRole(role) ||
    role === 'FISCAL_ADMINISTRATIVO' ||
    role === 'FISCAL_TECNICO' ||
    role === 'FISCAL_SETORIAL'
  );
}

export function canIssueOrder(role: string): boolean {
  return (
    isAdminRole(role) ||
    role === 'GESTOR' ||
    role === 'SUPLENTE' ||
    role === 'FISCAL_ADMINISTRATIVO'
  );
}

export function canManageContaVinculada(role: string): boolean {
  return (
    isAdminRole(role) ||
    role === 'GESTOR' ||
    role === 'SUPLENTE' ||
    role === 'FISCAL_ADMINISTRATIVO'
  );
}

export function canManageTerceirizacao(role: string): boolean {
  return (
    isAdminRole(role) ||
    role === 'GESTOR' ||
    role === 'SUPLENTE' ||
    role === 'FISCAL_ADMINISTRATIVO'
  );
}

export async function getUserDesignatedContext(userId: string): Promise<{
  contractIds: string[];
  campusSetor: string | null;
}> {
  const designacoes = await prisma.contratoResponsavel.findMany({
    where: {
      userId,
      ativo: true,
    },
    select: {
      contratoId: true,
      campusSetor: true,
    },
  });

  const contractIds = Array.from(new Set(designacoes.map((d) => d.contratoId)));
  const campusSetor = designacoes.find((d) => d.campusSetor)?.campusSetor || null;

  return { contractIds, campusSetor };
}
