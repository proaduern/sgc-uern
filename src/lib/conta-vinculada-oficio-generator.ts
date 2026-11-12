import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  convertInchesToTwip,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BRASAO_UERN_BASE64, formatarNumeroOficioDas } from '@/lib/config/brasao-uern';
import { DADOS_DIRETORIA_DAS_PADRAO } from '@/lib/config/diretoria';

export interface FichaCadastralData {
  // 1. Identificação do Órgão Público (Convenente)
  orgaoRazaoSocial: string;
  orgaoCnpj: string;
  orgaoContatoNome: string;
  orgaoContatoDdd: string;
  orgaoContatoTelefone: string;
  orgaoEndereco: string;
  orgaoMunicipio: string;
  orgaoUf: string;
  orgaoCep: string;
  orgaoBairro: string;
  orgaoFax: string;
  orgaoEmail: string;
  orgaoAgenciaPrefixo: string;
  orgaoAgenciaDv: string;
  orgaoContaCorrente: string;

  // 2. Serviço solicitado*
  servicoContratacao: boolean;
  servicoCadastrarGarantidor: boolean;
  servicoCadastrarEvento: boolean;

  // 3. Dados para Cadastramento do Convênio
  convenioCidadeSede: string;
  convenioUf: string;
  convenioCep: string;
  convenioBairro: string;

  // 4. Cadastramento do Convênio*
  tipoConvenio: 'CONTRATOS_ADMINISTRATIVOS' | 'CAUCAO_LICITACAO';

  // 5. Dados do Evento*
  eventoNumero: string;
  eventoNome: string;
  eventoDescricao: string;
  eventoDataInicio: string;
  eventoDataFim: string;
  eventoDataInicioCaptacao: string;
  eventoDataFimCaptacao: string;
  eventoDepositante: '1_ORGAO' | '2_PRESTADORA';

  // 6. Dados da Empresa Prestadora de Serviço (Garantidor)*
  empresaRazaoSocial: string;
  empresaCnpj: string;
  empresaContatoNome: string;
  empresaContatoDdd: string;
  empresaContatoTelefone: string;
  empresaEndereco: string;
  empresaCidade: string;
  empresaUf: string;
  empresaCep: string;
  empresaFax: string;
  empresaEmail: string;

  // Assinatura do Gestor
  gestorNome: string;
  gestorMatricula: string;
  gestorCargoAto: string;
  gestorSetor: string;
}

export interface OficioAberturaParams {
  numeroOficio: string;
  numeroContrato: string;
  empresaRazaoSocial: string;
  empresaCnpj: string;
  processoSei?: string;
  contaRelacionamento?: string;
  responsavelNome: string;
  responsavelMatricula: string;
  cargoDiretor: string;
  portariaDiretor: string;
  fichaData?: FichaCadastralData;
}

export function criarFichaCadastralDefault(contrato: any): FichaCadastralData {
  const f = contrato?.fornecedor || {};
  const numContrato = contrato?.numeroContrato || contrato?.numeroEmpenho || '024/2026';
  const numEvento = numContrato.includes('FUERN') ? numContrato : `${numContrato}-FUERN`;

  const formatarDataBr = (d: any) => {
    if (!d) return '';
    try {
      const date = new Date(d);
      return isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  };

  const vigInicio = formatarDataBr(contrato?.vigenciaInicio) || '14/11/2026';
  const vigFim = formatarDataBr(contrato?.vigenciaFim) || '14/11/2027';

  // Extrair DDD e telefone do fornecedor
  const telBruto = f?.telefone || f?.telefonePreposto || f?.telefoneRepresentanteLegal || '81 99927-5426';
  const matchTel = telBruto.replace(/\D/g, '').match(/^(\d{2})(\d{8,9})$/);
  const dddEmpresa = matchTel ? matchTel[1] : '81';
  const telEmpresa = matchTel ? `${matchTel[2].slice(0, 5)}-${matchTel[2].slice(5)}` : telBruto;

  return {
    orgaoRazaoSocial: 'FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE – FUERN',
    orgaoCnpj: '08.258.295/0001-02',
    orgaoContatoNome: DADOS_DIRETORIA_DAS_PADRAO.nome.toUpperCase(),
    orgaoContatoDdd: '84',
    orgaoContatoTelefone: '8733-3375',
    orgaoEndereco: 'R DOUTOR ALMINO AFONSO, 478.',
    orgaoMunicipio: 'MOSSORÓ',
    orgaoUf: 'RN',
    orgaoCep: '59610-210',
    orgaoBairro: 'CENTRO',
    orgaoFax: '',
    orgaoEmail: DADOS_DIRETORIA_DAS_PADRAO.email,
    orgaoAgenciaPrefixo: '4687',
    orgaoAgenciaDv: '6',
    orgaoContaCorrente: '39.869-1',

    servicoContratacao: true,
    servicoCadastrarGarantidor: true,
    servicoCadastrarEvento: true,

    convenioCidadeSede: 'MOSSORÓ',
    convenioUf: 'RN',
    convenioCep: '59610-210',
    convenioBairro: 'CENTRO',

    tipoConvenio: 'CONTRATOS_ADMINISTRATIVOS',

    eventoNumero: numEvento,
    eventoNome: f?.razaoSocial || 'ZELO RECURSOS HUMANOS LTDA',
    eventoDescricao:
      contrato?.objeto ||
      'Contratação de serviços continuados com regime de dedicação exclusiva de mão de obra em atendimento às necessidades da UERN.',
    eventoDataInicio: vigInicio,
    eventoDataFim: vigFim,
    eventoDataInicioCaptacao: vigInicio,
    eventoDataFimCaptacao: vigFim,
    eventoDepositante: '1_ORGAO',

    empresaRazaoSocial: f?.razaoSocial || 'ZELO RECURSOS HUMANOS LTDA',
    empresaCnpj: f?.cnpj || '09.347.115/0001-21',
    empresaContatoNome: f?.nomePreposto || f?.nomeRepresentanteLegal || 'Genivaldo Firmino Segundo',
    empresaContatoDdd: dddEmpresa,
    empresaContatoTelefone: telEmpresa,
    empresaEndereco: f?.endereco || 'Rua Raimundo Chaves, nº 1621, Lagoa Nova',
    empresaCidade: 'Natal',
    empresaUf: 'RN',
    empresaCep: '59064-368',
    empresaFax: '',
    empresaEmail: f?.email || f?.emailPreposto || 'diretoria@zelorn.com.br',

    gestorNome: DADOS_DIRETORIA_DAS_PADRAO.nome,
    gestorMatricula: '12.757-4',
    gestorCargoAto: contrato?.portariaDesignacaoGestor || 'Gestor do Contrato - Ato de designação nº 448/2026',
    gestorSetor: 'Diretoria de Administração e Serviços - DAS/PROAD',
  };
}

/**
 * Gera o arquivo oficial editável do Ofício de Abertura em formato Word (.docx)
 */
export async function gerarOficioAberturaDocx(params: OficioAberturaParams): Promise<Blob> {
  const oficioFormatado = formatarNumeroOficioDas(params.numeroOficio);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.98),
              bottom: convertInchesToTwip(0.98),
              left: convertInchesToTwip(0.98),
              right: convertInchesToTwip(0.98),
            },
          },
        },
        children: [
          // Cabeçalho Institucional UERN
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE – UERN',
                bold: true,
                font: 'Times New Roman',
                size: 22, // 11pt
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'PRÓ-REITORIA DE ADMINISTRAÇÃO – PROAD',
                bold: true,
                font: 'Times New Roman',
                size: 20, // 10pt
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'DIRETORIA DE ADMINISTRAÇÃO E SERVIÇOS – DAS',
                bold: true,
                font: 'Times New Roman',
                size: 19, // 9.5pt
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Rua Almino Afonso, 478 - Bairro Centro, Mossoró/RN, CEP 59610-210 | http://portal.uern.br/',
                font: 'Times New Roman',
                size: 17, // 8.5pt
              }),
            ],
          }),
          new Paragraph({ spacing: { after: 360 } }),

          // Número do Ofício
          new Paragraph({
            children: [
              new TextRun({
                text: oficioFormatado,
                bold: true,
                font: 'Times New Roman',
                size: 22,
              }),
            ],
            spacing: { after: 240 },
          }),

          // Destinatário
          new Paragraph({
            children: [
              new TextRun({
                text: 'Ao(À) Senhor(a) Gerente',
                font: 'Times New Roman',
                size: 21,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Banco do Brasil S.A.',
                bold: true,
                font: 'Times New Roman',
                size: 21,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Agência 3795-8 - Escritório Setor Público RN',
                font: 'Times New Roman',
                size: 21,
              }),
            ],
            spacing: { after: 320 },
          }),

          // Assunto
          new Paragraph({
            children: [
              new TextRun({
                text: 'Assunto: ',
                bold: true,
                font: 'Times New Roman',
                size: 21,
              }),
              new TextRun({
                text: 'Cadastro de Convênio de Conta Garantia (Conta Vinculada)',
                font: 'Times New Roman',
                size: 21,
              }),
            ],
            spacing: { after: 320 },
          }),

          // Vocativo
          new Paragraph({
            indent: { firstLine: 720 },
            children: [
              new TextRun({
                text: 'Senhor(a) Gerente,',
                font: 'Times New Roman',
                size: 21,
              }),
            ],
            spacing: { after: 180 },
          }),

          // Parágrafo 1
          new Paragraph({
            indent: { firstLine: 720 },
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: `Solicitamos a abertura de convênio e conta garantia bloqueada para movimentação em nome da `,
                font: 'Times New Roman',
                size: 21,
              }),
              new TextRun({
                text: 'FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - FUERN',
                bold: true,
                font: 'Times New Roman',
                size: 21,
              }),
              new TextRun({
                text: `, CNPJ nº 08.258.295/0001-02, a qual se destina à prestação de garantia de execução do Contrato Administrativo nº `,
                font: 'Times New Roman',
                size: 21,
              }),
              new TextRun({
                text: `${params.numeroContrato} - FUERN`,
                bold: true,
                font: 'Times New Roman',
                size: 21,
              }),
              new TextRun({
                text: `, firmado com a empresa `,
                font: 'Times New Roman',
                size: 21,
              }),
              new TextRun({
                text: params.empresaRazaoSocial,
                bold: true,
                font: 'Times New Roman',
                size: 21,
              }),
              new TextRun({
                text: `, inscrita no CNPJ sob o nº `,
                font: 'Times New Roman',
                size: 21,
              }),
              new TextRun({
                text: params.empresaCnpj,
                bold: true,
                font: 'Times New Roman',
                size: 21,
              }),
              new TextRun({
                text: '.',
                font: 'Times New Roman',
                size: 21,
              }),
            ],
            spacing: { after: 200, line: 360 },
          }),

          // Parágrafo 2
          new Paragraph({
            indent: { firstLine: 720 },
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: 'O presente pedido atende às disposições da Lei Estadual nº 10.841/2021, do Decreto Estadual nº 33.782/2024 e da Instrução Normativa-SEI nº 2/2024 - SEAD/RN, para retenção das provisões de encargos trabalhistas de dedicação exclusiva de mão de obra.',
                font: 'Times New Roman',
                size: 21,
              }),
            ],
            spacing: { after: 200, line: 360 },
          }),

          // Parágrafo 3
          new Paragraph({
            indent: { firstLine: 720 },
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: 'Encaminhamos em anexo a respectiva ',
                font: 'Times New Roman',
                size: 21,
              }),
              new TextRun({
                text: 'FICHA CADASTRAL',
                bold: true,
                font: 'Times New Roman',
                size: 21,
              }),
              new TextRun({
                text: ' devidamente preenchida e assinada.',
                font: 'Times New Roman',
                size: 21,
              }),
            ],
            spacing: { after: 360, line: 360 },
          }),

          // Fecho
          new Paragraph({
            indent: { firstLine: 720 },
            children: [
              new TextRun({
                text: 'Atenciosamente,',
                font: 'Times New Roman',
                size: 21,
              }),
            ],
            spacing: { after: 360 },
          }),

          // Data e Local
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: 'Mossoró/RN, data da assinatura eletrônica.',
                font: 'Times New Roman',
                size: 20,
              }),
            ],
            spacing: { after: 480 },
          }),

          // Assinatura
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: (params.responsavelNome || '').toUpperCase(),
                bold: true,
                font: 'Times New Roman',
                size: 21,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `Matrícula nº ${params.responsavelMatricula}`,
                font: 'Times New Roman',
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: params.portariaDiretor || params.cargoDiretor,
                font: 'Times New Roman',
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: 'Diretoria de Administração e Serviços – DAS/PROAD',
                font: 'Times New Roman',
                size: 20,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Gera o PDF oficial do Ofício de Abertura
 */
export function gerarOficioAberturaPdf(params: OficioAberturaParams, abrirPreview = false): jsPDF {
  const oficioFormatado = formatarNumeroOficioDas(params.numeroOficio);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // Brasão UERN colorido
  try {
    doc.addImage(BRASAO_UERN_BASE64, 'PNG', 95.5, 12, 19, 29);
  } catch (e) {
    console.warn('Falha ao desenhar brasão:', e);
  }

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Rua Almino Afonso, 478 - Bairro Centro, Mossoró/RN, CEP 59610-210', 105, 45.5, { align: 'center' });
  doc.text('Telefone: (84) 3315-2122 - http://portal.uern.br/', 105, 50, { align: 'center' });

  // Número do Ofício
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.text(oficioFormatado, 15, 61);

  // Destinatário Padrão
  doc.setFont('times', 'normal');
  doc.text('Senhor(a) Gerente', 15, 69);
  doc.text('Banco do Brasil S.A.', 15, 73.5);
  doc.text('Agência 3795-8 - Escritório Setor Público RN', 15, 78);

  // Assunto
  doc.setFont('times', 'bold');
  doc.text('Assunto:', 15, 88);
  doc.setFont('times', 'normal');
  doc.text('Cadastro de Convênio de Conta Garantia (Conta Vinculada)', 30.5, 88);

  // Vocativo e Corpo
  doc.text('Senhor(a) Gerente,', 35, 100);
  const textoCorpo = [
    `          Solicitamos a abertura de convênio e conta garantia bloqueada para movimentação em nome da FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - FUERN, CNPJ nº 08.258.295/0001-02, a qual se destina à prestação de garantia de execução do Contrato Administrativo nº ${params.numeroContrato} - FUERN, firmado com a empresa ${params.empresaRazaoSocial}, inscrita no CNPJ/MF sob o nº ${params.empresaCnpj}.`,
    '',
    `          O presente pedido atende às disposições da Lei Estadual nº 10.841/2021, do Decreto Estadual nº 33.782/2024 e da Instrução Normativa-SEI nº 2/2024 - SEAD/RN, para retenção das provisões de encargos trabalhistas de dedicação exclusiva de mão de obra.`,
    '',
    '          Encaminhamos em anexo a respectiva FICHA CADASTRAL devidamente preenchida e assinada.',
  ];

  doc.text(textoCorpo, 15, 110, { maxWidth: 180, lineHeightFactor: 1.35 });

  // Fecho e Assinatura alinhada à direita
  doc.text('Atenciosamente,', 35, 166);
  doc.text('Mossoró, data da assinatura eletrônica.', 195, 182, { align: 'right' });

  const finalY = 196;
  doc.setFont('times', 'bold');
  doc.text((params.responsavelNome || '').toUpperCase(), 195, finalY, { align: 'right' });
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(`Matrícula nº ${params.responsavelMatricula}`, 195, finalY + 4.5, { align: 'right' });
  doc.text(params.portariaDiretor || params.cargoDiretor, 195, finalY + 9, { align: 'right' });
  doc.text('Diretoria de Administração e Serviços – DAS/PROAD', 195, finalY + 13.5, { align: 'right' });

  if (abrirPreview) {
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  }

  return doc;
}

/**
 * Gera o PDF oficial da FICHA CADASTRAL reproduzindo rigorosamente a grade de 2 páginas
 * do arquivo de referência "MODELO EXEMPLO FICHA CADASTRAL CV.pdf" do Banco do Brasil.
 */
export function gerarFichaCadastralPdf(
  data: FichaCadastralData,
  abrirPreview = false,
  docExistente?: jsPDF
): jsPDF {
  const doc = docExistente || new jsPDF({ unit: 'mm', format: 'a4' });

  const aplicarEstiloTabela = (startY: number, head: any[], body: any[], columnStyles?: any) => {
    autoTable(doc, {
      startY,
      theme: 'plain',
      styles: {
        font: 'times',
        fontSize: 8,
        textColor: [20, 20, 20],
        lineColor: [40, 40, 40],
        lineWidth: 0.2,
        cellPadding: 1.8,
      },
      headStyles: {
        fontStyle: 'bold',
        fontSize: 7.5,
        textColor: [40, 40, 40],
        fillColor: [245, 245, 245],
        lineColor: [40, 40, 40],
        lineWidth: 0.2,
        cellPadding: 1.5,
      },
      columnStyles,
      margin: { left: 14, right: 14 },
      head,
      body,
    });
  };

  // -------------------------------------------------------------
  // PÁGINA 1
  // -------------------------------------------------------------
  if (docExistente) {
    doc.addPage();
  }

  // Título da Ficha
  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text('FICHA CADASTRAL', 105, 16, { align: 'center' });

  let curY = 22;

  // 1. Identificação do Órgão Público (Convenente)
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.text('1. Identificação do Órgão Público (Convenente)', 14, curY);
  curY += 2;

  aplicarEstiloTabela(
    curY,
    [],
    [
      [{ content: 'Razão Social (Completa sem abreviaturas)\n' + data.orgaoRazaoSocial, colSpan: 3, styles: { fontStyle: 'bold' } }],
      [{ content: 'CNPJ\n' + data.orgaoCnpj, colSpan: 3, styles: { fontStyle: 'bold' } }],
      [
        { content: 'Pessoa para Contato\n' + data.orgaoContatoNome, styles: { fontStyle: 'bold' } },
        { content: 'DDD\n' + data.orgaoContatoDdd, styles: { fontStyle: 'bold' } },
        { content: 'Telefone\n' + data.orgaoContatoTelefone, styles: { fontStyle: 'bold' } },
      ],
      [{ content: 'Endereço da Sede\n' + data.orgaoEndereco, colSpan: 3, styles: { fontStyle: 'bold' } }],
      [
        { content: 'Município: ' + data.orgaoMunicipio + '   |   UF: ' + data.orgaoUf + '   |   CEP: ' + data.orgaoCep, colSpan: 2 },
        { content: 'Bairro/Distrito: ' + data.orgaoBairro },
      ],
      [
        { content: 'Fax: ' + (data.orgaoFax || '-') },
        { content: 'E-mail: ' + data.orgaoEmail, colSpan: 2, styles: { fontStyle: 'bold' } },
      ],
      [
        { content: 'Agência de relacionamento: Prefixo ' + data.orgaoAgenciaPrefixo + '-' + data.orgaoAgenciaDv, colSpan: 2 },
        { content: 'Conta: ' + data.orgaoContaCorrente, styles: { fontStyle: 'bold' } },
      ],
    ],
    {
      0: { cellWidth: 110 },
      1: { cellWidth: 22 },
      2: { cellWidth: 50 },
    }
  );

  curY = (doc as any).lastAutoTable.finalY + 5;

  // 2. Serviço solicitado*
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.text('2. Serviço solicitado*', 14, curY);
  curY += 2;

  aplicarEstiloTabela(
    curY,
    [],
    [
      [
        {
          content: `${data.servicoContratacao ? '( X )' : '(   )'} Contratação          ${data.servicoCadastrarGarantidor ? '( X )' : '(   )'} Cadastrar Garantidor**          ${data.servicoCadastrarEvento ? '( X )' : '(   )'} Cadastrar Evento`,
          styles: { fontStyle: 'bold' },
        },
      ],
      [
        {
          content: '*É permitida a marcação de todos os serviços.   **Empresa Prestadora de Serviço',
          styles: { fontSize: 7, textColor: [80, 80, 80] },
        },
      ],
    ]
  );

  curY = (doc as any).lastAutoTable.finalY + 5;

  // 3. Dados para Cadastramento do Convênio
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.text('3. Dados para Cadastramento do Convênio', 14, curY);
  curY += 2;

  aplicarEstiloTabela(
    curY,
    [['CIDADE SEDE', 'UF', 'CEP', 'BAIRRO/DISTRITO']],
    [[data.convenioCidadeSede, data.convenioUf, data.convenioCep, data.convenioBairro]],
    {
      0: { cellWidth: 65 },
      1: { cellWidth: 25 },
      2: { cellWidth: 35 },
      3: { cellWidth: 57 },
    }
  );

  curY = (doc as any).lastAutoTable.finalY + 5;

  // 4. Cadastramento do Convênio*
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.text('4. Cadastramento do Convênio*', 14, curY);
  curY += 2;

  aplicarEstiloTabela(
    curY,
    [],
    [
      [
        {
          content: `Tipo de Convênio:\n${data.tipoConvenio === 'CONTRATOS_ADMINISTRATIVOS' ? '( X )' : '(   )'} Contratos Administrativos                    ${data.tipoConvenio === 'CAUCAO_LICITACAO' ? '( X )' : '(   )'} Caução em Licitação`,
          styles: { fontStyle: 'bold' },
        },
      ],
      [
        {
          content: '* Deve ser preenchido um formulário para cada convênio',
          styles: { fontSize: 7, textColor: [80, 80, 80] },
        },
      ],
    ]
  );

  curY = (doc as any).lastAutoTable.finalY + 5;

  // 5. Dados do Evento*
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.text('5. Dados do Evento*', 14, curY);
  curY += 2;

  aplicarEstiloTabela(
    curY,
    [],
    [
      [
        { content: 'Número do Evento (contrato)\n' + data.eventoNumero, styles: { fontStyle: 'bold' } },
        { content: 'Nome do Evento** (nome da empresa)\n' + data.eventoNome, styles: { fontStyle: 'bold' } },
      ],
      [
        { content: 'Descrição do Evento\n' + data.eventoDescricao, colSpan: 2 },
      ],
      [
        { content: 'Data de Início do Evento: ' + data.eventoDataInicio, styles: { fontStyle: 'bold' } },
        { content: 'Data do Fim do Evento: ' + data.eventoDataFim, styles: { fontStyle: 'bold' } },
      ],
      [
        { content: 'Data Início Captação dos Depósitos: ' + data.eventoDataInicioCaptacao, styles: { fontStyle: 'bold' } },
        { content: 'Data Fim Captação dos Depósitos: ' + data.eventoDataFimCaptacao, styles: { fontStyle: 'bold' } },
      ],
      [
        {
          content: `Depositante:\n${data.eventoDepositante === '1_ORGAO' ? '( X )' : '(   )'} 1 – Órgão Público                    ${data.eventoDepositante === '2_PRESTADORA' ? '( X )' : '(   )'} 2 – Prestadora de Serviço`,
          colSpan: 2,
          styles: { fontStyle: 'bold' },
        },
      ],
      [
        {
          content: '*Deve ser preenchido um formulário para cada evento.\n**Para Contratos Administrativos, preencher com o nome da empresa prestadora de serviços.',
          colSpan: 2,
          styles: { fontSize: 7, textColor: [80, 80, 80] },
        },
      ],
    ],
    {
      0: { cellWidth: 91 },
      1: { cellWidth: 91 },
    }
  );

  // Rodapé da Página 1
  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Ficha Cadastral de Conta Vinculada • Banco do Brasil Setor Público RN — Página 1 de 2', 105, 290, { align: 'center' });

  // -------------------------------------------------------------
  // PÁGINA 2
  // -------------------------------------------------------------
  doc.addPage();
  curY = 20;

  // 6. Dados da Empresa Prestadora de Serviço (Garantidor)*
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text('6. Dados da Empresa Prestadora de Serviço (Garantidor)*', 14, curY);
  curY += 3;

  aplicarEstiloTabela(
    curY,
    [],
    [
      [{ content: 'Razão Social (Completa sem abreviaturas)\n' + data.empresaRazaoSocial, colSpan: 3, styles: { fontStyle: 'bold' } }],
      [{ content: 'CNPJ\n' + data.empresaCnpj, colSpan: 3, styles: { fontStyle: 'bold' } }],
      [
        { content: 'Pessoa para Contato\n' + data.empresaContatoNome, styles: { fontStyle: 'bold' } },
        { content: 'DDD\n' + data.empresaContatoDdd, styles: { fontStyle: 'bold' } },
        { content: 'Telefone\n' + data.empresaContatoTelefone, styles: { fontStyle: 'bold' } },
      ],
      [{ content: 'Endereço da Sede\n' + data.empresaEndereco, colSpan: 3, styles: { fontStyle: 'bold' } }],
      [
        { content: 'Cidade: ' + data.empresaCidade + '   |   UF: ' + data.empresaUf + '   |   CEP: ' + data.empresaCep, colSpan: 2 },
        { content: 'Fax: ' + (data.empresaFax || '-') },
      ],
      [{ content: 'E-mail: ' + data.empresaEmail, colSpan: 3, styles: { fontStyle: 'bold' } }],
      [
        {
          content: '*Não é necessário preenchimento no caso de convênio para Caução em Licitação.',
          colSpan: 3,
          styles: { fontSize: 7, textColor: [80, 80, 80] },
        },
      ],
    ],
    {
      0: { cellWidth: 110 },
      1: { cellWidth: 22 },
      2: { cellWidth: 50 },
    }
  );

  curY = (doc as any).lastAutoTable.finalY + 30;

  // Bloco de Assinatura do Gestor do Contrato
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.3);
  doc.line(55, curY, 155, curY);
  curY += 5;

  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(data.gestorNome, 105, curY, { align: 'center' });
  curY += 4.5;

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text(`TNS/Matrícula nº ${data.gestorMatricula}`, 105, curY, { align: 'center' });
  curY += 4.5;
  doc.text(data.gestorCargoAto, 105, curY, { align: 'center' });
  curY += 4.5;
  doc.text(data.gestorSetor, 105, curY, { align: 'center' });

  curY += 25;
  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('Documento anexo ao Ofício de Abertura de Convênio de Conta Vinculada Bloqueada.', 105, curY, { align: 'center' });
  doc.text('Assinatura eletrônica realizada conforme os normativos institucionais da FUERN / SEI-RN.', 105, curY + 4, { align: 'center' });

  // Rodapé da Página 2
  doc.text('Ficha Cadastral de Conta Vinculada • Banco do Brasil Setor Público RN — Página 2 de 2', 105, 290, { align: 'center' });

  if (abrirPreview) {
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  }

  return doc;
}

/**
 * Gera a Ficha Cadastral em formato Word (.docx) estruturado em tabelas editáveis
 */
export async function gerarFichaCadastralDocx(data: FichaCadastralData): Promise<Blob> {
  const celula = (texto: string, bold = false, colSpan = 1) =>
    new TableCell({
      columnSpan: colSpan,
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: texto,
              bold,
              font: 'Times New Roman',
              size: 19, // 9.5pt
            }),
          ],
        }),
      ],
    });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(0.8),
              right: convertInchesToTwip(0.8),
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'FICHA CADASTRAL - CONTA VINCULADA',
                bold: true,
                font: 'Times New Roman',
                size: 26, // 13pt
              }),
            ],
            spacing: { after: 200 },
          }),

          // 1. Identificação do Órgão Público
          new Paragraph({
            children: [
              new TextRun({
                text: '1. Identificação do Órgão Público (Convenente)',
                bold: true,
                font: 'Times New Roman',
                size: 21,
              }),
            ],
            spacing: { after: 120 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: [celula(`Razão Social:\n${data.orgaoRazaoSocial}`, true, 3)] }),
              new TableRow({ children: [celula(`CNPJ:\n${data.orgaoCnpj}`, true, 3)] }),
              new TableRow({
                children: [
                  celula(`Pessoa para Contato:\n${data.orgaoContatoNome}`, true),
                  celula(`DDD:\n${data.orgaoContatoDdd}`),
                  celula(`Telefone:\n${data.orgaoContatoTelefone}`, true),
                ],
              }),
              new TableRow({ children: [celula(`Endereço da Sede:\n${data.orgaoEndereco}`, true, 3)] }),
              new TableRow({
                children: [
                  celula(`Município: ${data.orgaoMunicipio} | UF: ${data.orgaoUf} | CEP: ${data.orgaoCep}`, false, 2),
                  celula(`Bairro: ${data.orgaoBairro}`),
                ],
              }),
              new TableRow({
                children: [
                  celula(`Fax: ${data.orgaoFax || '-'}`),
                  celula(`E-mail: ${data.orgaoEmail}`, true, 2),
                ],
              }),
              new TableRow({
                children: [
                  celula(`Agência de Relacionamento: Prefixo ${data.orgaoAgenciaPrefixo}-${data.orgaoAgenciaDv}`, false, 2),
                  celula(`Conta: ${data.orgaoContaCorrente}`, true),
                ],
              }),
            ],
          }),
          new Paragraph({ spacing: { after: 240 } }),

          // 2. Serviço Solicitado
          new Paragraph({
            children: [
              new TextRun({
                text: '2. Serviço solicitado*',
                bold: true,
                font: 'Times New Roman',
                size: 21,
              }),
            ],
            spacing: { after: 120 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  celula(
                    `${data.servicoContratacao ? '[X]' : '[ ]'} Contratação        ${data.servicoCadastrarGarantidor ? '[X]' : '[ ]'} Cadastrar Garantidor**        ${data.servicoCadastrarEvento ? '[X]' : '[ ]'} Cadastrar Evento`,
                    true
                  ),
                ],
              }),
              new TableRow({
                children: [
                  celula('*É permitida a marcação de todos os serviços.   **Empresa Prestadora de Serviço'),
                ],
              }),
            ],
          }),
          new Paragraph({ spacing: { after: 240 } }),

          // 3. Dados para Cadastramento do Convênio
          new Paragraph({
            children: [
              new TextRun({
                text: '3. Dados para Cadastramento do Convênio',
                bold: true,
                font: 'Times New Roman',
                size: 21,
              }),
            ],
            spacing: { after: 120 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  celula('CIDADE SEDE', true),
                  celula('UF', true),
                  celula('CEP', true),
                  celula('BAIRRO/DISTRITO', true),
                ],
              }),
              new TableRow({
                children: [
                  celula(data.convenioCidadeSede),
                  celula(data.convenioUf),
                  celula(data.convenioCep),
                  celula(data.convenioBairro),
                ],
              }),
            ],
          }),
          new Paragraph({ spacing: { after: 240 } }),

          // 4. Cadastramento do Convênio
          new Paragraph({
            children: [
              new TextRun({
                text: '4. Cadastramento do Convênio*',
                bold: true,
                font: 'Times New Roman',
                size: 21,
              }),
            ],
            spacing: { after: 120 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  celula(
                    `Tipo de Convênio:\n${data.tipoConvenio === 'CONTRATOS_ADMINISTRATIVOS' ? '[X]' : '[ ]'} Contratos Administrativos      ${data.tipoConvenio === 'CAUCAO_LICITACAO' ? '[X]' : '[ ]'} Caução em Licitação`,
                    true
                  ),
                ],
              }),
            ],
          }),
          new Paragraph({ spacing: { after: 240 } }),

          // 5. Dados do Evento
          new Paragraph({
            children: [
              new TextRun({
                text: '5. Dados do Evento*',
                bold: true,
                font: 'Times New Roman',
                size: 21,
              }),
            ],
            spacing: { after: 120 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  celula(`Número do Evento (contrato):\n${data.eventoNumero}`, true),
                  celula(`Nome do Evento (nome da empresa):\n${data.eventoNome}`, true),
                ],
              }),
              new TableRow({
                children: [
                  celula(`Descrição do Evento:\n${data.eventoDescricao}`, false, 2),
                ],
              }),
              new TableRow({
                children: [
                  celula(`Data de Início do Evento: ${data.eventoDataInicio}`, true),
                  celula(`Data do Fim do Evento: ${data.eventoDataFim}`, true),
                ],
              }),
              new TableRow({
                children: [
                  celula(`Data Início Captação: ${data.eventoDataInicioCaptacao}`, true),
                  celula(`Data Fim Captação: ${data.eventoDataFimCaptacao}`, true),
                ],
              }),
              new TableRow({
                children: [
                  celula(
                    `Depositante:\n${data.eventoDepositante === '1_ORGAO' ? '[X]' : '[ ]'} 1 – Órgão Público      ${data.eventoDepositante === '2_PRESTADORA' ? '[X]' : '[ ]'} 2 – Prestadora de Serviço`,
                    true,
                    2
                  ),
                ],
              }),
            ],
          }),
          new Paragraph({ spacing: { after: 360 } }),

          // 6. Dados da Empresa Prestadora de Serviço
          new Paragraph({
            children: [
              new TextRun({
                text: '6. Dados da Empresa Prestadora de Serviço (Garantidor)*',
                bold: true,
                font: 'Times New Roman',
                size: 21,
              }),
            ],
            spacing: { after: 120 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: [celula(`Razão Social:\n${data.empresaRazaoSocial}`, true, 3)] }),
              new TableRow({ children: [celula(`CNPJ:\n${data.empresaCnpj}`, true, 3)] }),
              new TableRow({
                children: [
                  celula(`Pessoa para Contato:\n${data.empresaContatoNome}`, true),
                  celula(`DDD:\n${data.empresaContatoDdd}`),
                  celula(`Telefone:\n${data.empresaContatoTelefone}`, true),
                ],
              }),
              new TableRow({ children: [celula(`Endereço da Sede:\n${data.empresaEndereco}`, true, 3)] }),
              new TableRow({
                children: [
                  celula(`Cidade: ${data.empresaCidade} | UF: ${data.empresaUf} | CEP: ${data.empresaCep}`, false, 2),
                  celula(`Fax: ${data.empresaFax || '-'}`),
                ],
              }),
              new TableRow({ children: [celula(`E-mail:\n${data.empresaEmail}`, true, 3)] }),
            ],
          }),
          new Paragraph({ spacing: { after: 480 } }),

          // Assinatura do Gestor
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: data.gestorNome,
                bold: true,
                font: 'Times New Roman',
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `TNS/Matrícula nº ${data.gestorMatricula}`,
                font: 'Times New Roman',
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: data.gestorCargoAto,
                font: 'Times New Roman',
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: data.gestorSetor,
                font: 'Times New Roman',
                size: 20,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Gera o texto formatado para copiar e colar diretamente no editor do SEI
 */
export function obterTextoSeiOficio(params: OficioAberturaParams): string {
  const oficioFormatado = formatarNumeroOficioDas(params.numeroOficio);

  return `${oficioFormatado}

Ao(À) Senhor(a) Gerente
Banco do Brasil S.A.
Agência 3795-8 - Escritório Setor Público RN

Assunto: Cadastro de Convênio de Conta Garantia (Conta Vinculada)

Senhor(a) Gerente,

1. Solicitamos a abertura de convênio e conta garantia bloqueada para movimentação em nome da FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - FUERN, CNPJ nº 08.258.295/0001-02, a qual se destina à prestação de garantia de execução do Contrato Administrativo nº ${params.numeroContrato} - FUERN, firmado com a empresa ${params.empresaRazaoSocial}, inscrita no CNPJ sob o nº ${params.empresaCnpj}.

2. O presente pedido atende às disposições da Lei Estadual nº 10.841/2021, do Decreto Estadual nº 33.782/2024 e da Instrução Normativa-SEI nº 2/2024 - SEAD/RN, para retenção das provisões de encargos trabalhistas de dedicação exclusiva de mão de obra.

3. Encaminhamos em anexo a respectiva FICHA CADASTRAL devidamente preenchida e assinada.

Atenciosamente,

Mossoró/RN, data da assinatura eletrônica.

${(params.responsavelNome || '').toUpperCase()}
Matrícula nº ${params.responsavelMatricula}
${params.portariaDiretor || params.cargoDiretor}
Diretoria de Administração e Serviços – DAS/PROAD`;
}
