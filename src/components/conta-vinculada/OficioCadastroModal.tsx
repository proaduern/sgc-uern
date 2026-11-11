'use client';

import React, { useState } from 'react';
import {
  X,
  FileText,
  Download,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DADOS_DIRETORIA_DAS_PADRAO } from '@/lib/config/diretoria';
import { BRASAO_UERN_BASE64, formatarNumeroOficioDas } from '@/lib/config/brasao-uern';

interface OficioCadastroModalProps {
  contrato: any;
  onClose: () => void;
}

export default function OficioCadastroModal({ contrato, onClose }: OficioCadastroModalProps) {
  const [numeroOficio, setNumeroOficio] = useState(
    contrato?.contaVinculadaOficioAbertura || ''
  );
  const [contaRelacionamento, setContaRelacionamento] = useState(
    contrato?.contaVinculadaNumeroConta || ''
  );
  const [responsavelNome, setResponsavelNome] = useState(DADOS_DIRETORIA_DAS_PADRAO.nome);
  const [responsavelMatricula, setResponsavelMatricula] = useState(DADOS_DIRETORIA_DAS_PADRAO.matricula);
  const [portariaDiretor, setPortariaDiretor] = useState(DADOS_DIRETORIA_DAS_PADRAO.portariaNomeacao);
  const [cargoDiretor, setCargoDiretor] = useState(DADOS_DIRETORIA_DAS_PADRAO.cargo);
  const [telefoneContato, setTelefoneContato] = useState(DADOS_DIRETORIA_DAS_PADRAO.telefone);
  const [emailContato, setEmailContato] = useState(DADOS_DIRETORIA_DAS_PADRAO.email);
  const [erro, setErro] = useState<string | null>(null);

  const oficioFormatado = numeroOficio.trim() ? formatarNumeroOficioDas(numeroOficio) : '';

  const gerarPdfOficioCadastro = (abrirPreview = false) => {
    if (!numeroOficio.trim()) {
      setErro('Informe o número/ano do Ofício (Ex: 147/2026) antes de gerar o documento.');
      return;
    }
    setErro(null);

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // Brasão Oficial UERN colorido centralizado
    try {
      doc.addImage(BRASAO_UERN_BASE64, 'PNG', 95.5, 12, 19, 29);
    } catch (e) {
      console.warn('Falha ao desenhar brasão:', e);
    }

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Rua Almino Afonso, 478 - Bairro Centro, Mossoró/RN, CEP 59610-210', 105, 45.5, { align: 'center' });
    doc.text('Telefone: - http://portal.uern.br/', 105, 50, { align: 'center' });

    // Número do Ofício
    doc.setFont('times', 'normal');
    doc.setFontSize(10.5);
    doc.text(oficioFormatado, 15, 61);

    // Destinatário Padrão
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
      `          Solicitamos a abertura de convênio e conta garantia bloqueada para movimentação em nome da FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - FUERN, CNPJ nº 08.258.295/0001-02, a qual se destina à prestação de garantia de execução do Contrato Administrativo nº ${contrato?.numeroContrato || contrato?.numeroEmpenho || '035/2025'} - FUERN, firmado com a empresa ${contrato?.fornecedor?.razaoSocial || 'CONTRATADA'}, inscrita no CNPJ/MF sob o nº ${contrato?.fornecedor?.cnpj || '00.000.000/0001-00'}.`,
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
    doc.text((responsavelNome || '').toUpperCase(), 195, finalY, { align: 'right' });
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(`Matrícula nº ${responsavelMatricula}`, 195, finalY + 4.5, { align: 'right' });
    doc.text(portariaDiretor, 195, finalY + 9, { align: 'right' });
    doc.text('Diretoria de Administração e Serviços – DAS/PROAD', 195, finalY + 13.5, { align: 'right' });

    // Página 2: FICHA CADASTRAL
    doc.addPage();
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 51, 102);
    doc.text('FICHA CADASTRAL - CONTA VINCULADA', 105, 18, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text('ANEXO AO OFÍCIO DE ABERTURA DE CONVÊNIO BANCÁRIO', 105, 23, { align: 'center' });

    autoTable(doc, {
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      head: [['Campo', 'Discriminação Cadastral']],
      body: [
        ['Órgão Convenente', 'FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - FUERN'],
        ['CNPJ do Convenente', '08.258.295/0001-02'],
        ['Responsável / Contato', `${responsavelNome} - Tel: ${telefoneContato} - E-mail: ${emailContato}`],
        ['Endereço da Sede', 'Rua Almino Afonso, 478 - Bairro Centro, Mossoró/RN, CEP: 59610-210'],
        ['Banco / Destinatário', 'Banco do Brasil S.A. - Agência 3795-8 - Escritório Setor Público RN'],
        ...(contaRelacionamento ? [['Conta Vinculada', contaRelacionamento]] : []),
        ['Serviço Solicitado', '[X] Contratação  [X] Cadastrar Garantidor  [X] Cadastrar Evento'],
        ['Empresa Garantidora', contrato?.fornecedor?.razaoSocial || '-'],
        ['CNPJ Garantidora', contrato?.fornecedor?.cnpj || '-'],
        ['Contrato Administrativo', contrato?.numeroContrato ? `Contrato nº ${contrato.numeroContrato}` : `Empenho ${contrato?.numeroEmpenho}`],
        ['Objeto da Contratação', contrato?.objeto || 'Prestação contínua de serviços nos Campi da UERN'],
        ['Valor Global Contratado', (contrato?.valorGlobal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
        ['Vigência do Contrato', `${contrato?.vigenciaInicio ? new Date(contrato.vigenciaInicio).toLocaleDateString('pt-BR') : '-'} até ${contrato?.vigenciaFim ? new Date(contrato.vigenciaFim).toLocaleDateString('pt-BR') : '-'}`],
      ],
    });

    const contratoSanitizado = (contrato?.numeroContrato || 'Contrato').replace(/[\/\\?%*:|"<>]/g, '_');
    const nomeArquivo = `Oficio_Abertura_CV_${contratoSanitizado}.pdf`;

    if (abrirPreview) {
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
    } else {
      doc.save(nomeArquivo);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-700 text-white shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Ofício de Cadastro & Ficha Cadastral (Conta Vinculada)
              </h3>
              <p className="text-xs text-slate-500">
                Abertura de convênio de conta garantia no Banco do Brasil Setor Público RN
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-700 text-xs">
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center space-x-2">
              <span className="font-bold">Atenção:</span>
              <span>{erro}</span>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Nº e Ano do Ofício de Abertura * <span className="font-normal text-slate-500">(apenas xx/ano)</span>
            </label>
            <input
              type="text"
              value={numeroOficio}
              onChange={(e) => {
                setNumeroOficio(e.target.value);
                if (erro) setErro(null);
              }}
              placeholder="Ex: 147/2026"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-blue-600"
            />
            {oficioFormatado && (
              <span className="text-[10px] font-bold text-blue-800 mt-1 block">
                Gerado: {oficioFormatado}
              </span>
            )}
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Número da Conta Vinculada (caso já informada pelo Banco)
            </label>
            <input
              type="text"
              value={contaRelacionamento}
              onChange={(e) => setContaRelacionamento(e.target.value)}
              placeholder="Deixe em branco caso a conta ainda vá ser aberta"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none"
            />
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 text-[11px] block">
              Dados do Diretor Signatário (Diretoria de Administração e Serviços - DAS/PROAD):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 font-bold block">Nome do Diretor:</label>
                <input
                  type="text"
                  value={responsavelNome}
                  onChange={(e) => setResponsavelNome(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold block">Matrícula:</label>
                <input
                  type="text"
                  value={responsavelMatricula}
                  onChange={(e) => setResponsavelMatricula(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 font-bold block">Cargo / Função:</label>
                <input
                  type="text"
                  value={cargoDiretor}
                  onChange={(e) => setCargoDiretor(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold block">Portaria de Nomeação:</label>
                <input
                  type="text"
                  value={portariaDiretor}
                  onChange={(e) => setPortariaDiretor(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-blue-950"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-100"
          >
            Fechar
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => gerarPdfOficioCadastro(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-slate-700" />
              <span>Visualizar / Imprimir (Nova Aba)</span>
            </button>

            <button
              type="button"
              onClick={() => gerarPdfOficioCadastro(false)}
              className="inline-flex items-center space-x-2 px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Ofício em PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
