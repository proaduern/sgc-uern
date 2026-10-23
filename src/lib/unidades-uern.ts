import prisma from './prisma';
export * from './cidades-constantes';
import { UnidadeUern, UNIDADES_UERN_PADRAO } from './cidades-constantes';

/**
 * Busca a lista canônica de unidades cadastradas no Portal PROAD (portal.portal_unidades),
 * com fallback para a lista padrão.
 */
export async function buscarUnidadesOficiais(): Promise<UnidadeUern[]> {
  try {
    const unidades = await prisma.$queryRawUnsafe<UnidadeUern[]>(
      `SELECT id, sigla, nome, campus FROM portal.portal_unidades WHERE ativo = true ORDER BY campus ASC, sigla ASC;`
    );
    if (unidades && unidades.length > 0) {
      return unidades;
    }
  } catch (err) {
    console.warn('Fallback para unidades estáticas da UERN (não foi possível consultar portal.portal_unidades):', err);
  }
  return UNIDADES_UERN_PADRAO;
}

/**
 * Consulta servidores cadastrados no Portal PROAD com sua respectiva unidade oficial e cidade.
 */
export async function buscarServidoresPortal(busca?: string): Promise<
  Array<{
    id: string;
    nome: string;
    email: string;
    matricula: string | null;
    unidadeId: string | null;
    unidadeSigla: string | null;
    unidadeNome: string | null;
    campus: string | null;
  }>
> {
  try {
    let sql = `
      SELECT 
        u.id, 
        u.nome, 
        u.email, 
        u.matricula, 
        u."unidadeId" as "unidadeId",
        un.sigla as "unidadeSigla", 
        un.nome as "unidadeNome", 
        un.campus as "campus"
      FROM portal.portal_usuarios u
      LEFT JOIN portal.portal_unidades un ON u."unidadeId" = un.id
      WHERE u.status = 'ATIVO'
    `;

    if (busca && busca.trim()) {
      const termo = busca.trim().replace(/'/g, "''");
      sql += ` AND (
        u.nome ILIKE '%${termo}%' 
        OR u.email ILIKE '%${termo}%' 
        OR u.matricula ILIKE '%${termo}%'
        OR un.sigla ILIKE '%${termo}%'
      )`;
    }

    sql += ` ORDER BY u.nome ASC LIMIT 100;`;

    const usuarios = await prisma.$queryRawUnsafe<any[]>(sql);
    return usuarios || [];
  } catch (err) {
    console.warn('Não foi possível consultar servidores no schema portal:', err);
    return [];
  }
}
