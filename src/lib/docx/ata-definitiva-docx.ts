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

export interface ItemAtaDocx {
  numero: number;
  descricao: string;
  quantidadeRegistrada: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
}

export interface DadosAtaDocx {
  numeroAta: string;
  processoSEI: string;
  anoExercicio: number;
  fornecedorNome: string;
  fornecedorCnpj: string;
  fornecedorEndereco?: string;
  objeto: string;
  valorTotal: number;
  dataInicioVigencia: string;
  dataFimVigencia: string;
  gestorNome?: string;
  itens: ItemAtaDocx[];
  codigoAutenticacao?: string;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function gerarDocxAtaDefinitivaSgc(dados: DadosAtaDocx): Promise<Buffer> {
  const tituloHeader = `ATA DE REGISTRO DE PREÇOS Nº ${dados.numeroAta} (MODELO AGU — LEI Nº 14.133/2021)`;

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
          criarParagrafoDocxSgc(`ATA DE REGISTRO DE PREÇOS Nº ${dados.numeroAta}`, true),

          criarTituloSecaoDocxSgc("PREÂMBULO — ÓRGÃO GERENCIADOR E BENEFICIÁRIO"),
          criarParagrafoDocxSgc(
            "A FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE (FUERN/UERN), autarquia estadual de regime especial, inscrita no CNPJ sob nº 08.258.209/0001-07, sediada no Campus Central em Mossoró/RN, doravante denominada ÓRGÃO GERENCIADOR, e, de outro lado, a empresa " +
              dados.fornecedorNome +
              ", inscrita no CNPJ/MF sob o nº " +
              dados.fornecedorCnpj +
              (dados.fornecedorEndereco ? `, sediada em ${dados.fornecedorEndereco}` : "") +
              ", doravante denominada DETENTORA DA ATA, resolvem registrar os preços para a futura e eventual contratação, observadas as disposições da Lei Federal nº 14.133/2021, da Lei Complementar Estadual nº 675/2020 e demais normas regulamentares aplicáveis.",
          ),

          criarTituloSecaoDocxSgc("CLÁUSULA PRIMEIRA — DO OBJETO E REGISTRO DE PREÇOS"),
          criarParagrafoDocxSgc(dados.objeto),

          criarTituloSecaoDocxSgc("CLÁUSULA SEGUNDA — DA VALIDADE DA ATA"),
          criarParagrafoDocxSgc(
            `O prazo de vigência desta Ata de Registro de Preços é de 1 (um) ano, com início em ${dados.dataInicioVigencia} e término em ${dados.dataFimVigencia}, prorrogável por igual período nos termos do art. 84 da Lei nº 14.133/2021.`,
          ),

          criarTituloSecaoDocxSgc("CLÁUSULA TERCEIRA — DO VALOR REGISTRADO"),
          criarParagrafoDocxSgc(
            `O valor total estimado registrado nesta Ata é de ${formatarMoeda(dados.valorTotal)}, consoante detalhamento constante do quadro de itens anexo.`,
          ),

          criarTituloSecaoDocxSgc("CLÁUSULA QUARTA — DA GESTÃO DA ATA"),
          criarParagrafoDocxSgc(
            "O gerenciamento desta Ata de Registro de Preços caberá ao Setor de Gestão de Contratos e Atas da PROAD/UERN." +
              (dados.gestorNome ? ` Gestor da Ata: ${dados.gestorNome}.` : ""),
          ),

          criarTituloSecaoDocxSgc("CLÁUSULA QUINTA — DA CONTRATAÇÃO E DA OBRIGAÇÃO DE FORNECIMENTO"),
          criarParagrafoDocxSgc(
            "A detentora da presente Ata fica obrigada a atender todas as ordens de fornecimento ou ordens de serviço formalmente emitidas pelo Órgão Gerenciador durante a vigência do registro, respeitados os prazos, locais e condições pactuadas.",
          ),

          criarTituloSecaoDocxSgc("ANEXO ÚNICO — QUADRO DE ITENS E PREÇOS REGISTRADOS"),
          criarTabelaItensAta(dados.itens),
        ],
      },
    ],
  });

  return empacotarDocxParaBufferSgc(doc);
}

function criarTabelaItensAta(itens: ItemAtaDocx[]): Table {
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
        celulaCabecalho("Especificação dos Bens / Serviços", 50),
        celulaCabecalho("Qtd. Registrada", 12),
        celulaCabecalho("Valor Unit. Reg.", 15),
        celulaCabecalho("Valor Total Reg.", 15),
      ],
    }),
  ];

  itens.forEach((it) => {
    linhas.push(
      new TableRow({
        children: [
          celulaCorpo(it.numero.toString().padStart(2, "0"), 8, AlignmentType.CENTER),
          celulaCorpo(it.descricao, 50),
          celulaCorpo(`${it.quantidadeRegistrada} ${it.unidade || "un"}`, 12, AlignmentType.CENTER),
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
