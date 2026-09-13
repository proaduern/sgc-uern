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
  DollarSign,
  CheckCircle2,
  Inbox
} from 'lucide-react';

interface DashboardStats {
  contratosAtivos: number;
  valorGlobalTotal: number;
  atasVigentes: number;
  alertasVigencia: number;
  alertasSaldoMedio: number;
  terceirizadosAtivos: number;
}

interface AlertaItem {
  id: string;
  tipo: string;
  titulo: string;
  badge: string;
  descricao: string;
  nivel: 'CRITICO' | 'ATENCAO' | 'INFORMATIVO';
  link?: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    contratosAtivos: 0,
    valorGlobalTotal: 0,
    atasVigentes: 0,
    alertasVigencia: 0,
    alertasSaldoMedio: 0,
    terceirizadosAtivos: 0,
  });
  const [alertas, setAlertas] = useState<AlertaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) setStats(data.stats);
        if (data.alertas) setAlertas(data.alertas);
      })
      .catch((err) => {
        console.error('Erro ao carregar dados reais do dashboard:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

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
            <div className="text-2xl font-extrabold text-slate-800">
              {loading ? '-' : stats.contratosAtivos}
            </div>
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
              {loading
                ? '-'
                : stats.valorGlobalTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className="text-xs text-slate-400 mt-1">Exercício Corrente</div>
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
            <div className="text-2xl font-extrabold text-amber-600">
              {loading ? '-' : stats.alertasVigencia}
            </div>
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
            <div className="text-2xl font-extrabold text-rose-600">
              {loading ? '-' : stats.alertasSaldoMedio}
            </div>
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
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Carregando indicadores em tempo real...
              </div>
            ) : alertas.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {stats.contratosAtivos === 0
                      ? 'Nenhum contrato cadastrado no momento'
                      : 'Nenhum alerta ou pendência crítica no momento'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                    {stats.contratosAtivos === 0
                      ? 'Sua base de dados está limpa e pronta para os cadastros oficiais. Você pode cadastrar os contratos manualmente ou fazer upload de planilha em lote.'
                      : 'Todos os contratos ativos estão com suas vigências e saldos dentro dos parâmetros normativos regulares da IN nº 01/2026.'}
                  </p>
                </div>
                {stats.contratosAtivos === 0 && (
                  <div className="flex justify-center gap-2 pt-2">
                    <Link
                      href="/contratos/novo"
                      className="px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                    >
                      + Cadastrar Primeiro Contrato
                    </Link>
                    <Link
                      href="/contratos"
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-all"
                    >
                      Importar Planilha
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              alertas.map((alerta) => (
                <div
                  key={alerta.id}
                  className={`p-4 rounded-xl border flex items-start space-x-3.5 transition-colors ${
                    alerta.nivel === 'CRITICO'
                      ? 'bg-rose-50/80 border-rose-200/90'
                      : alerta.nivel === 'ATENCAO'
                      ? 'bg-amber-50/80 border-amber-200/90'
                      : 'bg-blue-50/80 border-blue-200/90'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg mt-0.5 ${
                      alerta.nivel === 'CRITICO'
                        ? 'bg-rose-100 text-rose-800'
                        : alerta.nivel === 'ATENCAO'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {alerta.tipo === 'VIGENCIA' ? (
                      <Clock className="w-4 h-4" />
                    ) : alerta.tipo === 'SALDO' ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <BookOpen className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4
                        className={`text-xs font-bold ${
                          alerta.nivel === 'CRITICO'
                            ? 'text-rose-900'
                            : alerta.nivel === 'ATENCAO'
                            ? 'text-amber-900'
                            : 'text-blue-900'
                        }`}
                      >
                        {alerta.titulo}
                      </h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          alerta.nivel === 'CRITICO'
                            ? 'bg-rose-100 text-rose-800'
                            : alerta.nivel === 'ATENCAO'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {alerta.badge}
                      </span>
                    </div>
                    <p
                      className={`text-xs mt-1 leading-relaxed ${
                        alerta.nivel === 'CRITICO'
                          ? 'text-rose-800/90'
                          : alerta.nivel === 'ATENCAO'
                          ? 'text-amber-800/90'
                          : 'text-blue-800/90'
                      }`}
                    >
                      {alerta.descricao}
                    </p>
                    {alerta.link && (
                      <div className="mt-2">
                        <Link
                          href={alerta.link}
                          className="text-[11px] font-bold text-blue-700 hover:underline inline-flex items-center space-x-1"
                        >
                          <span>Ver detalhes</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
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
