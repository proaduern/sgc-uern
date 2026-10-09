'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Plus,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  ShieldCheck,
  Building,
  Calendar,
  DollarSign,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Check,
  X,
  Clock,
  Printer,
  ChevronRight,
  Info
} from 'lucide-react';

interface RepactuacoesTabProps {
  contratoId: string;
  contratoAtual: any;
  trabalhadores: any[];
  currentUser: any;
}

export default function RepactuacoesTab({
  contratoId,
  contratoAtual,
  trabalhadores,
  currentUser,
}: RepactuacoesTabProps) {
  const [repactuacoes, setRepactuacoes] = useState<any[]>([]);
  const [selectedRepactuacaoId, setSelectedRepactuacaoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNovaModal, setShowNovaModal] = useState(false);
  const [salvandoNova, setSalvandoNova] = useState(false);

  // Filtros da tabela de itens
  const [filtroMes, setFiltroMes] = useState<string>('TODOS');
  const [buscaItem, setBuscaItem] = useState<string>('');

  // Modal de Comprovação de Repasse
  const [showComprovanteModal, setShowComprovanteModal] = useState(false);
  const [itensSelecionadosParaAprovar, setItensSelecionadosParaAprovar] = useState<string[]>([]);
  const [tipoDocumentoComprovante, setTipoDocumentoComprovante] = useState('FOLHA_COMPLEMENTAR');
  const [nomeArquivoComprovante, setNomeArquivoComprovante] = useState('Comprovante_Repasse_Retroativo.pdf');
  const [obsComprovante, setObsComprovante] = useState('');
  const [salvandoComprovante, setSalvandoComprovante] = useState(false);

  // Form Nova Repactuação
  const [formData, setFormData] = useState({
    processoSei: contratoAtual?.processoSeiMae || '04410038.003805/2026-01',
    cctReferencia: 'CCT 2026 - MTE / Sindicato',
    competenciaInicio: '01/2026',
    competenciaFim: '03/2026',
    percentualContaVinculada: '11.11',
    salarioAnterior: '2000.00',
    salarioNovo: '2200.00',
    custoTotalAnterior: '3800.00',
    custoTotalNovo: '4180.00',
    observacoes: '',
  });

  const carregarRepactuacoes = async () => {
    if (!contratoId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/terceirizacao/repactuacoes?contratoId=${contratoId}`);
      if (res.ok) {
        const data = await res.json();
        setRepactuacoes(data);
        if (data.length > 0 && !selectedRepactuacaoId) {
          setSelectedRepactuacaoId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar repactuações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarRepactuacoes();
  }, [contratoId]);

  const repactuacaoAtiva = repactuacoes.find((r) => r.id === selectedRepactuacaoId);

  const handleCriarRepactuacao = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoNova(true);
    try {
      const res = await fetch('/api/terceirizacao/repactuacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contratoId,
          ...formData,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setShowNovaModal(false);
        await carregarRepactuacoes();
        setSelectedRepactuacaoId(created.id);
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao processar repactuação');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de conexão');
    } finally {
      setSalvandoNova(false);
    }
  };

  const handleDeleteRepactuacao = async (id: string) => {
    if (!confirm('Deseja realmente remover esta apuração de repactuação?')) return;
    try {
      const res = await fetch(`/api/terceirizacao/repactuacoes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedRepactuacaoId === id) setSelectedRepactuacaoId(null);
        carregarRepactuacoes();
      }
    } catch (err) {
      alert('Erro ao excluir repactuação');
    }
  };

  const handleSalvarComprovante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepactuacaoId) return;
    if (itensSelecionadosParaAprovar.length === 0) {
      alert('Selecione ao menos um trabalhador para homologar o repasse.');
      return;
    }

    setSalvandoComprovante(true);
    try {
      const res = await fetch(`/api/terceirizacao/repactuacoes/${selectedRepactuacaoId}/comprovantes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoDocumento: tipoDocumentoComprovante,
          nomeArquivo: nomeArquivoComprovante,
          observacoes: obsComprovante,
          itensAprovadosIds: itensSelecionadosParaAprovar,
        }),
      });

      if (res.ok) {
        setShowComprovanteModal(false);
        setItensSelecionadosParaAprovar([]);
        setObsComprovante('');
        await carregarRepactuacoes();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao homologar repasse');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de conexão');
    } finally {
      setSalvandoComprovante(false);
    }
  };

  const itensFiltrados = (repactuacaoAtiva?.itens || []).filter((item: any) => {
    const matchMes = filtroMes === 'TODOS' || item.competenciaMesAno === filtroMes;
    const matchBusca =
      !buscaItem ||
      item.trabalhador?.nomeCompleto?.toLowerCase().includes(buscaItem.toLowerCase()) ||
      item.funcao?.toLowerCase().includes(buscaItem.toLowerCase());
    return matchMes && matchBusca;
  });

  const mesesDisponiveis = Array.from(
    new Set((repactuacaoAtiva?.itens || []).map((i: any) => i.competenciaMesAno))
  ) as string[];

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'HOMOLOGADO_FISCAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> 100% Homologado & Liberado
          </span>
        );
      case 'PARCIALMENTE_COMPROVADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" /> Parcialmente Comprovado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
            <Lock className="w-3.5 h-3.5" /> Bloqueado - Aguardando Repasse
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Aba */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-100 text-blue-800 tracking-wider">
                Auditoria & Controle Fiscal
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-500">IN 05/2017 & IN 01/2026 UERN</span>
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              <span>Repactuações Retroativas & Conciliação de Efetividade</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cálculo de retroativos proporcional aos dias efetivamente trabalhados, evitando bitributação na Conta Vinculada e bloqueando pagamento até comprovação do repasse aos funcionários.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNovaModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Apuração de Repactuação</span>
            </button>
          </div>
        </div>

        {/* Lista de Repactuações cadastradas em abas/pills */}
        {repactuacoes.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">
              Processos Apurados:
            </span>
            {repactuacoes.map((r) => {
              const isSelected = r.id === selectedRepactuacaoId;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRepactuacaoId(r.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {r.cctReferencia} ({r.competenciaInicio} a {r.competenciaFim})
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      r.status === 'HOMOLOGADO_FISCAL'
                        ? 'bg-emerald-400'
                        : r.status === 'PARCIALMENTE_COMPROVADO'
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Conteúdo da Repactuação Selecionada */}
      {repactuacaoAtiva ? (
        <div className="space-y-6">
          {/* Barra de Status e Ações */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Processo SEI: {repactuacaoAtiva.processoSei}
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Intervalo Retroativo: {repactuacaoAtiva.competenciaInicio} até {repactuacaoAtiva.competenciaFim}
                  </span>
                  {getStatusBadge(repactuacaoAtiva.status)}
                </div>
                <h3 className="text-base font-black text-white mt-1">
                  {repactuacaoAtiva.cctReferencia}
                </h3>
                <p className="text-xs text-slate-400">
                  Responsável: {repactuacaoAtiva.fiscalResponsavelNome} ({repactuacaoAtiva.fiscalResponsavelMatricula}) • Criado em {new Date(repactuacaoAtiva.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowComprovanteModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Auditar Repasse aos Trabalhadores</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Parecer SEI</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteRepactuacao(repactuacaoAtiva.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Excluir apuração"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 4 Cards de Métricas e Compliance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
              {/* Card 1: Teórico */}
              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Retroativo Teórico</span>
                  <Info className="w-3.5 h-3.5" />
                </div>
                <div className="text-lg font-black text-slate-100 mt-1">
                  {formatCurrency(repactuacaoAtiva.valorNominalTeorico)}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Sem dedução de faltas/postos</p>
              </div>

              {/* Card 2: Economia por Glosas */}
              <div className="bg-emerald-950/40 rounded-xl p-4 border border-emerald-800/50">
                <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
                  <span>Economia UERN (Glosas)</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="text-lg font-black text-emerald-300 mt-1">
                  - {formatCurrency(repactuacaoAtiva.valorGlosasFaltas)}
                </div>
                <p className="text-[11px] text-emerald-400/80 mt-0.5">Faltas não remuneradas no retroativo</p>
              </div>

              {/* Card 3: Conta Vinculada Conciliada */}
              <div className="bg-blue-950/40 rounded-xl p-4 border border-blue-800/50">
                <div className="flex items-center justify-between text-blue-400 text-xs font-bold">
                  <span>Conta Vinculada Suplementar</span>
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
                <div className="text-lg font-black text-blue-300 mt-1">
                  {formatCurrency(repactuacaoAtiva.valorSuplementarContaVinculada)}
                </div>
                <p className="text-[11px] text-blue-400/80 mt-0.5">
                  Já retido: {formatCurrency(repactuacaoAtiva.valorJaRetidoContaVinculada)}
                </p>
              </div>

              {/* Card 4: Bloqueio Trabalhista Cautelar */}
              <div
                className={`rounded-xl p-4 border ${
                  repactuacaoAtiva.valorBloqueadoPendente > 0
                    ? 'bg-rose-950/40 border-rose-800/60'
                    : 'bg-emerald-950/40 border-emerald-800/60'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className={repactuacaoAtiva.valorBloqueadoPendente > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                    {repactuacaoAtiva.valorBloqueadoPendente > 0 ? 'Bloqueado (Sem Repasse)' : 'Liberado para Pagamento'}
                  </span>
                  {repactuacaoAtiva.valorBloqueadoPendente > 0 ? (
                    <Lock className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
                <div className={`text-lg font-black mt-1 ${repactuacaoAtiva.valorBloqueadoPendente > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                  {formatCurrency(repactuacaoAtiva.valorBloqueadoPendente > 0 ? repactuacaoAtiva.valorBloqueadoPendente : repactuacaoAtiva.valorBrutoEfetivoDevido)}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Comprovado: {formatCurrency(repactuacaoAtiva.valorComprovadoTrabalhadores)}
                </p>
              </div>
            </div>

            {/* Alerta de Compliance Trabalhista */}
            {repactuacaoAtiva.valorBloqueadoPendente > 0 && (
              <div className="mt-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-200 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Trava de Segurança e Liquidação Condicionada (IN 05/2017):</strong> A empresa contratada não pode receber a parcela retroativa de <strong>{formatCurrency(repactuacaoAtiva.valorBloqueadoPendente)}</strong> até comprovar a efetiva liquidação da folha complementar e repasse das diferenças aos trabalhadores. Utilize o botão &ldquo;Auditar Repasse aos Trabalhadores&rdquo; acima para anexar os comprovantes bancários nominais.
                </div>
              </div>
            )}
          </div>

          {/* Tabela de Memória de Cálculo Trabalhador a Trabalhador */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-700" />
                  <span>Memória de Cálculo Analítica por Trabalhador e Competência</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {itensFiltrados.length} lançamentos encontrados conciliando frequência e faturamento efetivo.
                </p>
              </div>

              {/* Filtros */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={buscaItem}
                    onChange={(e) => setBuscaItem(e.target.value)}
                    placeholder="Filtrar trabalhador..."
                    className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 w-44"
                  />
                </div>

                <select
                  value={filtroMes}
                  onChange={(e) => setFiltroMes(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white"
                >
                  <option value="TODOS">Todas Competências</option>
                  {mesesDisponiveis.map((m) => (
                    <option key={m} value={m}>
                      Mês: {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tabela Responsiva */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Mês</th>
                    <th className="p-3">Trabalhador / Função</th>
                    <th className="p-3 text-center">Dias / Faltas</th>
                    <th className="p-3 text-center">Efetividade</th>
                    <th className="p-3 text-right">Δ Custo Nominal</th>
                    <th className="p-3 text-right text-emerald-700">Glosa Faltas</th>
                    <th className="p-3 text-right">Retroativo Devido</th>
                    <th className="p-3 text-right text-blue-700">Suplemento CV</th>
                    <th className="p-3 text-right text-amber-700">Δ Salarial Func.</th>
                    <th className="p-3 text-center">Status Repasse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {itensFiltrados.map((item: any) => {
                    const isComprovado = item.statusComprovacaoRepasse === 'COMPROVADO';
                    const isPendente = item.statusComprovacaoRepasse === 'PENDENTE';
                    const isRejeitado = item.statusComprovacaoRepasse === 'REJEITADO';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900">{item.competenciaMesAno}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{item.trabalhador?.nomeCompleto}</div>
                          <div className="text-[10px] text-slate-400">
                            {item.funcao} • CPF: {item.trabalhador?.cpf}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-semibold text-slate-900">{item.diasTrabalhados}</span>
                          <span className="text-slate-400">/{item.diasPrevistos}</span>
                          {item.faltasInjustificadas > 0 && (
                            <span className="ml-1 text-[10px] px-1 py-0.2 rounded bg-rose-100 text-rose-700 font-bold">
                              {item.faltasInjustificadas} falta(s)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center font-bold">
                          <span
                            className={
                              item.fatorEfetividade < 1
                                ? 'text-amber-600'
                                : 'text-emerald-700'
                            }
                          >
                            {(item.fatorEfetividade * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3 text-right text-slate-500 font-mono">
                          {formatCurrency(item.deltaSalarioNominal * 1.85)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700">
                          {item.glosaFaltasRetroativo > 0 ? `- ${formatCurrency(item.glosaFaltasRetroativo)}` : 'R$ 0,00'}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-slate-900">
                          {formatCurrency(item.deltaCustoTotalPosto)}
                        </td>
                        <td className="p-3 text-right font-mono text-blue-700">
                          {formatCurrency(item.retencaoCvSuplementarDevida)}
                          {item.retencaoCvJaRealizada > 0 && (
                            <div className="text-[9px] text-slate-400">
                              (Já retido: {formatCurrency(item.retencaoCvJaRealizada)})
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-amber-700">
                          {formatCurrency(item.valorDiferencaSalarioDevida)}
                        </td>
                        <td className="p-3 text-center">
                          {isComprovado && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <Check className="w-3 h-3" /> Comprovado
                            </span>
                          )}
                          {isPendente && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 animate-pulse">
                              <Lock className="w-3 h-3" /> Pendente
                            </span>
                          )}
                          {isRejeitado && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                              <X className="w-3 h-3" /> Rejeitado
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <TrendingUp className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">Nenhuma Repactuação Cadastrada</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Gere a apuração da repactuação para cruzar a nova convenção coletiva com os registros reais de frequência e medições anteriores.
          </p>
          <button
            type="button"
            onClick={() => setShowNovaModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Primeira Apuração</span>
          </button>
        </div>
      )}

      {/* MODAL 1: NOVA REPACTUAÇÃO */}
      {showNovaModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                  <span>Nova Apuração de Repactuação com Efeito Retroativo</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Conciliação automática de faltas, deduções e saldos prévios da Conta Vinculada.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNovaModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCriarRepactuacao} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Processo SEI</label>
                  <input
                    type="text"
                    required
                    value={formData.processoSei}
                    onChange={(e) => setFormData({ ...formData, processoSei: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CCT / Convenção Coletiva</label>
                  <input
                    type="text"
                    required
                    value={formData.cctReferencia}
                    onChange={(e) => setFormData({ ...formData, cctReferencia: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Competência Inicial (MM/AAAA)</label>
                  <input
                    type="text"
                    required
                    placeholder="01/2026"
                    value={formData.competenciaInicio}
                    onChange={(e) => setFormData({ ...formData, competenciaInicio: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Competência Final (MM/AAAA)</label>
                  <input
                    type="text"
                    required
                    placeholder="03/2026"
                    value={formData.competenciaFim}
                    onChange={(e) => setFormData({ ...formData, competenciaFim: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Salário Anterior (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.salarioAnterior}
                    onChange={(e) => setFormData({ ...formData, salarioAnterior: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Novo Salário Repactuado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.salarioNovo}
                    onChange={(e) => setFormData({ ...formData, salarioNovo: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Custo Total Anterior Posto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.custoTotalAnterior}
                    onChange={(e) => setFormData({ ...formData, custoTotalAnterior: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Novo Custo Total Posto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.custoTotalNovo}
                    onChange={(e) => setFormData({ ...formData, custoTotalNovo: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-blue-600" />
                <span>
                  O sistema buscará automaticamente o registro de ponto de cada funcionário nos meses indicados e descontará as faltas e postos vazios do cálculo retroativo.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNovaModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoNova}
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-all shadow-sm flex items-center gap-2"
                >
                  {salvandoNova ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Conciliando e Calculando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Processar Memória de Cálculo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: AUDITORIA DE REPASSE TRABALHISTA */}
      {showComprovanteModal && repactuacaoAtiva && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Auditoria e Homologação de Repasse Trabalhista</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Marque os trabalhadores com repasse salarial comprovado por holerite ou comprovante bancário nominal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowComprovanteModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarComprovante} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Documento</label>
                  <select
                    value={tipoDocumentoComprovante}
                    onChange={(e) => setTipoDocumentoComprovante(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="FOLHA_COMPLEMENTAR">Folha de Pagamento Complementar</option>
                    <option value="HOLERITE_ASSINADO">Holerites / Contracheques Assinados</option>
                    <option value="COMPROVANTE_PIX_TED">Extratos / Comprovantes Bancários PIX/TED</option>
                    <option value="ESOCIAL_S1200">eSocial Evento S-1200 / S-1210</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Identificação / Arquivo</label>
                  <input
                    type="text"
                    value={nomeArquivoComprovante}
                    onChange={(e) => setNomeArquivoComprovante(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">
                    Selecione os Trabalhadores para Homologação:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const todosIds = (repactuacaoAtiva.itens || [])
                        .filter((i: any) => i.statusComprovacaoRepasse === 'PENDENTE')
                        .map((i: any) => i.id);
                      setItensSelecionadosParaAprovar(todosIds);
                    }}
                    className="text-[11px] font-bold text-blue-700 hover:underline"
                  >
                    Marcar Todos Pendentes
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {(repactuacaoAtiva.itens || []).map((item: any) => {
                    const isChecked = itensSelecionadosParaAprovar.includes(item.id);
                    const isJaAprovado = item.statusComprovacaoRepasse === 'COMPROVADO';

                    return (
                      <div
                        key={item.id}
                        className={`p-3 flex items-center justify-between text-xs transition-colors ${
                          isJaAprovado
                            ? 'bg-emerald-50/60'
                            : isChecked
                            ? 'bg-blue-50/60'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            disabled={isJaAprovado}
                            checked={isChecked || isJaAprovado}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setItensSelecionadosParaAprovar([...itensSelecionadosParaAprovar, item.id]);
                              } else {
                                setItensSelecionadosParaAprovar(
                                  itensSelecionadosParaAprovar.filter((id) => id !== item.id)
                                );
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <div className="font-bold text-slate-900">
                              {item.trabalhador?.nomeCompleto} ({item.competenciaMesAno})
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {item.funcao} • Diferença Salarial: {formatCurrency(item.valorDiferencaSalarioDevida)}
                            </div>
                          </div>
                        </div>

                        <div>
                          {isJaAprovado ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Já Comprovado
                            </span>
                          ) : (
                            <span className="font-mono font-bold text-slate-700">
                              {formatCurrency(item.deltaCustoTotalPosto)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Parecer / Observações do Fiscal
                </label>
                <textarea
                  rows={2}
                  value={obsComprovante}
                  onChange={(e) => setObsComprovante(e.target.value)}
                  placeholder="Informar detalhes da conferência dos contracheques e ordens bancárias..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowComprovanteModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoComprovante || itensSelecionadosParaAprovar.length === 0}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {salvandoComprovante ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Gravando Ateste...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Homologar Repasse ({itensSelecionadosParaAprovar.length} funcionários)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
