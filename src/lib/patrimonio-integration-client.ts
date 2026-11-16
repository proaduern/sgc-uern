/**
 * Cliente de Integração SGC -> Controle de Estoque e Entregas (Patrimônio / DMP)
 * Permite que eventos de Recebimento Provisório (TRP), Recebimento Definitivo (TRD)
 * e Envio de Bens para o Demandante retroalimentem automaticamente o Estoque Central do Patrimônio.
 */

export interface NotificarPatrimonioParams {
  tipoEvento: 'RECEBIMENTO_PROVISORIO_TRP' | 'RECEBIMENTO_DEFINITIVO_TRD' | 'ENVIO_CARGA_DEMANDANTE';
  processoSei: string;
  itemDescricao: string;
  quantidade: number;
  destino: string;
  termoNumero?: string;
  guiaNumero?: string;
  recebedorNome?: string;
}

export async function notificarPatrimonioEstoque(
  params: NotificarPatrimonioParams
): Promise<{ sucesso: boolean; error?: string }> {
  try {
    const portalBaseUrl =
      process.env.PORTAL_PROAD_URL ||
      process.env.NEXT_PUBLIC_PORTAL_URL ||
      'https://portal-proad.vercel.app';
    const serviceKey =
      process.env.PROAD_SERVICE_KEY || 'proad_interop_internal_service_key_2026_uern';

    const response = await fetch(`${portalBaseUrl}/api/integracao/patrimonio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn('[Interop SGC -> Patrimônio] Falha ao notificar Patrimônio:', errData);
      return { sucesso: false, error: errData.error || response.statusText };
    }

    return { sucesso: true };
  } catch (err: any) {
    console.warn(
      '[Interop SGC -> Patrimônio] Aviso: Não foi possível contatar o serviço de Patrimônio:',
      err.message
    );
    return { sucesso: false, error: err.message };
  }
}
