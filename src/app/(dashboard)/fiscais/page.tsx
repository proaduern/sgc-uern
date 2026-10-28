'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Search,
  Building,
  Key,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  FileSpreadsheet,
  Download,
  X,
  Check,
  Edit3,
  Sparkles,
  Trash2,
  UserCheck,
  PlusCircle,
  FileText,
} from 'lucide-react';
import UploadInteligenteDesignacaoModal from '@/components/fiscais/UploadInteligenteDesignacaoModal';
import GerarAtoDesignacaoModal from '@/components/fiscais/GerarAtoDesignacaoModal';
import {
  CIDADES_UERN,
  normalizarCidadeCampus,
  UnidadeUern,
} from '@/lib/cidades-constantes';

interface Servidor {
  id: string;
  nome: string;
  email: string;
  matricula: string | null;
  role: string;
  unidadeId?: string | null;
  unidadeSigla?: string | null;
  unidadeNome?: string | null;
  campus?: string | null;
  totalDesignacoes?: number;
  origem?: string;
}

interface Designacao {
  id: string;
  tipoAtuacao: string;
  numeroAtoDesignacao?: string | null;
  idSeiAtoDesignacao: string;
  campusSetor: string | null;
  ativo?: boolean;
  createdAt: string;
  user: {
    id: string;
    nome: string;
    email: string;
    matricula: string | null;
    role: string;
    unidadeSigla?: string | null;
    unidadeNome?: string | null;
    campus?: string | null;
    deveTrocarSenha: boolean;
  };
  contrato: {
    id: string;
    numeroContrato: string | null;
    numeroEmpenho: string | null;
    objeto: string;
    processoSeiMae: string;
    itens?: Array<{ id: string; cidade?: string; descricao: string }>;
  };
}

export default function FiscaisPage() {
  const [designacoes, setDesignacoes] = useState<Designacao[]>([]);
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [unidades, setUnidades] = useState<UnidadeUern[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [designacaoMode, setDesignacaoMode] = useState<'EXISTENTE' | 'NOVO'>('EXISTENTE');
  const [selectedServidorId, setSelectedServidorId] = useState<string>('');
  const [filtroServidor, setFiltroServidor] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showUploadDesignacaoModal, setShowUploadDesignacaoModal] = useState(false);
  const [showGerarAtoModal, setShowGerarAtoModal] = useState(false);
  const [selectedContratoAtoId, setSelectedContratoAtoId] = useState<string | undefined>(undefined);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Estados de Edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDesignacaoId, setEditingDesignacaoId] = useState<string | null>(null);
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    nomeCompleto: '',
    matricula: '',
    tipoAtuacao: 'FISCAL_ADMINISTRATIVO',
    numeroAtoDesignacao: '',
    idSeiAtoDesignacao: '',
    campusSetor: '',
    unidadeSigla: '',
    campus: '',
    ativo: true,
    atualizarAtoColetivo: true,
  });

  const [form, setForm] = useState({
    contratoId: '',
    nomeCompleto: '',
    email: '',
    matricula: '',
    unidadeId: '',
    unidadeSigla: '',
    unidadeNome: '',
    campus: '',
    tipoAtuacao: 'FISCAL_ADMINISTRATIVO',
    numeroAtoDesignacao: '',
    idSeiAtoDesignacao: '',
    campusSetor: '',
    atualizarAtoColetivo: true,
  });

  const handleDeleteDesignacao = async (d: Designacao) => {
    const nomeServidor = d.user?.nome || 'servidor';
    const numContrato = d.contrato?.numeroContrato || d.contrato?.processoSeiMae || 'contrato';
    if (!confirm(`Atenção: Deseja realmente excluir a designação de "${nomeServidor}" como ${d.tipoAtuacao.replace(/_/g, ' ')} no Contrato/Processo "${numContrato}"? Esta ação removerá o vínculo formal.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/fiscais?id=${d.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao excluir designação.');
      alert(data.message || 'Designação excluída com sucesso!');
      carregarDados();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir designação.');
    }
  };

  const handleOpenEdit = (d: Designacao) => {
    setEditingDesignacaoId(d.id);
    setEditForm({
      nomeCompleto: d.user.nome || '',
      matricula: d.user.matricula || '',
      tipoAtuacao: d.tipoAtuacao || 'FISCAL_ADMINISTRATIVO',
      numeroAtoDesignacao: d.numeroAtoDesignacao || '',
      idSeiAtoDesignacao: d.idSeiAtoDesignacao || '',
      campusSetor: d.campusSetor || d.user.campus || '',
      unidadeSigla: d.user.unidadeSigla || '',
      campus: d.user.campus || '',
      ativo: d.ativo !== false,
      atualizarAtoColetivo: true,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDesignacaoId) return;
    setSalvandoEdit(true);
    try {
      const res = await fetch('/api/fiscais', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingDesignacaoId,
          ...editForm,
        }),
      });

      if (res.ok) {
        setShowEditModal(false);
        setEditingDesignacaoId(null);
        carregarDados();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao editar designação');
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao conectar ao servidor');
    } finally {
      setSalvandoEdit(false);
    }
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resUser, resFiscais, resContratos] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/fiscais'),
        fetch('/api/contratos'),
      ]);
      const dataUser = await resUser.json();
      if (dataUser.user) setCurrentUser(dataUser.user);

      const dataF = await resFiscais.json();
      const dataC = await resContratos.json();

      if (dataF.designacoes) setDesignacoes(dataF.designacoes);
      if (dataF.unidades) setUnidades(dataF.unidades);

      if (dataF.servidores) {
        setServidores(dataF.servidores);
      } else if (dataF.designacoes) {
        const mapa = new Map<string, Servidor>();
        dataF.designacoes.forEach((d: Designacao) => {
          if (d.user?.id && !mapa.has(d.user.id)) {
            mapa.set(d.user.id, {
              id: d.user.id,
              nome: d.user.nome,
              email: d.user.email,
              matricula: d.user.matricula,
              role: d.user.role,
              unidadeSigla: d.user.unidadeSigla,
              unidadeNome: d.user.unidadeNome,
              campus: d.user.campus,
              totalDesignacoes: 1,
            });
          }
        });
        setServidores(Array.from(mapa.values()));
      }

      if (dataC.contratos) setContratos(dataC.contratos);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleContratoChange = (contratoId: string) => {
    const contratoSel = contratos.find((c) => c.id === contratoId);
    // Busca ato coletivo prévio no contrato para auto-preencher o ID SEI da comissão
    const atoExistente =
      designacoes.find((d) => d.contrato?.id === contratoId && d.idSeiAtoDesignacao) ||
      contratoSel?.responsaveis?.find((r: any) => r.idSeiAtoDesignacao);

    setForm((prev) => ({
      ...prev,
      contratoId,
      idSeiAtoDesignacao: atoExistente?.idSeiAtoDesignacao || prev.idSeiAtoDesignacao || '',
      numeroAtoDesignacao:
        atoExistente?.numeroAtoDesignacao ||
        contratoSel?.portariaDesignacaoGestor ||
        prev.numeroAtoDesignacao ||
        '',
    }));
  };

  const handleOpenModalGeral = () => {
    setDesignacaoMode(servidores.length > 0 ? 'EXISTENTE' : 'NOVO');
    setSelectedServidorId('');
    setFiltroServidor('');
    setForm({
      contratoId: '',
      nomeCompleto: '',
      email: '',
      matricula: '',
      unidadeId: '',
      unidadeSigla: '',
      unidadeNome: '',
      campus: '',
      tipoAtuacao: 'FISCAL_ADMINISTRATIVO',
      numeroAtoDesignacao: '',
      idSeiAtoDesignacao: '',
      campusSetor: '',
      atualizarAtoColetivo: true,
    });
    setError(null);
    setShowModal(true);
  };

  const handleOpenDesignarParaServidor = (servidor: Servidor) => {
    setSelectedServidorId(servidor.id);
    setDesignacaoMode('EXISTENTE');
    setFiltroServidor('');
    setForm({
      contratoId: '',
      nomeCompleto: servidor.nome,
      email: servidor.email,
      matricula: servidor.matricula || '',
      unidadeId: servidor.unidadeId || '',
      unidadeSigla: servidor.unidadeSigla || '',
      unidadeNome: servidor.unidadeNome || '',
      campus: servidor.campus || '',
      tipoAtuacao: 'FISCAL_ADMINISTRATIVO',
      numeroAtoDesignacao: '',
      idSeiAtoDesignacao: '',
      campusSetor: '',
      atualizarAtoColetivo: true,
    });
    setError(null);
    setShowModal(true);
  };

  const handleDesignar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (designacaoMode === 'EXISTENTE' && !selectedServidorId) {
      setError('Por favor, selecione um servidor cadastrado para vincular ao contrato.');
      return;
    }

    setSubmitting(true);

    try {
      const payload: any = {
        contratoId: form.contratoId,
        tipoAtuacao: form.tipoAtuacao,
        numeroAtoDesignacao: form.numeroAtoDesignacao || null,
        idSeiAtoDesignacao: form.idSeiAtoDesignacao,
        campusSetor: form.campusSetor,
        atualizarAtoColetivo: form.atualizarAtoColetivo,
      };

      if (designacaoMode === 'EXISTENTE') {
        payload.userId = selectedServidorId;
        const s = servidores.find((ser) => ser.id === selectedServidorId);
        if (s) {
          payload.nomeCompleto = s.nome;
          payload.email = s.email;
          payload.matricula = s.matricula;
          payload.unidadeId = s.unidadeId;
          payload.unidadeSigla = s.unidadeSigla;
          payload.unidadeNome = s.unidadeNome;
          payload.campus = s.campus;
        }
      } else {
        payload.nomeCompleto = form.nomeCompleto;
        payload.email = form.email;
        payload.matricula = form.matricula;
        payload.unidadeId = form.unidadeId;
        payload.unidadeSigla = form.unidadeSigla;
        payload.unidadeNome = form.unidadeNome;
        payload.campus = form.campus;
      }

      const res = await fetch('/api/fiscais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao designar fiscal.');

      setShowModal(false);
      setSelectedServidorId('');
      setForm({
        contratoId: '',
        nomeCompleto: '',
        email: '',
        matricula: '',
        unidadeId: '',
        unidadeSigla: '',
        unidadeNome: '',
        campus: '',
        tipoAtuacao: 'FISCAL_ADMINISTRATIVO',
        numeroAtoDesignacao: '',
        idSeiAtoDesignacao: '',
        campusSetor: '',
        atualizarAtoColetivo: true,
      });
      carregarDados();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const res = await fetch('/api/fiscais/importar-lote', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setImportResult(data);
      if (data.success) {
        carregarDados();
      }
    } catch (err: any) {
      setImportResult({ error: 'Erro ao processar planilha: ' + err.message });
    } finally {
      setImporting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'GESTOR':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Gestor do Contrato</span>;
      case 'SUPLENTE':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">Suplente de Gestor</span>;
      case 'FISCAL_ADMINISTRATIVO':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Fiscal Administrativo</span>;
      case 'FISCAL_TECNICO':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Fiscal Técnico</span>;
      case 'FISCAL_SETORIAL':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Fiscal Setorial</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{role}</span>;
    }
  };

  const filtered = designacoes.filter(
    (d) =>
      d.user.nome.toLowerCase().includes(search.toLowerCase()) ||
      d.user.email.toLowerCase().includes(search.toLowerCase()) ||
      d.contrato.objeto.toLowerCase().includes(search.toLowerCase()) ||
      d.contrato.processoSeiMae.includes(search)
  );

  const filteredServidores = servidores.filter((s) => {
    if (!filtroServidor) return true;
    const q = filtroServidor.toLowerCase();
    return (
      s.nome.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.matricula && s.matricula.toLowerCase().includes(q))
    );
  });

  const selectedServidor = servidores.find((s) => s.id === selectedServidorId);

  if (currentUser && !currentUser.isAdmin) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-2xl mx-auto my-12 shadow-sm space-y-4">
        <div className="w-16 h-16 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center mx-auto border border-blue-100">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Módulo Restrito à PROAD</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Conforme o Art. 4º da <strong>Instrução Normativa nº 01/2026-PROAD</strong>, a designação e substituição formal de Gestores, Suplentes e Fiscais de Contratos é competência privativa da autoridade competente da Pró-Reitoria de Administração.
        </p>
        <p className="text-xs text-slate-500">
          Como Gestor ou Fiscal de Contrato, consulte seus contratos designados no módulo de <strong>Contratos Vinculados</strong>.
        </p>
        <div className="pt-4">
          <Link
            href="/contratos"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow transition-colors"
          >
            <span>Voltar aos Contratos Vinculados</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg md:text-xl">
            <Users className="w-6 h-6 text-blue-700" />
            <h2>Equipes de Gestão e Fiscalização de Contratos</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Módulo 3 - Designação de Gestores, Suplentes e Fiscais conforme Art. 4º da IN nº 01/2026 - PROAD/UERN.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {currentUser?.isAdmin && (
            <>
              <a
                href="/api/modelos-planilhas/fiscais"
                download="Modelo_Importacao_Fiscais_UERN.xlsx"
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Baixar Modelo (.xlsx)</span>
              </a>

              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 transition-colors cursor-pointer"
              >
                <UploadCloud className="w-4 h-4 text-emerald-600" />
                <span>Importar Fiscais em Lote</span>
              </button>

              <button
                onClick={() => setShowUploadDesignacaoModal(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-semibold rounded-xl border border-indigo-200 transition-colors cursor-pointer shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Upload Inteligente (Ato PDF)</span>
              </button>

              <button
                onClick={() => {
                  setSelectedContratoAtoId(undefined);
                  setShowGerarAtoModal(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold rounded-xl border border-blue-200 transition-colors cursor-pointer shadow-sm"
                title="Emitir Ato de Designação nos padrões da PROAD e do SEI (.docx / .pdf)"
              >
                <FileText className="w-4 h-4 text-blue-700" />
                <span>Gerar Ato de Designação (SEI)</span>
              </button>

              <button
                onClick={handleOpenModalGeral}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Designar Gestor / Fiscal</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Security and RBAC Notice */}
      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start space-x-3 text-xs text-blue-900">
        <Key className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Política de Acesso e Segregação de Funções:</span> Cada servidor designado recebe credencial institucional com senha padrão <span className="font-mono font-bold">123</span> e obrigatoriedade de alteração no primeiro login. O fiscal acessa exclusivamente as medições e documentos dos contratos sob sua responsabilidade, enquanto o Gestor possui visão ampla e poder de auditoria.
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por nome do fiscal, e-mail, processo SEI ou contrato..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none shadow-sm"
        />
      </div>

      {/* Designations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Servidor Designado</th>
                <th className="py-3.5 px-4">Função no Contrato</th>
                <th className="py-3.5 px-4">Contrato Vinculado</th>
                <th className="py-3.5 px-4">Ato de Designação & ID SEI</th>
                <th className="py-3.5 px-4">Campus / Setor</th>
                <th className="py-3.5 px-4 text-center">Status de Acesso</th>
                <th className="py-3.5 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Carregando equipe de fiscalização...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Nenhuma designação encontrada.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{d.user.nome}</div>
                      <div className="text-[11px] text-slate-500">{d.user.email}</div>
                      {d.user.matricula && (
                        <div className="text-[10px] text-slate-400">Matrícula: {d.user.matricula}</div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {getRoleBadge(d.tipoAtuacao)}
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800 truncate">
                        {d.contrato.numeroContrato ? `Contrato nº ${d.contrato.numeroContrato}` : `Empenho: ${d.contrato.numeroEmpenho}`}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1" title={d.contrato.objeto}>
                        {d.contrato.objeto}
                      </div>
                      <div className="text-[10px] text-blue-600 font-mono">
                        SEI: {d.contrato.processoSeiMae}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {d.numeroAtoDesignacao || 'Ato Coletivo SEI'}
                      </div>
                      <div className="text-[10px] text-blue-700 font-mono font-medium flex items-center gap-1 mt-0.5">
                        <FileCheck className="w-3 h-3 text-blue-600 shrink-0" />
                        <span>ID SEI: {d.idSeiAtoDesignacao}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {d.tipoAtuacao === 'FISCAL_SETORIAL' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                          {normalizarCidadeCampus(d.campusSetor) || 'Campus Setorial'}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600 font-medium">
                          Global {d.user.campus ? `(${d.user.campus})` : ''}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {d.user.deveTrocarSenha ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Senha Provisória (123)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Conta Ativa
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {currentUser?.isAdmin && (
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedContratoAtoId(d.contrato.id);
                              setShowGerarAtoModal(true);
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                            title="Gerar Ato de Designação Oficial (.docx / .pdf) deste contrato"
                          >
                            <FileText className="w-3 h-3 text-indigo-600" />
                            <span>Ato SEI</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDesignarParaServidor(d.user)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                            title="Atribuir este servidor a um novo contrato"
                          >
                            <PlusCircle className="w-3 h-3 text-blue-600" />
                            <span>+ Contrato</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(d)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                            title="Editar Fiscal/Gestor"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteDesignacao(d)}
                            className="inline-flex items-center space-x-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                            title="Excluir Designação (Admin)"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Excluir</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Designação Dinâmica */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-800 text-base mb-1">Designar Gestor ou Fiscal de Contrato</h3>
            <p className="text-xs text-slate-500 mb-4">
              Vincule um servidor formalmente designado ao contrato, emitindo suas credenciais no sistema.
            </p>

            {/* Alternador de Modo: Servidor Já Cadastrado vs Novo Servidor */}
            <div className="flex border-b border-slate-200 mb-4">
              <button
                type="button"
                onClick={() => {
                  setDesignacaoMode('EXISTENTE');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  designacaoMode === 'EXISTENTE'
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Servidor Já Cadastrado</span>
                {servidores.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full font-mono font-bold">
                    {servidores.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setDesignacaoMode('NOVO');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  designacaoMode === 'NOVO'
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 text-slate-600" />
                <span>Novo Servidor</span>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleDesignar} className="space-y-4">
              {/* MODO 1: SERVIDOR JÁ CADASTRADO */}
              {designacaoMode === 'EXISTENTE' ? (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Selecionar Servidor Já Cadastrado *
                    </label>
                    <span className="text-[10px] text-slate-500">
                      {filteredServidores.length} de {servidores.length} disponíveis
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filtrar por nome, e-mail ou matrícula..."
                      value={filtroServidor}
                      onChange={(e) => setFiltroServidor(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 shadow-sm"
                    />
                  </div>

                  <select
                    required={designacaoMode === 'EXISTENTE'}
                    value={selectedServidorId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedServidorId(id);
                      const s = servidores.find((x) => x.id === id);
                      if (s) {
                        setForm((prev) => ({
                          ...prev,
                          nomeCompleto: s.nome,
                          email: s.email,
                          matricula: s.matricula || '',
                          unidadeId: s.unidadeId || '',
                          unidadeSigla: s.unidadeSigla || '',
                          unidadeNome: s.unidadeNome || '',
                          campus: s.campus || '',
                          campusSetor: prev.tipoAtuacao === 'FISCAL_SETORIAL' ? (s.campus || prev.campusSetor) : prev.campusSetor,
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-600 bg-white font-medium text-slate-800"
                  >
                    <option value="">-- Escolha o servidor para vincular ao contrato --</option>
                    {filteredServidores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome} ({s.email}) {s.matricula ? `• Matr: ${s.matricula}` : ''} {s.unidadeSigla ? `[${s.unidadeSigla} • ${s.campus || 'Mossoró'}]` : ''} [{s.totalDesignacoes || 0} contratos]
                      </option>
                    ))}
                  </select>

                  {selectedServidor && (
                    <div className="mt-2 p-2.5 bg-blue-50/80 border border-blue-200 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                          <UserCheck className="w-4 h-4 text-blue-700 flex-shrink-0" />
                          <span>{selectedServidor.nome}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          {selectedServidor.email} {selectedServidor.matricula && `• Matrícula: ${selectedServidor.matricula}`}
                        </div>
                        <div className="text-[11px] font-semibold text-blue-900 mt-0.5 flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-blue-600" />
                          <span>Lotação: {selectedServidor.unidadeSigla ? `${selectedServidor.unidadeSigla} — ` : ''}{selectedServidor.unidadeNome || 'UERN'} • Cidade/Campus: <strong>{selectedServidor.campus || 'Mossoró'}</strong></span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                        {selectedServidor.totalDesignacoes || 0} contrato(s) ativo(s)
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* MODO 2: NOVO SERVIDOR */
                <div className="p-3.5 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-3">
                  <div className="text-[11px] text-amber-800 flex items-center space-x-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                    <span>Cadastre os dados pessoais do novo servidor. Credenciais provisórias serão geradas (senha <strong>123</strong>).</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo do Servidor *</label>
                    <input
                      type="text"
                      required={designacaoMode === 'NOVO'}
                      value={form.nomeCompleto}
                      onChange={(e) => setForm({ ...form, nomeCompleto: e.target.value })}
                      placeholder="Nome completo do servidor"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail Institucional *</label>
                      <input
                        type="email"
                        required={designacaoMode === 'NOVO'}
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="servidor@uern.br"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Matrícula</label>
                      <input
                        type="text"
                        value={form.matricula}
                        onChange={(e) => setForm({ ...form, matricula: e.target.value })}
                        placeholder="Ex: 08155-8"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Unidade Oficial de Lotação na UERN (Portal PROAD) *
                    </label>
                    <select
                      required={designacaoMode === 'NOVO'}
                      value={form.unidadeSigla}
                      onChange={(e) => {
                        const siglaSel = e.target.value;
                        const un = unidades.find((u) => u.sigla === siglaSel);
                        setForm((prev) => ({
                          ...prev,
                          unidadeId: un?.id || '',
                          unidadeSigla: siglaSel,
                          unidadeNome: un?.nome || '',
                          campus: un?.campus || '',
                          campusSetor: prev.tipoAtuacao === 'FISCAL_SETORIAL' ? (un?.campus || prev.campusSetor) : prev.campusSetor,
                        }));
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white font-medium"
                    >
                      <option value="">Selecione a Unidade Oficial da UERN...</option>
                      {unidades.map((u) => (
                        <option key={u.id || u.sigla} value={u.sigla}>
                          {u.sigla} — {u.nome} ({u.campus})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* DADOS DA DESIGNAÇÃO E DO CONTRATO */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contrato a Vincular *</label>
                <select
                  required
                  value={form.contratoId}
                  onChange={(e) => handleContratoChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                >
                  <option value="">Selecione o contrato...</option>
                  {contratos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.numeroContrato ? `Contrato nº ${c.numeroContrato}` : `Empenho: ${c.numeroEmpenho}`} - {c.objeto.slice(0, 45)}...
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Papel / Função de Atuação *</label>
                <select
                  required
                  value={form.tipoAtuacao}
                  onChange={(e) => {
                    const novoTipo = e.target.value;
                    const cidadeSugerida = form.campus || selectedServidor?.campus || '';
                    setForm({
                      ...form,
                      tipoAtuacao: novoTipo,
                      campusSetor: novoTipo === 'FISCAL_SETORIAL' ? (form.campusSetor || cidadeSugerida) : form.campusSetor,
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white font-semibold text-blue-900"
                >
                  <option value="GESTOR">Gestor do Contrato (Servidor Efetivo FUERN)</option>
                  <option value="SUPLENTE">Suplente de Gestor</option>
                  <option value="FISCAL_ADMINISTRATIVO">Fiscal Administrativo (OS, Folha, CNDs, Saldo)</option>
                  <option value="FISCAL_TECNICO">Fiscal Técnico (Medição física, IMR, Recebimento Provisório)</option>
                  <option value="FISCAL_SETORIAL">Fiscal Setorial (Campi fora da sede / unidades)</option>
                </select>
              </div>

              {/* ATO COLETIVO E ID SEI */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-blue-700" />
                    Ato de Designação Coletivo (SEI)
                  </span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                    Ato Coletivo da Equipe
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      ID SEI do Ato de Designação *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.idSeiAtoDesignacao}
                      onChange={(e) => setForm({ ...form, idSeiAtoDesignacao: e.target.value })}
                      placeholder="Ex: 39959658"
                      className="w-full px-3 py-2 border border-blue-300 rounded-xl text-xs outline-none focus:border-blue-600 font-mono font-semibold bg-white"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Identificador único do documento/ato coletivo no SEI (Obrigatório).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Número do Ato / Portaria <span className="text-slate-400 font-normal">(Opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={form.numeroAtoDesignacao}
                      onChange={(e) => setForm({ ...form, numeroAtoDesignacao: e.target.value })}
                      placeholder="Ex: Portaria nº 3653/2026-GP"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Opcional. Se não informado, o sistema utilizará o ID SEI.
                    </p>
                  </div>
                </div>

                {/* Sincronização em Lote */}
                <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-lg flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="atualizarAtoColetivoModal"
                    checked={form.atualizarAtoColetivo}
                    onChange={(e) => setForm({ ...form, atualizarAtoColetivo: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer mt-0.5"
                  />
                  <label htmlFor="atualizarAtoColetivoModal" className="text-[11px] text-blue-900 cursor-pointer leading-tight">
                    <strong>Ato Coletivo: Sincronizar em lote este ID SEI com todos os servidores deste contrato.</strong>
                    <span className="block text-[10px] text-blue-700 mt-0.5">
                      Como a designação é coletiva, as designações de toda a comissão (Gestor, Suplente e Fiscais) deste contrato receberão este mesmo ID SEI.
                    </span>
                  </label>
                </div>
              </div>

              {/* VINCULAÇÃO DE CIDADE / CAMPUS */}
              {form.tipoAtuacao === 'FISCAL_SETORIAL' ? (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-indigo-950">
                      Cidade / Campus de Atuação do Fiscal Setorial *
                    </label>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full">
                      Escopo Local Restrito
                    </span>
                  </div>

                  <select
                    required
                    value={form.campusSetor}
                    onChange={(e) => setForm({ ...form, campusSetor: e.target.value })}
                    className="w-full px-3 py-2 border border-indigo-300 rounded-xl text-xs outline-none focus:border-indigo-600 bg-white font-semibold text-slate-800"
                  >
                    <option value="">Selecione o campus/cidade de atuação...</option>
                    {CIDADES_UERN.map((cid) => {
                      const contratoSel = contratos.find((c) => c.id === form.contratoId);
                      const cidadesContrato = contratoSel?.itens
                        ? Array.from(new Set(contratoSel.itens.map((i: any) => normalizarCidadeCampus(i.cidade)).filter(Boolean)))
                        : [];
                      const temNoContrato = cidadesContrato.includes(cid);
                      return (
                        <option key={cid} value={cid}>
                          {cid} {temNoContrato ? '✓ (Contemplada no Contrato)' : ''}
                        </option>
                      );
                    })}
                  </select>

                  {/* Validação de compatibilidade com o contrato */}
                  {(() => {
                    const contratoSel = contratos.find((c) => c.id === form.contratoId);
                    const cidadesContrato = contratoSel?.itens
                      ? Array.from(new Set(contratoSel.itens.map((i: any) => normalizarCidadeCampus(i.cidade)).filter(Boolean)))
                      : [];
                    if (!form.contratoId || !form.campusSetor || cidadesContrato.length === 0) return null;

                    const cidadeNormalizada = normalizarCidadeCampus(form.campusSetor);
                    const compativel = cidadesContrato.includes(cidadeNormalizada);

                    if (compativel) {
                      return (
                        <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span><strong>Compatível com o Contrato:</strong> Este contrato possui itens/postos em <strong>{form.campusSetor}</strong>. O fiscal responderá exclusivamente pelos postos e serviços locais desta cidade.</span>
                        </div>
                      );
                    } else {
                      return (
                        <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-300 rounded-lg p-2 flex items-start gap-1.5 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span><strong>Atenção à vinculação:</strong> O fiscal está selecionado para <strong>{form.campusSetor}</strong>, mas os postos deste contrato estão previstos para: <strong>{cidadesContrato.join(', ')}</strong>.</span>
                        </div>
                      );
                    }
                  })()}
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
                    <span><strong>Atuação Global Corporativa:</strong> Este papel fiscaliza e atesta a execução de todos os campi e cidades do contrato.</span>
                  </div>
                  {form.campus && (
                    <span className="text-[10px] text-slate-500 font-medium">Lotação: {form.campus}</span>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#003366] text-white text-xs font-semibold rounded-lg hover:bg-[#002244] disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {submitting ? 'Salvando...' : 'Confirmar Designação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO EM LOTE DE FISCAIS */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Importar Gestores e Fiscais em Lote
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Associe servidores a contratos automaticamente via Excel (.xlsx)
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 space-y-1">
              <p className="font-semibold">Como funciona a importação:</p>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                A planilha deve conter o número do contrato ou processo SEI, papel (GESTOR, SUPLENTE, FISCAL_ADMINISTRATIVO, etc.), dados do servidor e o número do ato/portaria. Servidores não cadastrados recebem conta automática com senha padrão 123.
              </p>
              <div className="pt-1">
                <a
                  href="/api/modelos-planilhas/fiscais"
                  download="Modelo_Importacao_Fiscais_UERN.xlsx"
                  className="inline-flex items-center space-x-1 text-xs font-bold text-blue-800 hover:text-blue-900 underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Modelo Oficial de Designações (.xlsx)</span>
                </a>
              </div>
            </div>

            {importResult && (
              <div
                className={`p-3 rounded-xl text-xs ${
                  importResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {importResult.success ? (
                  <div>
                    <p className="font-bold">{importResult.mensagem || 'Importação realizada com sucesso!'}</p>
                    {importResult.erros && importResult.erros.length > 0 && (
                      <div className="mt-1.5 space-y-0.5 text-[11px] text-amber-800">
                        <p className="font-semibold">Avisos:</p>
                        {importResult.erros.map((e: string, i: number) => (
                          <p key={i}>• {e}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p>{importResult.error || 'Erro ao processar planilha.'}</p>
                )}
              </div>
            )}

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50/50 cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="fiscais-file-upload"
                />
                <label htmlFor="fiscais-file-upload" className="cursor-pointer block">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <span className="text-xs font-semibold text-slate-700 block">
                    {importFile ? importFile.name : 'Clique para selecionar a planilha de fiscais'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Formatos suportados: .xlsx, .xls, .csv
                  </span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportResult(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={!importFile || importing}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {importing ? 'Importando Designações...' : 'Processar Planilha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR FISCAL / GESTOR */}
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
                    Editar Fiscal / Gestor
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ajuste os dados cadastrais, função e ato de designação
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingDesignacaoId(null);
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
                    Nome Completo do Servidor
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.nomeCompleto}
                    onChange={(e) => setEditForm({ ...editForm, nomeCompleto: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Matrícula UERN
                  </label>
                  <input
                    type="text"
                    value={editForm.matricula}
                    onChange={(e) => setEditForm({ ...editForm, matricula: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                    placeholder="Ex: 12345-6"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Função no Contrato
                  </label>
                  <select
                    value={editForm.tipoAtuacao}
                    onChange={(e) => setEditForm({ ...editForm, tipoAtuacao: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 font-semibold"
                  >
                    <option value="GESTOR">Gestor do Contrato</option>
                    <option value="SUPLENTE">Gestor Suplente</option>
                    <option value="FISCAL_ADMINISTRATIVO">Fiscal Administrativo</option>
                    <option value="FISCAL_TECNICO">Fiscal Técnico</option>
                    <option value="FISCAL_SETORIAL">Fiscal Setorial</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    {editForm.tipoAtuacao === 'FISCAL_SETORIAL' ? 'Cidade do Fiscal Setorial *' : 'Campus / Lotação'}
                  </label>
                  {editForm.tipoAtuacao === 'FISCAL_SETORIAL' ? (
                    <select
                      value={editForm.campusSetor}
                      onChange={(e) => setEditForm({ ...editForm, campusSetor: e.target.value })}
                      className="w-full px-3 py-1.5 border border-indigo-300 rounded-lg text-xs outline-none focus:border-indigo-600 font-semibold text-slate-800 bg-white"
                    >
                      <option value="">Selecione a Cidade...</option>
                      {CIDADES_UERN.map((cid) => (
                        <option key={cid} value={cid}>
                          {cid}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={editForm.campusSetor}
                      onChange={(e) => setEditForm({ ...editForm, campusSetor: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                      placeholder="Ex: Global / Sede (Mossoró)"
                    />
                  )}
                </div>
              </div>

              {/* ATO COLETIVO E ID SEI NA EDIÇÃO */}
              <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-amber-700" />
                    Ato de Designação Coletivo (SEI)
                  </span>
                  <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                    Ato Coletivo
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-800 block mb-1">
                      ID SEI do Ato de Designação *
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.idSeiAtoDesignacao}
                      onChange={(e) => setEditForm({ ...editForm, idSeiAtoDesignacao: e.target.value })}
                      className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-xs outline-none focus:border-amber-600 font-mono font-semibold bg-white"
                      placeholder="Ex: 39959658"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Identificador oficial do ato coletivo no SEI (Obrigatório).
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-700 block mb-1">
                      Número do Ato / Portaria <span className="text-slate-400 font-normal">(Opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.numeroAtoDesignacao}
                      onChange={(e) => setEditForm({ ...editForm, numeroAtoDesignacao: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 bg-white"
                      placeholder="Ex: Portaria nº 123/2026-GR (Opcional)"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Opcional quando informado o ID SEI.
                    </p>
                  </div>
                </div>

                {/* Sincronização em Lote */}
                <div className="p-2.5 bg-amber-100/60 border border-amber-300/80 rounded-lg flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="atualizarAtoColetivoEditModal"
                    checked={editForm.atualizarAtoColetivo}
                    onChange={(e) => setEditForm({ ...editForm, atualizarAtoColetivo: e.target.checked })}
                    className="w-4 h-4 text-amber-700 rounded border-slate-300 focus:ring-amber-500 cursor-pointer mt-0.5"
                  />
                  <label htmlFor="atualizarAtoColetivoEditModal" className="text-[11px] text-amber-950 cursor-pointer leading-tight">
                    <strong>Propagação Coletiva: Sincronizar este ID SEI para toda a equipe deste contrato.</strong>
                    <span className="block text-[10px] text-amber-800 mt-0.5">
                      Como o ato de designação é coletivo, ao salvar, o novo ID SEI será replicado em lote para o Gestor, Suplente e todos os Fiscais deste contrato.
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Status da Designação
                </label>
                <select
                  value={editForm.ativo ? 'true' : 'false'}
                  onChange={(e) => setEditForm({ ...editForm, ativo: e.target.value === 'true' })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo / Revogado</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingDesignacaoId(null);
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

      {showUploadDesignacaoModal && (
        <UploadInteligenteDesignacaoModal
          isOpen={showUploadDesignacaoModal}
          onClose={() => setShowUploadDesignacaoModal(false)}
          onSuccess={carregarDados}
        />
      )}

      {showGerarAtoModal && (
        <GerarAtoDesignacaoModal
          isOpen={showGerarAtoModal}
          onClose={() => setShowGerarAtoModal(false)}
          contratos={contratos}
          initialContratoId={selectedContratoAtoId}
        />
      )}
    </div>
  );
}
