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
  FileSpreadsheet,
  Wrench,
  Plane
} from 'lucide-react';

interface SidebarProps {
  role: string;
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const isAdmin = role === 'ADMIN_PROAD' || role === 'ADMIN_PARCIAL';
  const isGestorAta = role === 'GESTOR_ATA';
  const isGestor = role === 'GESTOR' || role === 'SUPLENTE';
  const isFiscalAdm = role === 'FISCAL_ADMINISTRATIVO';
  const isFiscalTecnico = role === 'FISCAL_TECNICO';
  const isFiscalSetorial = role === 'FISCAL_SETORIAL';

  // Lista base de navegação com controle de permissões por perfil
  const allNavigation = [
    { name: 'Visão Geral', href: '/', icon: LayoutDashboard, visible: true },
    {
      name: isAdmin ? 'Contratos & Empenhos' : 'Contratos Vinculados',
      href: '/contratos',
      icon: FileText,
      visible: true,
    },
    {
      name: 'Gestão de Atas (ARP)',
      href: '/atas',
      icon: Layers,
      visible: isAdmin || isGestorAta, // Exclusivo PROAD / Admin e Gestor de Ata
    },
    {
      name: 'Gestores & Fiscais',
      href: '/fiscais',
      icon: Users,
      visible: isAdmin, // Exclusivo PROAD / Admin
    },
    {
      name: isFiscalSetorial ? 'Execução (Meu Campus)' : 'Execução & Medições',
      href: '/execucao',
      icon: FileSpreadsheet,
      visible: true,
    },
    {
      name: 'Módulo de Terceirização',
      href: '/terceirizacao',
      icon: Users,
      visible: isAdmin || isGestor || isFiscalAdm, // Gestor e Fiscal Adm
    },
    {
      name: 'Conta Vinculada',
      href: '/terceirizacao?tab=CONTA_VINCULADA',
      icon: PiggyBank,
      visible: isAdmin || isGestor || isFiscalAdm, // Gestor e Fiscal Adm
    },
    {
      name: 'IMR & Penalidades',
      href: '/penalidades',
      icon: AlertTriangle,
      visible: true, // Visível para todos os fiscais e gestores (para IMR / notificações)
    },
    {
      name: 'Base de Normativos',
      href: '/normativos',
      icon: BookOpen,
      visible: true,
    },
    {
      name: isAdmin ? 'Relatórios Executivos' : 'Relatórios & Fechamento',
      href: '/relatorios',
      icon: BarChart3,
      visible: isAdmin || isGestor || isFiscalAdm, // PROAD, Gestores e Fiscais Adm para Fechamento Contábil
    },
    {
      name: 'Manutenção Predial (OS)',
      href: '/manutencao-os',
      icon: Wrench,
      visible: isAdmin || isGestor || isFiscalAdm || isFiscalTecnico,
    },
    {
      name: 'Viagens & Diárias',
      href: '/diarias-integracao',
      icon: Plane,
      visible: isAdmin || isGestor || isFiscalAdm,
    },
    {
      name: 'Planejamento (PCA)',
      href: '/planejamento-pca',
      icon: Layers,
      visible: isAdmin || isGestor,
    },
  ];

  const navigation = allNavigation.filter((item) => item.visible);

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
