'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  UserPlus,
  Search,
  Key,
  CheckCircle2,
  AlertCircle,
  Mail,
  User,
  ShieldAlert,
  Edit3,
  Trash2,
  X,
  RotateCcw
} from 'lucide-react';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Form Novo Usuário
  const [form, setForm] = useState({
    nome: '',
    email: '',
    matricula: '',
    role: 'ADMIN_PARCIAL',
  });

  // Modal e Form de Edição de Usuário
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    nome: '',
    email: '',
    matricula: '',
    role: 'ADMIN_PARCIAL',
    ativo: true,
    resetPassword: false,
  });

  // Modal de Exclusão de Usuário
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [excluindoUser, setExcluindoUser] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const [resUser, res] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/usuarios'),
      ]);
      const dataUser = await resUser.json();
      if (dataUser.user) setCurrentUser(dataUser.user);

      if (res.ok) {
        const data = await res.json();
        if (data.usuarios) setUsuarios(data.usuarios);
      }
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

  // Funções de Edição
  const handleOpenEdit = (u: any) => {
    setEditingUser(u);
    setEditError(null);
    setEditForm({
      nome: u.nome || '',
      email: u.email || '',
      matricula: u.matricula || '',
      role: u.role || 'ADMIN_PARCIAL',
      ativo: u.ativo !== false,
      resetPassword: false,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSalvandoEdicao(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/usuarios/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao atualizar usuário.');

      setShowEditModal(false);
      setEditingUser(null);
      carregarUsuarios();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  // Funções de Exclusão
  const handleOpenDelete = (u: any) => {
    setDeletingUser(u);
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setExcluindoUser(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/usuarios/${deletingUser.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao excluir usuário.');

      setShowDeleteModal(false);
      setDeletingUser(null);
      carregarUsuarios();
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setExcluindoUser(false);
    }
  };

  if (currentUser && !currentUser.isAdmin) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-2xl mx-auto my-12 shadow-sm space-y-4">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-100">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Módulo Restrito à PROAD</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Conforme a <strong>Instrução Normativa nº 01/2026-PROAD</strong>, a criação, edição e exclusão de usuários e a atribuição de perfis de acesso no sistema é de competência privativa dos Administradores da Pró-Reitoria de Administração.
        </p>
        <p className="text-xs text-slate-500">
          Como Gestor ou Fiscal de Contrato, utilize os módulos operacionais vinculados às suas atribuições formais.
        </p>
        <div className="pt-4">
          <Link
            href="/contratos"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow transition-colors"
          >
            <span>Voltar aos Contratos</span>
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
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <h2>Gestão de Administradores & Usuários</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Controle de acessos, cadastramento, retificação e liberação de perfis institucionais (IN 01/2026-PROAD).
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
          <span className="font-bold">Política de Credenciais Iniciais:</span> Todo novo usuário é criado com a senha provisória padrão <span className="font-mono font-bold">123</span> e bloqueio obrigatório para alteração de senha no primeiro login. O administrador pode redefinir a senha a qualquer momento na opção de edição.
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
                <th className="py-3.5 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Carregando usuários...
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {u.nome}
                      {currentUser?.id === u.id && (
                        <span className="ml-2 text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          (Você)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">{u.email}</td>
                    <td className="py-3 px-4 font-mono">{u.matricula || '-'}</td>
                    <td className="py-3 px-4">
                      {(() => {
                        switch (u.role) {
                          case 'ADMIN_PROAD':
                            return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">Administrador Geral (PROAD)</span>;
                          case 'ADMIN_PARCIAL':
                            return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">Administrador Parcial</span>;
                          case 'GESTOR_ATA':
                            return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">Gestor de Ata (ARP)</span>;
                          case 'GESTOR':
                            return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">Gestor de Contrato</span>;
                          case 'SUPLENTE':
                            return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">Suplente</span>;
                          case 'FISCAL_ADMINISTRATIVO':
                            return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">Fiscal Administrativo</span>;
                          case 'FISCAL_TECNICO':
                            return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">Fiscal Técnico</span>;
                          case 'FISCAL_SETORIAL':
                            return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">Fiscal Setorial</span>;
                          default:
                            return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-800 border border-slate-200">{u.role}</span>;
                        }
                      })()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {u.ativo === false ? (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          Inativo
                        </span>
                      ) : u.deveTrocarSenha ? (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Troca de Senha Pendente
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Ativo e Homologado
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-blue-200"
                          title="Editar Usuário"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        {currentUser?.id !== u.id && (
                          <button
                            onClick={() => handleOpenDelete(u)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-rose-200"
                            title="Excluir Usuário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CADASTRAR NOVO USUÁRIO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-800 text-base mb-1">Cadastrar Administrador / Usuário</h3>
            <p className="text-xs text-slate-500 mb-4">
              Crie contas institucionais com papel de administrador, gestor de ata ou fiscal.
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
                  <option value="GESTOR_ATA">Gestor de Ata de Registro de Preço (ARP)</option>
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
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003366] text-white text-xs font-semibold rounded-lg hover:bg-[#002244] cursor-pointer"
                >
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR USUÁRIO */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Editar Usuário</h3>
                  <p className="text-xs text-slate-500">Retifique dados, perfil ou redefina a senha.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={editForm.nome}
                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail Institucional *</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Matrícula</label>
                <input
                  type="text"
                  value={editForm.matricula}
                  onChange={(e) => setEditForm({ ...editForm, matricula: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Papel / Nível de Acesso *</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white font-semibold"
                >
                  <option value="ADMIN_PARCIAL">Administrador Parcial (PROAD)</option>
                  <option value="ADMIN_PROAD">Administrador Geral (PROAD - Total)</option>
                  <option value="GESTOR_ATA">Gestor de Ata de Registro de Preço (ARP)</option>
                  <option value="GESTOR">Gestor de Contrato</option>
                  <option value="SUPLENTE">Suplente de Gestor</option>
                  <option value="FISCAL_ADMINISTRATIVO">Fiscal Administrativo</option>
                  <option value="FISCAL_TECNICO">Fiscal Técnico</option>
                  <option value="FISCAL_SETORIAL">Fiscal Setorial</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="ativoCheckbox"
                  checked={editForm.ativo}
                  onChange={(e) => setEditForm({ ...editForm, ativo: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="ativoCheckbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Conta de Acesso Ativa
                </label>
              </div>

              {/* Opção de Reset de Senha */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="resetPasswordCheckbox"
                    checked={editForm.resetPassword}
                    onChange={(e) => setEditForm({ ...editForm, resetPassword: e.target.checked })}
                    className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="resetPasswordCheckbox" className="text-xs font-bold text-amber-900 cursor-pointer flex items-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                    Redefinir senha para padrão inicial (123)
                  </label>
                </div>
                {editForm.resetPassword && (
                  <p className="text-[11px] text-amber-800 leading-tight pl-5">
                    A senha do usuário será resetada para <strong>123</strong> e o sistema exigirá a troca imediata no próximo login.
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEdicao}
                  className="px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EXCLUIR USUÁRIO (CONFIRMAÇÃO) */}
      {showDeleteModal && deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-4">
              <div className="p-2 bg-rose-50 text-rose-700 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Excluir Usuário</h3>
                <p className="text-xs text-slate-500">Ação administrativa irreversível.</p>
              </div>
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {deleteError}
              </div>
            )}

            <div className="space-y-3 text-xs text-slate-700">
              <p>
                Tem certeza de que deseja excluir permanentemente o usuário{' '}
                <strong className="text-slate-900">{deletingUser.nome}</strong> ({deletingUser.email})?
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div><strong>Papel:</strong> {deletingUser.role}</div>
                <div><strong>Matrícula:</strong> {deletingUser.matricula || 'Não informada'}</div>
                <div className="text-rose-700 font-semibold pt-1">
                  Aviso: As designações deste usuário em contratos e alertas serão removidas.
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={excluindoUser}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
              >
                {excluindoUser ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
