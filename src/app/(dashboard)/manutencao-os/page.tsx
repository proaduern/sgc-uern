'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Building2, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  RefreshCw,
  Search,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';

interface ContratoManutencao {
  id: string;
  numeroContrato: string;
  objeto: string;
  valorGlobal: number;
  valorAtualizado: number;
  totalEmpenhadoOs: number;
  totalMedido: number;
  saldoDisponivel: number;
  percentualConsumido: number;
  fornecedor: {
    razaoSocial: string;
    cnpj: string;
  };
  totalOrdensServico: number;
}

interface OrdemServicoItem {
  id: string;
  numeroOs: string;
  ano: number;
  processoSeiDespesa: string;
  descricaoServico: string;
  valorEstimado: number;
  status: string;
  createdAt: string;
  contrato: {
    numeroContrato: string;
    fornecedor: { razaoSocial: string };
  };
  fiscalAdm: { nome: string; email: string };
  medicoes: Array<{
    id: string;
    valorAtestadoFinal: number;
    status: string;
    referenciaMesAno: string;
  }>;
}

export default function ManutencaoOsPage() {
  const [contratos, setContratos] = useState<ContratoManutencao[]>([]);
  const [ordens, setOrdens] = useState<OrdemServicoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const carregarDados = async () => {
    try {
      setRefreshing(true);
      const [resContratos, resOrdens] = await Promise.all([
        fetch('/api/integracao/manutencao/contratos'),
        fetch('/api/integracao/manutencao/ordens-servico'),
      ]);

      if (resContratos.ok) {
        const dataC = await resContratos.json();
        setContratos(dataC.contratos || []);
      }
      if (resOrdens.ok) {
        const dataO = await resOrdens.json();
        setOrdens(dataO.ordens || []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados integrados de manutenção:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const totalValorContratual = contratos.reduce((acc, c) => acc + c.valorAtualizado, 0);
  const totalOsEmitidas = contratos.reduce((acc, c) => acc + c.totalEmpenhadoOs, 0);
  const totalSaldoRestante = contratos.reduce((acc, c) => acc + c.saldoDisponivel, 0);
  const totalMedicoes = contratos.reduce((acc, c) => acc + c.totalMedido, 0);

  const ordensFiltradas = ordens.filter(
    (o) =>
      o.numeroOs.toLowerCase().includes(busca.toLowerCase()) ||
      o.descricaoServico.toLowerCase().includes(busca.toLowerCase()) ||
      o.contrato.numeroContrato.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
            <Wrench className="w-3.5 h-3.5" />
            Interoperabilidade PROAD: Manutenção ➔ SGC
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Ordens de Serviço & Manutenção Predial</h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Acompanhamento em tempo real das Ordens de Serviço (OS) autorizadas pelo Departamento de Manutenção / Diretoria Administrativa, com trava de saldo contratual e faturamento.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={carregarDados}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
          <a
            href="http://localhost:3003"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            Acessar Sistema de Manutenção
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Teto Contratual Total</span>
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            R$ {totalValorContratual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-1">{contratos.length} contrato(s) ativo(s) de manutenção</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">OS Emitidas (Comprometido)</span>
            <FileText className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">
            R$ {totalOsEmitidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-1">{ordens.length} ordem(ns) de serviço registrada(s)</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Saldo Disponível no SGC</span>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            R$ {totalSaldoRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Trava de limite ativa
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Medições Faturadas</span>
            <TrendingUp className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-700">
            R$ {totalMedicoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-1">Prontas para liquidação / PROPLAN</p>
        </div>
      </div>

      {/* Contratos Master de Manutenção */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Contratos Ativos de Manutenção Predial</h2>
            <p className="text-xs text-slate-500">Contratos registrados no SGC onde as Ordens de Serviço consom saldo diretamente</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {contratos.map((c) => (
            <div key={c.id} className="p-5 hover:bg-slate-50/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                    {c.numeroContrato}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    {c.fornecedor.razaoSocial}
                  </span>
                  <span className="text-[11px] text-slate-400">CNPJ: {c.fornecedor.cnpj}</span>
                </div>
                <p className="text-xs text-slate-700 line-clamp-2">{c.objeto}</p>
                <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                  <span>Valor Global: R$ {c.valorAtualizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <span>•</span>
                  <span>OS Emitidas: {c.totalOrdensServico}</span>
                  <span>•</span>
                  <span className="font-semibold text-emerald-700">Saldo Livre: R$ {c.saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Barra de Consumo */}
              <div className="w-full md:w-64 space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <span>Consumo Contratual</span>
                  <span className="font-bold text-slate-900">{c.percentualConsumido}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      c.percentualConsumido > 85 ? 'bg-rose-500' : c.percentualConsumido > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, c.percentualConsumido)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Empenhado: R$ {c.totalEmpenhadoOs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <span>Restante: R$ {c.saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabela de Ordens de Serviço emitidas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Histórico de Ordens de Serviço & Medições</h2>
            <p className="text-xs text-slate-500">Ordens de serviço emitidas e enviadas para execução técnica com trava de saldo</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por OS, descrição ou contrato..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            Carregando Ordens de Serviço...
          </div>
        ) : ordensFiltradas.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Nenhuma Ordem de Serviço encontrada com os filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Nº da OS</th>
                  <th className="py-3 px-4">Contrato Vinculado</th>
                  <th className="py-3 px-4">Descrição do Serviço / Campus</th>
                  <th className="py-3 px-4 text-right">Valor Autorizado</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Medição / Faturamento</th>
                  <th className="py-3 px-4">Data Emissão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordensFiltradas.map((os) => {
                  const ultimaMedicao = os.medicoes?.[0];
                  return (
                    <tr key={os.id} className="hover:bg-slate-50/60 transition-all">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {os.numeroOs}
                        <div className="text-[10px] font-normal text-slate-400">Ano: {os.ano}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-blue-700">{os.contrato.numeroContrato}</span>
                        <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                          {os.contrato.fornecedor.razaoSocial}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 max-w-xs">
                        <div className="line-clamp-2">{os.descricaoServico}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Proc: {os.processoSeiDespesa}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        R$ {os.valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            os.status === 'MEDIDA_ATESTE_DEFINITIVO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {os.status === 'MEDIDA_ATESTE_DEFINITIVO' ? 'CONCLUÍDA & MEDIDA' : 'EM EXECUÇÃO'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {ultimaMedicao ? (
                          <div>
                            <span className="font-bold text-emerald-700">
                              R$ {ultimaMedicao.valorAtestadoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <div className="text-[10px] text-slate-500">Ref: {ultimaMedicao.referenciaMesAno}</div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Pendente de medição</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(os.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
