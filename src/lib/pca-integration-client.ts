/**
 * Cliente de Integração SGC -> PCA (Retroalimentação em Tempo Real)
 * Permite que eventos da fase de Gestão de Contratos (Formalização, Recebimento Provisório,
 * Recebimento Definitivo/Atesto da Nota Fiscal) retroalimentem os itens correspondentes no PCA.
 */

interface NotificarPcaParams {
  contratoId?: string;
  numeroContrato?: string;
  ataId?: string;
  numeroAta?: string;
  fornecedorNome?: string;
  fornecedorCnpj?: string;
  origemPcaConsolidacaoId?: string | null;
  itensOrigemPcaIds?: (string | null)[];
  statusExecucao: "CONTRATADO" | "EM_EXECUCAO" | "RECEBIDO_PROVISORIO" | "RECEBIDO_DEFINITIVO" | "PAGO" | "REMETIDO_DEMANDANTE";
  dataRecebimentoProv?: Date | string | null;
  dataRecebimentoDef?: Date | string | null;
  dataAtesto?: Date | string | null;
  numeroNotaFiscal?: string | null;
}

export async function notificarPcaExecucao(params: NotificarPcaParams): Promise<{ sucesso: boolean; error?: string }> {
  try {
    const pcaBaseUrl = process.env.PCA_API_URL || "http://localhost:3000";
    const serviceKey = process.env.PROAD_SERVICE_KEY || "proad_interop_internal_service_key_2026_uern";

    const payload = {
      ...params,
      itensOrigemPcaIds: params.itensOrigemPcaIds?.filter(Boolean),
    };

    const response = await fetch(`${pcaBaseUrl}/api/integracao/sgc/atualizar-execucao-item`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn("[Interop SGC -> PCA] Falha ao notificar PCA:", errData);
      return { sucesso: false, error: errData.error || response.statusText };
    }

    const data = await response.json();
    return { sucesso: true };
  } catch (err: any) {
    // Falha silenciosa para não quebrar a transação no SGC se o PCA estiver temporariamente offline
    console.warn("[Interop SGC -> PCA] Aviso: Não foi possível contatar o serviço do PCA:", err.message);
    return { sucesso: false, error: err.message };
  }
}
