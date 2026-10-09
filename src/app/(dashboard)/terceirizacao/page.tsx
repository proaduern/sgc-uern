'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Briefcase,
  Users,
  UserPlus,
  FileSpreadsheet,
  BookOpen,
  DollarSign,
  Download,
  AlertTriangle,
  CheckCircle2,
  Building,
  CreditCard,
  FileText,
  UploadCloud,
  Edit3,
  X,
  Plus,
  Trash2,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertCircle,
  PiggyBank,
  Calculator,
  Search,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import * as XLSX from 'xlsx';
import OficioLiberacaoModal from '@/components/conta-vinculada/OficioLiberacaoModal';
import OficioCadastroModal from '@/components/conta-vinculada/OficioCadastroModal';
import RepactuacoesTab from '@/components/terceirizacao/RepactuacoesTab';

type ActiveTabType = 'TRABALHADORES' | 'DOCUMENTOS' | 'FREQUENCIA' | 'CONTA_VINCULADA' | 'CCT' | 'FOLHA_SIMULADA' | 'REPACTUACOES';

export default function TerceirizacaoPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto p-12 text-center text-slate-500 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-[#003366] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">Carregando Módulo Especializado de Terceirização...</p>
      </div>
    }>
      <TerceirizacaoContent />
    </Suspense>
  );
}

function TerceirizacaoContent() {
  const searchParams = useSearchParams();
  const contratoIdParam = searchParams.get('contratoId') || '';
  const tabParam = (searchParams.get('tab') as ActiveTabType) || 'TRABALHADORES';

  const [activeTab, setActiveTab] = useState<ActiveTabType>(tabParam);
  const [selectedContratoId, setSelectedContratoId] = useState<string>(contratoIdParam);
  const [contratos, setContratos] = useState<any[]>([]);
  const [trabalhadores, setTrabalhadores] = useState<any[]>([]);
  const [convencoes, setConvencoes] = useState<any[]>([]);
  const [frequencias, setFrequencias] = useState<any[]>([]);
  const [movimentacoesCV, setMovimentacoesCV] = useState<any[]>([]);
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState<string>('03/2026');
  const [filtroCampus, setFiltroCampus] = useState<string>('');
  const [buscaTrabalhador, setBuscaTrabalhador] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modais de Trabalhador
  const [showTrabalhadorModal, setShowTrabalhadorModal] = useState(false);
  const [showEditTrabalhadorModal, setShowEditTrabalhadorModal] = useState(false);
  const [editingTrabalhadorId, setEditingTrabalhadorId] = useState<string | null>(null);
  const [salvandoTrabalhador, setSalvandoTrabalhador] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Form Trabalhador Novo
  const [formT, setFormT] = useState({
    contratoId: '',
    nomeCompleto: '',
    cpf: '',
    funcao: '',
    campus: 'Campus Central (Mossoró)',
    setorLotacao: 'Reitoria / Prédio Administrativo',
    jornada: '44h semanais',
    dataAdmissao: new Date().toISOString().slice(0, 10),
    banco: 'Banco do Brasil',
    agencia: '',
    contaCorrente: '',
    salarioBaseCct: '1650',
    beneficiosInfo: 'Vale Alimentação (R$ 680,00) + Vale Transporte',
  });

  // Form Trabalhador Edição
  const [editTrabalhadorForm, setEditTrabalhadorForm] = useState({
    nomeCompleto: '',
    cpf: '',
    funcao: '',
    campus: '',
    setorLotacao: '',
    jornada: '',
    dataAdmissao: '',
    dataDemissao: '',
    banco: '',
    agencia: '',
    contaCorrente: '',
    salarioBaseCct: '0',
    beneficiosInfo: '',
    status: 'ATIVO',
  });

  // Modais de Documento
  const [showDocModal, setShowDocModal] = useState(false);
  const [docTrabalhadorId, setDocTrabalhadorId] = useState<string>('');
  const [docForm, setDocForm] = useState({
    tipoDocumento: 'CTPS_DIGITAL',
    nomeArquivo: '',
    arquivoUrl: '',
    observacoes: '',
  });
  const [salvandoDoc, setSalvandoDoc] = useState(false);

  // Modais de Frequência
  const [showFreqModal, setShowFreqModal] = useState(false);
  const [freqTrabalhador, setFreqTrabalhador] = useState<any | null>(null);
  const [freqForm, setFreqForm] = useState({
    diasPrevistos: 30,
    diasTrabalhados: 30,
    faltasInjustificadas: 0,
    faltasJustificadas: 0,
    diasSubstituidos: 0,
    observacoes: '',
  });
  const [salvandoFreq, setSalvandoFreq] = useState(false);

  // Modais de CCT
  const [showCctModal, setShowCctModal] = useState(false);
  const [editingCctId, setEditingCctId] = useState<string | null>(null);
  const [salvandoCct, setSalvandoCct] = useState(false);
  const [cctTabAtiva, setCctTabAtiva] = useState<'DADOS' | 'SALARIOS' | 'BENEFICIOS' | 'OBRIGACOES_PAGTO' | 'OBRIGACOES_REGRAS'>('DADOS');
  const [cctPdfFeedback, setCctPdfFeedback] = useState<string | null>(null);
  const [lendoPdfCct, setLendoPdfCct] = useState(false);
  const [cctForm, setCctForm] = useState<{
    contratoId: string;
    numeroRegistroMte: string;
    sindicatoLaboral: string;
    sindicatoPatronal: string;
    vigenciaInicio: string;
    vigenciaFim: string;
    categoriasProfissionais: string;
    arquivoPdfUrl: string;
    salarios: Array<{ id: string; funcao: string; salarioPiso: string | number }>;
    beneficios: Array<{ id: string; beneficio: string; valor: string | number }>;
    obrigacoesComPagamento: Array<{ id: string; descricao: string; valor: string | number; periodicidade?: string }>;
    obrigacoesSemPagamento: Array<{ id: string; descricao: string }>;
  }>({
    contratoId: '',
    numeroRegistroMte: '',
    sindicatoLaboral: '',
    sindicatoPatronal: '',
    vigenciaInicio: '',
    vigenciaFim: '',
    categoriasProfissionais: '',
    arquivoPdfUrl: '',
    salarios: [{ id: '1', funcao: '', salarioPiso: '' }],
    beneficios: [{ id: '1', beneficio: '', valor: '' }],
    obrigacoesComPagamento: [{ id: '1', descricao: '', valor: '', periodicidade: 'Mensal' }],
    obrigacoesSemPagamento: [{ id: '1', descricao: '' }],
  });

  // Modais de Conta Vinculada
  const [showOficioLiberacaoModal, setShowOficioLiberacaoModal] = useState(false);
  const [showOficioCadastroModal, setShowOficioCadastroModal] = useState(false);
  const [showRetencaoModal, setShowRetencaoModal] = useState(false);
  const [retencaoForm, setRetencaoForm] = useState({
    competenciaMesAno: '03/2026',
    rubrica: 'FERIAS_8_33',
    valor: '',
    trabalhadorId: '',
    numeroOficio: '',
  });

  // Carregar Dados Iniciais
  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resC, resT, resCCT, resUser] = await Promise.all([
        fetch('/api/contratos'),
        fetch(`/api/terceirizacao/trabalhadores${selectedContratoId ? `?contratoId=${selectedContratoId}` : ''}`),
        fetch('/api/terceirizacao/cct'),
        fetch('/api/auth/me'),
      ]);

      const dataC = await resC.json();
      const dataT = await resT.json();
      const dataCCT = await resCCT.json();
      const dataUser = await resUser.json();

      if (dataUser.user) setCurrentUser(dataUser.user);

      // Filtra apenas contratos com dedicação exclusiva de mão de obra
      const listaContratos = (dataC.contratos || []).filter(
        (c: any) => c.tipoContrato === 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO'
      );
      setContratos(listaContratos);

      // Se nenhum contrato selecionado ainda e existem contratos de terceirização, seleciona o primeiro
      if (!selectedContratoId && listaContratos.length > 0) {
        setSelectedContratoId(listaContratos[0].id);
      }

      setTrabalhadores(dataT.trabalhadores || []);
      setConvencoes(dataCCT.convencoes || []);

      // Se tem contrato selecionado, busca frequências e conta vinculada
      if (selectedContratoId || listaContratos[0]?.id) {
        const cId = selectedContratoId || listaContratos[0]?.id;
        const [resFreq, resCV] = await Promise.all([
          fetch(`/api/terceirizacao/frequencias?contratoId=${cId}&competencia=${competenciaSelecionada}`),
          fetch(`/api/conta-vinculada?contratoId=${cId}`),
        ]);
        if (resFreq.ok) {
          const dFreq = await resFreq.json();
          setFrequencias(dFreq.frequencias || []);
        }
        if (resCV.ok) {
          const dCV = await resCV.json();
          setMovimentacoesCV(dCV.movimentacoes || []);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar dados do Cockpit de Terceirização:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [selectedContratoId, competenciaSelecionada]);

  // Contrato atualmente em foco
  const contratoAtual = contratos.find((c) => c.id === selectedContratoId) || contratos[0];

  // Trabalhadores filtrados para a visualização
  const trabalhadoresFiltrados = trabalhadores.filter((t) => {
    const matchContrato = !selectedContratoId || t.contratoId === selectedContratoId;
    const matchBusca =
      !buscaTrabalhador ||
      t.nomeCompleto.toLowerCase().includes(buscaTrabalhador.toLowerCase()) ||
      t.cpf.includes(buscaTrabalhador) ||
      t.funcao.toLowerCase().includes(buscaTrabalhador.toLowerCase());
    const matchCampus = !filtroCampus || t.campus === filtroCampus;
    return matchContrato && matchBusca && matchCampus;
  });

  // KPIs
  const totalTrabalhadoresAtivos = trabalhadoresFiltrados.filter((t) => t.status === 'ATIVO').length;
  const totalDocumentos = trabalhadoresFiltrados.reduce((acc, t) => acc + (t.documentos?.length || 0), 0);
  const totalDocumentosPendentes = trabalhadoresFiltrados.reduce(
    (acc, t) => acc + (t.documentos?.filter((d: any) => d.statusConferencia === 'PENDENTE').length || 0),
    0
  );

  let saldoTotalContaVinculada = 0;
  movimentacoesCV.forEach((m) => {
    if (m.tipoOperacao === 'RETENCAO_ENTRADA') saldoTotalContaVinculada += m.valor;
    else if (m.tipoOperacao === 'LIBERACAO_SAIDA') saldoTotalContaVinculada -= m.valor;
  });

  const totalGlosasApuradas = frequencias.reduce((acc, f) => acc + (f.valorGlosaSugerida || 0), 0);
  const totalFaltasMes = frequencias.reduce((acc, f) => acc + (f.faltasInjustificadas || 0), 0);

  // Handlers Trabalhador
  const handleSaveNovoTrabalhador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formT.contratoId && !selectedContratoId) {
      alert('Selecione o contrato.');
      return;
    }
    setSalvandoTrabalhador(true);
    try {
      const res = await fetch('/api/terceirizacao/trabalhadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formT,
          contratoId: formT.contratoId || selectedContratoId,
        }),
      });
      if (res.ok) {
        setShowTrabalhadorModal(false);
        setFormT({
          contratoId: selectedContratoId,
          nomeCompleto: '',
          cpf: '',
          funcao: '',
          campus: 'Campus Central (Mossoró)',
          setorLotacao: 'Reitoria / Prédio Administrativo',
          jornada: '44h semanais',
          dataAdmissao: new Date().toISOString().slice(0, 10),
          banco: 'Banco do Brasil',
          agencia: '',
          contaCorrente: '',
          salarioBaseCct: '1650',
          beneficiosInfo: 'Vale Alimentação (R$ 680,00) + Vale Transporte',
        });
        carregarDados();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao cadastrar trabalhador');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de conexão');
    } finally {
      setSalvandoTrabalhador(false);
    }
  };

  const handleOpenEditTrabalhador = (t: any) => {
    setEditingTrabalhadorId(t.id);
    setEditTrabalhadorForm({
      nomeCompleto: t.nomeCompleto || '',
      cpf: t.cpf || '',
      funcao: t.funcao || '',
      campus: t.campus || '',
      setorLotacao: t.setorLotacao || '',
      jornada: t.jornada || '',
      dataAdmissao: t.dataAdmissao ? new Date(t.dataAdmissao).toISOString().split('T')[0] : '',
      dataDemissao: t.dataDemissao ? new Date(t.dataDemissao).toISOString().split('T')[0] : '',
      banco: t.banco || '',
      agencia: t.agencia || '',
      contaCorrente: t.contaCorrente || '',
      salarioBaseCct: String(t.salarioBaseCct || 0),
      beneficiosInfo: t.beneficiosInfo || '',
      status: t.status || 'ATIVO',
    });
    setShowEditTrabalhadorModal(true);
  };

  const handleSaveEditTrabalhador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrabalhadorId) return;
    setSalvandoTrabalhador(true);
    try {
      const res = await fetch('/api/terceirizacao/trabalhadores', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingTrabalhadorId, ...editTrabalhadorForm }),
      });
      if (res.ok) {
        setShowEditTrabalhadorModal(false);
        setEditingTrabalhadorId(null);
        carregarDados();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao editar trabalhador');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de conexão');
    } finally {
      setSalvandoTrabalhador(false);
    }
  };

  const handleDeleteTrabalhador = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente remover o trabalhador "${nome}"?`)) return;
    try {
      const res = await fetch(`/api/terceirizacao/trabalhadores?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        carregarDados();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao excluir trabalhador');
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao conectar');
    }
  };

  // Handlers Documento
  const handleOpenDocModal = (trabalhadorId: string) => {
    setDocTrabalhadorId(trabalhadorId);
    setDocForm({
      tipoDocumento: 'CTPS_DIGITAL',
      nomeArquivo: '',
      arquivoUrl: '',
      observacoes: '',
    });
    setShowDocModal(true);
  };

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTrabalhadorId || !docForm.nomeArquivo) return;
    setSalvandoDoc(true);
    try {
      const res = await fetch('/api/terceirizacao/documentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trabalhadorId: docTrabalhadorId,
          ...docForm,
        }),
      });
      if (res.ok) {
        setShowDocModal(false);
        carregarDados();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao anexar documento');
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao conectar');
    } finally {
      setSalvandoDoc(false);
    }
  };

  const handleAtualizarStatusDoc = async (docId: string, novoStatus: 'CONFERIDO' | 'INCONFORME') => {
    try {
      const res = await fetch('/api/terceirizacao/documentos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: docId, statusConferencia: novoStatus }),
      });
      if (res.ok) {
        carregarDados();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao atualizar documento');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de conexão');
    }
  };

  // Handlers Frequência
  const handleOpenFreqModal = (trab: any, freqExistente?: any) => {
    setFreqTrabalhador(trab);
    if (freqExistente) {
      setFreqForm({
        diasPrevistos: freqExistente.diasPrevistos || 30,
        diasTrabalhados: freqExistente.diasTrabalhados || 30,
        faltasInjustificadas: freqExistente.faltasInjustificadas || 0,
        faltasJustificadas: freqExistente.faltasJustificadas || 0,
        diasSubstituidos: freqExistente.diasSubstituidos || 0,
        observacoes: freqExistente.observacoes || '',
      });
    } else {
      setFreqForm({
        diasPrevistos: 30,
        diasTrabalhados: 30,
        faltasInjustificadas: 0,
        faltasJustificadas: 0,
        diasSubstituidos: 0,
        observacoes: '',
      });
    }
    setShowFreqModal(true);
  };

  const handleSaveFreq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freqTrabalhador || !selectedContratoId) return;
    setSalvandoFreq(true);
    try {
      const res = await fetch('/api/terceirizacao/frequencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contratoId: selectedContratoId,
          trabalhadorId: freqTrabalhador.id,
          competenciaMesAno: competenciaSelecionada,
          ...freqForm,
        }),
      });
      if (res.ok) {
        setShowFreqModal(false);
        carregarDados();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao salvar apuração de frequência');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de conexão');
    } finally {
      setSalvandoFreq(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* ======================================================== */}
      {/* CABEÇALHO DO MÓDULO & SELETOR DE CONTRATO                */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-r from-[#001f3f] via-[#002f5e] to-[#001730] text-white p-6 rounded-2xl shadow-xl border border-blue-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 flex items-center gap-1">
                <Users className="w-3 h-3" /> Sub-Módulo SGC
              </span>
              <span className="text-xs text-blue-200">IN nº 01/2026 - PROAD • Lei 14.133/21</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              Gestão de Mão de Obra & Terceirização
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Ambiente especializado para controle do quadro de trabalhadores, documentos admissionais, medições de frequência e glosas, retenções em conta vinculada e convenções coletivas.
            </p>
          </div>

          {/* Seletor de Contrato de Mão de Obra */}
          <div className="bg-black/30 backdrop-blur-md p-3.5 rounded-xl border border-white/10 shrink-0 w-full md:w-80">
            <label className="block text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Contrato em Fiscalização
            </label>
            <select
              value={selectedContratoId}
              onChange={(e) => setSelectedContratoId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-amber-400 font-semibold cursor-pointer"
            >
              {contratos.length === 0 && <option value="">Nenhum contrato com dedicação exclusiva</option>}
              {contratos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numeroContrato || `SEI: ${c.processoSeiMae}`} - {c.fornecedor?.razaoSocial?.slice(0, 25)}
                </option>
              ))}
            </select>
            {contratoAtual && (
              <div className="mt-2 text-[10px] text-slate-300 flex items-center justify-between">
                <span className="truncate">{contratoAtual.fornecedor?.razaoSocial}</span>
                <span className="font-mono text-amber-300">CNPJ: {contratoAtual.fornecedor?.cnpj}</span>
              </div>
            )}
          </div>
        </div>

        {/* 4 Cards de Métricas Chave do Cockpit */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-white/10 text-xs">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-300 block">Trabalhadores Ativos</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-amber-400">{totalTrabalhadoresAtivos}</span>
              <span className="text-[11px] text-slate-400">de {trabalhadoresFiltrados.length} no quadro</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-300 block">Dossiê Trabalhista</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-400">{totalDocumentos - totalDocumentosPendentes}</span>
              <span className="text-[11px] text-slate-400">
                {totalDocumentosPendentes > 0 ? (
                  <span className="text-amber-300 font-bold">({totalDocumentosPendentes} pendentes)</span>
                ) : (
                  'conferidos (100% regular)'
                )}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-300 block">
              Faltas & Glosas ({competenciaSelecionada})
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-rose-400">
                {totalGlosasApuradas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <span className="text-[11px] text-slate-400">({totalFaltasMes} faltas apuradas)</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-300 block">Conta Vinculada</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-cyan-300">
                {saldoTotalContaVinculada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <span className="text-[11px] text-slate-400">saldo retido</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SELETOR DE ABAS PRINCIPAIS DO COCKPIT                    */}
      {/* ======================================================== */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-900 rounded-2xl border border-slate-800 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('TRABALHADORES')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'TRABALHADORES'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Quadro de Empregados</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/40">
            {trabalhadoresFiltrados.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DOCUMENTOS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'DOCUMENTOS'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Dossiê Admissional & ASO</span>
          {totalDocumentosPendentes > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white animate-pulse">
              {totalDocumentosPendentes}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('FREQUENCIA')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'FREQUENCIA'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Ponto & Glosas da NF</span>
          {totalFaltasMes > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-bold">
              {totalFaltasMes}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CONTA_VINCULADA')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'CONTA_VINCULADA'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <PiggyBank className="w-4 h-4" />
          <span>Conta Vinculada & Fato Gerador</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CCT')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'CCT'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Convenção Coletiva (CCT)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('FOLHA_SIMULADA')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'FOLHA_SIMULADA'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Folha Analítica Simulada</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('REPACTUACOES')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'REPACTUACOES'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Repactuações & Retroativos</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: QUADRO DE EMPREGADOS                              */}
      {/* ======================================================== */}
      {activeTab === 'TRABALHADORES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-700" />
                <span>Quadro de Trabalhadores Alocados na UERN</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Relação nominal de profissionais com dedicação exclusiva em exercício nos Campi.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setFormT({ ...formT, contratoId: selectedContratoId });
                  setShowTrabalhadorModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#003366] hover:bg-[#002244] text-white font-bold text-xs rounded-xl shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Trabalhador</span>
              </button>
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por nome, CPF ou função..."
                value={buscaTrabalhador}
                onChange={(e) => setBuscaTrabalhador(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={filtroCampus}
              onChange={(e) => setFiltroCampus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="">Todos os Campi</option>
              <option value="Campus Central (Mossoró)">Campus Central (Mossoró)</option>
              <option value="Campus Natal">Campus Natal</option>
              <option value="Campus Assú">Campus Assú</option>
              <option value="Campus Caicó">Campus Caicó</option>
              <option value="Campus Patu">Campus Patu</option>
              <option value="Campus Pau dos Ferros">Campus Pau dos Ferros</option>
            </select>

            <div className="text-xs text-slate-500 flex items-center justify-end">
              <span>Exibindo <strong>{trabalhadoresFiltrados.length}</strong> funcionários</span>
            </div>
          </div>

          {/* Tabela de Trabalhadores */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Nome / CPF</th>
                  <th className="p-3">Função & Jornada</th>
                  <th className="p-3">Lotação (Campus / Setor)</th>
                  <th className="p-3">Salário CCT</th>
                  <th className="p-3">Admissão</th>
                  <th className="p-3">Dossiê</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trabalhadoresFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Nenhum trabalhador encontrado para este filtro.
                    </td>
                  </tr>
                ) : (
                  trabalhadoresFiltrados.map((t) => {
                    const pendentes = t.documentos?.filter((d: any) => d.statusConferencia === 'PENDENTE').length || 0;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{t.nomeCompleto}</div>
                          <div className="text-[11px] text-slate-400 font-mono">CPF: {t.cpf}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{t.funcao}</div>
                          <div className="text-[10px] text-slate-400">{t.jornada || '44h semanais'}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-slate-800 font-medium">{t.campus || 'Mossoró'}</div>
                          <div className="text-[10px] text-slate-500">{t.setorLotacao || 'Geral'}</div>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {t.salarioBaseCct?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="p-3 text-slate-600">
                          {new Date(t.dataAdmissao).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('DOCUMENTOS');
                              setBuscaTrabalhador(t.nomeCompleto);
                            }}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                              pendentes > 0
                                ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                            }`}
                          >
                            <FileText className="w-3 h-3" />
                            <span>{t.documentos?.length || 0} anexos</span>
                            {pendentes > 0 && <span className="text-amber-700">({pendentes} pend.)</span>}
                          </button>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              t.status === 'ATIVO'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenDocModal(t.id)}
                              title="Anexar Documento"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenFreqModal(t, t.frequencias?.[0])}
                              title="Lançar Frequência"
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditTrabalhador(t)}
                              title="Editar Trabalhador"
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTrabalhador(t.id, t.nomeCompleto)}
                              title="Excluir"
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: DOSSIÊ ADMISSIONAL & CONFORMIDADE                 */}
      {/* ======================================================== */}
      {activeTab === 'DOCUMENTOS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-700" />
                <span>Dossiê Admissional & Fiscalização Trabalhista</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Conferência de CTPS Digital, ASO Admissional, ficha de registro e comprovação de regularidade trabalhista (Art. 121, Lei 14.133/21).
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {trabalhadoresFiltrados.map((t) => (
              <div key={t.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{t.nomeCompleto}</h3>
                    <div className="text-xs text-slate-500">
                      {t.funcao} • {t.campus || 'Mossoró'} • CPF: <span className="font-mono">{t.cpf}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenDocModal(t.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Anexar Documento
                  </button>
                </div>

                {/* Lista de Documentos do Trabalhador */}
                {(!t.documentos || t.documentos.length === 0) ? (
                  <p className="text-xs text-amber-700 italic flex items-center gap-1.5 py-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Nenhum documento anexado ainda para este profissional.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {t.documentos.map((doc: any) => (
                      <div
                        key={doc.id}
                        className={`p-3 rounded-xl border bg-white flex flex-col justify-between gap-2 ${
                          doc.statusConferencia === 'CONFERIDO'
                            ? 'border-emerald-200'
                            : doc.statusConferencia === 'INCONFORME'
                            ? 'border-red-200'
                            : 'border-amber-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase mb-1">
                            <span className="text-slate-700">{doc.tipoDocumento.replace('_', ' ')}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded-full ${
                                doc.statusConferencia === 'CONFERIDO'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : doc.statusConferencia === 'INCONFORME'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {doc.statusConferencia}
                            </span>
                          </div>
                          <div className="font-semibold text-xs text-slate-800 truncate" title={doc.nomeArquivo}>
                            {doc.nomeArquivo}
                          </div>
                          {doc.observacoes && (
                            <div className="text-[11px] text-slate-500 mt-1 italic">{doc.observacoes}</div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                          <span className="text-slate-400">
                            {new Date(doc.enviadoEm).toLocaleDateString('pt-BR')}
                          </span>
                          <div className="flex items-center gap-1">
                            {doc.statusConferencia !== 'CONFERIDO' && (
                              <button
                                type="button"
                                onClick={() => handleAtualizarStatusDoc(doc.id, 'CONFERIDO')}
                                className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700"
                              >
                                Homologar
                              </button>
                            )}
                            {doc.statusConferencia !== 'INCONFORME' && (
                              <button
                                type="button"
                                onClick={() => handleAtualizarStatusDoc(doc.id, 'INCONFORME')}
                                className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-700"
                              >
                                Recusar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: MEDIÇÃO DE PONTO & APURAÇÃO DE GLOSAS             */}
      {/* ======================================================== */}
      {activeTab === 'FREQUENCIA' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-700" />
                <span>Medição Mensal de Frequência & Cálculo de Glosas</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Apuração de faltas não repostas por empregado com desconto proporcional direto na medição da Nota Fiscal.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700">Competência:</label>
              <select
                value={competenciaSelecionada}
                onChange={(e) => setCompetenciaSelecionada(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-300 text-xs font-bold text-slate-800"
              >
                <option value="01/2026">01/2026 (Janeiro)</option>
                <option value="02/2026">02/2026 (Fevereiro)</option>
                <option value="03/2026">03/2026 (Março)</option>
                <option value="04/2026">04/2026 (Abril)</option>
                <option value="05/2026">05/2026 (Maio)</option>
              </select>
            </div>
          </div>

          {/* Banner de Memória de Cálculo de Glosa */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-600 text-white rounded-lg font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Glosa Total Sugerida para Abatimento na NF: {totalGlosasApuradas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h4>
                <p className="text-slate-600 mt-0.5">
                  Foram apuradas <strong>{totalFaltasMes} faltas sem reposição de posto</strong> na competência {competenciaSelecionada}.
                  Este valor deve ser transportado para a medição da Nota Fiscal no SGC como dedução obrigatória.
                </p>
              </div>
            </div>
          </div>

          {/* Tabela de Espelho de Frequência */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Trabalhador</th>
                  <th className="p-3">Função</th>
                  <th className="p-3 text-center">Dias Previstos</th>
                  <th className="p-3 text-center">Dias Trab.</th>
                  <th className="p-3 text-center">Faltas Injust.</th>
                  <th className="p-3 text-center">Faltas Just.</th>
                  <th className="p-3">Glosa Sugerida</th>
                  <th className="p-3">Status Apuração</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trabalhadoresFiltrados.map((t) => {
                  const freq = frequencias.find((f) => f.trabalhadorId === t.id);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{t.nomeCompleto}</div>
                        <div className="text-[10px] text-slate-400 font-mono">CPF: {t.cpf}</div>
                      </td>
                      <td className="p-3 text-slate-700">{t.funcao}</td>
                      <td className="p-3 text-center font-semibold text-slate-700">
                        {freq?.diasPrevistos || 30}
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-700">
                        {freq?.diasTrabalhados ?? 30}
                      </td>
                      <td className="p-3 text-center font-bold text-rose-600">
                        {freq?.faltasInjustificadas || 0}
                      </td>
                      <td className="p-3 text-center text-slate-500">
                        {freq?.faltasJustificadas || 0}
                      </td>
                      <td className="p-3 font-mono font-bold text-rose-700">
                        {((freq?.valorGlosaSugerida || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            freq?.statusApuracao === 'CONFERIDO'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {freq?.statusApuracao || 'NÃO APURADO'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenFreqModal(t, freq)}
                          className="px-2.5 py-1 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded-lg text-[11px] transition shadow-sm"
                        >
                          Lançar Ponto
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 4: CONTA VINCULADA & FATO GERADOR                    */}
      {/* ======================================================== */}
      {activeTab === 'CONTA_VINCULADA' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-blue-700" />
                <span>Conta Vinculada & Retenções Trabalhistas</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Provisões de encargos trabalhistas retidos na fatura e liberados mediante Fato Gerador (IN nº 01/2026 - PROAD).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowOficioCadastroModal(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition"
              >
                Ofício Abertura de Conta
              </button>
              <button
                type="button"
                onClick={() => setShowOficioLiberacaoModal(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition"
              >
                Ofício de Liberação (Banco)
              </button>
            </div>
          </div>

          {/* Cards de Rubricas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200">
              <span className="text-[10px] uppercase font-bold text-blue-700 block">Férias (8,33%)</span>
              <strong className="text-base font-black text-slate-900 mt-1 block">
                {(saldoTotalContaVinculada * 0.35).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </strong>
            </div>

            <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200">
              <span className="text-[10px] uppercase font-bold text-purple-700 block">1/3 Constitucional (2,78%)</span>
              <strong className="text-base font-black text-slate-900 mt-1 block">
                {(saldoTotalContaVinculada * 0.12).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </strong>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
              <span className="text-[10px] uppercase font-bold text-amber-700 block">13º Salário (8,33%)</span>
              <strong className="text-base font-black text-slate-900 mt-1 block">
                {(saldoTotalContaVinculada * 0.35).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </strong>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200">
              <span className="text-[10px] uppercase font-bold text-rose-700 block">Multa FGTS Rescisório</span>
              <strong className="text-base font-black text-slate-900 mt-1 block">
                {(saldoTotalContaVinculada * 0.18).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </strong>
            </div>
          </div>

          {/* Extrato de Movimentações */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
              Extrato Histórico de Retenções e Liberações
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Data</th>
                  <th className="p-3">Competência</th>
                  <th className="p-3">Operação</th>
                  <th className="p-3">Rubrica</th>
                  <th className="p-3">Ofício Ref.</th>
                  <th className="p-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movimentacoesCV.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Nenhuma retenção ou liberação registrada para este contrato ainda.
                    </td>
                  </tr>
                ) : (
                  movimentacoesCV.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 text-slate-500">{new Date(m.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="p-3 font-semibold text-slate-800">{m.competenciaMesAno}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            m.tipoOperacao === 'RETENCAO_ENTRADA'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {m.tipoOperacao === 'RETENCAO_ENTRADA' ? 'Retenção' : 'Liberação'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 font-medium">{m.rubrica}</td>
                      <td className="p-3 font-mono text-slate-600">{m.numeroOficio || '—'}</td>
                      <td className={`p-3 text-right font-mono font-bold ${
                        m.tipoOperacao === 'RETENCAO_ENTRADA' ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {m.tipoOperacao === 'RETENCAO_ENTRADA' ? '+' : '-'} {m.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 5: CONVENÇÕES COLETIVAS (CCT) & PISOS                */}
      {/* ======================================================== */}
      {activeTab === 'CCT' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-700" />
                <span>Convenções Coletivas de Trabalho (CCT) & Pisos</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pisos salariais por categoria, auxílios obrigatórios e cláusulas de repactuação contratual.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCctForm({
                  contratoId: selectedContratoId,
                  numeroRegistroMte: '',
                  sindicatoLaboral: '',
                  sindicatoPatronal: '',
                  vigenciaInicio: '',
                  vigenciaFim: '',
                  categoriasProfissionais: '',
                  arquivoPdfUrl: '',
                  salarios: [{ id: '1', funcao: '', salarioPiso: '' }],
                  beneficios: [{ id: '1', beneficio: '', valor: '' }],
                  obrigacoesComPagamento: [{ id: '1', descricao: '', valor: '', periodicidade: 'Mensal' }],
                  obrigacoesSemPagamento: [{ id: '1', descricao: '' }],
                });
                setShowCctModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#003366] hover:bg-[#002244] text-white font-bold text-xs rounded-xl shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Nova CCT
            </button>
          </div>

          {/* Listagem de CCTs */}
          <div className="space-y-4">
            {convencoes.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                Nenhuma convenção coletiva cadastrada para este contrato.
              </div>
            ) : (
              convencoes.map((cct) => (
                <div key={cct.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {cct.sindicatoLaboral || 'Sindicato da Categoria'}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Registro MTE: <span className="font-mono">{cct.numeroRegistroMte || 'Em homologação'}</span> • Patronal: {cct.sindicatoPatronal || 'Sindicato Patronal'}
                      </p>
                    </div>
                    <div className="text-xs font-semibold text-slate-600">
                      Vigência: {cct.vigenciaInicio ? new Date(cct.vigenciaInicio).toLocaleDateString('pt-BR') : '—'} até {cct.vigenciaFim ? new Date(cct.vigenciaFim).toLocaleDateString('pt-BR') : '—'}
                    </div>
                  </div>

                  {/* Funções e Pisos Salariais */}
                  <div>
                    <h5 className="text-[11px] font-bold uppercase text-slate-500 mb-2">Pisos Salariais Homologados</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {cct.funcoes?.map((f: any) => (
                        <div key={f.id} className="p-3 bg-white rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">{f.nomeFuncao}</span>
                          <strong className="text-sm font-black text-slate-800">
                            {f.salarioPiso?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 6: FOLHA ANALÍTICA SIMULADA                          */}
      {/* ======================================================== */}
      {activeTab === 'FOLHA_SIMULADA' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-700" />
              <span>Simulação Analítica de Custos de Folha & Encargos</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cálculo estimativo dos encargos previdenciários e trabalhistas sobre a remuneração direta.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-slate-800">Composição Global Estimada do Contrato Selecionado</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Folha Salarial Bruta</span>
                <strong className="text-base font-black text-slate-800">
                  {trabalhadoresFiltrados
                    .reduce((acc, t) => acc + (t.salarioBaseCct || 0), 0)
                    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </strong>
              </div>
              <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Encargos Sociais & FGTS (~36,8%)</span>
                <strong className="text-base font-black text-slate-800">
                  {(trabalhadoresFiltrados.reduce((acc, t) => acc + (t.salarioBaseCct || 0), 0) * 0.368).toLocaleString(
                    'pt-BR',
                    { style: 'currency', currency: 'BRL' }
                  )}
                </strong>
              </div>
              <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Provisões de Conta Vinculada (~22,7%)</span>
                <strong className="text-base font-black text-slate-800">
                  {(trabalhadoresFiltrados.reduce((acc, t) => acc + (t.salarioBaseCct || 0), 0) * 0.227).toLocaleString(
                    'pt-BR',
                    { style: 'currency', currency: 'BRL' }
                  )}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 7: REPACTUAÇÕES & RETROATIVOS PROPORCIONAIS          */}
      {/* ======================================================== */}
      {activeTab === 'REPACTUACOES' && (
        <RepactuacoesTab
          contratoId={selectedContratoId}
          contratoAtual={contratoAtual}
          trabalhadores={trabalhadoresFiltrados}
          currentUser={currentUser}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL: NOVO TRABALHADOR                                  */}
      {/* ======================================================== */}
      {showTrabalhadorModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-700" /> Cadastrar Trabalhador Terceirizado
              </h3>
              <button onClick={() => setShowTrabalhadorModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveNovoTrabalhador} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={formT.nomeCompleto}
                    onChange={(e) => setFormT({ ...formT, nomeCompleto: e.target.value })}
                    placeholder="Ex: João Ferreira da Silva"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">CPF *</label>
                  <input
                    type="text"
                    required
                    value={formT.cpf}
                    onChange={(e) => setFormT({ ...formT, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Função / Posto de Trabalho *</label>
                  <input
                    type="text"
                    required
                    value={formT.funcao}
                    onChange={(e) => setFormT({ ...formT, funcao: e.target.value })}
                    placeholder="Ex: Vigilante Armado, Aux. Limpeza"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jornada de Trabalho</label>
                  <input
                    type="text"
                    value={formT.jornada}
                    onChange={(e) => setFormT({ ...formT, jornada: e.target.value })}
                    placeholder="Ex: 44h semanais, Escala 12x36"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Campus de Lotação *</label>
                  <select
                    value={formT.campus}
                    onChange={(e) => setFormT({ ...formT, campus: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Campus Central (Mossoró)">Campus Central (Mossoró)</option>
                    <option value="Campus Natal">Campus Natal</option>
                    <option value="Campus Assú">Campus Assú</option>
                    <option value="Campus Caicó">Campus Caicó</option>
                    <option value="Campus Patu">Campus Patu</option>
                    <option value="Campus Pau dos Ferros">Campus Pau dos Ferros</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Setor / Prédio Específico</label>
                  <input
                    type="text"
                    value={formT.setorLotacao}
                    onChange={(e) => setFormT({ ...formT, setorLotacao: e.target.value })}
                    placeholder="Ex: Complexo Cultural, FAEF, Reitoria"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Data de Admissão *</label>
                  <input
                    type="date"
                    required
                    value={formT.dataAdmissao}
                    onChange={(e) => setFormT({ ...formT, dataAdmissao: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Salário-Base CCT (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formT.salarioBaseCct}
                    onChange={(e) => setFormT({ ...formT, salarioBaseCct: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Banco</label>
                  <input
                    type="text"
                    value={formT.banco}
                    onChange={(e) => setFormT({ ...formT, banco: e.target.value })}
                    placeholder="Ex: Banco do Brasil"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Agência</label>
                  <input
                    type="text"
                    value={formT.agencia}
                    onChange={(e) => setFormT({ ...formT, agencia: e.target.value })}
                    placeholder="0035-3"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Conta Corrente / Salário</label>
                  <input
                    type="text"
                    value={formT.contaCorrente}
                    onChange={(e) => setFormT({ ...formT, contaCorrente: e.target.value })}
                    placeholder="12345-6"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowTrabalhadorModal(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoTrabalhador}
                  className="px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded-xl transition shadow"
                >
                  {salvandoTrabalhador ? 'Salvando...' : 'Salvar Trabalhador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDITAR TRABALHADOR                                */}
      {/* ======================================================== */}
      {showEditTrabalhadorModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-700" /> Editar Trabalhador Terceirizado
              </h3>
              <button onClick={() => setShowEditTrabalhadorModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveEditTrabalhador} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={editTrabalhadorForm.nomeCompleto}
                    onChange={(e) => setEditTrabalhadorForm({ ...editTrabalhadorForm, nomeCompleto: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">CPF</label>
                  <input
                    type="text"
                    required
                    value={editTrabalhadorForm.cpf}
                    onChange={(e) => setEditTrabalhadorForm({ ...editTrabalhadorForm, cpf: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Função</label>
                  <input
                    type="text"
                    required
                    value={editTrabalhadorForm.funcao}
                    onChange={(e) => setEditTrabalhadorForm({ ...editTrabalhadorForm, funcao: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Campus</label>
                  <input
                    type="text"
                    value={editTrabalhadorForm.campus}
                    onChange={(e) => setEditTrabalhadorForm({ ...editTrabalhadorForm, campus: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={editTrabalhadorForm.status}
                    onChange={(e) => setEditTrabalhadorForm({ ...editTrabalhadorForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="ATIVO">ATIVO</option>
                    <option value="AFASTADO">AFASTADO</option>
                    <option value="DEMITIDO">DEMITIDO</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Salário-Base CCT (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editTrabalhadorForm.salarioBaseCct}
                    onChange={(e) => setEditTrabalhadorForm({ ...editTrabalhadorForm, salarioBaseCct: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Setor de Lotação</label>
                  <input
                    type="text"
                    value={editTrabalhadorForm.setorLotacao}
                    onChange={(e) => setEditTrabalhadorForm({ ...editTrabalhadorForm, setorLotacao: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditTrabalhadorModal(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoTrabalhador}
                  className="px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded-xl transition shadow"
                >
                  {salvandoTrabalhador ? 'Atualizando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ANEXAR DOCUMENTO                                  */}
      {/* ======================================================== */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-700" /> Anexar Documento ao Dossiê
              </h3>
              <button onClick={() => setShowDocModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveDoc} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipo de Documento *</label>
                <select
                  value={docForm.tipoDocumento}
                  onChange={(e) => setDocForm({ ...docForm, tipoDocumento: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500 font-medium"
                >
                  <option value="CTPS_DIGITAL">CTPS Digital (Carteira de Trabalho)</option>
                  <option value="ASO_ADMISSIONAL">ASO Admissional</option>
                  <option value="ASO_PERIODICO">ASO Periódico</option>
                  <option value="FICHA_REGISTRO">Ficha de Registro de Empregado</option>
                  <option value="CONTA_BANCARIA">Comprovante de Conta Salário</option>
                  <option value="CERTIDAO_RECICLAGEM">Certidão de Reciclagem / Treinamento</option>
                  <option value="OUTROS">Outros Documentos Trabalhistas</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome do Arquivo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: CTPS_Assinada_2026.pdf"
                  value={docForm.nomeArquivo}
                  onChange={(e) => setDocForm({ ...docForm, nomeArquivo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observações do Fiscal</label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais para conferência..."
                  value={docForm.observacoes}
                  onChange={(e) => setDocForm({ ...docForm, observacoes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoDoc}
                  className="px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded-xl transition shadow"
                >
                  {salvandoDoc ? 'Gravando...' : 'Salvar Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: LANÇAR PONTO & FREQUÊNCIA                         */}
      {/* ======================================================== */}
      {showFreqModal && freqTrabalhador && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-700" /> Apuração de Ponto & Frequência
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {freqTrabalhador.nomeCompleto} • Competência: <strong>{competenciaSelecionada}</strong>
                </p>
              </div>
              <button onClick={() => setShowFreqModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveFreq} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dias Previstos no Mês</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={freqForm.diasPrevistos}
                    onChange={(e) => setFreqForm({ ...freqForm, diasPrevistos: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dias Efetivamente Trabalhados</label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    value={freqForm.diasTrabalhados}
                    onChange={(e) => setFreqForm({ ...freqForm, diasTrabalhados: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500 font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-rose-700 mb-1">Faltas Injustificadas *</label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    value={freqForm.faltasInjustificadas}
                    onChange={(e) => setFreqForm({ ...freqForm, faltasInjustificadas: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-rose-300 bg-rose-50/50 outline-none focus:border-rose-500 font-bold text-rose-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Faltas Justificadas</label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    value={freqForm.faltasJustificadas}
                    onChange={(e) => setFreqForm({ ...freqForm, faltasJustificadas: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dias Substituídos</label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    value={freqForm.diasSubstituidos}
                    onChange={(e) => setFreqForm({ ...freqForm, diasSubstituidos: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Prévia da Glosa */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 font-semibold">Glosa calculada a descontar:</span>
                <span className="font-mono font-bold text-sm text-rose-700">
                  {((freqTrabalhador.salarioBaseCct / (freqForm.diasPrevistos || 30)) * freqForm.faltasInjustificadas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observações do Fiscal / Justificativa</label>
                <textarea
                  rows={2}
                  value={freqForm.observacoes}
                  onChange={(e) => setFreqForm({ ...freqForm, observacoes: e.target.value })}
                  placeholder="Ex: Folguista não compareceu no dia 14/03 gerando posto descoberto..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowFreqModal(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoFreq}
                  className="px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded-xl transition shadow"
                >
                  {salvandoFreq ? 'Gravando...' : 'Salvar Apuração'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modais de Ofício Reutilizados */}
      {showOficioLiberacaoModal && contratoAtual && (
        <OficioLiberacaoModal
          contrato={contratoAtual}
          trabalhadores={trabalhadoresFiltrados}
          saldosPorTrabalhador={{}}
          onClose={() => setShowOficioLiberacaoModal(false)}
          onSucesso={() => {
            setShowOficioLiberacaoModal(false);
            carregarDados();
          }}
        />
      )}

      {showOficioCadastroModal && contratoAtual && (
        <OficioCadastroModal
          contrato={contratoAtual}
          onClose={() => setShowOficioCadastroModal(false)}
        />
      )}
    </div>
  );
}
