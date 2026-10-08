'use client';

import React, { useState } from 'react';
import {
  X,
  Printer,
  FileText,
  Download,
  Building,
  CheckCircle2,
  Send,
  FileSpreadsheet
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface OficioCadastroModalProps {
  contrato: any;
  onClose: () => void;
}

export default function OficioCadastroModal({ contrato, onClose }: OficioCadastroModalProps) {
  const [numeroOficio, setNumeroOficio] = useState('Ofício nº 151/2026/UERN - PROAD - DAS/UERN');
  const [bancoNome, setBancoNome] = useState('Banco do Brasil S.A. - Escritório Setor Público RN');
  const [agenciaRelacionamento, setAgenciaRelacionamento] = useState('4687-6');
  const [contaRelacionamento, setContaRelacionamento] = useState('39.869-1');
  const [responsavelNome, setResponsavelNome] = useState('Pedro Eloy de Paiva Farias');
  const [responsavelMatricula, setResponsavelMatricula] = useState('12.757-4');
  const [portariaDiretor, setPortariaDiretor] = useState('Portaria Nº 3827/2025-GP/FUERN');
  const [telefoneContato, setTelefoneContato] = useState('(84) 3315-2122 / 98733-3375');
  const [emailContato, setEmailContato] = useState('diradm@uern.br');

  const gerarPdfOficioCadastro = () => {
    const doc = new jsPDF();

    // Cabeçalho Oficial
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 51, 102);
    doc.text('UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - UERN', 105, 18, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text('PRÓ-REITORIA DE ADMINISTRAÇÃO - PROAD / DIRETORIA DE ADMINISTRAÇÃO E SERVIÇOS - DAS', 105, 23, { align: 'center' });
    doc.text('Rua Almino Afonso, 478 - Bairro Centro, Mossoró/RN, CEP 59610-210 - http://portal.uern.br', 105, 27, { align: 'center' });

    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.6);
    doc.line(14, 31, 196, 31);

    // Número e Data
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(numeroOficio, 14, 42);
    doc.text(`Mossoró/RN, ${new Date().toLocaleDateString('pt-BR')}`, 196, 42, { align: 'right' });

    // Destinatário
    doc.setFont('helvetica', 'bold');
    doc.text('Ao(À) Senhor(a) Gerente Geral', 14, 54);
    doc.setFont('helvetica', 'normal');
    doc.text(bancoNome, 14, 59);

    // Assunto
    doc.setFont('helvetica', 'bold');
    doc.text('Assunto: Cadastro de Convênio de Conta Garantia (Conta Vinculada)', 14, 69);

    // Corpo do Ofício
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const textoCorpo = [
      'Senhor(a) Gerente,',
      '',
      `Solicitamos a abertura de convênio e conta garantia bloqueada para movimentação em nome da FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - FUERN, CNPJ nº 08.258.295/0001-02, a qual se destina à prestação de garantia de execução do Contrato nº ${contrato?.numeroContrato || contrato?.numeroEmpenho || '028/2025'}-FUERN, firmado com a empresa ${contrato?.fornecedor?.razaoSocial || 'CONTRATADA'}, inscrita no CNPJ/MF sob o nº ${contrato?.fornecedor?.cnpj || '00.000.000/0001-00'}.`,
      '',
      `O presente pedido atende às disposições da Lei Estadual nº 10.841/2021, do Decreto Estadual nº 33.782/2024 e da Instrução Normativa nº 01/2026 - PROAD/UERN, para retenção das provisões de encargos trabalhistas de dedicação exclusiva de mão de obra (férias, 13º salário e multa rescisória do FGTS).`,
      '',
      'Encaminhamos em anexo a respectiva FICHA CADASTRAL devidamente preenchida e assinada.',
      '',
      'Atenciosamente,',
    ];

    doc.text(textoCorpo, 14, 79, { maxWidth: 182, align: 'justify' });

    // Assinatura
    const finalY = 160;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(responsavelNome, 105, finalY, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Matrícula nº ${responsavelMatricula}`, 105, finalY + 4, { align: 'center' });
    doc.text(`Diretor - ${portariaDiretor}`, 105, finalY + 8, { align: 'center' });
    doc.text('Diretoria de Administração e Serviços / PROAD / UERN', 105, finalY + 12, { align: 'center' });

    // Página 2: FICHA CADASTRAL
    doc.addPage();
    doc.setFont('helvetica', 'bold');
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
        ['Agência Relacionamento', `${agenciaRelacionamento} (Conta: ${contaRelacionamento})`],
        ['Serviço Solicitado', '[X] Contratação  [X] Cadastrar Garantidor  [X] Cadastrar Evento'],
        ['Empresa Garantidora', contrato?.fornecedor?.razaoSocial || '-'],
        ['CNPJ Garantidora', contrato?.fornecedor?.cnpj || '-'],
        ['Contrato Administrativo', contrato?.numeroContrato ? `Contrato nº ${contrato.numeroContrato}` : `Empenho ${contrato?.numeroEmpenho}`],
        ['Objeto da Contratação', contrato?.objeto || 'Prestação contínua de serviços nos Campi da UERN'],
        ['Valor Global Contratado', (contrato?.valorGlobal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
        ['Vigência do Contrato', `${contrato?.vigenciaInicio ? new Date(contrato.vigenciaInicio).toLocaleDateString('pt-BR') : '-'} até ${contrato?.vigenciaFim ? new Date(contrato.vigenciaFim).toLocaleDateString('pt-BR') : '-'}`],
      ],
    });

    doc.save(`Oficio_Cadastro_CV_${contrato?.numeroContrato || 'Contrato'}.pdf`);
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
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Número do Ofício *
            </label>
            <input
              type="text"
              value={numeroOficio}
              onChange={(e) => setNumeroOficio(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Agência de Relacionamento
              </label>
              <input
                type="text"
                value={agenciaRelacionamento}
                onChange={(e) => setAgenciaRelacionamento(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Conta do Convenente (FUERN)
              </label>
              <input
                type="text"
                value={contaRelacionamento}
                onChange={(e) => setContaRelacionamento(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 text-[11px] block">
              Dados do Diretor Signatário (DAS/PROAD):
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 block">Nome:</label>
                <input
                  type="text"
                  value={responsavelNome}
                  onChange={(e) => setResponsavelNome(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">Matrícula & Portaria:</label>
                <input
                  type="text"
                  value={portariaDiretor}
                  onChange={(e) => setPortariaDiretor(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
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

          <button
            type="button"
            onClick={gerarPdfOficioCadastro}
            className="inline-flex items-center space-x-2 px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Gerar Ofício de Cadastro + Ficha Cadastral (PDF)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
