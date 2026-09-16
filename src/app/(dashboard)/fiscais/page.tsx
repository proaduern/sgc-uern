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
  Edit3
} from 'lucide-react';

interface Designacao {
  id: string;
  tipoAtuacao: string;
  numeroAtoDesignacao: string;
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
    deveTrocarSenha: boolean;
  };
  contrato: {
    id: string;
    numeroContrato: string | null;
    numeroEmpenho: string | null;
    objeto: string;
    processoSeiMae: string;
  };
}

export default function FiscaisPage() {
  const [designacoes, setDesignacoes] = useState<Designacao[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
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
    ativo: true,
  });

  const [form, setForm] = useState({
    contratoId: '',
    nomeCompleto: '',
    email: '',
    matricula: '',
    tipoAtuacao: 'FISCAL_ADMINISTRATIVO',
    numeroAtoDesignacao: '',
    idSeiAtoDesignacao: '',
    campusSetor: '',
  });

  const handleOpenEdit = (d: Designacao) => {
    setEditingDesignacaoId(d.id);
    setEditForm({
      nomeCompleto: d.user.nome || '',
      matricula: d.user.matricula || '',
      tipoAtuacao: d.tipoAtuacao || 'FISCAL_ADMINISTRATIVO',
      numeroAtoDesignacao: d.numeroAtoDesignacao || '',
      idSeiAtoDesignacao: d.idSeiAtoDesignacao || '',
      campusSetor: d.campusSetor || '',
      ativo: d.ativo !== false,
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

  const handleDesignar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/fiscais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao designar fiscal.');

      setShowModal(false);
      setForm({
        contratoId: '',
        nomeCompleto: '',
        email: '',
        matricula: '',
        tipoAtuacao: 'FISCAL_ADMINISTRATIVO',
        numeroAtoDesignacao: '',
        idSeiAtoDesignacao: '',
        campusSetor: '',
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
                onClick={() => setShowModal(true)}
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
                      <div className="font-semibold text-slate-800">{d.numeroAtoDesignacao}</div>
                      <div className="text-[10px] text-slate-500 font-mono">ID SEI: {d.idSeiAtoDesignacao}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-xs text-slate-700">
                        {d.campusSetor || 'Sede (Mossoró)'}
                      </span>
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
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(d)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                          title="Editar Fiscal/Gestor"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Designação */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-800 text-base mb-1">Designar Gestor ou Fiscal de Contrato</h3>
            <p className="text-xs text-slate-500 mb-4">
              Vincule um servidor formalmente designado ao contrato, emitindo suas credenciais no sistema.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleDesignar} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contrato a Vincular *</label>
                <select
                  required
                  value={form.contratoId}
                  onChange={(e) => setForm({ ...form, contratoId: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, tipoAtuacao: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white font-semibold text-blue-900"
                >
                  <option value="GESTOR">Gestor do Contrato (Servidor Efetivo FUERN)</option>
                  <option value="SUPLENTE">Suplente de Gestor</option>
                  <option value="FISCAL_ADMINISTRATIVO">Fiscal Administrativo (OS, Folha, CNDs, Saldo)</option>
                  <option value="FISCAL_TECNICO">Fiscal Técnico (Medição física, IMR, Recebimento Provisório)</option>
                  <option value="FISCAL_SETORIAL">Fiscal Setorial (Campi fora da sede / unidades)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo do Servidor *</label>
                <input
                  type="text"
                  required
                  value={form.nomeCompleto}
                  onChange={(e) => setForm({ ...form, nomeCompleto: e.target.value })}
                  placeholder="Nome completo do servidor"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail Institucional *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="servidor@uern.br"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Matrícula</label>
                  <input
                    type="text"
                    value={form.matricula}
                    onChange={(e) => setForm({ ...form, matricula: e.target.value })}
                    placeholder="Ex: 08155-8"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Número do Ato de Designação *</label>
                  <input
                    type="text"
                    required
                    value={form.numeroAtoDesignacao}
                    onChange={(e) => setForm({ ...form, numeroAtoDesignacao: e.target.value })}
                    placeholder="Ex: Portaria nº 3653/2026-GP"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ID SEI do Ato *</label>
                  <input
                    type="text"
                    required
                    value={form.idSeiAtoDesignacao}
                    onChange={(e) => setForm({ ...form, idSeiAtoDesignacao: e.target.value })}
                    placeholder="Ex: 39959658"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Campus ou Setor (Obrigatório se Fiscal Setorial)</label>
                <input
                  type="text"
                  value={form.campusSetor}
                  onChange={(e) => setForm({ ...form, campusSetor: e.target.value })}
                  placeholder="Ex: Campus Natal, Campus Pau dos Ferros, DTI..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                />
              </div>

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
                  className="px-5 py-2 bg-[#003366] text-white text-xs font-semibold rounded-lg hover:bg-[#002244] disabled:opacity-50 cursor-pointer"
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
                    Campus / Setor
                  </label>
                  <input
                    type="text"
                    value={editForm.campusSetor}
                    onChange={(e) => setEditForm({ ...editForm, campusSetor: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                    placeholder="Ex: Campus Central - DINFRA"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Ato de Designação (Portaria/Ato)
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.numeroAtoDesignacao}
                    onChange={(e) => setEditForm({ ...editForm, numeroAtoDesignacao: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                    placeholder="Ex: Portaria nº 123/2026-GR"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    ID SEI do Ato
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.idSeiAtoDesignacao}
                    onChange={(e) => setEditForm({ ...editForm, idSeiAtoDesignacao: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 font-mono"
                    placeholder="Ex: 04410024.000987/2026-55"
                  />
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
    </div>
  );
}
