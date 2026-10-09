/**
 * Cliente de Auditoria Central do Ecossistema PROAD UERN
 * Despacha eventos de rastreabilidade (quem, o quê, quando e onde com diff)
 * de forma assíncrona e não-bloqueante para o cofre central no Portal PROAD.
 */

export interface EventoAuditoria {
  sistema?: 'SGC' | 'PCA' | 'MANUTENCAO' | 'DIARIAS' | 'PORTAL';
  acao: string; // CRIACAO, EDICAO, EXCLUSAO, ADITIVO, MEDICAO, DESIGNACAO_FISCAL, etc.
  entidade: string; // Contrato, AtaRegistroPreco, TermoAditivo, Medicao, etc.
  entidadeId?: string | number | null;
  entidadeNome?: string | null;
  descricao: string;
  usuario: {
    id?: string | null;
    nome?: string | null;
    email: string;
    role?: string | null;
    unidadeSigla?: string | null;
  };
  dadosAnteriores?: any;
  dadosNovos?: any;
  camposAlterados?: string[];
  rota?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

const PORTAL_URL = process.env.PORTAL_PROAD_URL || 'https://portal-proad.vercel.app';
const SERVICE_KEY = process.env.PROAD_SERVICE_KEY || 'proad_interop_internal_service_key_2026_uern';

function calcularDiff(antigo: any, novo: any): string[] {
  if (!antigo || !novo || typeof antigo !== 'object' || typeof novo !== 'object') {
    return [];
  }
  const chaves = Array.from(new Set([...Object.keys(antigo), ...Object.keys(novo)]));
  const alterados: string[] = [];

  for (const k of chaves) {
    if (['atualizadoEm', 'updatedAt', 'id'].includes(k)) continue;
    const vAntigo = antigo[k];
    const vNovo = novo[k];

    const jsonAntigo = JSON.stringify(vAntigo);
    const jsonNovo = JSON.stringify(vNovo);

    if (jsonAntigo !== jsonNovo) {
      alterados.push(k);
    }
  }
  return alterados;
}

export async function registrarAuditoria(evento: EventoAuditoria): Promise<void> {
  // Executa de forma assíncrona e segura (não interrompe o fluxo principal caso falhe)
  try {
    let campos = evento.camposAlterados;
    if ((!campos || campos.length === 0) && evento.dadosAnteriores && evento.dadosNovos) {
      campos = calcularDiff(evento.dadosAnteriores, evento.dadosNovos);
    }

    const payload = {
      sistema: evento.sistema || 'SGC',
      acao: evento.acao.toUpperCase(),
      entidade: evento.entidade,
      entidadeId: evento.entidadeId ? String(evento.entidadeId) : null,
      entidadeNome: evento.entidadeNome || null,
      descricao: evento.descricao,
      usuarioId: evento.usuario.id || null,
      usuarioNome: evento.usuario.nome || 'Operador SGC',
      usuarioEmail: evento.usuario.email,
      usuarioRole: evento.usuario.role || 'GESTOR',
      unidadeSigla: evento.usuario.unidadeSigla || 'UERN',
      dadosAnteriores: evento.dadosAnteriores ?? undefined,
      dadosNovos: evento.dadosNovos ?? undefined,
      camposAlterados: campos || [],
      rota: evento.rota || null,
      ip: evento.ip || null,
      userAgent: evento.userAgent || null,
    };

    // Enviar ao endpoint central no Portal PROAD
    fetch(`${PORTAL_URL}/api/auditoria/registrar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.warn('[AUDIT_SGC_WARN] Falha ao enviar log para o Portal PROAD:', err?.message || err);
    });
  } catch (error) {
    console.warn('[AUDIT_SGC_ERROR] Erro ao preparar log de auditoria:', error);
  }
}
