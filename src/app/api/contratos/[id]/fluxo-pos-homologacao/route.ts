import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notificarPcaExecucao } from "@/lib/pca-integration-client";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

async function handleFluxoPosHomologacao(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const authHeader = request.headers.get("authorization");
    const serviceKey = process.env.PROAD_SERVICE_KEY || "proad_interop_internal_service_key_2026_uern";
    const isInternalCall = authHeader === `Bearer ${serviceKey}`;

    if (!session && !isInternalCall) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    const contrato = await prisma.contrato.findUnique({
      where: { id },
      include: {
        fornecedor: true,
        itens: true,
        responsaveis: true,
      },
    });

    if (!contrato) {
      return NextResponse.json({ error: "Contrato/processo não encontrado no SGC." }, { status: 404 });
    }

    const itensOrigemPcaIds = contrato.itens.map((it) => it.origemPcaItemId).filter(Boolean);

    // =========================================================================
    // 1ª ETAPA: REGISTRO DO EMPENHO (Setor de Empenho / Financeiro)
    // =========================================================================
    if (action === "REGISTRAR_EMPENHO") {
      const { numeroEmpenho, valorEmpenhado, exigeContratoFormal } = body;

      if (!numeroEmpenho || String(numeroEmpenho).trim() === "") {
        return NextResponse.json(
          { error: "O número da Nota de Empenho é obrigatório para concluir esta etapa." },
          { status: 400 }
        );
      }

      const exigeFormalBool =
        typeof exigeContratoFormal === "boolean"
          ? exigeContratoFormal
          : !contrato.empenhoSubstituiContrato;

      const valorEmpNum =
        valorEmpenhado !== undefined && valorEmpenhado !== null && valorEmpenhado !== ""
          ? Number(valorEmpenhado)
          : contrato.valorGlobal;

      const atualizado = await prisma.contrato.update({
        where: { id },
        data: {
          numeroEmpenho: String(numeroEmpenho).trim(),
          valorEmpenhado: valorEmpNum,
          dataRegistroEmpenho: new Date(),
          exigeContratoFormal: exigeFormalBool,
          empenhoSubstituiContrato: !exigeFormalBool,
          etapaFluxoPosHomologacao: "AGUARDANDO_DESIGNACAO_PROAD",
        },
        include: {
          fornecedor: true,
          itens: true,
          responsaveis: { include: { user: true } },
        },
      });

      if (contrato.origemPcaConsolidacaoId || itensOrigemPcaIds.length > 0) {
        await notificarPcaExecucao({
          contratoId: atualizado.id,
          numeroContrato: atualizado.numeroContrato || `NE ${atualizado.numeroEmpenho}`,
          fornecedorNome: atualizado.fornecedor.razaoSocial,
          fornecedorCnpj: atualizado.fornecedor.cnpj,
          origemPcaConsolidacaoId: atualizado.origemPcaConsolidacaoId,
          itensOrigemPcaIds,
          statusExecucao: "CONTRATADO",
        });
      }

      return NextResponse.json({
        sucesso: true,
        contrato: atualizado,
        mensagem: `Nota de Empenho ${atualizado.numeroEmpenho} registrada! Processo encaminhado ao Gabinete da PROAD para designação de Gestor e Fiscais.`,
      });
    }

    // =========================================================================
    // 2ª ETAPA: GABINETE DA PROAD — DESIGNAÇÃO DE GESTOR E FISCAIS
    // =========================================================================
    if (action === "DESIGNAR_GESTOR_PROAD") {
      const {
        gestorId,
        fiscalTecnicoId,
        fiscalAdmId,
        portariaDesignacaoGestor,
        idSeiAtoDesignacao,
      } = body;

      if (!portariaDesignacaoGestor || String(portariaDesignacaoGestor).trim() === "") {
        return NextResponse.json(
          { error: "Informe o número da Portaria / Ato de Designação do Gabinete da PROAD." },
          { status: 400 }
        );
      }

      const atoDesignacao = String(portariaDesignacaoGestor).trim();
      const seiDesignacao = idSeiAtoDesignacao ? String(idSeiAtoDesignacao).trim() : contrato.processoSeiMae;

      const designacoesParaCriar: Array<{ userId: string; role: Role }> = [];
      if (gestorId) designacoesParaCriar.push({ userId: String(gestorId), role: "GESTOR" });
      if (fiscalTecnicoId) designacoesParaCriar.push({ userId: String(fiscalTecnicoId), role: "FISCAL_TECNICO" });
      if (fiscalAdmId) designacoesParaCriar.push({ userId: String(fiscalAdmId), role: "FISCAL_ADMINISTRATIVO" });

      for (const desig of designacoesParaCriar) {
        await prisma.contratoResponsavel.upsert({
          where: {
            contratoId_userId_tipoAtuacao: {
              contratoId: id,
              userId: desig.userId,
              tipoAtuacao: desig.role,
            },
          },
          update: {
            numeroAtoDesignacao: atoDesignacao,
            idSeiAtoDesignacao: seiDesignacao,
            ativo: true,
          },
          create: {
            contratoId: id,
            userId: desig.userId,
            tipoAtuacao: desig.role,
            numeroAtoDesignacao: atoDesignacao,
            idSeiAtoDesignacao: seiDesignacao,
            ativo: true,
          },
        });
      }

      const atualizado = await prisma.contrato.update({
        where: { id },
        data: {
          portariaDesignacaoGestor: atoDesignacao,
          dataDesignacaoGestor: new Date(),
          etapaFluxoPosHomologacao: "AGUARDANDO_UCI",
          statusUci: "EM_ANALISE_UCI",
          dataEnvioUci: new Date(),
        },
        include: {
          fornecedor: true,
          itens: true,
          responsaveis: { include: { user: true } },
        },
      });

      return NextResponse.json({
        sucesso: true,
        contrato: atualizado,
        mensagem: `Portaria ${atoDesignacao} registrada! Processo remetido à Unidade de Controle Interno (UCI) para análise de conformidade.`,
      });
    }

    // =========================================================================
    // 3ª ETAPA: RETORNO DA UNIDADE DE CONTROLE INTERNO (UCI)
    // =========================================================================
    if (action === "REGISTRAR_RETORNO_UCI") {
      const { statusUci, parecerUciResumo, dataRetornoUci } = body;

      if (!statusUci || !["APROVADO_UCI", "DILIGENCIA_UCI"].includes(statusUci)) {
        return NextResponse.json(
          { error: "Informe o resultado da análise da UCI: APROVADO_UCI ou DILIGENCIA_UCI." },
          { status: 400 }
        );
      }

      const dtRetorno = dataRetornoUci ? new Date(dataRetornoUci) : new Date();
      let novaEtapa = contrato.etapaFluxoPosHomologacao || "AGUARDANDO_UCI";

      if (statusUci === "APROVADO_UCI") {
        novaEtapa = contrato.exigeContratoFormal
          ? "AGUARDANDO_ELABORACAO_CONTRATO"
          : "EXECUCAO_DIRETA_EMPENHO";
      } else {
        novaEtapa = "AGUARDANDO_UCI";
      }

      const atualizado = await prisma.contrato.update({
        where: { id },
        data: {
          statusUci,
          parecerUciResumo: parecerUciResumo ? String(parecerUciResumo).trim() : null,
          dataRetornoUci: isNaN(dtRetorno.getTime()) ? new Date() : dtRetorno,
          etapaFluxoPosHomologacao: novaEtapa,
          status: "ATIVO",
        },
        include: {
          fornecedor: true,
          itens: true,
          responsaveis: { include: { user: true } },
        },
      });

      if (statusUci === "APROVADO_UCI" && !contrato.exigeContratoFormal) {
        if (contrato.origemPcaConsolidacaoId || itensOrigemPcaIds.length > 0) {
          await notificarPcaExecucao({
            contratoId: atualizado.id,
            numeroContrato: `NE ${atualizado.numeroEmpenho || "S/N"}`,
            fornecedorNome: atualizado.fornecedor.razaoSocial,
            fornecedorCnpj: atualizado.fornecedor.cnpj,
            origemPcaConsolidacaoId: atualizado.origemPcaConsolidacaoId,
            itensOrigemPcaIds,
            statusExecucao: "EM_EXECUCAO",
          });
        }
      }

      return NextResponse.json({
        sucesso: true,
        contrato: atualizado,
        mensagem:
          statusUci === "APROVADO_UCI"
            ? contrato.exigeContratoFormal
              ? "Parecer favorável da UCI registrado! Processo encaminhado ao Setor de Contratos para elaboração e numeração do instrumento contratual."
              : "Parecer favorável da UCI registrado! Como a Nota de Empenho substitui o instrumento contratual, o processo já está liberado para Execução Direta pelo Gestor e Fiscais."
            : "Diligência da UCI registrada no processo para saneamento.",
      });
    }

    // =========================================================================
    // 4ª ETAPA: FORMALIZAÇÃO DEFINITIVA DO INSTRUMENTO CONTRATUAL (Setor de Contratos)
    // =========================================================================
    if (action === "FORMALIZAR_CONTRATO_DEFINITIVO") {
      const { numeroContrato, vigenciaInicio, vigenciaFim } = body;

      if (!numeroContrato || String(numeroContrato).trim() === "") {
        return NextResponse.json(
          { error: "Informe o número definitivo do Contrato Administrativo (ex: 045/2026-UERN)." },
          { status: 400 }
        );
      }

      const dataUpdate: any = {
        numeroContrato: String(numeroContrato).trim(),
        etapaFluxoPosHomologacao: "VIGENTE",
        status: "ATIVO",
        empenhoSubstituiContrato: false,
      };

      if (vigenciaInicio) {
        const dIni = new Date(vigenciaInicio);
        if (!isNaN(dIni.getTime())) dataUpdate.vigenciaInicio = dIni;
      }
      if (vigenciaFim) {
        const dFim = new Date(vigenciaFim);
        if (!isNaN(dFim.getTime())) dataUpdate.vigenciaFim = dFim;
      }

      const atualizado = await prisma.contrato.update({
        where: { id },
        data: dataUpdate,
        include: {
          fornecedor: true,
          itens: true,
          responsaveis: { include: { user: true } },
        },
      });

      if (contrato.origemPcaConsolidacaoId || itensOrigemPcaIds.length > 0) {
        await notificarPcaExecucao({
          contratoId: atualizado.id,
          numeroContrato: atualizado.numeroContrato || undefined,
          fornecedorNome: atualizado.fornecedor.razaoSocial,
          fornecedorCnpj: atualizado.fornecedor.cnpj,
          origemPcaConsolidacaoId: atualizado.origemPcaConsolidacaoId,
          itensOrigemPcaIds,
          statusExecucao: "EM_EXECUCAO",
        });
      }

      return NextResponse.json({
        sucesso: true,
        contrato: atualizado,
        mensagem: `Contrato Administrativo nº ${atualizado.numeroContrato} formalizado e vigente! Liberado para execução contratual pelo Gestor e Fiscais.`,
      });
    }

    return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error("Erro no fluxo pós-homologação do SGC:", error);
    return NextResponse.json(
      { error: "Erro ao processar etapa pós-homologação no SGC.", detalhes: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [contrato, servidoresDisponiveis] = await Promise.all([
      prisma.contrato.findUnique({
        where: { id },
        include: {
          fornecedor: true,
          itens: { orderBy: { numeroItem: "asc" } },
          responsaveis: {
            include: {
              user: { select: { id: true, nome: true, email: true, matricula: true, role: true } },
            },
          },
        },
      }),
      prisma.user.findMany({
        where: { ativo: true },
        select: { id: true, nome: true, email: true, matricula: true, role: true },
        orderBy: { nome: "asc" },
      }),
    ]);

    if (!contrato) {
      return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ contrato, servidoresDisponiveis });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleFluxoPosHomologacao(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleFluxoPosHomologacao(request, context);
}
