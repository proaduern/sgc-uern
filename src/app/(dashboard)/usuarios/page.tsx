'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Search,
  Key,
  CheckCircle2,
  AlertCircle,
  Mail,
  User
} from 'lucide-react';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: '',
    email: '',
    matricula: '',
    role: 'ADMIN_PARCIAL',
  });

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/usuarios');
      const data = await res.json();
      if (data.usuarios) setUsuarios(data.usuarios);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao cadastrar usuário.');

      setShowModal(false);
      setForm({ nome: '', email: '', matricula: '', role: 'ADMIN_PARCIAL' });
      carregarUsuarios();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg md:text-xl">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <h2>Gestão de Administradores & Usuários</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Controle de acessos, cadastramento de administradores parciais/totais e liberação de perfis.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Administrador / Usuário</span>
        </button>
      </div>

      {/* Security Note */}
      <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 text-xs text-slate-700 flex items-start space-x-3">
        <Key className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Política de Credenciais Iniciais:</span> Todo novo usuário é criado com a senha provisória padrão <span className="font-mono font-bold">123</span> e bloqueio obrigatório para alteração de senha no primeiro login.
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Nome</th>
                <th className="py-3.5 px-4">E-mail Institucional</th>
                <th className="py-3.5 px-4">Matrícula</th>
                <th className="py-3.5 px-4">Papel / Nível de Acesso</th>
                <th className="py-3.5 px-4 text-center">Status de Acesso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    Carregando usuários...
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">{u.nome}</td>
                    <td className="py-3 px-4 font-mono">{u.email}</td>
                    <td className="py-3 px-4 font-mono">{u.matricula || '-'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-100">
                        {u.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {u.deveTrocarSenha ? (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Troca de Senha Pendente
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Ativo e Homologado
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

      {/* Modal Novo Usuário */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-800 text-base mb-1">Cadastrar Administrador / Usuário</h3>
            <p className="text-xs text-slate-500 mb-4">
              Crie contas institucionais com papel de administrador ou fiscal.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Nome do servidor"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail Institucional *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="exemplo@uern.br"
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Papel / Nível de Acesso *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white font-semibold"
                >
                  <option value="ADMIN_PARCIAL">Administrador Parcial (PROAD)</option>
                  <option value="ADMIN_PROAD">Administrador Geral (PROAD - Total)</option>
                  <option value="GESTOR">Gestor de Contrato</option>
                  <option value="SUPLENTE">Suplente de Gestor</option>
                  <option value="FISCAL_ADMINISTRATIVO">Fiscal Administrativo</option>
                  <option value="FISCAL_TECNICO">Fiscal Técnico</option>
                  <option value="FISCAL_SETORIAL">Fiscal Setorial</option>
                </select>
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
                  className="px-5 py-2 bg-[#003366] text-white text-xs font-semibold rounded-lg hover:bg-[#002244]"
                >
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
