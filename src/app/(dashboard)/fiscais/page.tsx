'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Search,
  Building,
  Key,
  FileCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Designacao {
  id: string;
  tipoAtuacao: string;
  numeroAtoDesignacao: string;
  idSeiAtoDesignacao: string;
  campusSetor: string | null;
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resFiscais, resContratos] = await Promise.all([
        fetch('/api/fiscais'),
        fetch('/api/contratos'),
      ]);
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

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Designar Gestor / Fiscal</span>
        </button>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Carregando equipe de fiscalização...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
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
    </div>
  );
}
