'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  Layers,
  PiggyBank,
  BookOpen,
  AlertTriangle,
  BarChart3,
  ShieldCheck,
  Building2,
  FileSpreadsheet
} from 'lucide-react';

interface SidebarProps {
  role: string;
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    { name: 'Visão Geral', href: '/', icon: LayoutDashboard },
    { name: 'Contratos & Empenhos', href: '/contratos', icon: FileText },
    { name: 'Atas de Registro de Preço', href: '/atas', icon: Layers },
    { name: 'Gestores & Fiscais', href: '/fiscais', icon: Users },
    { name: 'Execução & Medições', href: '/execucao', icon: FileSpreadsheet },
    { name: 'Terceirização & CCT', href: '/terceirizacao', icon: Briefcase },
    { name: 'Conta Vinculada', href: '/conta-vinculada', icon: PiggyBank },
    { name: 'IMR & Penalidades', href: '/penalidades', icon: AlertTriangle },
    { name: 'Base de Normativos', href: '/normativos', icon: BookOpen },
    { name: 'Relatórios Executivos', href: '/relatorios', icon: BarChart3 },
  ];

  const isAdmin = role === 'ADMIN_PROAD' || role === 'ADMIN_PARCIAL';

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800">
      <div className="p-4 flex-1 space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Módulos do Sistema
        </div>

        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {isAdmin && (
          <div className="pt-4 mt-4 border-t border-slate-800/80">
            <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Administração
            </div>
            <Link
              href="/usuarios"
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                pathname.startsWith('/usuarios')
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Gestão de Usuários</span>
            </Link>
          </div>
        )}
      </div>

      {/* Institutional Legal Seal */}
      <div className="p-4 m-3 rounded-2xl bg-slate-800/50 border border-slate-800 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center space-x-1.5 font-semibold text-slate-200">
          <Building2 className="w-3.5 h-3.5 text-blue-400" />
          <span>PROAD / UERN</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-snug">
          IN nº 01/2026-PROAD<br />
          Lei Federal nº 14.133/2021
        </p>
      </div>
    </aside>
  );
}
