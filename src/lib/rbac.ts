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

export function canPerformDefinitiveAttest(role: string, contractRoles: string[] = []): boolean {
  if (isAdminRole(role)) return true;
  if (role === 'GESTOR' || role === 'SUPLENTE') return true;
  return contractRoles.some((r) => r === 'GESTOR' || r === 'SUPLENTE');
}

export const canPerformDefinitiveReceipt = canPerformDefinitiveAttest;

export function canPerformProvisionalAttest(role: string, contractRoles: string[] = []): boolean {
  if (isAdminRole(role)) return true;
  if (role === 'FISCAL_TECNICO' || role === 'FISCAL_SETORIAL' || role === 'FISCAL_ADMINISTRATIVO') return true;
  return contractRoles.some(
    (r) => r === 'FISCAL_TECNICO' || r === 'FISCAL_SETORIAL' || r === 'FISCAL_ADMINISTRATIVO'
  );
}

export const canPerformTechnicalReceipt = canPerformProvisionalAttest;

/**
 * Recebimento Provisório Administrativo Complementar (Art. 140 da Lei 14.133/2021)
 * Competência do Fiscal Administrativo para conferir regularidade documental, certidões e encargos trabalhistas
 */
export function canPerformAdministrativeReceipt(role: string, contractRoles: string[] = []): boolean {
  if (isAdminRole(role)) return true;
  if (role === 'FISCAL_ADMINISTRATIVO') return true;
  return contractRoles.includes('FISCAL_ADMINISTRATIVO');
}

export function canIssueOrder(role: string, contractRoles: string[] = []): boolean {
  if (isAdminRole(role)) return true;
  if (role === 'GESTOR' || role === 'SUPLENTE' || role === 'FISCAL_ADMINISTRATIVO') return true;
  return contractRoles.some(
    (r) => r === 'GESTOR' || r === 'SUPLENTE' || r === 'FISCAL_ADMINISTRATIVO'
  );
}

export function canManageContaVinculada(role: string, contractRoles: string[] = []): boolean {
  if (isAdminRole(role)) return true;
  if (role === 'GESTOR' || role === 'SUPLENTE' || role === 'FISCAL_ADMINISTRATIVO') return true;
  return contractRoles.some(
    (r) => r === 'GESTOR' || r === 'SUPLENTE' || r === 'FISCAL_ADMINISTRATIVO'
  );
}

export function canManageTerceirizacao(role: string, contractRoles: string[] = []): boolean {
  if (isAdminRole(role)) return true;
  if (role === 'GESTOR' || role === 'SUPLENTE' || role === 'FISCAL_ADMINISTRATIVO') return true;
  return contractRoles.some(
    (r) => r === 'GESTOR' || r === 'SUPLENTE' || r === 'FISCAL_ADMINISTRATIVO'
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
