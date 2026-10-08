import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface DadosNotificacaoUern {
  numeroNotificacao: string; // Ex: 15/2026
  processoSei: string;       // Ex: 04410035.000402/2026-38
  tipoFase: 'DEFESA_PREVIA_15D' | 'DECISAO_RECURSO_15D' | 'DECISAO_FINAL';
  assunto: string;
  contratoNumero: string;
  processoOrigem?: string;
  pregaoNumero?: string;
  vigenciaInicio?: string;
  vigenciaFim?: string;
  objeto: string;
  razaoSocial: string;
  cnpj: string;
  enderecoContratada?: string;
  clausulaDescumprida: string;
  descricaoFatos: string;
  penalidadeProposta: string;
  prazoDiasUteis: number; // Padrão 15 dias úteis (Art. 45 IN 01/2026 e Art. 156 Lei 14.133/2021)
  fiscalNome: string;
  fiscalCargoMatricula: string;
  atoDesignacaoNumero?: string;
  dataEmissao?: string;
}

/**
 * Gera arquivo XLSX pronto para download com o Termo de Notificação padrão da UERN
 */
export function exportarNotificacaoXlsx(dados: DadosNotificacaoUern): Uint8Array {
  const wb = XLSX.utils.book_new();

  const linhas = [
    ['UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - UERN'],
    ['PRÓ-REITORIA DE ADMINISTRAÇÃO - PROAD / DIRETORIA DE ADMINISTRAÇÃO E SERVIÇOS - DAS'],
    ['TERMO DE NOTIFICAÇÃO Nº ' + dados.numeroNotificacao],
    [''],
    ['PARÂMETRO', 'DISCRIMINAÇÃO OFICIAL'],
    ['NOTIFICANTE', 'UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - UERN'],
    ['ENDEREÇO NOTIFICANTE', 'Praça Miguel Faustino, Centro - Edifício Epílogo de Campos, CEP: 59.610-220, Mossoró/RN'],
    ['NOTIFICADA', dados.razaoSocial],
    ['CNPJ DA NOTIFICADA', dados.cnpj],
    ['ENDEREÇO NOTIFICADA', dados.enderecoContratada || 'Conforme cadastro no SICAF/UERN'],
    ['PROCESSO ADMINISTRATIVO SEI', dados.processoSei],
    ['ASSUNTO', dados.assunto],
    ['CONTRATO ADMINISTRATIVO', dados.contratoNumero],
    ['ORIGEM DA CONTRATAÇÃO', `${dados.processoOrigem || 'Processo SEI/FUERN'} (Pregão Eletrônico nº ${dados.pregaoNumero || 'N/A'})`],
    ['VIGÊNCIA CONTRATUAL', `${dados.vigenciaInicio || '-'} à ${dados.vigenciaFim || '-'}`],
    ['OBJETO CONTRATUAL', dados.objeto],
    ['CLÁUSULA / DISPOSITIVO DESCUMPRIDO', dados.clausulaDescumprida],
    ['DESCRIÇÃO DA FALTA CONTRATUAL OU LEGAL', dados.descricaoFatos],
    ['PENALIDADE APLICÁVEL', dados.penalidadeProposta],
    ['RITO PROCESSUAL E PRAZO LEGAL', `Concede-se o prazo legal de ${dados.prazoDiasUteis} (quinze) dias úteis a contar do recebimento para apresentação de Defesa Prévia / Manifestação por escrito (Art. 45 da IN 01/2026 e Art. 156 da Lei nº 14.133/2021).`],
    ['CANAL DE ENVIO DA DEFESA', 'A defesa deverá ser juntada diretamente no Processo SEI indicado ou enviada eletronicamente para servicos@uern.br'],
    ['FISCAL RESPONSÁVEL', `${dados.fiscalNome} - ${dados.fiscalCargoMatricula}`],
    ['ATO DE DESIGNAÇÃO', `Ato de Designação nº ${dados.atoDesignacaoNumero || 'Em vigor'} - DAS/PROAD`],
    ['DATA DE EMISSÃO', dados.dataEmissao || new Date().toLocaleDateString('pt-BR')],
  ];

  const ws = XLSX.utils.aoa_to_sheet(linhas);

  // Ajuste de largura das colunas
  ws['!cols'] = [{ wch: 38 }, { wch: 95 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Notificação UERN');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Gera documento PDF com o Termo de Notificação padrão da UERN (idêntico ao documento SEI 39332643)
 */
export function exportarNotificacaoPdf(dados: DadosNotificacaoUern): jsPDF {
  const doc = new jsPDF();

  // Cabeçalho UERN
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 51, 102);
  doc.text('UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - UERN', 105, 18, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('PRÓ-REITORIA DE ADMINISTRAÇÃO - PROAD / DIRETORIA DE ADMINISTRAÇÃO E SERVIÇOS - DAS', 105, 23, { align: 'center' });
  doc.text('SETOR DE GESTÃO E FISCALIZAÇÃO CONTRATUAL', 105, 27, { align: 'center' });

  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(0.6);
  doc.line(14, 31, 196, 31);

  // Título do Termo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`TERMO DE NOTIFICAÇÃO Nº ${dados.numeroNotificacao}`, 105, 39, { align: 'center' });

  // Tabela de Qualificação das Partes
  autoTable(doc, {
    startY: 43,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 1.5, textColor: [40, 40, 40] },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [0, 51, 102], cellWidth: 42 },
      1: { cellWidth: 140 },
    },
    body: [
      ['NOTIFICANTE:', 'UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - UERN'],
      ['ENDEREÇO:', 'Praça Miguel Faustino, Centro - Edifício Epílogo de Campos, CEP: 59.610-220, Mossoró/RN'],
      ['NOTIFICADA:', dados.razaoSocial],
      ['CNPJ:', dados.cnpj],
      ['ENDEREÇO NOTIFICADA:', dados.enderecoContratada || 'Conforme dados cadastrais no SICAF/UERN'],
      ['PROCESSO ADM SEI:', dados.processoSei],
      ['ASSUNTO:', dados.assunto],
    ],
  });

  const tablePos1 = (doc as any).lastAutoTable.finalY + 4;

  // Seção Dados da Notificação
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 51, 102);
  doc.text('DADOS DA NOTIFICAÇÃO CONTRATUAL', 14, tablePos1);

  autoTable(doc, {
    startY: tablePos1 + 2,
    theme: 'grid',
    headStyles: { fillColor: [240, 243, 248], textColor: [0, 51, 102], fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50, fillColor: [250, 252, 255] },
      1: { cellWidth: 132 },
    },
    body: [
      ['Contrato Administrativo nº:', dados.contratoNumero],
      ['Origem da Contratação:', `${dados.processoOrigem || 'Processo SEI/FUERN'} (Pregão Eletrônico nº ${dados.pregaoNumero || 'N/A'})`],
      ['Vigência Contratual:', `${dados.vigenciaInicio || '-'} à ${dados.vigenciaFim || '-'}`],
      ['Objeto:', dados.objeto],
      ['Dispositivo Legal / Cláusula Descumprida:', dados.clausulaDescumprida],
      ['Descrição da Falta Contratual:', dados.descricaoFatos],
      ['Penalidade Aplicável:', dados.penalidadeProposta],
    ],
  });

  const tablePos2 = (doc as any).lastAutoTable.finalY + 6;

  // Bloco de Concessão de Prazo e Ampla Defesa (15 dias úteis)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(180, 20, 20);
  const textoPrazo = `Pelo presente, concedo-lhe o prazo legal de ${dados.prazoDiasUteis} (quinze) dias úteis a contar do recebimento desta, para apresentar DEFESA PRÉVIA por escrito, tendo em vista a apuração de responsabilidade e eventual aplicação das sanções contratuais e legais cabíveis (Art. 45 da Instrução Normativa nº 01/2026 - PROAD/UERN e Art. 156 da Lei Federal nº 14.133/2021).`;
  doc.text(textoPrazo, 14, tablePos2, { maxWidth: 182, align: 'justify' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  const textoEnvio = `A defesa deverá ser juntada pelo(a) notificado(a) neste PROCESSO SEI (${dados.processoSei}) ou, não sendo possível, remetida por meio eletrônico institucional através do e-mail: servicos@uern.br.`;
  doc.text(textoEnvio, 14, tablePos2 + 14, { maxWidth: 182, align: 'justify' });

  // Assinatura
  const dataHoje = dados.dataEmissao || new Date().toLocaleDateString('pt-BR');
  doc.text(`Mossoró/RN, ${dataHoje}.`, 14, tablePos2 + 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text(dados.fiscalNome, 105, tablePos2 + 35, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(dados.fiscalCargoMatricula, 105, tablePos2 + 39, { align: 'center' });
  doc.text(`Fiscal / Gestor do Contrato Administrativo - Ato de Designação nº ${dados.atoDesignacaoNumero || 'Em vigor'}`, 105, tablePos2 + 43, { align: 'center' });
  doc.text('Diretoria de Administração e Serviços - DAS / PROAD / UERN', 105, tablePos2 + 47, { align: 'center' });

  // Rodapé com validação eletrônica
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.4);
  doc.line(14, 275, 196, 275);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(`Termo de Notificação ${dados.numeroNotificacao} - SEI ${dados.processoSei} - SGC UERN - Página 1 de 1`, 105, 280, { align: 'center' });
  doc.text('Documento gerado em conformidade com o Decreto Estadual nº 27.685/2018 e a IN nº 01/2026 - PROAD/UERN', 105, 284, { align: 'center' });

  return doc;
}
