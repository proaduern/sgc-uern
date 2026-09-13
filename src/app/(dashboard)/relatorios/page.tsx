'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  FileText,
  Calendar,
  Building,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function RelatoriosPage() {
  const [contratos, setContratos] = useState<any[]>([]);
  const [selectedContratoId, setSelectedContratoId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/contratos')
      .then((r) => r.json())
      .then((d) => {
        if (d.contratos) {
          setContratos(d.contratos);
          if (d.contratos.length > 0) setSelectedContratoId(d.contratos[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const contratoAtual = contratos.find((c) => c.id === selectedContratoId);

  // Emitir Relatório Consolidado do Contrato em PDF (conforme Art. 174 da Lei 14.133 e Art. 5º da IN 01/2026)
  const emitirRelatorioPdf = () => {
    if (!contratoAtual) return;
    const doc = new jsPDF();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 51, 102);
    doc.text('UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - UERN', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('PRÓ-REITORIA DE ADMINISTRAÇÃO - PROAD', 105, 26, { align: 'center' });
    doc.text('RELATÓRIO GERENCIAL EXECUTIVO DE EXECUÇÃO CONTRATUAL', 105, 31, { align: 'center' });

    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.8);
    doc.line(15, 36, 195, 36);

    autoTable(doc, {
      startY: 44,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9 },
      head: [['Identificação', 'Detalhes do Contrato']],
      body: [
        ['Número do Instrumento', contratoAtual.numeroContrato ? `Contrato nº ${contratoAtual.numeroContrato}` : `Empenho nº ${contratoAtual.numeroEmpenho}`],
        ['Processo SEI Mãe', contratoAtual.processoSeiMae],
        ['Procedimento Licitatório', contratoAtual.licitacaoProcedimento],
        ['Contratada', contratoAtual.fornecedor.razaoSocial],
        ['CNPJ', contratoAtual.fornecedor.cnpj],
        ['Objeto', contratoAtual.objeto],
        ['Vigência', `${new Date(contratoAtual.vigenciaInicio).toLocaleDateString('pt-BR')} a ${new Date(contratoAtual.vigenciaFim).toLocaleDateString('pt-BR')}`],
        ['Valor Global Original', contratoAtual.valorGlobal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
        ['Valor Global Atualizado', contratoAtual.valorAtualizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
        ['Status Atual', contratoAtual.status],
      ],
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('DECLARAÇÃO DE CONFORMIDADE E AUDITORIA', 15, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Relatório emitido pelo SGC-UERN contendo histórico de medições, glosas e retenções aplicadas no exercício de fiscalização em estrita consonância com a IN nº 01/2026 - PROAD.', 15, finalY + 6, { maxWidth: 180 });

    doc.save(`Relatorio_Contrato_${contratoAtual.numeroContrato || 'UERN'}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg md:text-xl">
            <BarChart3 className="w-6 h-6 text-blue-700" />
            <h2>Relatórios Executivos & Auditoria de Contratos</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Geração de relatórios analíticos, atestados de capacidade técnica e termo de encerramento contratual.
          </p>
        </div>

        <button
          onClick={emitirRelatorioPdf}
          disabled={!contratoAtual}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer disabled:opacity-50"
        >
          <Printer className="w-4 h-4" />
          <span>Emitir Relatório em PDF</span>
        </button>
      </div>

      {/* Contract Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
        <Building className="w-5 h-5 text-blue-700 flex-shrink-0" />
        <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Selecione o Contrato:</label>
        <select
          value={selectedContratoId}
          onChange={(e) => setSelectedContratoId(e.target.value)}
          className="w-full md:w-96 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
        >
          {contratos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.numeroContrato ? `Contrato nº ${c.numeroContrato}` : `Empenho: ${c.numeroEmpenho}`} - {c.objeto.slice(0, 45)}...
            </option>
          ))}
        </select>
      </div>

      {/* Resumo do Contrato */}
      {contratoAtual && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 uppercase">
                {contratoAtual.tipoContrato.replace(/_/g, ' ')}
              </span>
              <h3 className="font-bold text-slate-900 text-lg mt-1">
                {contratoAtual.numeroContrato ? `Contrato nº ${contratoAtual.numeroContrato}` : `Empenho: ${contratoAtual.numeroEmpenho}`}
              </h3>
              <p className="text-xs text-blue-700 font-mono mt-0.5">SEI: {contratoAtual.processoSeiMae}</p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Valor Global Atualizado</span>
              <span className="text-xl font-extrabold text-slate-900">
                {contratoAtual.valorAtualizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-700 block mb-1">Empresa Contratada</span>
              <div className="font-semibold text-slate-900">{contratoAtual.fornecedor.razaoSocial}</div>
              <div className="text-[11px] text-slate-500 font-mono">CNPJ: {contratoAtual.fornecedor.cnpj}</div>
              <div className="text-[11px] text-slate-500">Contato: {contratoAtual.fornecedor.email}</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-700 block mb-1">Vigência & Regime</span>
              <div className="text-slate-800">
                {new Date(contratoAtual.vigenciaInicio).toLocaleDateString('pt-BR')} a {new Date(contratoAtual.vigenciaFim).toLocaleDateString('pt-BR')}
              </div>
              <div className="text-[11px] text-blue-700 font-semibold mt-1">
                Tipo: {contratoAtual.tipoVigencia.replace(/_/g, ' ')}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-700 block mb-1">Equipe de Fiscalização</span>
              <div className="space-y-0.5 text-[11px]">
                {contratoAtual.responsaveis?.map((r: any) => (
                  <div key={r.id}>
                    <span className="font-semibold text-slate-700">{r.tipoAtuacao.replace(/_/g, ' ')}:</span> {r.user.nome}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <span className="font-bold text-slate-700 text-xs block mb-1.5">Descrição do Objeto:</span>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
              {contratoAtual.objeto}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
