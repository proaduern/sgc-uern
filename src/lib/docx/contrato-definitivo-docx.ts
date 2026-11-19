import {
  Document,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  Paragraph,
  TextRun,
} from "docx";
import {
  criarCabecalhoDocxUernSgc,
  criarRodapeDocxUernSgc,
  criarTituloSecaoDocxSgc,
  criarParagrafoDocxSgc,
  empacotarDocxParaBufferSgc,
} from "./gerador-docx-uern-sgc";

export interface ItemContratoDocx {
  numero: number;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
}

export interface DadosContratoDocx {
  numeroContrato: string;
  processoSEI: string;
  anoExercicio: number;
  fornecedorNome: string;
  fornecedorCnpj: string;
  fornecedorEndereco?: string;
  objeto: string;
  valorTotal: number;
  dataInicioVigencia: string;
  dataFimVigencia: string;
  fiscalNome?: string;
  gestorNome?: string;
  dotacaoOrcamentaria?: string;
  itens: ItemContratoDocx[];
  codigoAutenticacao?: string;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function gerarDocxContratoDefinitivoSgc(dados: DadosContratoDocx): Promise<Buffer> {
  const tituloHeader = `TERMO DE CONTRATO Nº ${dados.numeroContrato} (MODELO AGU — LEI Nº 14.133/2021)`;

  const doc = new Document({
    sections: [
      {
        headers: {
          default: criarCabecalhoDocxUernSgc(tituloHeader),
        },
        footers: {
          default: criarRodapeDocxUernSgc(dados.codigoAutenticacao),
        },
        children: [
          criarParagrafoDocxSgc(`PROCESSO ADMINISTRATIVO SEI Nº ${dados.processoSEI}`, true),
          criarParagrafoDocxSgc(`CONTRATO ADMINISTRATIVO Nº ${dados.numeroContrato}`, true),

          criarTituloSecaoDocxSgc("PREÂMBULO — DAS PARTES"),
          criarParagrafoDocxSgc(
            "Pelo presente instrumento, de um lado, a FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE (FUERN/UERN), autarquia estadual de regime especial com sede no Campus Central, Mossoró/RN, CNPJ sob o nº 08.258.209/0001-07, doravante denominada simplesmente CONTRATANTE, e, de outro lado, a sociedade empresária " +
              dados.fornecedorNome +
              ", inscrita no CNPJ/MF sob o nº " +
              dados.fornecedorCnpj +
              (dados.fornecedorEndereco ? `, com sede em ${dados.fornecedorEndereco}` : "") +
              ", doravante denominada simplesmente CONTRATADA, resolvem celebrar o presente Termo de Contrato, sob a égide da Lei Federal nº 14.133/2021 e da Lei Complementar Estadual nº 675/2020.",
          ),

          criarTituloSecaoDocxSgc("CLÁUSULA PRIMEIRA — DO OBJETO"),
          criarParagrafoDocxSgc(dados.objeto),

          criarTituloSecaoDocxSgc("CLÁUSULA SEGUNDA — DA VIGÊNCIA E PRORROGAÇÃO"),
          criarParagrafoDocxSgc(
            `O prazo de vigência desta contratação tem início em ${dados.dataInicioVigencia} e término em ${dados.dataFimVigencia}, podendo ser prorrogado nos termos dos arts. 105 a 107 da Lei Federal nº 14.133/2021.`,
          ),

          criarTituloSecaoDocxSgc("CLÁUSULA TERCEIRA — DO VALOR CONTRATUAL E DOTAÇÃO ORÇAMENTÁRIA"),
          criarParagrafoDocxSgc(
            `O valor total do presente contrato é de ${formatarMoeda(dados.valorTotal)}. A despesa correrá à conta dos recursos específicos consignados no orçamento da UERN para o presente exercício financeiro.` +
              (dados.dotacaoOrcamentaria ? ` Dotação Orçamentária: ${dados.dotacaoOrcamentaria}.` : ""),
          ),

          criarTituloSecaoDocxSgc("CLÁUSULA QUARTA — DA GESTÃO E DA FISCALIZAÇÃO DO CONTRATO"),
          criarParagrafoDocxSgc(
            "A execução do contrato deverá ser acompanhada e fiscalizada por representantes da Administração especialmente designados pela PROAD, nos termos do art. 117 da Lei nº 14.133/2021." +
              (dados.fiscalNome ? ` Fiscal do Contrato: ${dados.fiscalNome}.` : "") +
              (dados.gestorNome ? ` Gestor do Contrato: ${dados.gestorNome}.` : ""),
          ),

          criarTituloSecaoDocxSgc("CLÁUSULA QUINTA — DA LIQUIDAÇÃO E PAGAMENTO (IMR)"),
          criarParagrafoDocxSgc(
            "O pagamento será realizado no prazo de até 30 (trinta) dias após o recebimento definitivo da nota fiscal/fatura e do ateste de conformidade técnica pela fiscalização, aplicando-se, quando couber, os fatores de pontuação e eventuais glosas pactuadas no Instrumento de Medição de Resultado (IMR).",
          ),

          criarTituloSecaoDocxSgc("CLÁUSULA SEXTA — DAS SANÇÕES ADMINISTRATIVAS"),
          criarParagrafoDocxSgc(
            "Comete infração administrativa a Contratada que der causa à inexecução parcial ou total do contrato, sujeitando-se às penalidades de advertência, multa, impedimento de licitar e contratar e declaração de inidoneidade, nos termos dos arts. 155 e seguintes da Lei nº 14.133/2021.",
          ),

          criarTituloSecaoDocxSgc("CLÁUSULA SÉTIMA — DO FORO"),
          criarParagrafoDocxSgc(
            "Fica eleito o Foro da Comarca de Mossoró/RN para dirimir quaisquer dúvidas ou litígios decorrentes da execução deste contrato.",
          ),

          criarTituloSecaoDocxSgc("ANEXO ÚNICO — QUADRO DE ITENS CONTRATADOS"),
          criarTabelaItensContrato(dados.itens),
        ],
      },
    ],
  });

  return empacotarDocxParaBufferSgc(doc);
}

function criarTabelaItensContrato(itens: ItemContratoDocx[]): Table {
  const celulaCabecalho = (texto: string, larguraPct: number) =>
    new TableCell({
      width: { size: larguraPct, type: WidthType.PERCENTAGE },
      shading: { fill: "1E3A8A" },
      margins: { top: 70, bottom: 70, left: 70, right: 70 },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: texto,
              bold: true,
              color: "FFFFFF",
              size: 15,
              font: "Arial",
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
    });

  const celulaCorpo = (texto: string, larguraPct: number, alinhamento: any = AlignmentType.LEFT, negrito = false) =>
    new TableCell({
      width: { size: larguraPct, type: WidthType.PERCENTAGE },
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: texto,
              bold: negrito,
              size: 15,
              font: "Arial",
            }),
          ],
          alignment: alinhamento,
        }),
      ],
    });

  const linhas: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        celulaCabecalho("Item", 8),
        celulaCabecalho("Descrição dos Bens / Serviços", 50),
        celulaCabecalho("Qtd.", 12),
        celulaCabecalho("Valor Unit.", 15),
        celulaCabecalho("Valor Total", 15),
      ],
    }),
  ];

  itens.forEach((it) => {
    linhas.push(
      new TableRow({
        children: [
          celulaCorpo(it.numero.toString().padStart(2, "0"), 8, AlignmentType.CENTER),
          celulaCorpo(it.descricao, 50),
          celulaCorpo(`${it.quantidade} ${it.unidade || "un"}`, 12, AlignmentType.CENTER),
          celulaCorpo(formatarMoeda(it.valorUnitario), 15, AlignmentType.RIGHT),
          celulaCorpo(formatarMoeda(it.valorTotal), 15, AlignmentType.RIGHT, true),
        ],
      }),
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
    },
    rows: linhas,
  });
}
