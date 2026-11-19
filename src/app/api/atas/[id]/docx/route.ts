import { prisma } from "@/lib/prisma";
import { gerarDocxAtaDefinitivaSgc } from "@/lib/docx/ata-definitiva-docx";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  const ata = await prisma.ataRegistroPreco.findUnique({
    where: { id },
    include: {
      fornecedor: true,
      gestor: true,
      itens: { orderBy: { numeroItem: "asc" } },
    },
  });

  if (!ata) {
    return new Response("Ata de Registro de Preços não encontrada.", { status: 404 });
  }

  const buffer = await gerarDocxAtaDefinitivaSgc({
    numeroAta: ata.numeroAta,
    processoSEI: ata.processoSei,
    anoExercicio: ata.ano,
    fornecedorNome: ata.fornecedor.razaoSocial,
    fornecedorCnpj: ata.fornecedor.cnpj,
    fornecedorEndereco: ata.fornecedor.endereco || undefined,
    objeto: ata.objeto,
    valorTotal: ata.valorGlobalAtual || ata.valorGlobalOriginal,
    dataInicioVigencia: ata.vigenciaInicio.toLocaleDateString("pt-BR"),
    dataFimVigencia: ata.vigenciaFim.toLocaleDateString("pt-BR"),
    gestorNome: ata.gestor?.nome,
    itens: ata.itens.map((it) => ({
      numero: it.numeroItem,
      descricao: it.descricao,
      quantidadeRegistrada: it.quantidadeRegistrada,
      unidade: it.unidade,
      valorUnitario: it.valorUnitario,
      valorTotal: it.valorTotal,
    })),
    codigoAutenticacao: `SGC-ARP-${ata.id.slice(0, 8).toUpperCase()}`,
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="Ata-${ata.numeroAta.replace(/\//g, "-")}.docx"`,
    },
  });
}
