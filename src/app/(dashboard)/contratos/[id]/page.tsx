'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Building2,
  Calendar,
  DollarSign,
  ArrowLeft,
  Edit3,
  Layers,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Search,
  ExternalLink,
  Users,
  Briefcase,
  Plus,
  Trash2,
  Calculator,
  HelpCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import PlanilhaCustosModal from '@/components/contratos/PlanilhaCustosModal';

export default function DetalhesContratoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [contrato, setContrato] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [showPlanilhaModal, setShowPlanilhaModal] = useState(false);
  const [planilhaParaEditar, setPlanilhaParaEditar] = useState<any | null>(null);
  const [excluindoPlanilhaId, setExcluindoPlanilhaId] = useState<string | null>(null);

  const carregarContrato = () => {
    if (id) {
      setLoading(true);
      fetch(`/api/contratos/${id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.error) throw new Error(d.error);
          setContrato(d.contrato);
        })
        .catch((err: any) => {
          setError(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    carregarContrato();
  }, [id]);

  const handleDeletePlanilha = async (planilhaId: string) => {
    if (!confirm('Deseja realmente excluir esta planilha de composição de custos?')) return;
    setExcluindoPlanilhaId(planilhaId);
    try {
      const res = await fetch(`/api/contratos/planilhas-custos/${planilhaId}`, { method: 'DELETE' });
      if (res.ok) {
        carregarContrato();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao excluir planilha');
      }
    } catch (e: any) {
      alert(e.message || 'Erro de conexão');
    } finally {
      setExcluindoPlanilhaId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-16 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-[#003366] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Carregando detalhes do contrato institucional...</p>
      </div>
    );
  }

  if (error || !contrato) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center justify-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error || 'Contrato não localizado.'}</span>
        </div>
        <Link
          href="/contratos"
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Listagem de Contratos</span>
        </Link>
      </div>
    );
  }

  const exportarItensParaExcel = () => {
    if (!contrato.itens || contrato.itens.length === 0) return;

    const dataToExport = contrato.itens.map((it: any) => ({
      'Item': it.numeroItem,
      'Descrição': it.descricao,
      'Unidade': it.unidade,
      'Quantidade Original': it.quantidadeOriginal,
      'Quantidade Atual': it.quantidadeAtual,
      'Valor Unitário (R$)': it.valorUnitarioAtual,
      'Valor Total (R$)': it.valorTotalAtual,
      'Limite Acréscimo (%)': `${it.limiteAcrescimoPercent}%`,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Itens');
    const num = contrato.numeroContrato ? contrato.numeroContrato.replace(/[\/\\]/g, '_') : 'Contrato';
    XLSX.writeFile(wb, `Itens_${num}_UERN.xlsx`);
  };

  const gestor = contrato.responsaveis?.find((r: any) => r.tipoAtuacao === 'GESTOR')?.user?.nome;
  const suplente = contrato.responsaveis?.find((r: any) => r.tipoAtuacao === 'SUPLENTE')?.user?.nome;
  const fiscalAdm = contrato.responsaveis?.find((r: any) => r.tipoAtuacao === 'FISCAL_ADMINISTRATIVO')?.user?.nome;
  const fiscalTec = contrato.responsaveis?.find((r: any) => r.tipoAtuacao === 'FISCAL_TECNICO')?.user?.nome;
  const fiscalSetorial = contrato.responsaveis?.find((r: any) => r.tipoAtuacao === 'FISCAL_SETORIAL')?.user?.nome;

  const itensList = contrato.itens || [];
  const filteredItens = itensList.filter(
    (it: any) =>
      it.descricao?.toLowerCase().includes(itemSearch.toLowerCase()) ||
      String(it.numeroItem).includes(itemSearch)
  );
  const totalPages = Math.ceil(filteredItens.length / pageSize) || 1;
  const paginatedItens = filteredItens.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalCalculado = itensList.reduce((acc: number, it: any) => acc + (it.valorTotalAtual || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-3">
          <Link
            href="/contratos"
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-800">
                {contrato.empenhoSubstituiContrato
                  ? `Nota de Empenho nº ${contrato.numeroEmpenho}`
                  : contrato.numeroContrato
                  ? `Contrato Administrativo nº ${contrato.numeroContrato}`
                  : `Empenho nº ${contrato.numeroEmpenho}`}
              </h1>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  contrato.status === 'ATIVO'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : contrato.status === 'SUSPENSO'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {contrato.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Processo SEI: {contrato.processoSeiMae} • {contrato.licitacaoProcedimento}
            </p>
          </div>
        </div>

        {/* Botão de Edição Principal */}
        <div className="flex items-center space-x-2.5 self-end sm:self-center">
          <Link
            href={`/contratos/${contrato.id}/editar`}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
            <span>Editar Contrato</span>
          </Link>
        </div>
      </div>

      {/* Grid de Informações Chave */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card Fornecedor */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
            <Building2 className="w-4 h-4 text-blue-700" />
            <span>Empresa Contratada</span>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800 leading-snug">
              {contrato.fornecedor?.razaoSocial}
            </h4>
            <p className="text-xs text-slate-500 font-mono">
              CNPJ: {contrato.fornecedor?.cnpj}
            </p>
            {contrato.fornecedor?.email && (
              <p className="text-xs text-slate-600">
                E-mail: {contrato.fornecedor.email}
              </p>
            )}
            {contrato.fornecedor?.nomePreposto && (
              <p className="text-xs text-slate-600">
                Preposto: {contrato.fornecedor.nomePreposto}
              </p>
            )}
          </div>
        </div>

        {/* Card Vigência e Classificação */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
            <Calendar className="w-4 h-4 text-blue-700" />
            <span>Vigência & Regime</span>
          </div>
          <div className="space-y-1 text-xs">
            <div>
              <span className="text-slate-500">Período: </span>
              <strong className="text-slate-800">
                {new Date(contrato.vigenciaInicio).toLocaleDateString('pt-BR')} a{' '}
                {new Date(contrato.vigenciaFim).toLocaleDateString('pt-BR')}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Regime: </span>
              <span className="font-semibold text-blue-800">
                {contrato.tipoVigencia?.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Tipo: </span>
              <span className="font-semibold text-slate-700">
                {contrato.tipoContrato?.replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Empreitada: </span>
              <span className="font-semibold text-slate-700">
                {contrato.tipoEmpreitada?.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Card Valores Financeiros */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
            <DollarSign className="w-4 h-4 text-blue-700" />
            <span>Valores e Reajuste</span>
          </div>
          <div className="space-y-1 text-xs">
            <div>
              <span className="text-slate-500">Valor Global Original: </span>
              <strong className="text-slate-800 text-sm">
                {contrato.valorGlobal?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Valor Atualizado: </span>
              <span className="font-bold text-emerald-700">
                {contrato.valorAtualizado?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            {contrato.indicesReajuste && contrato.indicesReajuste.length > 0 && (
              <div className="pt-1">
                <span className="text-slate-500 block text-[11px]">Índices aplicáveis:</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {contrato.indicesReajuste.map((i: any) => (
                    <span
                      key={i.id}
                      className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold"
                    >
                      {i.tipoIndice === 'SETORIAL' ? i.nomeIndiceSetorial : i.tipoIndice}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Objeto do Contrato */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Objeto Contratual
        </h3>
        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
          {contrato.objeto}
        </p>
      </div>

      {/* Equipe de Fiscalização */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
          <Users className="w-4 h-4 text-blue-700" />
          <span>Equipe de Gestão e Fiscalização Designada (IN 01/2026)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Gestor Titular</span>
            <span className="font-semibold text-slate-800">{gestor || 'Não designado'}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Suplente do Gestor</span>
            <span className="font-semibold text-slate-800">{suplente || 'Não designado'}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Fiscal Administrativo</span>
            <span className="font-semibold text-slate-800">{fiscalAdm || 'Não designado'}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Fiscal Técnico</span>
            <span className="font-semibold text-slate-800">{fiscalTec || 'Não designado'}</span>
          </div>
        </div>
      </div>

      {/* Relação de Itens Contratados */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center space-x-2 text-sm font-bold text-slate-800">
              <Layers className="w-4 h-4 text-blue-700" />
              <span>Itens Contratados ({itensList.length} itens)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Total consolidado dos itens:{' '}
              <strong className="text-slate-800 font-semibold">
                {totalCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </strong>
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={exportarItensParaExcel}
              disabled={itensList.length === 0}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar Itens (.xlsx)</span>
            </button>

            <Link
              href={`/contratos/${contrato.id}/editar`}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold rounded-xl transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar Itens</span>
            </Link>
          </div>
        </div>

        {/* Busca rápida de itens */}
        {itensList.length > 5 && (
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => {
                  setItemSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Filtrar itens por descrição ou número..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              />
            </div>
            <span className="text-xs text-slate-500">
              Página {currentPage} de {totalPages}
            </span>
          </div>
        )}

        {/* Tabela de Itens */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3 w-14 text-center">Item</th>
                <th className="py-2.5 px-3">Descrição Detalhada do Objeto / Serviço</th>
                <th className="py-2.5 px-3 w-20 text-center">Unidade</th>
                <th className="py-2.5 px-3 w-24 text-right">Qtd Atual</th>
                <th className="py-2.5 px-3 w-28 text-right">Valor Unit. (R$)</th>
                <th className="py-2.5 px-3 w-32 text-right">Subtotal (R$)</th>
                <th className="py-2.5 px-3 w-24 text-center">Limite Adit.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedItens.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Nenhum item encontrado.
                  </td>
                </tr>
              ) : (
                paginatedItens.map((item: any) => (
                  <tr key={item.id || item.numeroItem} className="hover:bg-slate-50/60">
                    <td className="py-2 px-3 text-center font-bold text-slate-700">
                      {item.numeroItem}
                    </td>
                    <td className="py-2 px-3 text-slate-800">
                      {item.descricao}
                    </td>
                    <td className="py-2 px-3 text-center font-semibold text-slate-600">
                      {item.unidade}
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-slate-700">
                      {item.quantidadeAtual?.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-slate-700">
                      {item.valorUnitarioAtual?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-800">
                      {item.valorTotalAtual?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="py-2 px-3 text-center text-[11px] text-slate-500">
                      +{item.limiteAcrescimoPercent || 25}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg disabled:opacity-40 cursor-pointer"
            >
              Anterior
            </button>
            <span className="text-xs text-slate-500">
              Página {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg disabled:opacity-40 cursor-pointer"
            >
              Próxima
            </button>
          </div>
        )}
      </div>

      {/* SEÇÃO: Planilhas de Composição de Custos e Formação de Preços (IN 05/2017 & IN 01/2026) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center space-x-2 text-sm font-bold text-slate-800">
              <FileSpreadsheet className="w-4 h-4 text-blue-700" />
              <span>Planilhas de Composição de Custos e Formação de Preços</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {contrato.planilhasCustos?.length || 0} {contrato.planilhasCustos?.length === 1 ? 'função' : 'funções'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Cadastro facultativo por função e posto de trabalho (IN 05/2017 e IN 01/2026 - UERN) com detalhamento dos 6 módulos e BDI.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/api/modelos-planilhas/custos"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Baixar Modelo (.xlsx)</span>
            </a>

            <button
              type="button"
              onClick={() => {
                setPlanilhaParaEditar(null);
                setShowPlanilhaModal(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Cadastrar Planilha por Função</span>
            </button>
          </div>
        </div>

        {/* Listagem das Planilhas de Custos */}
        {!contrato.planilhasCustos || contrato.planilhasCustos.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
              <Calculator className="w-5 h-5" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="text-xs font-bold text-slate-800">Nenhuma planilha de composição de custos cadastrada</h4>
              <p className="text-[11px] text-slate-500">
                O preenchimento é facultativo. Você pode importar o modelo oficial em Excel (.xlsx) ou preencher diretamente os módulos de custos da função (remuneração, encargos, provisões e BDI).
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPlanilhaParaEditar(null);
                setShowPlanilhaModal(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Cadastrar Planilha de Custos Agora</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {contrato.planilhasCustos.map((p: any) => (
              <div key={p.id} className="p-5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-4 hover:border-blue-200 transition-colors">
                {/* Linha 1: Identificação e Ações */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-slate-900 text-sm">{p.funcao}</h4>
                      {p.numeroItem && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Item {p.numeroItem} {p.item?.descricao ? `- ${p.item.descricao.slice(0, 30)}...` : ''}
                        </span>
                      )}
                      {p.cbo && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-200 text-slate-700">
                          CBO: {p.cbo}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {p.municipio || 'Mossoró/RN'} • {p.jornada || '44h semanais'} • {p.cctReferencia ? `CCT: ${p.cctReferencia}` : 'CCT Padrão'} • {p.mesesExecucao || 12} meses
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        setPlanilhaParaEditar(p);
                        setShowPlanilhaModal(true);
                      }}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      disabled={excluindoPlanilhaId === p.id}
                      onClick={() => handleDeletePlanilha(p.id)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>

                {/* Linha 2: KPIs Financeiros */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Salário-Base CCT</span>
                    <strong className="text-slate-800 text-sm font-bold">
                      {p.salarioBase?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Custo por Empregado</span>
                    <strong className="text-emerald-700 text-sm font-bold">
                      {p.precoTotalEmpregado?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Postos / Empregados</span>
                    <strong className="text-slate-800 text-sm font-bold">
                      {p.quantidadePostos || 1} postos ({p.quantidadeEmpregados || 1} emp/posto)
                    </strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Valor Mensal do Posto</span>
                    <strong className="text-blue-900 text-sm font-bold">
                      {p.valorMensalTotal?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Valor Global da Proposta</span>
                    <strong className="text-indigo-900 text-sm font-bold">
                      {p.valorGlobalTotal?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </strong>
                  </div>
                </div>

                {/* Linha 3: Módulos Detalhados */}
                <div className="p-3 bg-white rounded-xl border border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex flex-wrap gap-2 text-slate-600">
                    <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded font-medium">
                      M1 Remuneração: <strong>{p.totalModulo1?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                    </span>
                    <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded font-medium">
                      M2 Encargos/Benefícios: <strong>{p.totalModulo2?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                    </span>
                    <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded font-medium">
                      M3 Rescisão: <strong>{p.totalModulo3?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                    </span>
                    <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded font-medium">
                      M4 Reposição: <strong>{p.totalModulo4?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                    </span>
                    <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded font-medium">
                      M5 Insumos: <strong>{p.totalModulo5?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                    </span>
                    <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded font-medium">
                      M6 BDI/Tributos: <strong>{p.totalModulo6?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                    </span>
                  </div>
                  {p.fatorK && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-bold font-mono">
                      Fator K: {Number(p.fatorK).toFixed(4)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Cadastro / Edição da Planilha de Custos */}
      {showPlanilhaModal && (
        <PlanilhaCustosModal
          isOpen={showPlanilhaModal}
          onClose={() => {
            setShowPlanilhaModal(false);
            setPlanilhaParaEditar(null);
          }}
          contratoId={contrato.id}
          contratoNumero={contrato.numeroContrato || contrato.numeroEmpenho}
          itensContrato={contrato.itens || []}
          onSuccess={carregarContrato}
          planilhaParaEditar={planilhaParaEditar}
        />
      )}
    </div>
  );
}
