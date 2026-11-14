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

export interface ItemCompraOrdem {
  numeroItem: number;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface OrdemServicoDados {
  tipoOrdem?: 'ORDEM_SERVICO' | 'ORDEM_COMPRA';
  numeroOs: string;
  ano: number | string;
  tipoProcesso?: string; // Ex: 'Pagamento de fornecedor' ou 'Aquisição de bens e materiais'
  origem?: string; // Ex: 'Diretoria de Administração e Serviços - PROAD'
  origemContratacao?: string; // 'Ata de Registro de Preços', 'Pregão Eletrônico Direto', 'Dispensa', etc.
  numeroAtaRegistroPreco?: string;
  dataContratacao?: string;
  interessado: string; // Razão social do fornecedor
  cnpjCpf: string;
  enderecoFornecedor?: string;
  contatoFornecedor?: string;
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

  // Condições e Itens específicos para Aquisição de Bens / Ordem de Compra
  itensCompra?: ItemCompraOrdem[];
  prazoDiasEntrega?: number;
  localEntrega?: string;
  responsavelRecebimento?: string;
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

  const isCompra = dados.tipoOrdem === 'ORDEM_COMPRA';
  const tipoProcessoDefault = isCompra ? 'Aquisição de bens e materiais' : 'Pagamento de fornecedor';
  const origemContratacaoDefault = dados.origemContratacao || (dados.numeroAtaRegistroPreco ? `Ata de Registro de Preços nº ${dados.numeroAtaRegistroPreco}` : 'Pregão Eletrônico Direto');

  return {
    ...dados,
    tipoProcesso: dados.tipoProcesso || tipoProcessoDefault,
    origem: dados.origem || 'Diretoria de Administração e Serviços - PROAD',
    origemContratacao: origemContratacaoDefault,
    prazoDiasEntrega: dados.prazoDiasEntrega || 30,
    localEntrega: dados.localEntrega || 'Almoxarifado Central da UERN - Campus Central Mossoró/RN',
    responsavelRecebimento: dados.responsavelRecebimento || 'Fiscal Técnico / Setor de Almoxarifado e Patrimônio',
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

  const isCompra = dados.tipoOrdem === 'ORDEM_COMPRA';
  const textoIntro = isCompra
    ? `AUTORIZO o fornecimento dos bens/materiais abaixo discriminados, em observância ao Processo SEI da Despesa nº ${dados.processoSeiDespesa}, vinculado ao Processo Mãe de Contratação nº ${dados.processoSeiVinculado}, considerando as seguintes condições e especificações:`
    : 'DOU início ao processo de pagamento de fornecedor, o qual segue para trâmite de estilo, considerando as seguintes informações:';

  const introLines = doc.splitTextToSize(textoIntro, contentWidth);
  doc.text(introLines, marginX, currentY);
  currentY += introLines.length * 5 + 4;

  if (isCompra) {
    // 4. Campos Estruturados da Ordem de Compra
    const camposCompra = [
      { label: 'Tipo do processo:', valor: dados.tipoProcesso },
      { label: 'Origem da Contratação:', valor: dados.origemContratacao || 'Pregão Eletrônico Direto' },
      { label: 'Instrumento Contratual:', valor: `${dados.contratoNumero}${dados.dataContratacao ? ` (Firmado em: ${dados.dataContratacao})` : ''}` },
      { label: 'Interessado / Contratada:', valor: `${dados.interessado} (CNPJ: ${dados.cnpjCpf})` },
      { label: 'Processo SEI Vinculado (Mãe):', valor: dados.processoSeiVinculado },
      { label: 'Processo SEI da Despesa:', valor: dados.processoSeiDespesa },
    ];

    doc.setFontSize(10);
    const lineHeight = 4.8;

    camposCompra.forEach((c) => {
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

    currentY += 3;

    // Tabela de Itens de Compra
    if (dados.itensCompra && dados.itensCompra.length > 0) {
      doc.setFont('times', 'bold');
      doc.setFontSize(9.5);
      doc.text('Discriminação dos Bens / Materiais Solicitados:', marginX, currentY);
      currentY += 4.5;

      const colItemW = 12;
      const colDescW = 73;
      const colUnidW = 15;
      const colQtdW = 16;
      const colUnitW = 26;
      const colTotalW = 28;

      doc.setFillColor(245, 247, 250);
      doc.rect(marginX, currentY - 3.5, contentWidth, 5.5, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.15);
      doc.rect(marginX, currentY - 3.5, contentWidth, 5.5, 'S');

      doc.setFontSize(8.5);
      doc.setFont('times', 'bold');
      let tableX = marginX;
      doc.text('Item', tableX + 2, currentY);
      tableX += colItemW;
      doc.text('Descrição do Bem / Material', tableX + 2, currentY);
      tableX += colDescW;
      doc.text('Unid.', tableX + 2, currentY);
      tableX += colUnidW;
      doc.text('Qtd', tableX + 2, currentY);
      tableX += colQtdW;
      doc.text('Unitário (R$)', tableX + 2, currentY);
      tableX += colUnitW;
      doc.text('Total (R$)', tableX + 2, currentY);

      currentY += 4.5;

      doc.setFont('times', 'normal');
      dados.itensCompra.forEach((item) => {
        const descLines = doc.splitTextToSize(item.descricao, colDescW - 3);
        const rowH = Math.max(descLines.length * 3.8, 5.5);

        if (currentY + rowH > 240) {
          doc.addPage();
          currentY = 20;
        }

        doc.rect(marginX, currentY - 3.5, contentWidth, rowH, 'S');

        let rX = marginX;
        doc.text(String(item.numeroItem), rX + 2, currentY);
        rX += colItemW;
        doc.text(descLines, rX + 2, currentY);
        rX += colDescW;
        doc.text(item.unidade, rX + 2, currentY);
        rX += colUnidW;
        doc.text(String(item.quantidade), rX + 2, currentY);
        rX += colQtdW;
        doc.text(item.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rX + 2, currentY);
        rX += colUnitW;
        doc.text(item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rX + 2, currentY);

        currentY += rowH;
      });

      doc.setFont('times', 'bold');
      doc.setFillColor(245, 247, 250);
      doc.rect(marginX, currentY - 3.5, contentWidth, 5.5, 'FD');
      doc.text('VALOR TOTAL DA COMPRA:', marginX + 2, currentY);
      doc.text(
        `R$ ${dados.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${dados.valorExtenso})`,
        marginX + 55,
        currentY
      );
      currentY += 7;
    } else {
      doc.setFont('times', 'bold');
      doc.text('Especificação do Objeto:', marginX, currentY);
      doc.setFont('times', 'normal');
      const refLines = doc.splitTextToSize(dados.referencia, contentWidth - 45);
      doc.text(refLines, marginX + 45, currentY);
      currentY += refLines.length * 4.8;

      doc.setFont('times', 'bold');
      doc.text('Valor Total:', marginX, currentY);
      doc.setFont('times', 'normal');
      doc.text(
        `R$ ${dados.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${dados.valorExtenso})`,
        marginX + 25,
        currentY
      );
      currentY += 6.0;
    }

    // Condições de Fornecimento e Entrega
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text('Condições de Fornecimento e Entrega:', marginX, currentY);
    currentY += 4.5;

    const condicoes = [
      { label: '• Prazo de Entrega:', valor: `${dados.prazoDiasEntrega || 30} dias corridos, contados a partir da data de remessa formal desta Ordem de Compra ao fornecedor pelo Fiscal Técnico.` },
      { label: '• Local de Entrega:', valor: dados.localEntrega || 'Almoxarifado Central da UERN - Campus Central, Mossoró/RN.' },
      { label: '• Responsável pelo Recebimento:', valor: dados.responsavelRecebimento || 'Fiscal Técnico / Setor de Almoxarifado e Patrimônio' },
    ];

    condicoes.forEach((cond) => {
      doc.setFont('times', 'bold');
      doc.text(cond.label, marginX + 2, currentY);
      const lW = doc.getTextWidth(cond.label) + 2;
      doc.setFont('times', 'normal');
      const cLines = doc.splitTextToSize(cond.valor, contentWidth - lW - 4);
      doc.text(cLines, marginX + 2 + lW, currentY);
      currentY += cLines.length * 4.2;
    });

    currentY += 4;
  } else {
    // 4. Campos Estruturados (Ordem de Serviço Padrão)
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
  }

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

  const isCompra = dados.tipoOrdem === 'ORDEM_COMPRA';

  const bordaTabelaItens = {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  };

  const campos = isCompra
    ? [
        { label: 'Tipo do processo:', valor: dados.tipoProcesso },
        { label: 'Origem da Contratação:', valor: dados.origemContratacao || 'Pregão Eletrônico Direto' },
        { label: 'Instrumento Contratual:', valor: `${dados.contratoNumero}${dados.dataContratacao ? ` (Firmado em: ${dados.dataContratacao})` : ''}` },
        { label: 'Interessado / Contratada:', valor: `${dados.interessado} (CNPJ: ${dados.cnpjCpf})` },
        { label: 'Processo SEI Vinculado (Mãe):', valor: dados.processoSeiVinculado },
        { label: 'Processo SEI da Despesa:', valor: dados.processoSeiDespesa },
      ]
    : [
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

  // Tabela de Itens de Compra para Word (.docx)
  let tabelaItensDocx: Table | null = null;
  if (isCompra && dados.itensCompra && dados.itensCompra.length > 0) {
    const headerRow = new TableRow({
      children: [
        new TableCell({ width: { size: 800, type: WidthType.DXA }, borders: bordaTabelaItens, children: [new Paragraph({ children: [new TextRun({ text: 'Item', bold: true, font: 'Times New Roman', size: 18 })] })] }),
        new TableCell({ width: { size: 4400, type: WidthType.DXA }, borders: bordaTabelaItens, children: [new Paragraph({ children: [new TextRun({ text: 'Descrição do Bem / Material', bold: true, font: 'Times New Roman', size: 18 })] })] }),
        new TableCell({ width: { size: 900, type: WidthType.DXA }, borders: bordaTabelaItens, children: [new Paragraph({ children: [new TextRun({ text: 'Unid.', bold: true, font: 'Times New Roman', size: 18 })] })] }),
        new TableCell({ width: { size: 900, type: WidthType.DXA }, borders: bordaTabelaItens, children: [new Paragraph({ children: [new TextRun({ text: 'Qtd', bold: true, font: 'Times New Roman', size: 18 })] })] }),
        new TableCell({ width: { size: 1300, type: WidthType.DXA }, borders: bordaTabelaItens, children: [new Paragraph({ children: [new TextRun({ text: 'Unitário (R$)', bold: true, font: 'Times New Roman', size: 18 })] })] }),
        new TableCell({ width: { size: 1300, type: WidthType.DXA }, borders: bordaTabelaItens, children: [new Paragraph({ children: [new TextRun({ text: 'Total (R$)', bold: true, font: 'Times New Roman', size: 18 })] })] }),
      ],
    });

    const itemRows = dados.itensCompra.map((item) => (
      new TableRow({
        children: [
          new TableCell({ width: { size: 800, type: WidthType.DXA }, borders: bordaTabelaItens, children: [new Paragraph({ children: [new TextRun({ text: String(item.numeroItem), font: 'Times New Roman', size: 18 })] })] }),
          new TableCell({ width: { size: 4400, type: WidthType.DXA }, borders: bordaTabelaItens, children: [new Paragraph({ children: [new TextRun({ text: item.descricao, font: 'Times New Roman', size: 18 })] })] }),
          new TableCell({ width: { size: 900, type: WidthType.DXA }, borders: bordaTabelaItens, children: [new Paragraph({ children: [new TextRun({ text: item.unidade, font: 'Times New Roman', size: 18 })] })] }),
          new TableCell({ width: { size: 900, type: WidthType.DXA }, borders: bordaTabelaItens, children: [new Paragraph({ children: [new TextRun({ text: String(item.quantidade), font: 'Times New Roman', size: 18 })] })] }),
          new TableCell({ width: { size: 1300, type: WidthType.DXA }, borders: bordaTabelaItens, children: [new Paragraph({ children: [new TextRun({ text: item.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), font: 'Times New Roman', size: 18 })] })] }),
          new TableCell({ width: { size: 1300, type: WidthType.DXA }, borders: bordaTabelaItens, children: [new Paragraph({ children: [new TextRun({ text: item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), font: 'Times New Roman', size: 18 })] })] }),
        ],
      })
    ));

    const totalRow = new TableRow({
      children: [
        new TableCell({
          width: { size: 7000, type: WidthType.DXA },
          columnSpan: 4,
          borders: bordaTabelaItens,
          children: [new Paragraph({ children: [new TextRun({ text: 'VALOR TOTAL DA COMPRA:', bold: true, font: 'Times New Roman', size: 18 })] })],
        }),
        new TableCell({
          width: { size: 2600, type: WidthType.DXA },
          columnSpan: 2,
          borders: bordaTabelaItens,
          children: [new Paragraph({ children: [new TextRun({ text: `R$ ${dados.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, bold: true, font: 'Times New Roman', size: 18 })] })],
        }),
      ],
    });

    tabelaItensDocx = new Table({
      width: { size: 9600, type: WidthType.DXA },
      rows: [headerRow, ...itemRows, totalRow],
    });
  }

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
                text: isCompra
                  ? `AUTORIZO o fornecimento dos bens/materiais abaixo discriminados, em observância ao Processo SEI da Despesa nº ${dados.processoSeiDespesa}, vinculado ao Processo Mãe de Contratação nº ${dados.processoSeiVinculado}, considerando as seguintes condições e especificações:`
                  : 'DOU início ao processo de pagamento de fornecedor, o qual segue para trâmite de estilo, considerando as seguintes informações:',
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

          ...(isCompra && tabelaItensDocx
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Discriminação dos Bens / Materiais Solicitados:',
                      bold: true,
                      font: 'Times New Roman',
                      size: 20,
                    }),
                  ],
                  spacing: { before: 200, after: 100 },
                }),
                tabelaItensDocx,
              ]
            : []),

          // Condições de Fornecimento para Compra ou Observação para Serviços
          ...(isCompra
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Condições de Fornecimento e Entrega:',
                      bold: true,
                      font: 'Times New Roman',
                      size: 20,
                    }),
                  ],
                  spacing: { before: 200, after: 100 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: '• Prazo de Entrega: ', bold: true, font: 'Times New Roman', size: 18 }),
                    new TextRun({ text: `${dados.prazoDiasEntrega || 30} dias corridos, contados a partir da data de remessa formal desta Ordem de Compra ao fornecedor pelo Fiscal Técnico.`, font: 'Times New Roman', size: 18 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: '• Local de Entrega: ', bold: true, font: 'Times New Roman', size: 18 }),
                    new TextRun({ text: dados.localEntrega || 'Almoxarifado Central da UERN - Campus Central, Mossoró/RN.', font: 'Times New Roman', size: 18 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: '• Responsável pelo Recebimento: ', bold: true, font: 'Times New Roman', size: 18 }),
                    new TextRun({ text: dados.responsavelRecebimento || 'Fiscal Técnico / Setor de Almoxarifado e Patrimônio', font: 'Times New Roman', size: 18 }),
                  ],
                  spacing: { after: 200 },
                }),
              ]
            : [
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
              ]),

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
