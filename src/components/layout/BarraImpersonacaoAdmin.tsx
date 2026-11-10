'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Users,
  ChevronDown,
  Building2,
  FileText,
  Wrench,
  PiggyBank,
  Briefcase,
  X,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface BarraImpersonacaoAdminProps {
  sessaoReal?: {
    id: string;
    nome: string;
    email: string;
    role: string;
  } | null;
  sessaoAtual?: {
    id: string;
    nome: string;
    email: string;
    role: string;
    matricula?: string | null;
    empresaNome?: string | null;
  } | null;
}

export default function BarraImpersonacaoAdmin({
  sessaoReal,
  sessaoAtual,
}: BarraImpersonacaoAdminProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [menuAberto, setMenuAberto] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isAdminReal =
    sessaoReal &&
    (sessaoReal.role === 'ADMIN_PROAD' ||
      sessaoReal.role === 'ADMIN_PARCIAL' ||
      sessaoReal.role === 'ADMIN');

  if (!isAdminReal) {
    return null;
  }

  const isImpersonando =
    sessaoAtual &&
    (sessaoAtual.id !== sessaoReal.id ||
      sessaoAtual.role !== sessaoReal.role ||
      sessaoAtual.id.startsWith('sim_'));

  const isUsuarioReal = sessaoAtual && !sessaoAtual.id.startsWith('sim_') && sessaoAtual.id !== sessaoReal?.id;

  const handleTrocarPerfil = async (opcoes: {
    tipo?: 'ARQUETIPO' | 'FORNECEDOR';
    role?: string;
    fornecedorNome?: string;
    fornecedorCnpj?: string;
  }) => {
    setMenuAberto(false);
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/atuar-como', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(opcoes),
        });
        const data = await res.json();
        if (res.ok) {
          setFeedback(`Alternado com sucesso para ${data.user?.nome || 'novo perfil'}`);
          setTimeout(() => {
            window.location.reload();
          }, 400);
        } else {
          alert(data.error || 'Erro ao alternar perfil.');
        }
      } catch (err: any) {
        alert(err.message || 'Erro de conexão.');
      }
    });
  };

  const handleEncerrar = async () => {
    setMenuAberto(false);
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/encerrar-atuar-como', {
          method: 'POST',
        });
        if (res.ok) {
          window.location.reload();
        } else {
          alert('Erro ao retornar para o modo Administrador.');
        }
      } catch (err: any) {
        alert(err.message || 'Erro de conexão.');
      }
    });
  };

  const formatRole = (role?: string) => {
    switch (role) {
      case 'ADMIN_PROAD':
      case 'ADMIN':
        return 'Administrador Geral PROAD';
      case 'ADMIN_PARCIAL':
        return 'Administrador Setorial';
      case 'GESTOR':
        return 'Gestor de Contrato';
      case 'FISCAL_ADMINISTRATIVO':
        return 'Fiscal Administrativo';
      case 'FISCAL_TECNICO':
        return 'Fiscal Técnico';
      case 'FISCAL_SETORIAL':
        return 'Fiscal Setorial';
      case 'FORNECEDOR':
        return 'Fornecedor / Contratada';
      case 'GESTOR_ATA':
        return 'Gestor de Atas (ARP)';
      case 'USUARIO':
        return 'Servidor Demandante';
      default:
        return role || 'Perfil';
    }
  };

  return (
    <>
      {isImpersonando ? (
        /* Barra Âmbar Fixa quando em modo de simulação */
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 text-slate-950 px-4 py-2 border-b border-amber-400 shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-black/20 text-white animate-pulse">
                <ShieldAlert className="w-4 h-4 text-yellow-100" />
              </span>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="bg-black text-amber-300 font-extrabold uppercase px-1.5 py-0.5 rounded text-[10px] tracking-wider">
                    {isUsuarioReal ? '🎭 Atuando como Usuário Real' : 'Modo Simulação PROAD'}
                  </span>
                  <span>Atuando como:</span>
                  <strong className="text-black bg-white/70 px-2 py-0.5 rounded font-bold shadow-sm">
                    {sessaoAtual?.nome}
                  </strong>
                  <span className="text-amber-950 font-semibold">
                    ({formatRole(sessaoAtual?.role)})
                  </span>
                </div>
                <div className="text-[11px] text-amber-950 mt-0.5">
                  Sessão Real: <strong>{sessaoReal?.nome}</strong> ({sessaoReal?.email})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 relative">
              <button
                type="button"
                onClick={() => setMenuAberto(!menuAberto)}
                disabled={isPending}
                className="px-2.5 py-1 rounded bg-black/15 hover:bg-black/25 text-amber-950 font-bold flex items-center gap-1 border border-black/10 transition"
              >
                <span>Trocar Perfil</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleEncerrar}
                disabled={isPending}
                className="px-3 py-1 rounded bg-slate-950 text-white hover:bg-slate-900 font-bold flex items-center gap-1.5 shadow transition disabled:opacity-50"
                title="Restaurar modo Administrador PROAD"
              >
                <X className="w-3.5 h-3.5 text-amber-400" />
                <span>{isPending ? 'Saindo...' : 'Voltar para Admin'}</span>
              </button>

              {/* Menu Suspenso de Troca de Perfis */}
              {menuAberto && (
                <div className="absolute right-0 top-9 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Perfis Internos (Hermes / Servidor)
                  </div>
                  <button
                    onClick={() => handleTrocarPerfil({ role: 'GESTOR' })}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Gestor do Contrato</div>
                      <div className="text-[10px] text-slate-500">Atestes finais e gestão geral</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleTrocarPerfil({ role: 'FISCAL_ADMINISTRATIVO' })}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <PiggyBank className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Fiscal Administrativo</div>
                      <div className="text-[10px] text-slate-500">Conta Vinculada e retenções</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleTrocarPerfil({ role: 'FISCAL_TECNICO' })}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <Wrench className="w-4 h-4 text-orange-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Fiscal Técnico</div>
                      <div className="text-[10px] text-slate-500">Execução, medições e ocorrências</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleTrocarPerfil({ role: 'FISCAL_SETORIAL' })}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Fiscal Setorial</div>
                      <div className="text-[10px] text-slate-500">Campus regional / unidade</div>
                    </div>
                  </button>

                  <div className="px-3 py-1.5 border-t border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                    Perfis Externos (Fornecedores)
                  </div>
                  <button
                    onClick={() =>
                      handleTrocarPerfil({
                        tipo: 'FORNECEDOR',
                        fornecedorNome: 'AB Engenharia e Construções Ltda',
                        fornecedorCnpj: '12.345.678/0001-90',
                      })
                    }
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    <div>
                      <div className="font-semibold text-slate-800">AB Engenharia (Fornecedor)</div>
                      <div className="text-[10px] text-slate-500">Contrato de Obras / Conta Vinculada</div>
                    </div>
                  </button>
                  <button
                    onClick={() =>
                      handleTrocarPerfil({
                        tipo: 'FORNECEDOR',
                        fornecedorNome: 'Prestadora Credenciada Geral',
                        fornecedorCnpj: '00.000.000/0001-00',
                      })
                    }
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <Building2 className="w-4 h-4 text-slate-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Fornecedor Geral</div>
                      <div className="text-[10px] text-slate-500">Visão externa padrão</div>
                    </div>
                  </button>

                  <div className="border-t border-slate-100 p-2 mt-1">
                    <button
                      onClick={handleEncerrar}
                      className="w-full text-center py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition"
                    >
                      Voltar ao Administrador PROAD
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Seletor Discreto no topo quando em Modo Administrador Real */
        <div className="bg-slate-900 text-slate-200 border-b border-slate-800 px-4 py-1.5 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>
                Sessão Oficial PROAD: <strong>{sessaoReal?.nome}</strong> (Administrador Geral)
              </span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuAberto(!menuAberto)}
                className="px-2.5 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1.5 transition text-[11px]"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>🎭 Atuar Como Perfil...</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {menuAberto && (
                <div className="absolute right-0 top-7 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Simular Perfil Interno (Hermes)
                  </div>
                  <button
                    onClick={() => handleTrocarPerfil({ role: 'GESTOR' })}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Gestor do Contrato</div>
                      <div className="text-[10px] text-slate-500">Atestes finais e recebimento</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleTrocarPerfil({ role: 'FISCAL_ADMINISTRATIVO' })}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <PiggyBank className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Fiscal Administrativo</div>
                      <div className="text-[10px] text-slate-500">Conta Vinculada e retenções</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleTrocarPerfil({ role: 'FISCAL_TECNICO' })}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <Wrench className="w-4 h-4 text-orange-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Fiscal Técnico</div>
                      <div className="text-[10px] text-slate-500">Execução e atestes provisórios</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleTrocarPerfil({ role: 'FISCAL_SETORIAL' })}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Fiscal Setorial</div>
                      <div className="text-[10px] text-slate-500">Campus regional / departamento</div>
                    </div>
                  </button>

                  <div className="px-3 py-1.5 border-t border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                    Simular Perfil Externo (Fornecedor)
                  </div>
                  <button
                    onClick={() =>
                      handleTrocarPerfil({
                        tipo: 'FORNECEDOR',
                        fornecedorNome: 'AB Engenharia e Construções Ltda',
                        fornecedorCnpj: '12.345.678/0001-90',
                      })
                    }
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    <div>
                      <div className="font-semibold text-slate-800">AB Engenharia (Fornecedor)</div>
                      <div className="text-[10px] text-slate-500">Visualizar como empresa de obras</div>
                    </div>
                  </button>
                  <button
                    onClick={() =>
                      handleTrocarPerfil({
                        tipo: 'FORNECEDOR',
                        fornecedorNome: 'Prestadora Geral de Serviços',
                        fornecedorCnpj: '00.000.000/0001-00',
                      })
                    }
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <Building2 className="w-4 h-4 text-slate-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Fornecedor Geral Credenciado</div>
                      <div className="text-[10px] text-slate-500">Visão externa padrão</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
