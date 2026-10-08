'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  PlusCircle,
  Clock,
  ShieldAlert,
  Building,
  CheckCircle2,
  FileText,
  Scale,
  Award,
  Edit3,
  X,
  FileSpreadsheet,
  Printer,
  Download,
  Layers,
  Send,
  MapPin,
  HelpCircle,
  Calculator
} from 'lucide-react';
import ImrLeituraModal from '@/components/penalidades/ImrLeituraModal';
import NotificacaoModal from '@/components/penalidades/NotificacaoModal';

export default function PenalidadesPage() {
  const [penalidades, setPenalidades] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [avaliacoesImr, setAvaliacoesImr] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'processos' | 'imr'>('processos');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modals de IMR e Notificação
  const [showImrModal, setShowImrModal] = useState(false);
  const [showNotificacaoModal, setShowNotificacaoModal] = useState(false);
  const [notificacaoDadosIniciais, setNotificacaoDadosIniciais] = useState<any>(null);

  // Modal Penalidade Legada
  const [showModal, setShowModal] = useState(false);

  // Estados de Edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPenalidadeId, setEditingPenalidadeId] = useState<string | null>(null);
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    tipoPenalidade: 'ADVERTENCIA',
    status: 'NOTIFICACAO_DEFESA_15_DIAS',
    protocoloNotificacaoSei: '',
    protocoloDecisaoSei: '',
    prazoDefesaFim: '',
    fatosDescricao: '',
    baseLegal: '',
  });

  const handleOpenEdit = (p: any) => {
    setEditingPenalidadeId(p.id);
    setEditForm({
      tipoPenalidade: p.tipoPenalidade || 'ADVERTENCIA',
      status: p.status || 'NOTIFICACAO_DEFESA_15_DIAS',
      protocoloNotificacaoSei: p.protocoloNotificacaoSei || '',
      protocoloDecisaoSei: p.protocoloDecisaoSei || '',
      prazoDefesaFim: p.prazoDefesaFim ? new Date(p.prazoDefesaFim).toISOString().split('T')[0] : '',
      fatosDescricao: p.fatosDescricao || '',
      baseLegal: p.baseLegal || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPenalidadeId) return;
    setSalvandoEdit(true);
    try {
      const res = await fetch('/api/penalidades', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPenalidadeId,
          ...editForm,
        }),
      });
      if (res.ok) {
        setShowEditModal(false);
        setEditingPenalidadeId(null);
        carregarDados();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao editar penalidade');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de conexão');
    } finally {
      setSalvandoEdit(false);
    }
  };

  // Form Penalidade
  const [form, setForm] = useState({
    contratoId: '',
    tipoPenalidade: 'ADVERTENCIA',
    fatosDescricao: '',
    baseLegal: 'Art. 44 da Instrução Normativa nº 01/2026 - PROAD/UERN e Art. 156 da Lei nº 14.133/2021',
    protocoloNotificacaoSei: '',
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resP, resC, resUser, resImr] = await Promise.all([
        fetch('/api/penalidades'),
        fetch('/api/contratos'),
        fetch('/api/auth/me'),
        fetch('/api/imr'),
      ]);
      const dataP = await resP.json();
      const dataC = await resC.json();
      const dataUser = await resUser.json();
      const dataImr = await resImr.json();

      if (dataUser.user) setCurrentUser(dataUser.user);
      if (dataP.penalidades) setPenalidades(dataP.penalidades);
      if (dataC.contratos) setContratos(dataC.contratos);
      if (dataImr.avaliacoes) setAvaliacoesImr(dataImr.avaliacoes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleCriarPenalidade = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/penalidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({
          contratoId: '',
          tipoPenalidade: 'ADVERTENCIA',
          fatosDescricao: '',
          baseLegal: 'Art. 44 da Instrução Normativa nº 01/2026 - PROAD/UERN e Art. 156 da Lei nº 14.133/2021',
          protocoloNotificacaoSei: '',
        });
        carregarDados();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg md:text-xl">
            <Scale className="w-6 h-6 text-rose-600" />
            <h2>Apuração de Responsabilidade, IMR & Notificações</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Capítulo VII da IN nº 01/2026 UERN & Lei 14.133/2021 - Rito de ampla defesa (15 dias úteis), IMR e modelos de notificação.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowImrModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Leitura Inteligente IMR (.xlsx / .ods)</span>
          </button>

          <button
            onClick={() => {
              setNotificacaoDadosIniciais(null);
              setShowNotificacaoModal(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Emitir Notificação (.xlsx / .pdf)</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Notificar Infração</span>
          </button>
        </div>
      </div>

      {/* Abas de Navegação */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('processos')}
          className={`pb-3 text-xs font-bold transition-colors flex items-center space-x-2 border-b-2 cursor-pointer ${
            activeTab === 'processos'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Processos Sancionatórios & Notificações</span>
          <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
            {penalidades.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('imr')}
          className={`pb-3 text-xs font-bold transition-colors flex items-center space-x-2 border-b-2 cursor-pointer ${
            activeTab === 'imr'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Medições de IMR & Glosas Contratuais</span>
          <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
            {avaliacoesImr.length} medições
          </span>
        </button>
      </div>

      {activeTab === 'processos' ? (
        <>
          {/* Legal Guidelines Alert */}
          <div className="p-4 bg-slate-100/70 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-1">
            <span className="font-bold text-slate-900 block">Rito Legal e Competências Sancionatórias (IN 01/2026):</span>
            <p>• <strong>Advertência e Multa:</strong> Competência do Gestor do Contrato, após parecer jurídico (Art. 46).</p>
            <p>• <strong>Impedimento de Licitar (até 3 anos) e Inidoneidade:</strong> Competência da Presidência da Fuern, após comissão com mínimo 2 servidores efetivos estáveis (Art. 47 e 48).</p>
            <p>• <strong>Prazos Obrigatórios:</strong> 15 dias úteis para defesa prévia e 15 dias úteis para recurso com efeito suspensivo (Arts. 45 e 49).</p>
          </div>

          {/* Lista de Penalidades */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-slate-400 text-xs">Carregando penalidades...</div>
            ) : penalidades.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                Nenhum processo de apuração ou penalidade em andamento.
              </div>
            ) : (
              penalidades.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 uppercase">
                        {p.tipoPenalidade.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-mono text-blue-700 font-semibold">
                        Notificação: {p.protocoloNotificacaoSei}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm">
                      {p.fornecedor.razaoSocial} (CNPJ: {p.fornecedor.cnpj})
                    </h3>
                    <div className="text-xs text-slate-500">
                      Contrato: {p.contrato.numeroContrato || p.contrato.numeroEmpenho} - {p.contrato.objeto.slice(0, 60)}...
                    </div>

                    <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 max-w-2xl">
                      {p.fatosDescricao}
                    </p>
                    <div className="text-[11px] text-slate-400">Base Legal: {p.baseLegal}</div>
                  </div>

                  <div className="flex flex-col items-end space-y-3 flex-shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Prazo Final para Defesa</span>
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-block mt-0.5">
                        {new Date(p.prazoDefesaFim).toLocaleDateString('pt-BR')} (15 dias úteis)
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Score Atual da Contratada:</span>
                      <span className="text-sm font-extrabold text-slate-800">
                        {p.fornecedor.scoreConfiabilidade.toFixed(1)} / 100
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNotificacaoDadosIniciais({
                            contratoId: p.contratoId,
                            assunto: `Notificação - Processo SEI ${p.protocoloNotificacaoSei}`,
                            descricaoFatos: p.fatosDescricao,
                            clausulaDescumprida: p.baseLegal,
                            processoSei: p.protocoloNotificacaoSei,
                          });
                          setShowNotificacaoModal(true);
                        }}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        title="Baixar Modelo de Notificação"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Gerar Notificação</span>
                      </button>

                      {currentUser?.isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          title="Editar Processo"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        /* Aba de Medições de IMR */
        <div className="space-y-4">
          {/* Tabela de Parâmetros de Glosa UERN */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700">
            <div className="flex items-center space-x-2 font-bold text-slate-900 mb-1">
              <Calculator className="w-4 h-4 text-blue-700" />
              <span>Critérios e Tabela Oficial de Glosas da UERN (Anexo I / IN 01/2026):</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-2">
              <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                <span className="block font-bold text-emerald-700">1 a 5 pts</span>
                <span className="text-[10px] text-slate-500">Sem Glosa (0%)</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                <span className="block font-bold text-slate-800">6 a 10 pts</span>
                <span className="text-[10px] text-slate-500">Glosa 0,1%</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                <span className="block font-bold text-amber-700">11 a 20 pts</span>
                <span className="text-[10px] text-slate-500">Glosa 0,2%</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                <span className="block font-bold text-amber-700">21 a 30 pts</span>
                <span className="text-[10px] text-slate-500">Glosa 0,3%</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                <span className="block font-bold text-rose-600">31 a 50 pts</span>
                <span className="text-[10px] text-slate-500">Glosa 0,5%</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                <span className="block font-bold text-rose-700">51 a 70 pts</span>
                <span className="text-[10px] text-slate-500">Glosa 1,0%</span>
              </div>
              <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-center">
                <span className="block font-bold text-rose-800">&gt; 70 pts</span>
                <span className="text-[10px] font-bold text-rose-600">Glosa 5% + Processo</span>
              </div>
            </div>
          </div>

          {/* Lista de Avaliações IMR */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Histórico de Avaliações Mensais de IMR por Contrato:
              </span>
              <button
                onClick={() => setShowImrModal(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Nova Leitura de Planilha</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Contrato / Fornecedor</th>
                    <th className="py-3 px-4">Competência</th>
                    <th className="py-3 px-4">Campus</th>
                    <th className="py-3 px-4 text-center">Pontuação</th>
                    <th className="py-3 px-4 text-center">% Glosa</th>
                    <th className="py-3 px-4 text-right">Valor Glosa (Est.)</th>
                    <th className="py-3 px-4">Grau de Aceitação</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">
                        Carregando medições de IMR...
                      </td>
                    </tr>
                  ) : avaliacoesImr.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">
                        Nenhuma avaliação de IMR cadastrada. Clique em "Leitura Inteligente IMR" para importar uma planilha .xlsx ou .ods.
                      </td>
                    </tr>
                  ) : (
                    avaliacoesImr.map((imr) => (
                      <tr key={imr.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">
                            {imr.contrato.numeroContrato ? `Contrato nº ${imr.contrato.numeroContrato}` : `Empenho ${imr.contrato.numeroEmpenho}`}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {imr.contrato.fornecedor.razaoSocial}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">
                          {imr.mesCompetencia}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center space-x-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-semibold">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{imr.localCampus}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-rose-700 font-mono text-sm">
                          {imr.totalPontos.toFixed(1)}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-blue-900 font-mono">
                          {imr.percentualGlosa > 0 ? `${imr.percentualGlosa}%` : '0%'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-800 font-mono">
                          {(imr.valorGlosa || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            imr.totalPontos <= 5
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : imr.totalPontos <= 20
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}>
                            {imr.observacoes || (imr.totalPontos <= 5 ? 'Totalmente Aceitável' : 'Requer Atenção')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {imr.percentualGlosa > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setNotificacaoDadosIniciais({
                                  contratoId: imr.contratoId,
                                  assunto: `Aplicação de Glosa do IMR - Competência ${imr.mesCompetencia}`,
                                  descricaoFatos: `No Instrumento de Medição de Resultado (IMR) referente ao mês ${imr.mesCompetencia} no Campus ${imr.localCampus}, a Contratada somou ${imr.totalPontos} pontos de ocorrências registradas pela fiscalização, ensejando a glosa de ${imr.percentualGlosa}% sobre o valor mensal faturado.`,
                                  clausulaDescumprida: `Anexo de IMR do Contrato e Art. 44 da IN 01/2026 - PROAD/UERN`,
                                  penalidadeProposta: `Glosa de ${imr.percentualGlosa}% na fatura e Advertência`,
                                });
                                setShowNotificacaoModal(true);
                              }}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                              title="Instaurar Notificação"
                            >
                              <Send className="w-3 h-3" />
                              <span>Notificar</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Regular</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Notificação */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-800 text-base mb-1">Notificar Infração e Abrir Processo Sancionatório</h3>
            <p className="text-xs text-slate-500 mb-4">
              Instauração do rito de contraditório e ampla defesa com prazo automático de 15 dias úteis.
            </p>

            <form onSubmit={handleCriarPenalidade} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contrato Objeto da Infração *</label>
                <select
                  required
                  value={form.contratoId}
                  onChange={(e) => setForm({ ...form, contratoId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                >
                  <option value="">Selecione o contrato...</option>
                  {contratos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.numeroContrato || c.numeroEmpenho} - {c.fornecedor.razaoSocial}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Penalidade Proposta *</label>
                  <select
                    value={form.tipoPenalidade}
                    onChange={(e) => setForm({ ...form, tipoPenalidade: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                  >
                    <option value="ADVERTENCIA">Advertência Escrita</option>
                    <option value="MULTA">Multa Contratual</option>
                    <option value="IMPEDIMENTO_LICITAR_ATE_3_ANOS">Impedimento de Licitar (até 3 anos)</option>
                    <option value="DECLARACAO_INIDONEIDADE">Declaração de Inidoneidade</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Processo SEI / Protocolo *</label>
                  <input
                    type="text"
                    required
                    value={form.protocoloNotificacaoSei}
                    onChange={(e) => setForm({ ...form, protocoloNotificacaoSei: e.target.value })}
                    placeholder="04410022.001234/2026-11"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição Detalhada dos Fatos *</label>
                <textarea
                  rows={3}
                  required
                  value={form.fatosDescricao}
                  onChange={(e) => setForm({ ...form, fatosDescricao: e.target.value })}
                  placeholder="Relato circunstanciado do descumprimento verificado pelo fiscal..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fundamento Legal / Cláusula Contratual *</label>
                <input
                  type="text"
                  required
                  value={form.baseLegal}
                  onChange={(e) => setForm({ ...form, baseLegal: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700"
                >
                  Expedir Notificação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PROCESSO DE PENALIDADE */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Editar Processo de Penalidade
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ajuste tipo de sanção, status processual, SEI e fundamentação
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingPenalidadeId(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Tipo de Penalidade
                  </label>
                  <select
                    value={editForm.tipoPenalidade}
                    onChange={(e) => setEditForm({ ...editForm, tipoPenalidade: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 font-semibold"
                  >
                    <option value="ADVERTENCIA">Advertência Escrita</option>
                    <option value="MULTA">Multa Moratória/Compensatória</option>
                    <option value="IMPEDIMENTO_LICITAR_2_ANOS">Impedimento de Licitar (Até 3 anos)</option>
                    <option value="DECLARACAO_INIDONEIDADE">Declaração de Inidoneidade</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Status do Processo
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 font-semibold"
                  >
                    <option value="NOTIFICACAO_DEFESA_15_DIAS">Notificação / Prazo de Defesa</option>
                    <option value="DEFESA_APRESENTADA">Defesa Apresentada</option>
                    <option value="RECURSO_ADMINISTRATIVO">Em Fase Recursal</option>
                    <option value="PENALIDADE_APLICADA">Penalidade Aplicada</option>
                    <option value="ARQUIVADO">Arquivado / Julgado Extinto</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Protocolo Notificação SEI
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.protocoloNotificacaoSei}
                    onChange={(e) => setEditForm({ ...editForm, protocoloNotificacaoSei: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 font-mono"
                    placeholder="Ex: 04410024.000123/2026-11"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Protocolo Decisão SEI (se houver)
                  </label>
                  <input
                    type="text"
                    value={editForm.protocoloDecisaoSei}
                    onChange={(e) => setEditForm({ ...editForm, protocoloDecisaoSei: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 font-mono"
                    placeholder="Ex: Decisão nº 45/2026-PROAD"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Prazo Final para Defesa Prévia
                </label>
                <input
                  type="date"
                  required
                  value={editForm.prazoDefesaFim}
                  onChange={(e) => setEditForm({ ...editForm, prazoDefesaFim: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Descrição dos Fatos e Infração
                </label>
                <textarea
                  rows={3}
                  required
                  value={editForm.fatosDescricao}
                  onChange={(e) => setEditForm({ ...editForm, fatosDescricao: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  placeholder="Detalhamento do descumprimento contratual..."
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Fundamento Legal / Cláusula Contratual
                </label>
                <input
                  type="text"
                  required
                  value={editForm.baseLegal}
                  onChange={(e) => setEditForm({ ...editForm, baseLegal: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  placeholder="Ex: Art. 44 da IN 01/2026 - PROAD/UERN"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingPenalidadeId(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEdit}
                  className="px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
                >
                  {salvandoEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Leitura Inteligente IMR */}
      {showImrModal && (
        <ImrLeituraModal
          contratos={contratos}
          onClose={() => setShowImrModal(false)}
          onSalvo={() => {
            setShowImrModal(false);
            carregarDados();
          }}
          onAbrirNotificacao={(dados) => {
            setShowImrModal(false);
            setNotificacaoDadosIniciais(dados);
            setShowNotificacaoModal(true);
          }}
        />
      )}

      {/* Modal Notificação Oficial UERN (.xlsx / .pdf) */}
      {showNotificacaoModal && (
        <NotificacaoModal
          contratos={contratos}
          dadosIniciais={notificacaoDadosIniciais}
          onClose={() => {
            setShowNotificacaoModal(false);
            setNotificacaoDadosIniciais(null);
          }}
          onSalvo={() => {
            setShowNotificacaoModal(false);
            setNotificacaoDadosIniciais(null);
            carregarDados();
          }}
        />
      )}
    </div>
  );
}
