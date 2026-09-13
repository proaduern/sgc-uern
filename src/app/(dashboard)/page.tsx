'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Layers,
  AlertTriangle,
  TrendingUp,
  Clock,
  ShieldCheck,
  PlusCircle,
  FileSpreadsheet,
  ArrowUpRight,
  BookOpen,
  DollarSign
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    contratosAtivos: 14,
    valorGlobalTotal: 18450200.0,
    atasVigentes: 8,
    alertasVigencia: 3,
    alertasSaldoMedio: 2,
    terceirizadosAtivos: 182,
  });

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#002244] to-[#0055A5] rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-950/10">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-blue-400/20 border border-blue-300/30 px-3 py-1 rounded-full text-xs font-semibold mb-3 backdrop-blur-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sistema Homologado - IN nº 01/2026-PROAD / Lei 14.133</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Painel de Gestão e Fiscalização de Contratos
          </h1>
          <p className="mt-2 text-sm text-blue-100/90 leading-relaxed">
            Acompanhamento centralizado de vigências, saldo empenhado, conformidade trabalhista de terceirizados e atas de registro de preços da Universidade do Estado do Rio Grande do Norte.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/contratos/novo"
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white text-[#003366] text-xs font-bold rounded-xl shadow hover:bg-blue-50 transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <span>Cadastrar Novo Contrato</span>
            </Link>
            <Link
              href="/normativos"
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 backdrop-blur-sm transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>Consultar Normativos (IN 01/2026)</span>
            </Link>
          </div>
        </div>

        {/* Subtle decorative background shape */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-80 h-80 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Contratos Ativos */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Contratos Ativos</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-800">{stats.contratosAtivos}</div>
            <div className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
              <span>Continuados e entrega única</span>
            </div>
          </div>
        </div>

        {/* Valor Total Sob Gestão */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Valor Sob Gestão</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-800">
              {stats.valorGlobalTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className="text-xs text-slate-400 mt-1">Exercício 2026</div>
          </div>
        </div>

        {/* Alertas de Vigência */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Alertas de Vigência</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-amber-600">{stats.alertasVigencia}</div>
            <div className="text-xs text-amber-600/80 mt-1 font-medium">
              Vencendo em menos de 90 dias
            </div>
          </div>
        </div>

        {/* Alertas de Risco de Saldo */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Risco de Saldo</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-rose-600">{stats.alertasSaldoMedio}</div>
            <div className="text-xs text-rose-600/80 mt-1 font-medium">
              Consumo superior a (Total / 12)
            </div>
          </div>
        </div>
      </div>

      {/* Feed de Alertas Inteligentes & Ações Normativas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Alertas Prioritários */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center space-x-2 font-bold text-slate-800 text-sm md:text-base">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3>Alertas e Prazos Normativos Prioritários</h3>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
              Atualizado em tempo real
            </span>
          </div>

          <div className="space-y-3">
            {/* Alerta 1: Vigência */}
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start space-x-3.5">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-lg mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-900">
                    Contrato nº 14/2024 - Locação de Imóvel (Campus Natal)
                  </h4>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                    Faltam 42 dias
                  </span>
                </div>
                <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                  Vigência expira em 24/10/2026. Abertura tempestiva de processo SEI para termo aditivo ou prorrogação conforme Art. 8º da IN 01/2026.
                </p>
              </div>
            </div>

            {/* Alerta 2: Saldo Linear */}
            <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200/80 flex items-start space-x-3.5">
              <div className="p-2 bg-rose-100 text-rose-800 rounded-lg mt-0.5">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-rose-900">
                    Contrato nº 08/2025 - Fornecimento de Combustíveis
                  </h4>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md">
                    Consumo +35% da média
                  </span>
                </div>
                <p className="text-xs text-rose-800/90 mt-1 leading-relaxed">
                  O ritmo mensal de medições ultrapassou a taxa linear estimada (Valor Global / 12). Risco de esgotamento prematuro do saldo antes do 10º mês.
                </p>
              </div>
            </div>

            {/* Alerta 3: Repactuação CCT */}
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-start space-x-3.5">
              <div className="p-2 bg-blue-100 text-blue-800 rounded-lg mt-0.5">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-blue-900">
                    Convenção Coletiva SINDESP/RN - Prazo Decadencial
                  </h4>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                    Regra 90 dias
                  </span>
                </div>
                <p className="text-xs text-blue-800/90 mt-1 leading-relaxed">
                  Conforme Art. 64, §2º da IN 01/2026, a empresa contratada tem até 90 dias para protocolar pedido de repactuação com retroativos da nova CCT.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Painel Rápido de Acesso às Regras da IN 01/2026 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 font-bold text-slate-800 text-sm md:text-base mb-4">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h3>Diretrizes Normativas UERN</h3>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-800 block mb-1">Fiscal Administrativo</span>
                Emissão da Ordem de Serviço (OS), fiscalização das obrigações fiscais/trabalhistas e acompanhamento de Conta Vinculada.
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-800 block mb-1">Fiscal Técnico / Setorial</span>
                Acompanhamento in loco, aplicação do IMR, elaboração de relatório de medição e recebimento provisório.
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-800 block mb-1">Gestor do Contrato</span>
                Coordenação geral, ratificação de atesto, recebimento definitivo e aplicação de advertências/multas.
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <Link
              href="/normativos"
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-2"
            >
              <span>Ver Biblioteca Completa de Normas</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
