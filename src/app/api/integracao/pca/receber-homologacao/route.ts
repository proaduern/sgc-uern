import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const serviceKey = process.env.PROAD_SERVICE_KEY || "proad_interop_internal_service_key_2026_uern";

    if (authHeader && authHeader !== `Bearer ${serviceKey}`) {
      return NextResponse.json({ error: "Chave de integração PROAD inválida ou ausente." }, { status: 401 });
    }

    const body = await request.json();
    const {
      consolidacaoId,
      processoSei,
      objeto,
      tipoContratacao, // "ATA" | "NORMAL"
      empenhoSubstituiContrato = false,
      vigenciaInicio = new Date().toISOString(),
      vigenciaFim = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      fornecedor,
      itens = [],
      pacotesFornecedores,
      valorGlobal,
      tipoContrato,
      ano = new Date().getFullYear(),
    } = body;

    // Normaliza pacotes de fornecedores (suporta único fornecedor ou múltiplos fornecedores vencedores por item/grupo)
    const pacotes: Array<{ fornecedor: any; itens: any[] }> =
      Array.isArray(pacotesFornecedores) && pacotesFornecedores.length > 0
        ? pacotesFornecedores.filter((p: any) => p?.fornecedor?.cnpj && Array.isArray(p?.itens) && p.itens.length > 0)
        : fornecedor?.cnpj && Array.isArray(itens) && itens.length > 0
        ? [{ fornecedor, itens }]
        : [];

    if (!processoSei || pacotes.length === 0) {
      return NextResponse.json(
        { error: "Dados incompletos: processoSei e pelo menos um fornecedor com itens homologados são obrigatórios." },
        { status: 400 }
      );
    }

    // Busca usuário administrador para notificações
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN_PROAD", ativo: true },
    });

    const registrosCriados: Array<{
      id: string;
      tipo: "ATA" | "CONTRATO";
      numeroRegistro: string | null;
      fornecedorRazaoSocial: string;
      fornecedorCnpj: string;
      valorTotalHomologado: number;
      quantidadeItens: number;
      etapaFluxoPosHomologacao?: string;
    }> = [];

    for (let pkgIndex = 0; pkgIndex < pacotes.length; pkgIndex++) {
      const pkg = pacotes[pkgIndex];
      const pkgFornecedor = pkg.fornecedor;
      const pkgItens = pkg.itens;

      // 1. Localiza ou cria Fornecedor
      const cnpjLimpo = String(pkgFornecedor.cnpj).replace(/\D/g, "");
      let fornecedorDb = await prisma.fornecedor.findFirst({
        where: { cnpj: cnpjLimpo },
      });

      if (!fornecedorDb) {
        fornecedorDb = await prisma.fornecedor.create({
          data: {
            cnpj: cnpjLimpo,
            razaoSocial: pkgFornecedor.razaoSocial || "Fornecedor Vencedor",
            nomeFantasia: pkgFornecedor.nomeFantasia || pkgFornecedor.razaoSocial || "Fornecedor Vencedor",
            email: pkgFornecedor.email || "contato@fornecedor.com.br",
            telefone: pkgFornecedor.telefone || "(84) 3315-2000",
            statusSicaf: "REGULAR",
          },
        });
      }

      // 2. Normaliza itens garantindo sempre o preço real homologado
      const itensNormalizados = pkgItens.map((it: any, index: number) => {
        const quantidadeReal = Number(it.quantidadeHomologada ?? it.quantidade) || 1;
        const valorUnitarioReal = Number(
          it.valorUnitarioHomologado ?? it.precoHomologado ?? it.valorUnitario ?? 0
        );
        const valorTotalInformado = Number(it.valorTotalHomologado ?? it.valorTotal ?? 0);
        const valorTotalReal =
          valorUnitarioReal > 0
            ? Number((valorUnitarioReal * quantidadeReal).toFixed(2))
            : valorTotalInformado;

        return {
          ...it,
          numeroItem: it.numeroItem || index + 1,
          quantidadeReal,
          valorUnitarioReal,
          valorTotalReal,
        };
      });

      const somaItensPacote = itensNormalizados.reduce(
        (acc: number, it: any) => acc + (Number(it.valorTotalReal) || 0),
        0
      );
      const valorTotalPacote =
        somaItensPacote > 0
          ? Number(somaItensPacote.toFixed(2))
          : pacotes.length === 1 && valorGlobal
          ? Number(valorGlobal)
          : 0;

      // -------------------------------------------------------------
      // Fluxo A: Ata de Registro de Preço (ARP) — Direto para Gestão de Atas sem exigir Empenho prévio
      // -------------------------------------------------------------
      if (tipoContratacao === "ATA") {
        const sufixoMulti = pacotes.length > 1 ? `-F${pkgIndex + 1}` : "";
        const numeroAtaFormatado = `ARP nº ${ano}-${processoSei.replace(/\D/g, "").slice(-4) || "001"}${sufixoMulti}/${ano}`;

        const ata = await prisma.ataRegistroPreco.create({
          data: {
            numeroAta: numeroAtaFormatado,
            ano: Number(ano),
            processoSei: processoSei,
            objeto: objeto || "Aquisição/Contratação decorrente do Sistema de Registro de Preços - PCA UERN",
            fornecedorId: fornecedorDb.id,
            vigenciaInicio: new Date(vigenciaInicio),
            vigenciaFim: new Date(vigenciaFim),
            valorGlobalOriginal: Number(valorTotalPacote),
            valorGlobalAtual: Number(valorTotalPacote),
            status: "VIGENTE",
            origemPcaConsolidacaoId: consolidacaoId || null,
            itens: {
              create: itensNormalizados.map((it: any) => ({
                numeroItem: it.numeroItem,
                descricao: it.descricao || "Item Registrado",
                marcaModelo: it.marcaModelo || null,
                unidade: it.unidade || "UN",
                quantidadeRegistrada: it.quantidadeReal,
                quantidadeSaldo: it.quantidadeReal,
                valorUnitario: it.valorUnitarioReal,
                valorTotal: it.valorTotalReal,
                origemPcaItemId: it.origemPcaItemId || null,
              })),
            },
          },
          include: { itens: true },
        });

        if (adminUser) {
          await prisma.alertaSistema.create({
            data: {
              destinatarioId: adminUser.id,
              tipoAlerta: "NOVA_ATA_PCA",
              nivel: "INFO",
              titulo: `Nova Ata de Registro de Preços Recebida do PCA`,
              mensagem: `Ata ${ata.numeroAta} gerada automaticamente para o Processo SEI ${processoSei} (Fornecedor: ${fornecedorDb.razaoSocial}, R$ ${Number(valorTotalPacote).toLocaleString("pt-BR")}). Disponível diretamente no Módulo de Gestão de Atas (sem exigência de empenho prévio).`,
            },
          });
        }

        registrosCriados.push({
          id: ata.id,
          tipo: "ATA",
          numeroRegistro: ata.numeroAta,
          fornecedorRazaoSocial: fornecedorDb.razaoSocial,
          fornecedorCnpj: fornecedorDb.cnpj,
          valorTotalHomologado: Number(valorTotalPacote),
          quantidadeItens: ata.itens.length,
        });
      } else {
        // -------------------------------------------------------------
        // Fluxo B: Contratação Tradicional ("NORMAL") -> Inicia na 1ª Etapa da Esteira Pós-Homologação no SGC (Setor de Empenho)
        // -------------------------------------------------------------
        const eServico = itensNormalizados.some((it: any) => it.tipoCategoria === "SERVICO");
        const exigeFormal = !Boolean(empenhoSubstituiContrato);

        const contrato = await prisma.contrato.create({
          data: {
            processoSeiMae: processoSei,
            licitacaoProcedimento: `Pregão / Dispensa PCA ${processoSei}`,
            objeto: objeto || "Contratação decorrente do Planejamento de Contratações Anual - PCA UERN",
            vigenciaInicio: new Date(vigenciaInicio),
            vigenciaFim: new Date(vigenciaFim),
            anosVigencia: 1,
            valorGlobal: Number(valorTotalPacote),
            valorAtualizado: Number(valorTotalPacote),
            valorBaseCalculoAditivos: Number(valorTotalPacote),
            tipoVigencia: "NAO_CONTINUADO",
            tipoContrato: tipoContrato || (eServico ? "SERVICO_SEM_DEDICACAO" : "FORNECIMENTO_SIMPLES"),
            tipoEmpreitada: "PRECO_UNITARIO",
            tipoMedicao: "MENSAL",
            status: "ATIVO",
            etapaFluxoPosHomologacao: "AGUARDANDO_EMPENHO",
            exigeContratoFormal: exigeFormal,
            empenhoSubstituiContrato: Boolean(empenhoSubstituiContrato),
            numeroEmpenho: null, // Preenchido na 1ª Etapa (Setor de Empenho)
            numeroContrato: null, // Preenchido na 4ª Etapa (Setor de Contratos) se exigeContratoFormal === true
            fornecedorId: fornecedorDb.id,
            origemPcaConsolidacaoId: consolidacaoId || null,
            itens: {
              create: itensNormalizados.map((it: any) => ({
                numeroItem: it.numeroItem,
                descricao: it.descricao || "Item Contratado",
                unidade: it.unidade || "UN",
                quantidadeOriginal: it.quantidadeReal,
                quantidadeAtual: it.quantidadeReal,
                valorUnitarioOriginal: it.valorUnitarioReal,
                valorUnitarioAtual: it.valorUnitarioReal,
                valorTotalOriginal: it.valorTotalReal,
                valorTotalAtual: it.valorTotalReal,
                origemPcaItemId: it.origemPcaItemId || null,
                cidade: it.cidade || "Mossoró",
              })),
            },
          },
          include: { itens: true },
        });

        if (adminUser) {
          await prisma.alertaSistema.create({
            data: {
              contratoId: contrato.id,
              destinatarioId: adminUser.id,
              tipoAlerta: "ESTEIRA_POS_HOMOLOGACAO_EMPENHO",
              nivel: "INFO",
              titulo: `Processo Homologado na Esteira SGC: Aguardando Empenho`,
              mensagem: `Processo SEI ${processoSei} recebido do PCA (Fornecedor: ${fornecedorDb.razaoSocial}, R$ ${Number(valorTotalPacote).toLocaleString("pt-BR")}). Encaminhado para 1ª Etapa: Registro do Empenho -> Gabinete PROAD -> UCI -> ${exigeFormal ? "Elaboração do Contrato" : "Execução Direta por Empenho"}.`,
            },
          });
        }

        registrosCriados.push({
          id: contrato.id,
          tipo: "CONTRATO",
          numeroRegistro: contrato.numeroContrato,
          fornecedorRazaoSocial: fornecedorDb.razaoSocial,
          fornecedorCnpj: fornecedorDb.cnpj,
          valorTotalHomologado: Number(valorTotalPacote),
          quantidadeItens: contrato.itens.length,
          etapaFluxoPosHomologacao: "AGUARDANDO_EMPENHO",
        });
      }
    }

    const primeiro = registrosCriados[0];

    if (tipoContratacao === "ATA") {
      return NextResponse.json({
        sucesso: true,
        tipo: "ATA",
        id: primeiro.id,
        numeroRegistro: primeiro.numeroRegistro,
        destinoRoteamento: "GESTAO_ATAS",
        destinoDescricao: "Módulo de Gestão de Atas de Registro de Preços (SRP)",
        registrosCriados,
        mensagem:
          registrosCriados.length > 1
            ? `${registrosCriados.length} Atas de Registro de Preços geradas com sucesso (uma por fornecedor vencedor) e integradas ao módulo de Atas.`
            : "Ata de Registro de Preços gerada com sucesso e integrada diretamente ao módulo de Atas (sem exigência de empenho prévio).",
      });
    }

    const destinoRoteamento = "SETOR_EMPENHO";
    const destinoDescricao =
      "Esteira Pós-Homologação SGC: 1. Setor de Empenho ➔ 2. Gabinete PROAD (Gestor/Fiscais) ➔ 3. Controle Interno (UCI) ➔ 4. " +
      (empenhoSubstituiContrato ? "Execução Direta por Empenho" : "Elaboração do Contrato");

    return NextResponse.json({
      sucesso: true,
      tipo: "CONTRATO",
      id: primeiro.id,
      empenhoSubstituiContrato: Boolean(empenhoSubstituiContrato),
      exigeContratoFormal: !Boolean(empenhoSubstituiContrato),
      etapaFluxoPosHomologacao: "AGUARDANDO_EMPENHO",
      destinoRoteamento,
      destinoDescricao,
      registrosCriados,
      mensagem:
        registrosCriados.length > 1
          ? `${registrosCriados.length} processos contratuais criados no SGC (um por fornecedor vencedor) e posicionados na 1ª Etapa (Setor de Empenho).`
          : `Processo contratual recebido no SGC com valores reais homologados e posicionado na 1ª Etapa: Registro do Empenho (${destinoDescricao}).`,
    });
  } catch (error: any) {
    console.error("Erro ao receber homologação do PCA no SGC:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao processar homologação.", detalhes: error.message },
      { status: 500 }
    );
  }
}
