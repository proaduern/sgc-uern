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
      valorGlobal,
      tipoContrato,
      ano = new Date().getFullYear(),
    } = body;

    if (!processoSei || !fornecedor?.cnpj || !itens || itens.length === 0) {
      return NextResponse.json(
        { error: "Dados incompletos: processoSei, fornecedor.cnpj e itens são obrigatórios." },
        { status: 400 }
      );
    }

    // 1. Localiza ou cria Fornecedor
    const cnpjLimpo = String(fornecedor.cnpj).replace(/\D/g, "");
    let fornecedorDb = await prisma.fornecedor.findFirst({
      where: { cnpj: cnpjLimpo },
    });

    if (!fornecedorDb) {
      fornecedorDb = await prisma.fornecedor.create({
        data: {
          cnpj: cnpjLimpo,
          razaoSocial: fornecedor.razaoSocial || "Fornecedor Vencedor",
          nomeFantasia: fornecedor.nomeFantasia || fornecedor.razaoSocial || "Fornecedor Vencedor",
          email: fornecedor.email || "contato@fornecedor.com.br",
          telefone: fornecedor.telefone || "(84) 3315-2000",
          statusSicaf: "REGULAR",
        },
      });
    }

    // 2. Busca usuário administrador para notificações
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN_PROAD", ativo: true },
    });

    const valorTotalCalculado =
      valorGlobal ||
      itens.reduce((acc: number, it: any) => acc + (Number(it.valorTotal) || Number(it.valorUnitario) * Number(it.quantidade) || 0), 0);

    // -------------------------------------------------------------
    // Fluxo A: Ata de Registro de Preço (ARP)
    // -------------------------------------------------------------
    if (tipoContratacao === "ATA") {
      const numeroAtaFormatado = `ARP nº ${ano}-${processoSei.replace(/\D/g, "").slice(-4) || "001"}/${ano}`;

      const ata = await prisma.ataRegistroPreco.create({
        data: {
          numeroAta: numeroAtaFormatado,
          ano: Number(ano),
          processoSei: processoSei,
          objeto: objeto || "Aquisição/Contratação decorrente do Sistema de Registro de Preços - PCA UERN",
          fornecedorId: fornecedorDb.id,
          vigenciaInicio: new Date(vigenciaInicio),
          vigenciaFim: new Date(vigenciaFim),
          valorGlobalOriginal: Number(valorTotalCalculado),
          valorGlobalAtual: Number(valorTotalCalculado),
          status: "VIGENTE",
          origemPcaConsolidacaoId: consolidacaoId || null,
          itens: {
            create: itens.map((it: any, index: number) => ({
              numeroItem: it.numeroItem || index + 1,
              descricao: it.descricao || "Item Registrado",
              marcaModelo: it.marcaModelo || null,
              unidade: it.unidade || "UN",
              quantidadeRegistrada: Number(it.quantidade) || 1,
              quantidadeSaldo: Number(it.quantidade) || 1,
              valorUnitario: Number(it.valorUnitario) || 0,
              valorTotal: Number(it.valorTotal) || Number(it.valorUnitario) * Number(it.quantidade) || 0,
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
            mensagem: `Ata ${ata.numeroAta} gerada automaticamente para o Processo SEI ${processoSei} (Fornecedor: ${fornecedorDb.razaoSocial}, R$ ${Number(valorTotalCalculado).toLocaleString("pt-BR")}). Disponível no Módulo de Gestão de Atas para autorizações de execução.`,
          },
        });
      }

      return NextResponse.json({
        sucesso: true,
        tipo: "ATA",
        id: ata.id,
        numeroRegistro: ata.numeroAta,
        destinoRoteamento: "GESTAO_ATAS",
        mensagem: "Ata de Registro de Preços gerada com sucesso e integrada ao módulo de Atas.",
      });
    }

    // -------------------------------------------------------------
    // Fluxo B: Contrato Tradicional ou Execução Direta por Empenho
    // -------------------------------------------------------------
    const eServico = itens.some((it: any) => it.tipoCategoria === "SERVICO");
    let destinoRoteamento = "SETOR_CONTRATOS";
    let destinoDescricao = "Setor de Contratos (Formalização e Designação de Gestor/Fiscais)";

    if (empenhoSubstituiContrato) {
      if (eServico) {
        destinoRoteamento = "DSO_SERVICOS";
        destinoDescricao = "Diretoria de Administração e Serviços (DSO)";
      } else {
        destinoRoteamento = "DEPARTAMENTO_PATRIMONIO";
        destinoDescricao = "Departamento de Materiais e Patrimônio";
      }
    }

    const contrato = await prisma.contrato.create({
      data: {
        processoSeiMae: processoSei,
        licitacaoProcedimento: `Pregão / Dispensa PCA ${processoSei}`,
        objeto: objeto || "Contratação decorrente do Planejamento de Contratações Anual - PCA UERN",
        vigenciaInicio: new Date(vigenciaInicio),
        vigenciaFim: new Date(vigenciaFim),
        anosVigencia: 1,
        valorGlobal: Number(valorTotalCalculado),
        valorAtualizado: Number(valorTotalCalculado),
        valorBaseCalculoAditivos: Number(valorTotalCalculado),
        tipoVigencia: "NAO_CONTINUADO",
        tipoContrato: tipoContrato || (eServico ? "SERVICO_SEM_DEDICACAO" : "FORNECIMENTO_SIMPLES"),
        tipoEmpreitada: "PRECO_UNITARIO",
        tipoMedicao: "MENSAL",
        status: "ATIVO",
        empenhoSubstituiContrato: Boolean(empenhoSubstituiContrato),
        numeroEmpenho: empenhoSubstituiContrato ? "Pendente de Emissão" : null,
        numeroContrato: null, // Fica nulo até digitação pelo Setor de Contratos
        fornecedorId: fornecedorDb.id,
        origemPcaConsolidacaoId: consolidacaoId || null,
        itens: {
          create: itens.map((it: any, index: number) => ({
            numeroItem: it.numeroItem || index + 1,
            descricao: it.descricao || "Item Contratado",
            unidade: it.unidade || "UN",
            quantidadeOriginal: Number(it.quantidade) || 1,
            quantidadeAtual: Number(it.quantidade) || 1,
            valorUnitarioOriginal: Number(it.valorUnitario) || 0,
            valorUnitarioAtual: Number(it.valorUnitario) || 0,
            valorTotalOriginal: Number(it.valorTotal) || Number(it.valorUnitario) * Number(it.quantidade) || 0,
            valorTotalAtual: Number(it.valorTotal) || Number(it.valorUnitario) * Number(it.quantidade) || 0,
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
          tipoAlerta: empenhoSubstituiContrato ? "EXECUCAO_EMPENHO_DIRETO" : "FORMALIZACAO_CONTRATO",
          nivel: "INFO",
          titulo: empenhoSubstituiContrato
            ? `Execução Direta por Nota de Empenho (${destinoDescricao})`
            : `Novo Contrato Homologado: Pendente de Formalização e Designação`,
          mensagem: `Processo SEI ${processoSei} recebido do PCA. Fornecedor: ${fornecedorDb.razaoSocial}, R$ ${Number(valorTotalCalculado).toLocaleString("pt-BR")}. Encaminhado para: ${destinoDescricao}.`,
        },
      });
    }

    return NextResponse.json({
      sucesso: true,
      tipo: "CONTRATO",
      id: contrato.id,
      empenhoSubstituiContrato: Boolean(empenhoSubstituiContrato),
      destinoRoteamento,
      destinoDescricao,
      mensagem: empenhoSubstituiContrato
        ? `Execução encaminhada diretamente para ${destinoDescricao} via Nota de Empenho.`
        : `Contrato criado no SGC. Setor de Contratos notificado para aplicar número oficial do contrato e designar equipe de gestão/fiscalização.`,
    });
  } catch (error: any) {
    console.error("Erro ao receber homologação do PCA no SGC:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao processar homologação.", detalhes: error.message },
      { status: 500 }
    );
  }
}
