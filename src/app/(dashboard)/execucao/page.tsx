'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileCheck2,
  PlusCircle,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Printer,
  ShieldCheck,
  Building,
  Check,
  X
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ExecucaoPage() {
  const [activeTab, setActiveTab] = useState<'MEDICOES' | 'ORDENS_SERVICO'>('MEDICOES');
  const [contratos, setContratos] = useState<any[]>([]);
  const [medicoes, setMedicoes] = useState<any[]>([]);
  const [ordens, setOrdens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showNovaOsModal, setShowNovaOsModal] = useState(false);
  const [showNovaMedicaoModal, setShowNovaMedicaoModal] = useState(false);

  // Form OS
  const [osForm, setOsForm] = useState({
    contratoId: '',
    numeroOs: '',
    ano: new Date().getFullYear().toString(),
    processoSeiDespesa: '',
    descricaoServico: '',
    valorEstimado: '',
  });

  // Form Medição
  const [medicaoForm, setMedicaoForm] = useState({
    contratoId: '',
    referenciaMesAno: '',
    processoSeiDespesa: '',
    numeroNotaFiscal: '',
    dataEmissaoNf: '',
    valorNotaFiscal: '',
    valorGlosa: '0',
    motivoGlosa: '',
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resC, resM, resO] = await Promise.all([
        fetch('/api/contratos'),
        fetch('/api/execucao/medicoes'),
        fetch('/api/execucao/os'),
      ]);
      const dataC = await resC.json();
      const dataM = await resM.json();
      const dataO = await resO.json();

      if (dataC.contratos) setContratos(dataC.contratos);
      if (dataM.medicoes) setMedicoes(dataM.medicoes);
      if (dataO.ordens) setOrdens(dataO.ordens);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleCreateOs = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/execucao/os', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(osForm),
      });
      if (res.ok) {
        setShowNovaOsModal(false);
        setOsForm({
          contratoId: '',
          numeroOs: '',
          ano: new Date().getFullYear().toString(),
          processoSeiDespesa: '',
          descricaoServico: '',
          valorEstimado: '',
        });
        carregarDados();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateMedicao = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/execucao/medicoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(medicaoForm),
      });
      if (res.ok) {
        setShowNovaMedicaoModal(false);
        setMedicaoForm({
          contratoId: '',
          referenciaMesAno: '',
          processoSeiDespesa: '',
          numeroNotaFiscal: '',
          dataEmissaoNf: '',
          valorNotaFiscal: '',
          valorGlosa: '0',
          motivoGlosa: '',
        });
        carregarDados();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAtestar = async (medicaoId: string, acao: 'ATESTE_PROVISORIO' | 'ATESTE_DEFINITIVO') => {
    try {
      const res = await fetch('/api/execucao/medicoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicaoId, acao }),
      });
      if (res.ok) {
        carregarDados();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Gerar PDF da Ordem de Serviço com Assinatura Eletrônica Institucional
  const gerarPdfOs = (ordem: any) => {
    const doc = new jsPDF();

    // Cabeçalho Oficial UERN
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102); // #003366
    doc.text('UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - UERN', 105, 20, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text('PRÓ-REITORIA DE ADMINISTRAÇÃO - PROAD', 105, 26, { align: 'center' });
    doc.text('DIRETORIA DE ADMINISTRAÇÃO E SERVIÇOS - DAS', 105, 31, { align: 'center' });

    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.8);
    doc.line(15, 36, 195, 36);

    // Título do Documento
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(`ORDEM DE SERVIÇO Nº ${ordem.numeroOs}/${ordem.ano}`, 105, 46, { align: 'center' });

    // Dados do Contrato e Empresa
    autoTable(doc, {
      startY: 52,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9 },
      head: [['Identificação Contratual', 'Dados de Referência']],
      body: [
        ['Contrato / Empenho', ordem.contrato.numeroContrato ? `Contrato nº ${ordem.contrato.numeroContrato}` : `Empenho nº ${ordem.contrato.numeroEmpenho}`],
        ['Processo SEI da Despesa', ordem.processoSeiDespesa],
        ['Processo SEI Mãe (Contratação)', ordem.contrato.processoSeiMae],
        ['Empresa Contratada', ordem.contrato.fornecedor.razaoSocial],
        ['CNPJ', ordem.contrato.fornecedor.cnpj],
        ['Objeto Geral', ordem.contrato.objeto],
        ['Valor Estimado da Execução', ordem.valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
        ['Data de Emissão', new Date(ordem.dataEmissao).toLocaleDateString('pt-BR')],
      ],
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Descrição do Serviço
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('1. DESCRIÇÃO DETALHADA DOS SERVIÇOS AUTORIZADOS:', 15, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitDescricao = doc.splitTextToSize(ordem.descricaoServico, 180);
    doc.text(splitDescricao, 15, finalY + 6);

    const assinaturasY = finalY + 10 + splitDescricao.length * 5;

    // Quadro de Assinatura Eletrônica Institucional
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, assinaturasY, 180, 45, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 51, 102);
    doc.text('CHANCELA DE ASSINATURA ELETRÔNICA INSTITUCIONAL (IN nº 01/2026 - PROAD/UERN)', 20, assinaturasY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text(`Emitido por: ${ordem.fiscalAdm.nome} (Fiscal Administrativo)`, 20, assinaturasY + 16);
    doc.text(`E-mail: ${ordem.fiscalAdm.email} | Matrícula: ${ordem.fiscalAdm.matricula || 'Institucional'}`, 20, assinaturasY + 22);
    doc.text(`Data/Hora da Emissão: ${new Date(ordem.createdAt).toLocaleString('pt-BR')}`, 20, assinaturasY + 28);
    
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`Código Verificador / Hash: ${ordem.hashAssinaturaEletronica}`, 20, assinaturasY + 36);

    doc.save(`OS_${ordem.numeroOs}_${ordem.ano}_UERN.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg md:text-xl">
            <FileSpreadsheet className="w-6 h-6 text-blue-700" />
            <h2>Controle de Execução, Ordens de Serviço & Saldo</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Módulo 5 - Ambiente integrado para Fiscais Administrativos, Fiscais Técnicos e Gestores conforme Capítulo IV da IN 01/2026.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowNovaOsModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-slate-200"
          >
            <FileCheck2 className="w-4 h-4 text-blue-700" />
            <span>Emitir Ordem de Serviço (OS)</span>
          </button>

          <button
            onClick={() => setShowNovaMedicaoModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Lançar Fatura / Medição</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('MEDICOES')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'MEDICOES'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Tabela de Controle de Saldo & Atestes ({medicoes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ORDENS_SERVICO')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'ORDENS_SERVICO'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Ordens de Serviço Emitidas ({ordens.length})</span>
        </button>
      </div>

      {/* TAB 1: CONTROLE DE SALDO & MEDIÇÕES */}
      {activeTab === 'MEDICOES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Referência & SEI</th>
                  <th className="py-3.5 px-4">Contrato & Empresa</th>
                  <th className="py-3.5 px-4">Nota Fiscal</th>
                  <th className="py-3.5 px-4">Valor da NF</th>
                  <th className="py-3.5 px-4">Glosa Aplicada</th>
                  <th className="py-3.5 px-4">Valor Atestado</th>
                  <th className="py-3.5 px-4">Recebimento Provisório (Téc)</th>
                  <th className="py-3.5 px-4">Recebimento Definitivo (Gestor)</th>
                  <th className="py-3.5 px-4 text-center">Atestar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      Carregando medições...
                    </td>
                  </tr>
                ) : medicoes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      Nenhuma medição cadastrada no período.
                    </td>
                  </tr>
                ) : (
                  medicoes.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 text-sm">{m.referenciaMesAno}</div>
                        <div className="text-[10px] text-blue-600 font-mono">SEI: {m.processoSeiDespesa}</div>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-800 truncate">
                          {m.contrato.numeroContrato ? `Contrato nº ${m.contrato.numeroContrato}` : `Empenho: ${m.contrato.numeroEmpenho}`}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate" title={m.contrato.fornecedor.razaoSocial}>
                          {m.contrato.fornecedor.razaoSocial}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-800">
                          {m.numeroNotaFiscal || 'Aguardando'}
                        </span>
                        {m.dataEmissaoNf && (
                          <div className="text-[10px] text-slate-400">
                            {new Date(m.dataEmissaoNf).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {m.valorNotaFiscal?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>

                      <td className="py-3 px-4">
                        {m.valorGlosa > 0 ? (
                          <div>
                            <span className="text-rose-600 font-bold">
                              -{m.valorGlosa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                            {m.motivoGlosa && (
                              <p className="text-[10px] text-slate-400 line-clamp-1" title={m.motivoGlosa}>
                                {m.motivoGlosa}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">R$ 0,00</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-bold text-emerald-700">
                        {m.valorAtestadoFinal?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>

                      {/* Recebimento Provisório (Fiscal Técnico) */}
                      <td className="py-3 px-4">
                        {m.dataRecebimentoProvisorio ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 text-[11px] font-semibold">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{new Date(m.dataRecebimentoProvisorio).toLocaleDateString('pt-BR')}</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAtestar(m.id, 'ATESTE_PROVISORIO')}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                          >
                            Dar Ateste Provisório
                          </button>
                        )}
                      </td>

                      {/* Recebimento Definitivo (Gestor) */}
                      <td className="py-3 px-4">
                        {m.dataRecebimentoDefinitivo ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 text-[11px] font-semibold">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{new Date(m.dataRecebimentoDefinitivo).toLocaleDateString('pt-BR')}</span>
                          </span>
                        ) : m.dataRecebimentoProvisorio ? (
                          <button
                            onClick={() => handleAtestar(m.id, 'ATESTE_DEFINITIVO')}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                          >
                            Dar Ateste Definitivo
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Aguardando provisório</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-700">
                          {m.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ORDENS DE SERVIÇO */}
      {activeTab === 'ORDENS_SERVICO' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ordens.map((ordem) => (
            <div
              key={ordem.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase">
                      Ordem de Serviço Oficial
                    </span>
                    <h3 className="font-bold text-slate-900 text-base mt-1">
                      OS nº {ordem.numeroOs}/{ordem.ano}
                    </h3>
                  </div>
                  <button
                    onClick={() => gerarPdfOs(ordem)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-blue-200"
                    title="Baixar PDF com Assinatura Eletrônica"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>PDF Oficial</span>
                  </button>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div><span className="font-semibold text-slate-800">Contrato: </span> {ordem.contrato.numeroContrato || ordem.contrato.numeroEmpenho}</div>
                  <div><span className="font-semibold text-slate-800">Contratada: </span> {ordem.contrato.fornecedor.razaoSocial}</div>
                  <div><span className="font-semibold text-slate-800">Processo SEI: </span> <span className="font-mono text-blue-700">{ordem.processoSeiDespesa}</span></div>
                  <div><span className="font-semibold text-slate-800">Valor Estimado: </span> <span className="font-bold text-slate-900">{ordem.valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                  <p className="mt-2 text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 line-clamp-3">
                    {ordem.descricaoServico}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Emitido por: {ordem.fiscalAdm.nome}</span>
                <span className="font-mono text-[9px] text-slate-400" title={ordem.hashAssinaturaEletronica}>
                  {ordem.hashAssinaturaEletronica.slice(0, 18)}...
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova Ordem de Serviço */}
      {showNovaOsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-800 text-base mb-1">Emitir Nova Ordem de Serviço (OS)</h3>
            <p className="text-xs text-slate-500 mb-4">
              Padronizada conforme modelo da DAS/PROAD UERN com assinatura eletrônica vinculada ao fiscal.
            </p>

            <form onSubmit={handleCreateOs} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contrato Vinculado *</label>
                <select
                  required
                  value={osForm.contratoId}
                  onChange={(e) => setOsForm({ ...osForm, contratoId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                >
                  <option value="">Selecione o contrato...</option>
                  {contratos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.numeroContrato ? `Contrato nº ${c.numeroContrato}` : `Empenho: ${c.numeroEmpenho}`} - {c.objeto.slice(0, 40)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Número da OS *</label>
                  <input
                    type="text"
                    required
                    value={osForm.numeroOs}
                    onChange={(e) => setOsForm({ ...osForm, numeroOs: e.target.value })}
                    placeholder="Ex: 01"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ano *</label>
                  <input
                    type="number"
                    required
                    value={osForm.ano}
                    onChange={(e) => setOsForm({ ...osForm, ano: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Processo SEI da Despesa *</label>
                  <input
                    type="text"
                    required
                    value={osForm.processoSeiDespesa}
                    onChange={(e) => setOsForm({ ...osForm, processoSeiDespesa: e.target.value })}
                    placeholder="Ex: 04410022.001234/2026-11"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Valor Estimado (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={osForm.valorEstimado}
                    onChange={(e) => setOsForm({ ...osForm, valorEstimado: e.target.value })}
                    placeholder="0,00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição Detalhada do Serviço *</label>
                <textarea
                  rows={3}
                  required
                  value={osForm.descricaoServico}
                  onChange={(e) => setOsForm({ ...osForm, descricaoServico: e.target.value })}
                  placeholder="Instruções para execução dos serviços pelo fornecedor..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNovaOsModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003366] text-white text-xs font-semibold rounded-lg hover:bg-[#002244]"
                >
                  Emitir e Assinar Eletronicamente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Medição */}
      {showNovaMedicaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-800 text-base mb-1">Lançar Nova Medição / Fatura</h3>
            <p className="text-xs text-slate-500 mb-4">
              Registro mensal de faturamento para conferência e fluxo de atestes.
            </p>

            <form onSubmit={handleCreateMedicao} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contrato Vinculado *</label>
                <select
                  required
                  value={medicaoForm.contratoId}
                  onChange={(e) => setMedicaoForm({ ...medicaoForm, contratoId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                >
                  <option value="">Selecione o contrato...</option>
                  {contratos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.numeroContrato ? `Contrato nº ${c.numeroContrato}` : `Empenho: ${c.numeroEmpenho}`} - {c.objeto.slice(0, 40)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Referência (Mês/Ano) *</label>
                  <input
                    type="text"
                    required
                    value={medicaoForm.referenciaMesAno}
                    onChange={(e) => setMedicaoForm({ ...medicaoForm, referenciaMesAno: e.target.value })}
                    placeholder="Ex: 03/2026"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Processo SEI da Despesa *</label>
                  <input
                    type="text"
                    required
                    value={medicaoForm.processoSeiDespesa}
                    onChange={(e) => setMedicaoForm({ ...medicaoForm, processoSeiDespesa: e.target.value })}
                    placeholder="04410022.001234/2026-11"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Número da NF</label>
                  <input
                    type="text"
                    value={medicaoForm.numeroNotaFiscal}
                    onChange={(e) => setMedicaoForm({ ...medicaoForm, numeroNotaFiscal: e.target.value })}
                    placeholder="Ex: 10452"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data Emissão NF</label>
                  <input
                    type="date"
                    value={medicaoForm.dataEmissaoNf}
                    onChange={(e) => setMedicaoForm({ ...medicaoForm, dataEmissaoNf: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Valor da NF (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={medicaoForm.valorNotaFiscal}
                    onChange={(e) => setMedicaoForm({ ...medicaoForm, valorNotaFiscal: e.target.value })}
                    placeholder="0,00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Glosa (R$ se houver)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={medicaoForm.valorGlosa}
                    onChange={(e) => setMedicaoForm({ ...medicaoForm, valorGlosa: e.target.value })}
                    placeholder="0,00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 text-rose-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo da Glosa</label>
                  <input
                    type="text"
                    value={medicaoForm.motivoGlosa}
                    onChange={(e) => setMedicaoForm({ ...medicaoForm, motivoGlosa: e.target.value })}
                    placeholder="Ex: Faltas não repostas conforme IMR"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNovaMedicaoModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003366] text-white text-xs font-semibold rounded-lg hover:bg-[#002244]"
                >
                  Cadastrar Medição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
