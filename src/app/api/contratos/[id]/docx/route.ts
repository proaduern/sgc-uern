import { prisma } from "@/lib/prisma";
import { gerarDocxContratoDefinitivoSgc } from "@/lib/docx/contrato-definitivo-docx";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  const contrato = await prisma.contrato.findUnique({
    where: { id },
    include: {
      fornecedor: true,
      itens: { orderBy: { numeroItem: "asc" } },
      responsaveis: { include: { user: true } },
    },
  });

  if (!contrato) {
    return new Response("Contrato não encontrado.", { status: 404 });
  }

  const gestor = contrato.responsaveis.find((r) => r.tipoAtuacao === "GESTOR")?.user?.nome;
  const fiscal = contrato.responsaveis.find((r) => String(r.tipoAtuacao).includes("FISCAL"))?.user?.nome;

  const buffer = await gerarDocxContratoDefinitivoSgc({
    numeroContrato: contrato.numeroContrato || `SGC-${contrato.id.slice(0, 6)}`,
    processoSEI: contrato.processoSeiMae,
    anoExercicio: contrato.vigenciaInicio.getFullYear(),
    fornecedorNome: contrato.fornecedor.razaoSocial,
    fornecedorCnpj: contrato.fornecedor.cnpj,
    fornecedorEndereco: contrato.fornecedor.endereco || undefined,
    objeto: contrato.objeto,
    valorTotal: contrato.valorAtualizado || contrato.valorGlobal,
    dataInicioVigencia: contrato.vigenciaInicio.toLocaleDateString("pt-BR"),
    dataFimVigencia: contrato.vigenciaFim.toLocaleDateString("pt-BR"),
    fiscalNome: fiscal,
    gestorNome: gestor,
    dotacaoOrcamentaria: contrato.numeroEmpenho ? `Empenho nº ${contrato.numeroEmpenho}` : undefined,
    itens: contrato.itens.map((it) => ({
      numero: it.numeroItem,
      descricao: it.descricao,
      quantidade: it.quantidadeAtual || it.quantidadeOriginal || it.quantidadeAnual || 1,
      unidade: it.unidade,
      valorUnitario: it.valorUnitarioAtual || it.valorUnitarioOriginal || 0,
      valorTotal: it.valorTotalAtual || it.valorTotalOriginal || 0,
    })),
    codigoAutenticacao: `SGC-CTR-${contrato.id.slice(0, 8).toUpperCase()}`,
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="Contrato-${contrato.numeroContrato?.replace(/\//g, "-") || id}.docx"`,
    },
  });
}
