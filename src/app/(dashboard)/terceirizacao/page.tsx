'use client';

import React, { useState, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function TerceirizacaoPage() {
  const [activeTab, setActiveTab] = useState<'TRABALHADORES' | 'CCT' | 'FOLHA_SIMULADA'>('TRABALHADORES');
  const [contratos, setContratos] = useState<any[]>([]);
  const [trabalhadores, setTrabalhadores] = useState<any[]>([]);
  const [convencoes, setConvencoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modal Novo Trabalhador
  const [showTrabalhadorModal, setShowTrabalhadorModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importContratoId, setImportContratoId] = useState('');

  // Form Trabalhador
  const [formT, setFormT] = useState({
    contratoId: '',
    nomeCompleto: '',
    cpf: '',
    funcao: '',
    dataAdmissao: new Date().toISOString().slice(0, 10),
    banco: '',
    agencia: '',
    contaCorrente: '',
    salarioBaseCct: '1650',
    beneficiosInfo: 'Vale Alimentação (R$ 650) + Vale Transporte',
  });

  // Estados de Edição de Trabalhador
  const [showEditTrabalhadorModal, setShowEditTrabalhadorModal] = useState(false);
  const [editingTrabalhadorId, setEditingTrabalhadorId] = useState<string | null>(null);
  const [salvandoTrabalhador, setSalvandoTrabalhador] = useState(false);
  const [editTrabalhadorForm, setEditTrabalhadorForm] = useState({
    nomeCompleto: '',
    cpf: '',
    funcao: '',
    dataAdmissao: '',
    dataDemissao: '',
    banco: '',
    agencia: '',
    contaCorrente: '',
    salarioBaseCct: '0',
    beneficiosInfo: '',
    status: 'ATIVO',
  });

  // Estados de Cadastro / Edição de CCT
  const [showCctModal, setShowCctModal] = useState(false);
  const [editingCctId, setEditingCctId] = useState<string | null>(null);
  const [salvandoCct, setSalvandoCct] = useState(false);
  const [cctTabAtiva, setCctTabAtiva] = useState<'DADOS' | 'SALARIOS' | 'BENEFICIOS' | 'OBRIGACOES_PAGTO' | 'OBRIGACOES_REGRAS'>('DADOS');
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
  const [lendoPdfCct, setLendoPdfCct] = useState(false);
  const [cctPdfFeedback, setCctPdfFeedback] = useState<string | null>(null);

  const handleOpenEditTrabalhador = (t: any) => {
    setEditingTrabalhadorId(t.id);
    setEditTrabalhadorForm({
      nomeCompleto: t.nomeCompleto || '',
      cpf: t.cpf || '',
      funcao: t.funcao || '',
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

  const handleOpenNovoCct = () => {
    setEditingCctId(null);
    setCctTabAtiva('DADOS');
    setCctForm({
      contratoId: contratos[0]?.id || '',
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
  };

  const handleOpenEditCct = (cct: any) => {
    setEditingCctId(cct.id);
    setCctTabAtiva('DADOS');
    const fiscal = cct.itensFiscalizacao || {};
    setCctForm({
      contratoId: cct.contratoId || '',
      numeroRegistroMte: cct.numeroRegistroMte || '',
      sindicatoLaboral: cct.sindicatoLaboral || '',
      sindicatoPatronal: cct.sindicatoPatronal || '',
      vigenciaInicio: cct.vigenciaInicio ? new Date(cct.vigenciaInicio).toISOString().split('T')[0] : '',
      vigenciaFim: cct.vigenciaFim ? new Date(cct.vigenciaFim).toISOString().split('T')[0] : '',
      categoriasProfissionais: cct.categoriasProfissionais || '',
      arquivoPdfUrl: cct.arquivoPdfUrl || '',
      salarios: fiscal.salarios && fiscal.salarios.length > 0
        ? fiscal.salarios.map((s: any, idx: number) => ({ id: String(idx + 1), funcao: s.funcao || s.nomeFuncao || '', salarioPiso: s.salarioPiso || '' }))
        : (cct.funcoes && cct.funcoes.length > 0
            ? cct.funcoes.map((f: any, idx: number) => ({ id: String(idx + 1), funcao: f.nomeFuncao || '', salarioPiso: f.salarioPiso || '' }))
            : [{ id: '1', funcao: '', salarioPiso: '' }]),
      beneficios: fiscal.beneficios && fiscal.beneficios.length > 0
        ? fiscal.beneficios.map((b: any, idx: number) => ({ id: String(idx + 1), beneficio: b.beneficio || '', valor: b.valor || '' }))
        : [{ id: '1', beneficio: '', valor: '' }],
      obrigacoesComPagamento: fiscal.obrigacoesComPagamento && fiscal.obrigacoesComPagamento.length > 0
        ? fiscal.obrigacoesComPagamento.map((o: any, idx: number) => ({ id: String(idx + 1), descricao: o.descricao || '', valor: o.valor || '', periodicidade: o.periodicidade || 'Mensal' }))
        : [{ id: '1', descricao: '', valor: '', periodicidade: 'Mensal' }],
      obrigacoesSemPagamento: fiscal.obrigacoesSemPagamento && fiscal.obrigacoesSemPagamento.length > 0
        ? fiscal.obrigacoesSemPagamento.map((o: any, idx: number) => ({ id: String(idx + 1), descricao: o.descricao || '' }))
        : [{ id: '1', descricao: '' }],
    });
    setShowCctModal(true);
  };

  const handleSaveCct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cctForm.contratoId) {
      alert('Selecione um contrato vinculado.');
      return;
    }
    if (!cctForm.vigenciaInicio || !cctForm.vigenciaFim) {
      alert('Informe o início e o fim da vigência da convenção.');
      return;
    }
    setSalvandoCct(true);
    try {
      const payload = {
        ...(editingCctId ? { id: editingCctId } : { contratoId: cctForm.contratoId }),
        numeroRegistroMte: cctForm.numeroRegistroMte.trim() || null,
        sindicatoLaboral: cctForm.sindicatoLaboral.trim() || null,
        sindicatoPatronal: cctForm.sindicatoPatronal.trim() || null,
        vigenciaInicio: cctForm.vigenciaInicio,
        vigenciaFim: cctForm.vigenciaFim,
        categoriasProfissionais: cctForm.categoriasProfissionais.trim() || null,
        arquivoPdfUrl: cctForm.arquivoPdfUrl.trim() || null,
        itensFiscalizacao: {
          salarios: cctForm.salarios.filter((s) => s.funcao.trim()).map((s) => ({
            funcao: s.funcao.trim(),
            salarioPiso: parseFloat(String(s.salarioPiso)) || 0,
          })),
          beneficios: cctForm.beneficios.filter((b) => b.beneficio.trim()).map((b) => ({
            beneficio: b.beneficio.trim(),
            valor: parseFloat(String(b.valor)) || 0,
          })),
          obrigacoesComPagamento: cctForm.obrigacoesComPagamento.filter((o) => o.descricao.trim()).map((o) => ({
            descricao: o.descricao.trim(),
            valor: parseFloat(String(o.valor)) || 0,
            periodicidade: o.periodicidade || 'Mensal',
          })),
          obrigacoesSemPagamento: cctForm.obrigacoesSemPagamento.filter((o) => o.descricao.trim()).map((o) => ({
            descricao: o.descricao.trim(),
          })),
        },
        funcoes: cctForm.salarios.filter((s) => s.funcao.trim()).map((s) => ({
          nomeFuncao: s.funcao.trim(),
          salarioPiso: parseFloat(String(s.salarioPiso)) || 0,
        })),
      };

      const url = '/api/terceirizacao/cct';
      const method = editingCctId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowCctModal(false);
        setEditingCctId(null);
        carregarDados();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao salvar Convenção Coletiva');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de conexão');
    } finally {
      setSalvandoCct(false);
    }
  };

  const handleUploadPdfCct = async (file: File) => {
    setLendoPdfCct(true);
    setCctPdfFeedback(null);
    try {
      const fd = new FormData();
      fd.append('arquivo', file);
      const res = await fetch('/api/terceirizacao/cct/parse-pdf', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Erro ao processar PDF da CCT');
      }

      const d = json.dados;
      setCctForm((prev) => ({
        ...prev,
        numeroRegistroMte: d.numeroRegistroMte || prev.numeroRegistroMte,
        sindicatoLaboral: d.sindicatoLaboral || prev.sindicatoLaboral,
        sindicatoPatronal: d.sindicatoPatronal || prev.sindicatoPatronal,
        vigenciaInicio: d.vigenciaInicio || prev.vigenciaInicio,
        vigenciaFim: d.vigenciaFim || prev.vigenciaFim,
        categoriasProfissionais: d.categoriasProfissionais || prev.categoriasProfissionais,
        salarios: d.itensFiscalizacao?.salarios && d.itensFiscalizacao.salarios.length > 0
          ? d.itensFiscalizacao.salarios.map((s: any, idx: number) => ({
              id: String(idx + 1),
              funcao: s.funcao,
              salarioPiso: s.salarioPiso,
            }))
          : prev.salarios,
        beneficios: d.itensFiscalizacao?.beneficios && d.itensFiscalizacao.beneficios.length > 0
          ? d.itensFiscalizacao.beneficios.map((b: any, idx: number) => ({
              id: String(idx + 1),
              beneficio: b.beneficio,
              valor: b.valor,
            }))
          : prev.beneficios,
        obrigacoesComPagamento: d.itensFiscalizacao?.obrigacoesComPagamento && d.itensFiscalizacao.obrigacoesComPagamento.length > 0
          ? d.itensFiscalizacao.obrigacoesComPagamento.map((o: any, idx: number) => ({
              id: String(idx + 1),
              descricao: o.descricao,
              valor: o.valor,
              periodicidade: o.periodicidade || 'Mensal',
            }))
          : prev.obrigacoesComPagamento,
        obrigacoesSemPagamento: d.itensFiscalizacao?.obrigacoesSemPagamento && d.itensFiscalizacao.obrigacoesSemPagamento.length > 0
          ? d.itensFiscalizacao.obrigacoesSemPagamento.map((o: any, idx: number) => ({
              id: String(idx + 1),
              descricao: o.descricao,
            }))
          : prev.obrigacoesSemPagamento,
      }));

      const nSal = d.itensFiscalizacao?.salarios?.length || 0;
      const nBen = d.itensFiscalizacao?.beneficios?.length || 0;
      const nPag = d.itensFiscalizacao?.obrigacoesComPagamento?.length || 0;
      const nReg = d.itensFiscalizacao?.obrigacoesSemPagamento?.length || 0;
      setCctPdfFeedback(
        `✓ Leitura do PDF concluída com sucesso! Foram identificados: ${nSal} pisos salariais, ${nBen} benefícios, ${nPag} obrigações financeiras e ${nReg} regras operacionais. Você pode revisar e ajustar cada aba antes de gravar.`
      );
    } catch (err: any) {
      alert('Erro ao processar PDF da CCT: ' + (err.message || 'Verifique o arquivo.'));
    } finally {
      setLendoPdfCct(false);
    }
  };

  const handleDeleteCct = async (cctId: string) => {
    if (!confirm('Deseja realmente excluir esta Convenção Coletiva de Trabalho?')) return;
    try {
      const res = await fetch(`/api/terceirizacao/cct?id=${cctId}`, { method: 'DELETE' });
      if (res.ok) {
        carregarDados();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao excluir CCT');
      }
    } catch (e: any) {
      alert(e.message || 'Erro de conexão');
    }
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resC, resT, resCCT, resUser] = await Promise.all([
        fetch('/api/contratos'),
        fetch('/api/terceirizacao/trabalhadores'),
        fetch('/api/terceirizacao/cct'),
        fetch('/api/auth/me'),
      ]);
      const dataC = await resC.json();
      const dataT = await resT.json();
      const dataCCT = await resCCT.json();
      const dataUser = await resUser.json();

      if (dataUser.user) setCurrentUser(dataUser.user);
      if (dataC.contratos) setContratos(dataC.contratos);
      if (dataT.trabalhadores) setTrabalhadores(dataT.trabalhadores);
      if (dataCCT.convencoes) setConvencoes(dataCCT.convencoes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleSalvarTrabalhador = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/terceirizacao/trabalhadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formT),
      });
      if (res.ok) {
        setShowTrabalhadorModal(false);
        setFormT({
          contratoId: '',
          nomeCompleto: '',
          cpf: '',
          funcao: '',
          dataAdmissao: new Date().toISOString().slice(0, 10),
          banco: '',
          agencia: '',
          contaCorrente: '',
          salarioBaseCct: '1650',
          beneficiosInfo: 'Vale Alimentação (R$ 650) + Vale Transporte',
        });
        carregarDados();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportPlanilha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile || !importContratoId) return;

    const fd = new FormData();
    fd.append('planilha', importFile);
    fd.append('contratoId', importContratoId);

    try {
      const res = await fetch('/api/terceirizacao/trabalhadores', {
        method: 'POST',
        body: fd,
      });
      if (res.ok) {
        setShowImportModal(false);
        setImportFile(null);
        carregarDados();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const totalFolhaSimulada = trabalhadores.reduce((acc, t) => acc + (t.salarioBaseCct || 0), 0);
  const canManageCct =
    currentUser?.isAdmin ||
    currentUser?.role === 'GESTOR' ||
    currentUser?.role === 'SUPLENTE' ||
    currentUser?.role === 'FISCAL_ADMINISTRATIVO';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg md:text-xl">
            <Briefcase className="w-6 h-6 text-blue-700" />
            <h2>Módulo de Terceirização & Mão de Obra Exclusiva</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Módulo 4 - Gestão nominal de funcionários, convenções coletivas (CCT), folha simulada e fiscalização trabalhista.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canManageCct && (
            <button
              type="button"
              onClick={handleOpenNovoCct}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Cadastrar Convenção (CCT)</span>
            </button>
          )}

          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-slate-200"
          >
            <UploadCloud className="w-4 h-4 text-slate-600" />
            <span>Importar Planilha de Funcionários</span>
          </button>

          <button
            onClick={() => setShowTrabalhadorModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar Trabalhador</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('TRABALHADORES')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'TRABALHADORES'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Quadro Nominal de Trabalhadores ({trabalhadores.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CCT')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'CCT'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Convenções Coletivas Vigentes ({convencoes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('FOLHA_SIMULADA')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'FOLHA_SIMULADA'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Espelho de Folha & Pagamento Direto</span>
        </button>
      </div>

      {/* TAB 1: TRABALHADORES */}
      {activeTab === 'TRABALHADORES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Nome do Trabalhador</th>
                  <th className="py-3.5 px-4">CPF</th>
                  <th className="py-3.5 px-4">Função / Cargo</th>
                  <th className="py-3.5 px-4">Contrato Vinculado</th>
                  <th className="py-3.5 px-4">Salário CCT</th>
                  <th className="py-3.5 px-4">Dados Bancários</th>
                  <th className="py-3.5 px-4">Data Admissão</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      Carregando funcionários terceirizados...
                    </td>
                  </tr>
                ) : trabalhadores.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      Nenhum trabalhador cadastrado. Clique em "Cadastrar Trabalhador" ou importe via planilha.
                    </td>
                  </tr>
                ) : (
                  trabalhadores.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">{t.nomeCompleto}</td>
                      <td className="py-3 px-4 font-mono">{t.cpf}</td>
                      <td className="py-3 px-4 font-semibold text-blue-900">{t.funcao}</td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-800 truncate">
                          {t.contrato.numeroContrato || t.contrato.numeroEmpenho}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {t.contrato.fornecedor.razaoSocial}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {t.salarioBaseCct.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3 px-4">
                        {t.banco ? (
                          <div className="text-[11px] text-slate-700">
                            {t.banco} | Ag: {t.agencia} CC: {t.contaCorrente}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Não informado</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {new Date(t.dataAdmissao).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {currentUser?.isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleOpenEditTrabalhador(t)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                            title="Editar Trabalhador"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Cadastrado</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CCT */}
      {activeTab === 'CCT' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-blue-700" />
                <h3 className="font-bold text-slate-800 text-sm">Convenções Coletivas de Trabalho (CCT)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {convencoes.length} {convencoes.length === 1 ? 'convenção' : 'convenções'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Referência salarial, benefícios e obrigações trabalhistas vinculadas aos contratos sob sua gestão/fiscalização.
              </p>
            </div>

            {canManageCct && (
              <button
                type="button"
                onClick={handleOpenNovoCct}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Nova CCT</span>
              </button>
            )}
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3 text-xs text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Atenção ao Prazo Preclusivo de 90 dias (Art. 64, §2º da IN 01/2026):</span> A contratada tem até 90 dias após o registro da nova Convenção Coletiva para requerer a repactuação de preços com efeitos retroativos à data-base da categoria.
            </div>
          </div>

          {convencoes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-bold text-slate-800 text-sm">Nenhuma Convenção Coletiva cadastrada</h4>
                <p className="text-xs text-slate-500">
                  Cadastre a CCT vinculada ao seu contrato de mão de obra para parametrizar pisos salariais, benefícios e obrigações a fiscalizar.
                </p>
              </div>
              {canManageCct && (
                <button
                  type="button"
                  onClick={handleOpenNovoCct}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Primeira CCT</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {convencoes.map((cct) => {
                const fiscal = cct.itensFiscalizacao || {};
                const salariosList = (fiscal.salarios && fiscal.salarios.length > 0)
                  ? fiscal.salarios
                  : (cct.funcoes && cct.funcoes.length > 0
                      ? cct.funcoes.map((f: any) => ({ funcao: f.nomeFuncao, salarioPiso: f.salarioPiso }))
                      : []);
                const beneficiosList = fiscal.beneficios || [];
                const obrigacoesPagtoList = fiscal.obrigacoesComPagamento || [];
                const obrigacoesRegrasList = fiscal.obrigacoesSemPagamento || [];

                return (
                  <div
                    key={cct.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-5 hover:border-blue-200 transition-colors"
                  >
                    <div>
                      {/* Topo do Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                            Registro MTE: {cct.numeroRegistroMte || 'Cadastrado'}
                          </span>
                          {cct.contrato && (
                            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                              Contrato: {cct.contrato.numeroContrato || cct.contrato.numeroEmpenho} {cct.contrato.fornecedor ? `• ${cct.contrato.fornecedor.razaoSocial}` : ''}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-500 font-medium">
                            Vigência: {new Date(cct.vigenciaInicio).toLocaleDateString('pt-BR')} a {new Date(cct.vigenciaFim).toLocaleDateString('pt-BR')}
                          </span>

                          {canManageCct && (
                            <div className="flex items-center space-x-1.5 ml-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEditCct(cct)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                                title="Editar Convenção Coletiva"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Editar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCct(cct.id)}
                                className="inline-flex items-center space-x-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                                title="Excluir Convenção Coletiva"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Entidades e Categorias */}
                      <div className="space-y-1.5 mb-4">
                        <h3 className="font-bold text-slate-900 text-sm">
                          {cct.sindicatoLaboral || 'Convenção Coletiva da Categoria'}
                        </h3>
                        <div className="text-xs text-slate-500">
                          Sindicato Patronal: <strong className="text-slate-700">{cct.sindicatoPatronal || 'Não informado'}</strong>
                        </div>
                        {cct.categoriasProfissionais && (
                          <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">
                            <strong className="text-slate-700">Categorias Abrangidas:</strong> {cct.categoriasProfissionais}
                          </div>
                        )}
                      </div>

                      {/* Grade dos 4 Blocos de Fiscalização */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-2">
                        {/* Bloco 1: Salários Homologados */}
                        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                            <span className="font-bold text-slate-800 text-[11px] uppercase flex items-center space-x-1.5">
                              <DollarSign className="w-3.5 h-3.5 text-blue-700" />
                              <span>1. Salários por Função (Pisos)</span>
                            </span>
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                              {salariosList.length}
                            </span>
                          </div>
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                            {salariosList.length === 0 ? (
                              <p className="text-[11px] text-slate-400 italic">Nenhuma função com piso informada.</p>
                            ) : (
                              salariosList.map((s: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                                  <span className="font-medium text-slate-700 truncate mr-2">{s.funcao || s.nomeFuncao}</span>
                                  <span className="font-bold text-slate-900 whitespace-nowrap">
                                    {(parseFloat(s.salarioPiso) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Bloco 2: Benefícios Homologados */}
                        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                            <span className="font-bold text-slate-800 text-[11px] uppercase flex items-center space-x-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>2. Benefícios Obrigatórios</span>
                            </span>
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                              {beneficiosList.length}
                            </span>
                          </div>
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                            {beneficiosList.length === 0 ? (
                              <p className="text-[11px] text-slate-400 italic">Nenhum benefício específico informado.</p>
                            ) : (
                              beneficiosList.map((b: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                                  <span className="font-medium text-slate-700 truncate mr-2">{b.beneficio}</span>
                                  <span className="font-bold text-emerald-700 whitespace-nowrap">
                                    {(parseFloat(b.valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Bloco 3: Direitos e Obrigações com Pagamento */}
                        <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200 space-y-2">
                          <div className="flex items-center justify-between border-b border-amber-200 pb-1.5">
                            <span className="font-bold text-amber-900 text-[11px] uppercase flex items-center space-x-1.5">
                              <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                              <span>3. Obrigações com Impacto Financeiro</span>
                            </span>
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">
                              {obrigacoesPagtoList.length}
                            </span>
                          </div>
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                            {obrigacoesPagtoList.length === 0 ? (
                              <p className="text-[11px] text-amber-700/60 italic">Nenhuma obrigação pecuniária cadastrada.</p>
                            ) : (
                              obrigacoesPagtoList.map((o: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center py-1 border-b border-amber-100 last:border-0">
                                  <span className="font-medium text-amber-950 truncate mr-2" title={o.descricao}>{o.descricao}</span>
                                  <div className="text-right whitespace-nowrap">
                                    <span className="font-bold text-amber-900">
                                      {(parseFloat(o.valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                    {o.periodicidade && <span className="text-[9px] text-amber-700 block">({o.periodicidade})</span>}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Bloco 4: Obrigações Regulatórias sem Pagamento */}
                        <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2">
                          <div className="flex items-center justify-between border-b border-indigo-200 pb-1.5">
                            <span className="font-bold text-indigo-900 text-[11px] uppercase flex items-center space-x-1.5">
                              <FileText className="w-3.5 h-3.5 text-indigo-700" />
                              <span>4. Regras & Obrigações Operacionais</span>
                            </span>
                            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-900 px-1.5 py-0.2 rounded">
                              {obrigacoesRegrasList.length}
                            </span>
                          </div>
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                            {obrigacoesRegrasList.length === 0 ? (
                              <p className="text-[11px] text-indigo-700/60 italic">Nenhuma regra operacional cadastrada.</p>
                            ) : (
                              obrigacoesRegrasList.map((r: any, idx: number) => (
                                <div key={idx} className="py-1 border-b border-indigo-100 last:border-0 text-[11px] text-indigo-950 flex items-start space-x-1.5">
                                  <span className="text-indigo-400 font-bold">•</span>
                                  <span className="leading-snug">{r.descricao}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {cct.arquivoPdfUrl && (
                      <div className="pt-3 border-t border-slate-100">
                        <a
                          href={cct.arquivoPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 text-xs text-blue-700 font-bold hover:underline"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar PDF Integral da CCT</span>
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FOLHA SIMULADA & PAGAMENTO DIRETO */}
      {activeTab === 'FOLHA_SIMULADA' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Espelho de Folha de Pagamento Salarial Simulado</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Base calculada para conferência de relatórios e para subsidiar pagamento direto extraordinário em caso de inadimplência da contratada.
              </p>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-right">
              <span className="text-[10px] font-bold text-blue-600 uppercase block">Custo Salarial Base Total</span>
              <span className="text-xl font-extrabold text-[#003366]">
                {totalFolhaSimulada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / mês
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Demonstrativo por Trabalhador Alocado:
            </h4>

            <div className="space-y-2">
              {trabalhadores.map((t) => {
                const salario = t.salarioBaseCct || 0;
                const provisaoFerias = salario * 0.0833;
                const provisao13 = salario * 0.0833;
                const provisaoTerco = salario * 0.0278;
                const totalProvisoes = provisaoFerias + provisao13 + provisaoTerco;

                return (
                  <div key={t.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-800 text-sm block">{t.nomeCompleto}</span>
                      <span className="text-slate-500 font-mono">CPF: {t.cpf} | Função: {t.funcao}</span>
                      <div className="text-[11px] text-blue-700 mt-1">
                        Conta para Crédito Direto: {t.banco || 'Banco'} Ag: {t.agencia || '-'} CC: {t.contaCorrente || '-'}
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase">Salário Base</span>
                        <span className="font-bold text-slate-900">
                          {salario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase">Retenções Vinculadas</span>
                        <span className="font-bold text-emerald-700">
                          {totalProvisoes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Cadastro Trabalhador */}
      {showTrabalhadorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-800 text-base mb-1">Cadastrar Trabalhador Terceirizado</h3>
            <p className="text-xs text-slate-500 mb-4">
              Cadastro nominal para controle salarial e de conta vinculada.
            </p>

            <form onSubmit={handleSalvarTrabalhador} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contrato de Mão de Obra *</label>
                <select
                  required
                  value={formT.contratoId}
                  onChange={(e) => setFormT({ ...formT, contratoId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                >
                  <option value="">Selecione o contrato...</option>
                  {contratos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.numeroContrato || c.numeroEmpenho} - {c.objeto.slice(0, 45)}...
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo do Trabalhador *</label>
                <input
                  type="text"
                  required
                  value={formT.nomeCompleto}
                  onChange={(e) => setFormT({ ...formT, nomeCompleto: e.target.value })}
                  placeholder="Nome completo"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CPF *</label>
                  <input
                    type="text"
                    required
                    value={formT.cpf}
                    onChange={(e) => setFormT({ ...formT, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Função / Cargo *</label>
                  <input
                    type="text"
                    required
                    value={formT.funcao}
                    onChange={(e) => setFormT({ ...formT, funcao: e.target.value })}
                    placeholder="Ex: Vigilante, Porteiro, Servente"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data de Admissão *</label>
                  <input
                    type="date"
                    required
                    value={formT.dataAdmissao}
                    onChange={(e) => setFormT({ ...formT, dataAdmissao: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Salário Base CCT (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formT.salarioBaseCct}
                    onChange={(e) => setFormT({ ...formT, salarioBaseCct: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Banco</label>
                  <input
                    type="text"
                    value={formT.banco}
                    onChange={(e) => setFormT({ ...formT, banco: e.target.value })}
                    placeholder="Ex: Banco do Brasil"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Agência</label>
                  <input
                    type="text"
                    value={formT.agencia}
                    onChange={(e) => setFormT({ ...formT, agencia: e.target.value })}
                    placeholder="0000-0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Conta Corrente</label>
                  <input
                    type="text"
                    value={formT.contaCorrente}
                    onChange={(e) => setFormT({ ...formT, contaCorrente: e.target.value })}
                    placeholder="00000-0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTrabalhadorModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003366] text-white text-xs font-semibold rounded-lg hover:bg-[#002244]"
                >
                  Salvar Trabalhador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Importar Planilha de Funcionários */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-800 text-base mb-1">Importar Planilha de Trabalhadores</h3>
            <p className="text-xs text-slate-500 mb-4">
              Faça upload de arquivo Excel (.xlsx / .csv) com Nome, CPF, Função e Salário.
            </p>

            <form onSubmit={handleImportPlanilha} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contrato de Vínculo *</label>
                <select
                  required
                  value={importContratoId}
                  onChange={(e) => setImportContratoId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                >
                  <option value="">Selecione o contrato...</option>
                  {contratos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.numeroContrato || c.numeroEmpenho} - {c.objeto.slice(0, 40)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-500 transition-colors bg-slate-50/50">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="import-workers-file"
                />
                <label htmlFor="import-workers-file" className="cursor-pointer block">
                  <FileSpreadsheet className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <span className="text-xs font-semibold text-slate-700 block">
                    {importFile ? importFile.name : 'Clique para selecionar a planilha'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Formatos suportados: .xlsx, .xls, .csv
                  </span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!importFile || !importContratoId}
                  className="px-4 py-2 bg-[#003366] text-white text-xs font-semibold rounded-lg hover:bg-[#002244] disabled:opacity-50"
                >
                  Processar Importação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR TRABALHADOR */}
      {showEditTrabalhadorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Editar Trabalhador Terceirizado
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ajuste dados cadastrais, cargo, salário e dados bancários
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditTrabalhadorModal(false);
                  setEditingTrabalhadorId(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTrabalhador} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={editTrabalhadorForm.nomeCompleto}
                    onChange={(e) => setEditTrabalhadorForm({ ...editTrabalhadorForm, nomeCompleto: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    required
                    value={editTrabalhadorForm.cpf}
                    onChange={(e) => setEditTrabalhadorForm({ ...editTrabalhadorForm, cpf: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Função / Cargo
                  </label>
                  <input
                    type="text"
                    required
                    value={editTrabalhadorForm.funcao}
                    onChange={(e) => setEditTrabalhadorForm({ ...editTrabalhadorForm, funcao: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Salário Base CCT (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editTrabalhadorForm.salarioBaseCct}
                    onChange={(e) => setEditTrabalhadorForm({ ...editTrabalhadorForm, salarioBaseCct: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Data de Admissão
                  </label>
                  <input
                    type="date"
                    required
                    value={editTrabalhadorForm.dataAdmissao}
                    onChange={(e) => setEditTrabalhadorForm({ ...editTrabalhadorForm, dataAdmissao: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Data de Demissão (se houver)
                  </label>
                  <input
                    type="date"
                    value={editTrabalhadorForm.dataDemissao}
                    onChange={(e) => setEditTrabalhadorForm({ ...editTrabalhadorForm, dataDemissao: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Banco
                  </label>
                  <input
                    type="text"
                    value={editTrabalhadorForm.banco}
                    onChange={(e) => setEditTrabalhadorForm({ ...editTrabalhadorForm, banco: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                    placeholder="Ex: Banco do Brasil"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Agência
                  </label>
                  <input
                    type="text"
                    value={editTrabalhadorForm.agencia}
                    onChange={(e) => setEditTrabalhadorForm({ ...editTrabalhadorForm, agencia: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                    placeholder="Ex: 0035-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Conta Corrente
                  </label>
                  <input
                    type="text"
                    value={editTrabalhadorForm.contaCorrente}
                    onChange={(e) => setEditTrabalhadorForm({ ...editTrabalhadorForm, contaCorrente: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                    placeholder="Ex: 123456-7"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Status do Funcionário
                  </label>
                  <select
                    value={editTrabalhadorForm.status}
                    onChange={(e) => setEditTrabalhadorForm({ ...editTrabalhadorForm, status: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 font-semibold"
                  >
                    <option value="ATIVO">Ativo</option>
                    <option value="DEMITIDO">Demitido / Rescindido</option>
                    <option value="AFASTADO">Afastado / Licença</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Benefícios / Observações
                  </label>
                  <input
                    type="text"
                    value={editTrabalhadorForm.beneficiosInfo}
                    onChange={(e) => setEditTrabalhadorForm({ ...editTrabalhadorForm, beneficiosInfo: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                    placeholder="Ex: Vale Transporte + VR"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditTrabalhadorModal(false);
                    setEditingTrabalhadorId(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoTrabalhador}
                  className="px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
                >
                  {salvandoTrabalhador ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CADASTRO / EDIÇÃO DE CCT (GESTORES E FISCAIS ADMINISTRATIVOS) */}
      {showCctModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            {/* Cabeçalho do Modal */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-900 to-indigo-950 text-white">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-white/10 text-white backdrop-blur-sm">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {editingCctId ? 'Editar Convenção Coletiva de Trabalho (CCT)' : 'Cadastrar Convenção Coletiva de Trabalho (CCT)'}
                  </h3>
                  <p className="text-xs text-blue-200">
                    Formulário de fiscalização trabalhista • Vínculo com contrato administrativo (IN 01/2026 - UERN)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCctModal(false);
                  setEditingCctId(null);
                }}
                className="p-1.5 text-blue-200 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de Ação de Leitura Inteligente via PDF */}
            <div className="bg-blue-50/80 border-b border-blue-200/80 px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2 text-xs text-blue-950 font-medium">
                <FileText className="w-4 h-4 text-blue-700 flex-shrink-0" />
                <span>
                  Tem o PDF da Convenção (MTE)? O robô lê e preenche automaticamente as 5 abas para você revisar.
                </span>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <input
                  type="file"
                  id="cct-pdf-upload"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadPdfCct(f);
                  }}
                />
                <label
                  htmlFor="cct-pdf-upload"
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm ${
                    lendoPdfCct
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-700 hover:bg-blue-800 text-white'
                  }`}
                >
                  {lendoPdfCct ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Analisando PDF da CCT...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Importar CCT via PDF</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            {cctPdfFeedback && (
              <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{cctPdfFeedback}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCctPdfFeedback(null)}
                  className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Abas Internas do Formulário de CCT */}
            <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex space-x-1.5 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setCctTabAtiva('DADOS')}
                className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  cctTabAtiva === 'DADOS' ? 'bg-white text-blue-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Contrato & Dados Gerais
              </button>
              <button
                type="button"
                onClick={() => setCctTabAtiva('SALARIOS')}
                className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                  cctTabAtiva === 'SALARIOS' ? 'bg-white text-blue-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-blue-700" />
                <span>2. Salários ({cctForm.salarios.filter((s) => s.funcao.trim()).length})</span>
              </button>
              <button
                type="button"
                onClick={() => setCctTabAtiva('BENEFICIOS')}
                className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                  cctTabAtiva === 'BENEFICIOS' ? 'bg-white text-blue-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>3. Benefícios ({cctForm.beneficios.filter((b) => b.beneficio.trim()).length})</span>
              </button>
              <button
                type="button"
                onClick={() => setCctTabAtiva('OBRIGACOES_PAGTO')}
                className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                  cctTabAtiva === 'OBRIGACOES_PAGTO' ? 'bg-white text-blue-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                <span>4. Obrigações c/ Pagto ({cctForm.obrigacoesComPagamento.filter((o) => o.descricao.trim()).length})</span>
              </button>
              <button
                type="button"
                onClick={() => setCctTabAtiva('OBRIGACOES_REGRAS')}
                className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                  cctTabAtiva === 'OBRIGACOES_REGRAS' ? 'bg-white text-blue-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>5. Regras Operacionais ({cctForm.obrigacoesSemPagamento.filter((o) => o.descricao.trim()).length})</span>
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSaveCct} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* ABA 1: DADOS GERAIS */}
              {cctTabAtiva === 'DADOS' && (
                <div className="space-y-4">
                  {/* Seleção do Contrato Vinculado */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Contrato Administrativo Vinculado *
                    </label>
                    <select
                      required
                      disabled={!!editingCctId}
                      value={cctForm.contratoId}
                      onChange={(e) => setCctForm({ ...cctForm, contratoId: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-medium disabled:bg-slate-100"
                    >
                      <option value="">Selecione o contrato sob sua responsabilidade...</option>
                      {contratos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.numeroContrato ? `Contrato nº ${c.numeroContrato}` : `Empenho nº ${c.numeroEmpenho}`} - {c.objeto?.slice(0, 50)}... ({c.fornecedor?.razaoSocial})
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      Listando contratos vinculados a você como Gestor do Contrato ou Fiscal Administrativo.
                    </span>
                  </div>

                  {/* Registro MTE e Vigência */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Registro no MTE</label>
                      <input
                        type="text"
                        value={cctForm.numeroRegistroMte}
                        onChange={(e) => setCctForm({ ...cctForm, numeroRegistroMte: e.target.value })}
                        placeholder="Ex: RN000009/2025"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Vigência Início *</label>
                      <input
                        type="date"
                        required
                        value={cctForm.vigenciaInicio}
                        onChange={(e) => setCctForm({ ...cctForm, vigenciaInicio: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Vigência Fim *</label>
                      <input
                        type="date"
                        required
                        value={cctForm.vigenciaFim}
                        onChange={(e) => setCctForm({ ...cctForm, vigenciaFim: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-medium"
                      />
                    </div>
                  </div>

                  {/* Sindicatos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Sindicato Laboral (Trabalhadores)</label>
                      <input
                        type="text"
                        value={cctForm.sindicatoLaboral}
                        onChange={(e) => setCctForm({ ...cctForm, sindicatoLaboral: e.target.value })}
                        placeholder="Ex: SINDLIMP/RN, SINDESP/RN..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Sindicato Patronal (Empresas)</label>
                      <input
                        type="text"
                        value={cctForm.sindicatoPatronal}
                        onChange={(e) => setCctForm({ ...cctForm, sindicatoPatronal: e.target.value })}
                        placeholder="Ex: SEAC/RN..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {/* Categorias Profissionais Abrangidas */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Categorias Profissionais Abrangidas</label>
                    <input
                      type="text"
                      value={cctForm.categoriasProfissionais}
                      onChange={(e) => setCctForm({ ...cctForm, categoriasProfissionais: e.target.value })}
                      placeholder="Ex: Asseio e Conservação, Limpeza Predial, Portaria, Supervisor Operacional, Apoio Administrativo..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* Link do Arquivo/PDF da CCT */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Link / URL do PDF da CCT no SEI ou Mediador</label>
                    <input
                      type="text"
                      value={cctForm.arquivoPdfUrl}
                      onChange={(e) => setCctForm({ ...cctForm, arquivoPdfUrl: e.target.value })}
                      placeholder="https://sei.uern.br/... ou https://www3.mte.gov.br/..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Prazo Preclusivo da IN 01/2026:</span> Lembre-se que o direito à repactuação com efeitos retroativos à data-base da categoria preclui em 90 dias após o registro no MTE.
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: SALÁRIOS POR FUNÇÃO */}
              {cctTabAtiva === 'SALARIOS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Salários Normativos (Pisos da CCT)</h4>
                      <p className="text-[11px] text-slate-500">
                        Cadastre as funções e os pisos salariais obrigatórios homologados para o contrato.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCctForm({
                        ...cctForm,
                        salarios: [...cctForm.salarios, { id: String(Date.now()), funcao: '', salarioPiso: '' }],
                      })}
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Função</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {cctForm.salarios.map((s, idx) => (
                      <div key={s.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-3">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Nome da Função / Cargo *</label>
                          <input
                            type="text"
                            value={s.funcao}
                            onChange={(e) => {
                              const updated = [...cctForm.salarios];
                              updated[idx].funcao = e.target.value;
                              setCctForm({ ...cctForm, salarios: updated });
                            }}
                            placeholder="Ex: Supervisor Operacional, Servente, Vigilante..."
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600 font-semibold"
                          />
                        </div>
                        <div className="w-40">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Salário Piso (R$) *</label>
                          <input
                            type="number"
                            step="0.01"
                            value={s.salarioPiso}
                            onChange={(e) => {
                              const updated = [...cctForm.salarios];
                              updated[idx].salarioPiso = e.target.value;
                              setCctForm({ ...cctForm, salarios: updated });
                            }}
                            placeholder="0.00"
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600 font-bold text-blue-900 text-right"
                          />
                        </div>
                        <div className="pt-4">
                          <button
                            type="button"
                            disabled={cctForm.salarios.length === 1}
                            onClick={() => {
                              const updated = cctForm.salarios.filter((_, i) => i !== idx);
                              setCctForm({ ...cctForm, salarios: updated });
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ABA 3: BENEFÍCIOS */}
              {cctTabAtiva === 'BENEFICIOS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Benefícios Homologados</h4>
                      <p className="text-[11px] text-slate-500">
                        Cadastre benefícios obrigatórios e seus respectivos valores pecuniários previstos na CCT.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCctForm({
                        ...cctForm,
                        beneficios: [...cctForm.beneficios, { id: String(Date.now()), beneficio: '', valor: '' }],
                      })}
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Benefício</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {cctForm.beneficios.map((b, idx) => (
                      <div key={b.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-3">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Benefício Previsto *</label>
                          <input
                            type="text"
                            value={b.beneficio}
                            onChange={(e) => {
                              const updated = [...cctForm.beneficios];
                              updated[idx].beneficio = e.target.value;
                              setCctForm({ ...cctForm, beneficios: updated });
                            }}
                            placeholder="Ex: Vale-Alimentação, Cesta Básica, Auxílio Saúde, Seguro de Vida..."
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600 font-semibold"
                          />
                        </div>
                        <div className="w-40">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Valor Obrigatório (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={b.valor}
                            onChange={(e) => {
                              const updated = [...cctForm.beneficios];
                              updated[idx].valor = e.target.value;
                              setCctForm({ ...cctForm, beneficios: updated });
                            }}
                            placeholder="0.00"
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600 font-bold text-emerald-700 text-right"
                          />
                        </div>
                        <div className="pt-4">
                          <button
                            type="button"
                            disabled={cctForm.beneficios.length === 1}
                            onClick={() => {
                              const updated = cctForm.beneficios.filter((_, i) => i !== idx);
                              setCctForm({ ...cctForm, beneficios: updated });
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ABA 4: OBRIGAÇÕES COM PAGAMENTO */}
              {cctTabAtiva === 'OBRIGACOES_PAGTO' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Direitos & Obrigações com Impacto Financeiro (Pagamento ao Trabalhador)</h4>
                      <p className="text-[11px] text-slate-500">
                        Itens da convenção que geram custo adicional e pagamento pecuniário a ser fiscalizado no atesto mensal da fatura.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCctForm({
                        ...cctForm,
                        obrigacoesComPagamento: [...cctForm.obrigacoesComPagamento, { id: String(Date.now()), descricao: '', valor: '', periodicidade: 'Mensal' }],
                      })}
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Obrigação com Valor</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {cctForm.obrigacoesComPagamento.map((o, idx) => (
                      <div key={o.id || idx} className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl flex items-center space-x-3">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-amber-900 uppercase mb-0.5">Descrição da Obrigação / Cláusula CCT *</label>
                          <input
                            type="text"
                            value={o.descricao}
                            onChange={(e) => {
                              const updated = [...cctForm.obrigacoesComPagamento];
                              updated[idx].descricao = e.target.value;
                              setCctForm({ ...cctForm, obrigacoesComPagamento: updated });
                            }}
                            placeholder="Ex: Adicional Noturno 25%, Insalubridade 20%, Fornecimento de 2º uniforme indenizado..."
                            className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg outline-none focus:border-amber-600 font-semibold text-slate-800"
                          />
                        </div>
                        <div className="w-32">
                          <label className="block text-[10px] font-bold text-amber-900 uppercase mb-0.5">Valor (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={o.valor}
                            onChange={(e) => {
                              const updated = [...cctForm.obrigacoesComPagamento];
                              updated[idx].valor = e.target.value;
                              setCctForm({ ...cctForm, obrigacoesComPagamento: updated });
                            }}
                            placeholder="0.00"
                            className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg outline-none focus:border-amber-600 font-bold text-amber-900 text-right"
                          />
                        </div>
                        <div className="w-32">
                          <label className="block text-[10px] font-bold text-amber-900 uppercase mb-0.5">Periodicidade</label>
                          <select
                            value={o.periodicidade || 'Mensal'}
                            onChange={(e) => {
                              const updated = [...cctForm.obrigacoesComPagamento];
                              updated[idx].periodicidade = e.target.value;
                              setCctForm({ ...cctForm, obrigacoesComPagamento: updated });
                            }}
                            className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded-lg outline-none text-xs"
                          >
                            <option value="Mensal">Mensal</option>
                            <option value="Semestral">Semestral</option>
                            <option value="Anual">Anual</option>
                            <option value="Por Evento">Por Evento</option>
                          </select>
                        </div>
                        <div className="pt-4">
                          <button
                            type="button"
                            disabled={cctForm.obrigacoesComPagamento.length === 1}
                            onClick={() => {
                              const updated = cctForm.obrigacoesComPagamento.filter((_, i) => i !== idx);
                              setCctForm({ ...cctForm, obrigacoesComPagamento: updated });
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ABA 5: OBRIGAÇÕES SEM PAGAMENTO (REGRAS OPERACIONAIS) */}
              {cctTabAtiva === 'OBRIGACOES_REGRAS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Direitos & Obrigações Regulatórias (Sem Pagamento Direto)</h4>
                      <p className="text-[11px] text-slate-500">
                        Regras de jornada, intervalo, estabilidade e conformidade trabalhista da CCT que o fiscal administrativo deve auditar.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCctForm({
                        ...cctForm,
                        obrigacoesSemPagamento: [...cctForm.obrigacoesSemPagamento, { id: String(Date.now()), descricao: '' }],
                      })}
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Regra Regulatória</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {cctForm.obrigacoesSemPagamento.map((r, idx) => (
                      <div key={r.id || idx} className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl flex items-center space-x-3">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-indigo-900 uppercase mb-0.5">Cláusula / Regra Operacional a Fiscalizar *</label>
                          <input
                            type="text"
                            value={r.descricao}
                            onChange={(e) => {
                              const updated = [...cctForm.obrigacoesSemPagamento];
                              updated[idx].descricao = e.target.value;
                              setCctForm({ ...cctForm, obrigacoesSemPagamento: updated });
                            }}
                            placeholder="Ex: Escala 12x36 com intervalo de 1h, Homologação rescisória no sindicato, Estabilidade pré-aposentadoria de 12 meses..."
                            className="w-full px-3 py-1.5 bg-white border border-indigo-300 rounded-lg outline-none focus:border-indigo-600 font-semibold text-slate-800"
                          />
                        </div>
                        <div className="pt-4">
                          <button
                            type="button"
                            disabled={cctForm.obrigacoesSemPagamento.length === 1}
                            onClick={() => {
                              const updated = cctForm.obrigacoesSemPagamento.filter((_, i) => i !== idx);
                              setCctForm({ ...cctForm, obrigacoesSemPagamento: updated });
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rodapé do Modal */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setShowCctModal(false);
                    setEditingCctId(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <div className="flex items-center space-x-2">
                  {cctTabAtiva !== 'DADOS' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs: Array<'DADOS' | 'SALARIOS' | 'BENEFICIOS' | 'OBRIGACOES_PAGTO' | 'OBRIGACOES_REGRAS'> = ['DADOS', 'SALARIOS', 'BENEFICIOS', 'OBRIGACOES_PAGTO', 'OBRIGACOES_REGRAS'];
                        const idx = tabs.indexOf(cctTabAtiva);
                        if (idx > 0) setCctTabAtiva(tabs[idx - 1]);
                      }}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Voltar
                    </button>
                  )}

                  {cctTabAtiva !== 'OBRIGACOES_REGRAS' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs: Array<'DADOS' | 'SALARIOS' | 'BENEFICIOS' | 'OBRIGACOES_PAGTO' | 'OBRIGACOES_REGRAS'> = ['DADOS', 'SALARIOS', 'BENEFICIOS', 'OBRIGACOES_PAGTO', 'OBRIGACOES_REGRAS'];
                        const idx = tabs.indexOf(cctTabAtiva);
                        if (idx < tabs.length - 1) setCctTabAtiva(tabs[idx + 1]);
                      }}
                      className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Avançar
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={salvandoCct}
                    className="px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {salvandoCct ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Salvando CCT...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{editingCctId ? 'Salvar Alterações da CCT' : 'Gravar Convenção Coletiva'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
