'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, User as UserIcon, Shield, ChevronDown } from 'lucide-react';

interface NavbarProps {
  user: {
    nome: string;
    email: string;
    role: string;
    matricula?: string | null;
  };
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error(e);
      setLoggingOut(false);
    }
  };

  const formatRole = (role: string) => {
    const rolesMap: Record<string, string> = {
      ADMIN_PROAD: 'Administrador Geral (PROAD)',
      ADMIN_PARCIAL: 'Administrador Parcial',
      GESTOR: 'Gestor de Contrato',
      SUPLENTE: 'Suplente de Gestor',
      FISCAL_ADMINISTRATIVO: 'Fiscal Administrativo',
      FISCAL_TECNICO: 'Fiscal Técnico',
      FISCAL_SETORIAL: 'Fiscal Setorial',
      FORNECEDOR: 'Fornecedor / Contratada',
    };
    return rolesMap[role] || role;
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#003366] text-white flex items-center justify-center font-bold text-sm shadow">
            U
          </div>
          <div>
            <span className="font-bold text-slate-800 text-sm md:text-base leading-tight block">
              SGC - UERN
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase block">
              Gestão de Contratos e Atas
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notification Bell */}
        <button
          title="Notificações e Alertas"
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white" />
        </button>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#003366] flex items-center justify-center font-bold text-sm border border-blue-200">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="hidden md:block">
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {user.nome}
              </div>
              <div className="text-[11px] text-blue-600 font-medium leading-tight mt-0.5">
                {formatRole(user.role)}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
          </button>

          {dropdownOpen && (
            <div
              onMouseLeave={() => setDropdownOpen(false)}
              className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800 truncate">{user.nome}</p>
                <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                {user.matricula && (
                  <p className="text-[10px] text-slate-400 mt-0.5">Matrícula: {user.matricula}</p>
                )}
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                  {formatRole(user.role)}
                </span>
              </div>

              <div className="py-1">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{loggingOut ? 'Saindo...' : 'Encerrar Sessão'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
