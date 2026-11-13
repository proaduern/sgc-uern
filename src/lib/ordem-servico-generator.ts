import { jsPDF } from 'jspdf';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
} from 'docx';
import {
  BRASAO_RN_BASE64,
  LOGO_UERN_SEI_BASE64,
  QRCODE_SEI_BASE64,
} from '@/lib/config/sei-assets';
import { formatarTextoDocumentoSgc } from '@/lib/sequencial-documento';

export interface OrdemServicoDados {
  tipoOrdem?: 'ORDEM_SERVICO' | 'ORDEM_COMPRA';
  numeroOs: string;
  ano: number | string;
  tipoProcesso?: string; // Ex: 'Pagamento de fornecedor'
  origem?: string; // Ex: 'Diretoria de Administração e Serviços - PROAD'
  interessado: string; // Razão social do fornecedor
  cnpjCpf: string;
  contratoNumero: string;
  valor: number;
  valorExtenso?: string;
  referencia: string; // Medição de referência / Objeto
  processoSeiVinculado: string; // Processo Mãe SEI de contratação
  processoSeiDespesa: string; // Processo SEI da Despesa
  codigoVerificadorSei?: string;
  codigoCrcSei?: string;
  emissorNome: string;
  emissorCargoMatricula: string;
  emissorNomeCompleto?: string;
  emissorCargoCompleto?: string;
  dataAssinatura?: string;
  horaAssinatura?: string;
}

/**
 * Converte um valor monetário (R$) para extenso em português do Brasil.
 */
export function numeroParaExtenso(valor: number): string {
  if (isNaN(valor) || valor === 0) return 'zero real';

  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const especiais = [
    'dez',
    'onze',
    'doze',
    'treze',
    'quatorze',
    'quinze',
    'dezesseis',
    'dezessete',
    'dezoito',
    'dezenove',
  ];
  const dezenas = [
    '',
    '',
    'vinte',
    'trinta',
    'quarenta',
    'cinquenta',
    'sessenta',
    'setenta',
    'oitenta',
    'noventa',
  ];
  const centenas = [
    '',
    'cento',
    'duzentos',
    'trezentos',
    'quatrocentos',
    'quinhentos',
    'seiscentos',
    'setecentos',
    'oitocentos',
    'novecentos',
  ];

  function converterCentena(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    const partes: string[] = [];

    if (c > 0) partes.push(centenas[c]);

    if (d === 1) {
      partes.push(especiais[u]);
    } else {
      if (d > 1) partes.push(dezenas[d]);
      if (u > 0) partes.push(unidades[u]);
    }

    return partes.join(' e ');
  }

  const inteiro = Math.floor(Math.abs(valor));
  const centavos = Math.round((Math.abs(valor) - inteiro) * 100);

  const milhoes = Math.floor(inteiro / 1000000);
  const milhares = Math.floor((inteiro % 1000000) / 1000);
  const resto = inteiro % 1000;

  const partesTexto: string[] = [];

  if (milhoes > 0) {
    const textoM = converterCentena(milhoes);
    partesTexto.push(milhoes === 1 ? `${textoM} milhão` : `${textoM} milhões`);
  }

  if (milhares > 0) {
    const textoMil = converterCentena(milhares);
    partesTexto.push(milhares === 1 ? 'um mil' : `${textoMil} mil`);
  }

  if (resto > 0) {
    partesTexto.push(converterCentena(resto));
  }

  let textoReais = '';
  if (inteiro > 0) {
    textoReais = partesTexto.join(' e ');
    textoReais += inteiro === 1 ? ' real' : ' reais';
  }

  let textoCentavos = '';
  if (centavos > 0) {
    const cTexto = converterCentena(centavos);
    textoCentavos = `${cTexto} ${centavos === 1 ? 'centavo' : 'centavos'}`;
  }

  if (textoReais && textoCentavos) {
    return `${textoReais} e ${textoCentavos}`;
  }
  return textoReais || textoCentavos || 'zero real';
}

/**
 * Prepara e normaliza os dados da OS garantindo valores padrão e códigos de verificação SEI
 */
function normalizarDadosOs(dados: OrdemServicoDados) {
  const agora = new Date();
  const dataAssinatura =
    dados.dataAssinatura ||
    agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaAssinatura =
    dados.horaAssinatura ||
    agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Gera código verificador e CRC no formato oficial do SEI caso não informados
  const codigoVerificadorSei =
    dados.codigoVerificadorSei ||
    Math.floor(10000000 + Math.random() * 90000000).toString(); // 8 dígitos numéricos
  const codigoCrcSei =
    dados.codigoCrcSei ||
    Math.random().toString(36).substring(2, 10).toUpperCase(); // 8 caracteres hex/alfanuméricos

  const valorExtenso = dados.valorExtenso || numeroParaExtenso(dados.valor);

  return {
    ...dados,
    tipoProcesso: dados.tipoProcesso || 'Pagamento de fornecedor',
    origem: dados.origem || 'Diretoria de Administração e Serviços - PROAD',
    dataAssinatura,
    horaAssinatura,
    codigoVerificadorSei,
    codigoCrcSei,
    valorExtenso,
    emissorNomeCompleto: dados.emissorNomeCompleto || dados.emissorNome,
    emissorCargoCompleto: dados.emissorCargoCompleto || dados.emissorCargoMatricula,
  };
}

/**
 * Gera a Ordem de Serviço em PDF idêntica ao modelo oficial do SEI UERN.
 */
export function gerarOrdemServicoPdf(dadosEntrada: OrdemServicoDados): jsPDF {
  const dados = normalizarDadosOs(dadosEntrada);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const marginX = 20;
  const contentWidth = pageWidth - marginX * 2; // 170mm

  // 1. Brasão do Estado do Rio Grande do Norte (Centralizado no topo)
  const brasaoW = 17;
  const brasaoH = 25.8;
  const brasaoX = (pageWidth - brasaoW) / 2;
  doc.addImage('data:image/jpeg;base64,' + BRASAO_RN_BASE64, 'JPEG', brasaoX, 12, brasaoW, brasaoH);

  // 2. Título do Documento
  let currentY = 44;
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  const tituloDoc = formatarTextoDocumentoSgc(
    dados.tipoOrdem || 'ORDEM_SERVICO',
    dados.numeroOs,
    dados.ano
  );
  doc.text(tituloDoc, pageWidth / 2, currentY, { align: 'center' });

  // 3. Parágrafo Introdutório
  currentY += 12;
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  const textoIntro =
    'DOU início ao processo de pagamento de fornecedor, o qual segue para trâmite de estilo, considerando as seguintes informações:';
  const introLines = doc.splitTextToSize(textoIntro, contentWidth);
  doc.text(introLines, marginX, currentY);
  currentY += introLines.length * 5 + 4;

  // 4. Campos Estruturados (Chave Negrito, Valor Normal)
  const campos = [
    { label: 'Tipo do processo:', valor: dados.tipoProcesso },
    { label: 'Origem:', valor: dados.origem },
    { label: 'Interessado:', valor: dados.interessado },
    { label: 'CNPJ/CPF:', valor: dados.cnpjCpf },
    { label: 'Contrato nº:', valor: dados.contratoNumero },
    {
      label: 'Valor:',
      valor: `R$ ${dados.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${dados.valorExtenso})`,
    },
    { label: 'Referência:', valor: dados.referencia },
    { label: 'Processo SEI Vinculado:', valor: dados.processoSeiVinculado }, // Processo Mãe SEI da contratação
  ];

  doc.setFontSize(10.5);
  const lineHeight = 5.2;

  campos.forEach((c) => {
    doc.setFont('times', 'bold');
    doc.text(c.label, marginX, currentY);

    const labelWidth = doc.getTextWidth(c.label) + 2.5;
    const valorX = marginX + labelWidth;
    const valorWidth = contentWidth - labelWidth;

    doc.setFont('times', 'normal');
    const valorLines = doc.splitTextToSize(c.valor, valorWidth);
    doc.text(valorLines, valorX, currentY);

    currentY += valorLines.length * lineHeight;
  });

  // 5. Nota de Observação (Itálico)
  currentY += 2;
  doc.setFont('times', 'italic');
  doc.setFontSize(9.5);
  const textoObs =
    'OBS: Os valores são estimados, e podem variar conforme a execução, respeitando os limites do Contrato, vigência e saldo disponível';
  const obsLines = doc.splitTextToSize(textoObs, contentWidth);
  doc.text(obsLines, marginX, currentY);
  currentY += obsLines.length * 4.5 + 8;

  // 6. Bloco de Identificação do Emissor (Alinhado à Direita)
  const emissorX = pageWidth - marginX;
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.text(dados.emissorNome, emissorX, currentY, { align: 'right' });
  currentY += 5;
  doc.text(dados.emissorCargoMatricula, emissorX, currentY, { align: 'right' });
  currentY += 12;

  // 7. Bloco de Assinatura Eletrônica Oficial SEI
  const boxX = marginX;
  const boxY = currentY;
  const boxW = contentWidth;
  const boxH = 34;

  // Borda suave do quadro SEI
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.rect(boxX, boxY, boxW, boxH);

  // Logo UERN e QR Code no lado esquerdo do box
  doc.addImage('data:image/jpeg;base64,' + LOGO_UERN_SEI_BASE64, 'JPEG', boxX + 4, boxY + 3.5, 15, 10.1);
  doc.addImage('data:image/jpeg;base64,' + QRCODE_SEI_BASE64, 'JPEG', boxX + 4.5, boxY + 15.5, 14, 14);

  // Texto oficial da chancela SEI
  const seiTextX = boxX + 23;
  const seiTextW = boxW - 26;
  let seiY = boxY + 5.5;

  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);

  const txt1 = `Documento assinado eletronicamente por `;
  const txtNome = dados.emissorNomeCompleto;
  const txtCargo = `, ${dados.emissorCargoCompleto}`;
  const txtData = `, em ${dados.dataAssinatura}, às ${dados.horaAssinatura}, conforme horário oficial de Brasília, com fundamento no art. 4º do `;
  const txtDec = `Decreto nº 27.685, de 30 de janeiro de 2018.`;

  const p1 = `${txt1}${txtNome}${txtCargo}${txtData}${txtDec}`;
  const linesP1 = doc.splitTextToSize(p1, seiTextW);
  doc.text(linesP1, seiTextX, seiY);

  seiY += linesP1.length * 3.8 + 2;

  const p2 = `A autenticidade deste documento pode ser conferida no site https://sei.rn.gov.br/sei/controlador_externo.php?acao=documento_conferir&id_orgao_acesso_externo=0, informando o código verificador ${dados.codigoVerificadorSei} e o código CRC ${dados.codigoCrcSei}.`;
  const linesP2 = doc.splitTextToSize(p2, seiTextW);
  doc.text(linesP2, seiTextX, seiY);

  // 8. Rodapé SEI
  const footerY = 278;
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.text('Referência:', marginX, footerY);

  doc.setFont('times', 'normal');
  doc.text(`Processo nº ${dados.processoSeiDespesa}`, marginX + 17, footerY);
  doc.text(`SEI nº ${dados.codigoVerificadorSei}`, pageWidth - marginX, footerY, { align: 'right' });

  // Running text inferior
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  const runningTxt = `Ordem de Serviço ${dados.numeroOs} (${dados.codigoVerificadorSei})         SEI ${dados.processoSeiDespesa} / pg. 1`;
  doc.text(runningTxt, marginX + 15, 287);

  return doc;
}

/**
 * Converte base64 string em Uint8Array para uso na biblioteca docx
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Gera a Ordem de Serviço em formato editável Microsoft Word (.docx) rigorosamente formatado.
 */
export async function gerarOrdemServicoDocx(dadosEntrada: OrdemServicoDados): Promise<Blob> {
  const dados = normalizarDadosOs(dadosEntrada);

  const brasaoBytes = base64ToUint8Array(BRASAO_RN_BASE64);
  const uernBytes = base64ToUint8Array(LOGO_UERN_SEI_BASE64);
  const qrBytes = base64ToUint8Array(QRCODE_SEI_BASE64);

  const semBorda = {
    top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  };

  const bordaSuave = {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  };

  const campos = [
    { label: 'Tipo do processo:', valor: dados.tipoProcesso },
    { label: 'Origem:', valor: dados.origem },
    { label: 'Interessado:', valor: dados.interessado },
    { label: 'CNPJ/CPF:', valor: dados.cnpjCpf },
    { label: 'Contrato nº:', valor: dados.contratoNumero },
    {
      label: 'Valor:',
      valor: `R$ ${dados.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${dados.valorExtenso})`,
    },
    { label: 'Referência:', valor: dados.referencia },
    { label: 'Processo SEI Vinculado:', valor: dados.processoSeiVinculado },
  ];

  const tabelaCamposRows = campos.map(
    (c) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 2800, type: WidthType.DXA },
            borders: semBorda,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: c.label,
                    bold: true,
                    font: 'Times New Roman',
                    size: 22, // 11pt
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 6800, type: WidthType.DXA },
            borders: semBorda,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: c.valor,
                    font: 'Times New Roman',
                    size: 22, // 11pt
                  }),
                ],
              }),
            ],
          }),
        ],
      })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // ~20mm
              bottom: 1134,
              left: 1134,
              right: 1134,
            },
          },
        },
        children: [
          // 1. Brasão RN
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: brasaoBytes,
                transformation: { width: 64, height: 97 }, // pixels proporcionais
                type: 'jpg',
              }),
            ],
            spacing: { after: 300 },
          }),

          // 2. Título do Documento
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: formatarTextoDocumentoSgc(
                  dados.tipoOrdem || 'ORDEM_SERVICO',
                  dados.numeroOs,
                  dados.ano
                ),
                font: 'Times New Roman',
                size: 22, // 11pt
              }),
            ],
            spacing: { after: 300 },
          }),

          // 3. Parágrafo Introdutório
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: 'DOU início ao processo de pagamento de fornecedor, o qual segue para trâmite de estilo, considerando as seguintes informações:',
                bold: true,
                font: 'Times New Roman',
                size: 22, // 11pt
              }),
            ],
            spacing: { after: 200 },
          }),

          // 4. Tabela de Campos
          new Table({
            width: { size: 9600, type: WidthType.DXA },
            rows: tabelaCamposRows,
          }),

          // 5. Observação
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: 'OBS: Os valores são estimados, e podem variar conforme a execução, respeitando os limites do Contrato, vigência e saldo disponível',
                italics: true,
                font: 'Times New Roman',
                size: 20, // 10pt
              }),
            ],
            spacing: { before: 200, after: 400 },
          }),

          // 6. Identificação do Emissor
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: dados.emissorNome,
                font: 'Times New Roman',
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: dados.emissorCargoMatricula,
                font: 'Times New Roman',
                size: 22,
              }),
            ],
            spacing: { after: 400 },
          }),

          // 7. Quadro SEI
          new Table({
            width: { size: 9600, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 1400, type: WidthType.DXA },
                    borders: bordaSuave,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new ImageRun({
                            data: uernBytes,
                            transformation: { width: 56, height: 38 },
                            type: 'jpg',
                          }),
                        ],
                        spacing: { after: 100 },
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new ImageRun({
                            data: qrBytes,
                            transformation: { width: 54, height: 54 },
                            type: 'jpg',
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 8200, type: WidthType.DXA },
                    borders: bordaSuave,
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: 'Documento assinado eletronicamente por ',
                            font: 'Times New Roman',
                            size: 18, // 9pt
                          }),
                          new TextRun({
                            text: dados.emissorNomeCompleto,
                            bold: true,
                            font: 'Times New Roman',
                            size: 18,
                          }),
                          new TextRun({
                            text: `, ${dados.emissorCargoCompleto}`,
                            bold: true,
                            font: 'Times New Roman',
                            size: 18,
                          }),
                          new TextRun({
                            text: `, em ${dados.dataAssinatura}, às ${dados.horaAssinatura}, conforme horário oficial de Brasília, com fundamento no art. 4º do `,
                            font: 'Times New Roman',
                            size: 18,
                          }),
                          new TextRun({
                            text: 'Decreto nº 27.685, de 30 de janeiro de 2018.',
                            font: 'Times New Roman',
                            size: 18,
                          }),
                        ],
                        spacing: { after: 100 },
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: 'A autenticidade deste documento pode ser conferida no site https://sei.rn.gov.br/sei/controlador_externo.php?acao=documento_conferir&id_orgao_acesso_externo=0, informando o código verificador ',
                            font: 'Times New Roman',
                            size: 18,
                          }),
                          new TextRun({
                            text: dados.codigoVerificadorSei,
                            bold: true,
                            font: 'Times New Roman',
                            size: 18,
                          }),
                          new TextRun({
                            text: ' e o código CRC ',
                            font: 'Times New Roman',
                            size: 18,
                          }),
                          new TextRun({
                            text: dados.codigoCrcSei,
                            bold: true,
                            font: 'Times New Roman',
                            size: 18,
                          }),
                          new TextRun({
                            text: '.',
                            font: 'Times New Roman',
                            size: 18,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // 8. Rodapé SEI
          new Paragraph({
            children: [
              new TextRun({
                text: 'Referência: ',
                bold: true,
                font: 'Times New Roman',
                size: 18,
              }),
              new TextRun({
                text: `Processo nº ${dados.processoSeiDespesa}`,
                font: 'Times New Roman',
                size: 18,
              }),
              new TextRun({
                text: `\t\t\t\t\tSEI nº ${dados.codigoVerificadorSei}`,
                font: 'Times New Roman',
                size: 18,
              }),
            ],
            spacing: { before: 300, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Ordem de Serviço ${dados.numeroOs} (${dados.codigoVerificadorSei})         SEI ${dados.processoSeiDespesa} / pg. 1`,
                font: 'Arial',
                size: 15,
                color: '666666',
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
 * Função utilitária no navegador para download de arquivos Blob (.pdf ou .docx)
 */
export function baixarBlobNoNavegador(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
