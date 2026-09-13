'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  FileText,
  Building2,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Upload,
  Layers,
  HelpCircle,
  Info,
  FileSpreadsheet,
  Download,
  UploadCloud,
  X,
  Check,
  RefreshCw,
  Sparkles,
  Search,
  ArrowRight,
  Save
} from 'lucide-react';

function parseBrazilianNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  let str = String(val).trim();
  str = str.replace(/R\$\s?/gi, '').trim();
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export default function EditarContratoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loadingContrato, setLoadingContrato] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [fornecedores, setFornecedores] = useState<any[]>([]);

  // Fornecedor Selection
  const [fornecedorId, setFornecedorId] = useState('');

  // Dados Gerais
  const [status, setStatus] = useState('ATIVO');
  const [numeroContrato, setNumeroContrato] = useState('');
  const [numeroEmpenho, setNumeroEmpenho] = useState('');
  const [empenhoSubstituiContrato, setEmpenhoSubstituiContrato] = useState(false);
  const [processoSeiMae, setProcessoSeiMae] = useState('');
  const [licitacaoProcedimento, setLicitacaoProcedimento] = useState('');
  const [objeto, setObjeto] = useState('');

  // Vigência & Classificação
  const [vigenciaInicio, setVigenciaInicio] = useState('');
  const [vigenciaFim, setVigenciaFim] = useState('');
  const [valorGlobal, setValorGlobal] = useState('');
  const [tipoVigencia, setTipoVigencia] = useState('NAO_CONTINUADO');
  const [portariaContinuadosRef, setPortariaContinuadosRef] = useState('');
  const [portariaContinuadosIdSei, setPortariaContinuadosIdSei] = useState('');
  const [portariaContinuadosUrl, setPortariaContinuadosUrl] = useState('');

  // Tipos
  const [tipoContrato, setTipoContrato] = useState('FORNECIMENTO_SIMPLES');
  const [tipoEmpreitada, setTipoEmpreitada] = useState('PRECO_UNITARIO');
  const [tipoMedicao, setTipoMedicao] = useState('MENSAL');

  // Reajuste & Data-Base
  const [indiceIpca, setIndiceIpca] = useState(false);
  const [indiceSetorial, setIndiceSetorial] = useState(false);
  const [nomeIndiceSetorial, setNomeIndiceSetorial] = useState('');
  const [justificativaSetorial, setJustificativaSetorial] = useState('');
  const [indiceCct, setIndiceCct] = useState(false);
  const [dataOrcamentoEstimado, setDataOrcamentoEstimado] = useState('');

  // Módulo 2 - Itens
  const [tipoAgrupamento, setTipoAgrupamento] = useState('ITEM_INDIVIDUAL');
  const [itens, setItens] = useState<Array<{
    id?: string;
    numeroItem: number;
    descricao: string;
    unidade: string;
    quantidade: string;
    valorUnitario: string;
  }>>([]);

  // Estados para Importação em Lote de Itens via Planilha
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [previewItens, setPreviewItens] = useState<Array<{
    numeroItem: number;
    descricao: string;
    unidade: string;
    quantidade: string;
    valorUnitario: string;
    subtotal: number;
  }>>([]);
  const [importMode, setImportMode] = useState<'REPLACE' | 'APPEND'>('REPLACE');
  const [autoUpdateValorGlobal, setAutoUpdateValorGlobal] = useState(true);
  const [importError, setImportError] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    // Carregar fornecedores
    fetch('/api/fornecedores')
      .then((r) => r.json())
      .then((d) => {
        if (d.fornecedores) setFornecedores(d.fornecedores);
      })
      .catch(console.error);

    // Carregar contrato
    if (id) {
      setLoadingContrato(true);
      fetch(`/api/contratos/${id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          const c = data.contrato;
          if (!c) throw new Error('Contrato não encontrado');

          setFornecedorId(c.fornecedorId || '');
          setStatus(c.status || 'ATIVO');
          setNumeroContrato(c.numeroContrato || '');
          setNumeroEmpenho(c.numeroEmpenho || '');
          setEmpenhoSubstituiContrato(!!c.empenhoSubstituiContrato);
          setProcessoSeiMae(c.processoSeiMae || '');
          setLicitacaoProcedimento(c.licitacaoProcedimento || '');
          setObjeto(c.objeto || '');

          if (c.vigenciaInicio) {
            setVigenciaInicio(new Date(c.vigenciaInicio).toISOString().split('T')[0]);
          }
          if (c.vigenciaFim) {
            setVigenciaFim(new Date(c.vigenciaFim).toISOString().split('T')[0]);
          }

          setValorGlobal(c.valorGlobal ? String(c.valorGlobal) : '0');
          setTipoVigencia(c.tipoVigencia || 'NAO_CONTINUADO');
          setPortariaContinuadosRef(c.portariaContinuadosRef || '');
          setPortariaContinuadosIdSei(c.portariaContinuadosIdSei || '');
          setPortariaContinuadosUrl(c.portariaContinuadosUrl || '');

          setTipoContrato(c.tipoContrato || 'FORNECIMENTO_SIMPLES');
          setTipoEmpreitada(c.tipoEmpreitada || 'PRECO_UNITARIO');
          setTipoMedicao(c.tipoMedicao || 'MENSAL');

          if (c.dataOrcamentoEstimado) {
            setDataOrcamentoEstimado(new Date(c.dataOrcamentoEstimado).toISOString().split('T')[0]);
          }

          // Índices
          if (c.indicesReajuste && Array.isArray(c.indicesReajuste)) {
            const hasIpca = c.indicesReajuste.some((i: any) => i.tipoIndice === 'IPCA');
            const hasCct = c.indicesReajuste.some((i: any) => i.tipoIndice === 'CONVENCAO_COLETIVA');
            const setorial = c.indicesReajuste.find((i: any) => i.tipoIndice === 'SETORIAL');

            setIndiceIpca(hasIpca);
            setIndiceCct(hasCct);
            if (setorial) {
              setIndiceSetorial(true);
              setNomeIndiceSetorial(setorial.nomeIndiceSetorial || '');
              setJustificativaSetorial(setorial.justificativaSetorial || '');
            }
          }

          // Itens
          if (c.itens && Array.isArray(c.itens) && c.itens.length > 0) {
            setItens(
              c.itens.map((it: any) => ({
                id: it.id,
                numeroItem: it.numeroItem,
                descricao: it.descricao,
                unidade: it.unidade || 'UN',
                quantidade: String(it.quantidadeAtual ?? it.quantidadeOriginal ?? 1),
                valorUnitario: String(it.valorUnitarioAtual ?? it.valorUnitarioOriginal ?? 0),
              }))
            );
            if (c.itens[0]?.tipoGrupo) {
              setTipoAgrupamento(c.itens[0].tipoGrupo);
            }
          } else {
            setItens([
              { numeroItem: 1, descricao: '', unidade: 'UN', quantidade: '1', valorUnitario: '0' }
            ]);
          }
        })
        .catch((err: any) => {
          setError(err.message);
        })
        .finally(() => {
          setLoadingContrato(false);
        });
    }
  }, [id]);

  const handleAddItem = () => {
    setItens([
      ...itens,
      { numeroItem: itens.length + 1, descricao: '', unidade: 'UN', quantidade: '1', valorUnitario: '0' }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (itens.length === 1) return;
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const updated = [...itens];
    (updated[index] as any)[field] = value;
    setItens(updated);
  };

  const totalCalculadoItens = itens.reduce((acc, item) => {
    const q = parseFloat(item.quantidade) || 0;
    const v = parseFloat(item.valorUnitario) || 0;
    return acc + q * v;
  }, 0);

  const sincronizarValorGlobal = () => {
    setValorGlobal(totalCalculadoItens.toFixed(2));
  };

  // Processamento de Planilha
  const processarPlanilhaItens = (file: File) => {
    setImportError(null);
    setImportFile(file);
    setImportFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        if (!rows || rows.length === 0) {
          setImportError('A planilha selecionada está vazia.');
          setPreviewItens([]);
          return;
        }

        const parsedList: Array<{
          numeroItem: number;
          descricao: string;
          unidade: string;
          quantidade: string;
          valorUnitario: string;
          subtotal: number;
        }> = [];

        rows.forEach((row, index) => {
          const keys = Object.keys(row);
          let numeroItem = index + 1;
          let descricao = '';
          let unidade = 'UN';
          let quantidade = 1;
          let valorUnitario = 0;

          keys.forEach((key) => {
            const val = row[key];
            const norm = key
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .trim();

            if (norm === 'item' || norm === 'no' || norm === 'num' || norm === 'numero') {
              const p = parseInt(String(val).replace(/\D/g, ''));
              if (!isNaN(p) && p > 0) numeroItem = p;
            } else if (norm.includes('desc') || norm.includes('especifica') || norm.includes('objeto') || norm.includes('material') || norm.includes('servico')) {
              descricao = String(val || '').trim();
            } else if (norm.includes('unid') || norm === 'und' || norm === 'un') {
              unidade = String(val || 'UN').trim().toUpperCase();
            } else if (norm.includes('quant') || norm === 'qtd' || norm === 'qtd.' || norm === 'quant.') {
              quantidade = parseBrazilianNumber(val);
            } else if (norm.includes('unit') || norm.includes('preco') || norm.includes('valor unit') || norm === 'vu') {
              valorUnitario = parseBrazilianNumber(val);
            }
          });

          if (descricao || valorUnitario > 0 || quantidade > 0) {
            parsedList.push({
              numeroItem,
              descricao: descricao || `Item ${numeroItem}`,
              unidade: unidade || 'UN',
              quantidade: String(quantidade || 1),
              valorUnitario: String(valorUnitario || 0),
              subtotal: (quantidade || 1) * (valorUnitario || 0),
            });
          }
        });

        if (parsedList.length === 0) {
          setImportError('Nenhum item válido identificado na planilha.');
          setPreviewItens([]);
          return;
        }

        setPreviewItens(parsedList);
      } catch (err: any) {
        setImportError('Falha ao processar arquivo: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmarImportacao = () => {
    if (previewItens.length === 0) return;

    if (importMode === 'REPLACE') {
      setItens(previewItens.map((p) => ({
        numeroItem: p.numeroItem,
        descricao: p.descricao,
        unidade: p.unidade,
        quantidade: p.quantidade,
        valorUnitario: p.valorUnitario,
      })));
    } else {
      const proximoNum = itens.length > 0 ? Math.max(...itens.map((i) => i.numeroItem)) + 1 : 1;
      const novos = previewItens.map((p, idx) => ({
        numeroItem: proximoNum + idx,
        descricao: p.descricao,
        unidade: p.unidade,
        quantidade: p.quantidade,
        valorUnitario: p.valorUnitario,
      }));
      setItens([...itens, ...novos]);
    }

    if (autoUpdateValorGlobal) {
      const somaPlanilha = previewItens.reduce((acc, p) => acc + p.subtotal, 0);
      const novoTotal = importMode === 'REPLACE' ? somaPlanilha : totalCalculadoItens + somaPlanilha;
      setValorGlobal(novoTotal.toFixed(2));
    }

    setShowImportModal(false);
    setPreviewItens([]);
    setImportFile(null);
    setImportFileName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSucesso(null);
    setSalvando(true);

    try {
      const listaIndices = [];
      if (indiceIpca) listaIndices.push({ tipoIndice: 'IPCA' });
      if (indiceSetorial) {
        listaIndices.push({
          tipoIndice: 'SETORIAL',
          nomeIndiceSetorial,
          justificativaSetorial,
        });
      }
      if (indiceCct) listaIndices.push({ tipoIndice: 'CONVENCAO_COLETIVA' });

      const payload = {
        status,
        numeroContrato,
        numeroEmpenho,
        empenhoSubstituiContrato,
        processoSeiMae,
        licitacaoProcedimento,
        objeto,
        vigenciaInicio,
        vigenciaFim,
        valorGlobal,
        tipoVigencia,
        portariaContinuadosRef,
        portariaContinuadosIdSei,
        portariaContinuadosUrl,
        tipoContrato,
        tipoEmpreitada,
        tipoMedicao,
        dataOrcamentoEstimado: dataOrcamentoEstimado || null,
        fornecedorId,
        indices: listaIndices,
        itens: itens.map((it) => ({
          ...it,
          tipoGrupo: tipoAgrupamento,
        })),
      };

      const res = await fetch(`/api/contratos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao atualizar contrato.');

      setSucesso('Contrato atualizado com sucesso no banco de dados!');
      setTimeout(() => {
        router.push(`/contratos/${id}`);
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const filteredItens = itens.filter(
    (it) =>
      it.descricao.toLowerCase().includes(itemSearch.toLowerCase()) ||
      String(it.numeroItem).includes(itemSearch)
  );
  const totalPages = Math.ceil(filteredItens.length / pageSize) || 1;
  const paginatedItens = filteredItens.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loadingContrato) {
    return (
      <div className="max-w-5xl mx-auto p-16 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-[#003366] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Carregando dados do contrato para edição...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <Link
            href={`/contratos/${id}`}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Edição de Contrato Administrativo
            </h1>
            <p className="text-xs text-slate-500">
              {numeroContrato ? `Contrato nº ${numeroContrato}` : `Empenho nº ${numeroEmpenho}`} • Processo SEI: {processoSeiMae || 'S/N'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-semibold mr-1">Status:</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 outline-none"
          >
            <option value="ATIVO">🟢 ATIVO</option>
            <option value="SUSPENSO">🟡 SUSPENSO</option>
            <option value="INATIVO">⚪ INATIVO</option>
          </select>
        </div>
      </div>

      {sucesso && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{sucesso}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SEÇÃO 1: FORNECEDOR */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2 text-sm font-bold text-slate-800">
              <Building2 className="w-4 h-4 text-blue-700" />
              <span>Fornecedor / Empresa Contratada</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Selecione o Fornecedor Cadastrado *</label>
            <select
              value={fornecedorId}
              onChange={(e) => setFornecedorId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none"
            >
              <option value="">Selecione a empresa...</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.razaoSocial} — CNPJ: {f.cnpj}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SEÇÃO 2: DADOS GERAIS */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
            <FileText className="w-4 h-4 text-blue-700" />
            <span>Identificação e Formalização do Contrato</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Número do Contrato</label>
              <input
                type="text"
                value={numeroContrato}
                onChange={(e) => setNumeroContrato(e.target.value)}
                placeholder="Ex: 11/2026"
                disabled={empenhoSubstituiContrato}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Número da Nota de Empenho</label>
              <input
                type="text"
                value={numeroEmpenho}
                onChange={(e) => setNumeroEmpenho(e.target.value)}
                placeholder="Ex: 2026NE000123"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={empenhoSubstituiContrato}
                  onChange={(e) => setEmpenhoSubstituiContrato(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span>Nota de Empenho substitui o Contrato</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Processo SEI da Contratação (Processo Mãe) *</label>
              <input
                type="text"
                value={processoSeiMae}
                onChange={(e) => setProcessoSeiMae(e.target.value)}
                placeholder="04410035.003671/2025-75"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Procedimento Licitatório / Base Legal *</label>
              <input
                type="text"
                value={licitacaoProcedimento}
                onChange={(e) => setLicitacaoProcedimento(e.target.value)}
                placeholder="Pregão Eletrônico nº 05/2025 ou Dispensa Art. 75, II"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Objeto da Contratação *</label>
            <textarea
              rows={3}
              value={objeto}
              onChange={(e) => setObjeto(e.target.value)}
              placeholder="Descreva de forma completa e precisa o objeto contratado..."
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none resize-none"
            />
          </div>
        </div>

        {/* SEÇÃO 3: VIGÊNCIA & VALORES */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
            <Calendar className="w-4 h-4 text-blue-700" />
            <span>Vigência, Valores e Classificação Contratual</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Início da Vigência *</label>
              <input
                type="date"
                value={vigenciaInicio}
                onChange={(e) => setVigenciaInicio(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Fim da Vigência *</label>
              <input
                type="date"
                value={vigenciaFim}
                onChange={(e) => setVigenciaFim(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Valor Global (R$) *</label>
              <input
                type="number"
                step="0.01"
                value={valorGlobal}
                onChange={(e) => setValorGlobal(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-blue-900 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Regime de Vigência *</label>
              <select
                value={tipoVigencia}
                onChange={(e) => setTipoVigencia(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-semibold text-slate-800"
              >
                <option value="NAO_CONTINUADO">Não Continuado (Escopo / 1 ano)</option>
                <option value="CONTINUADO">Continuado (Até 10 anos - Lei 14.133)</option>
                <option value="LOCACAO_IMOVEL">Locação de Imóvel</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Tipo de Contrato *</label>
              <select
                value={tipoContrato}
                onChange={(e) => setTipoContrato(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-semibold text-slate-800"
              >
                <option value="FORNECIMENTO_SIMPLES">Fornecimento Simples</option>
                <option value="FORNECIMENTO_CONTINUADO">Fornecimento Continuado</option>
                <option value="SERVICO_SEM_DEDICACAO">Serviço Sem Dedicação Exclusiva</option>
                <option value="SERVICO_COM_DEDICACAO_TERCEIRIZACAO">Serviço Com Dedicação (Terceirização)</option>
                <option value="OBRA">Obra / Engenharia</option>
                <option value="LOCACAO_IMOVEL">Locação de Imóvel</option>
                <option value="SERVICOS_TECNICOS_PROFISSIONAIS">Serviços Técnicos Especializados</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Tipo de Empreitada *</label>
              <select
                value={tipoEmpreitada}
                onChange={(e) => setTipoEmpreitada(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              >
                <option value="PRECO_UNITARIO">Preço Unitário</option>
                <option value="PRECO_GLOBAL">Preço Global</option>
                <option value="EMPREITADA_INTEGRAL">Empreitada Integral</option>
                <option value="ESCOPO">Por Escopo</option>
                <option value="TAREFA">Tarefa</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Medição / Pagamento *</label>
              <select
                value={tipoMedicao}
                onChange={(e) => setTipoMedicao(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              >
                <option value="MENSAL">Mensal</option>
                <option value="ENTREGA_UNICA">Entrega Única</option>
                <option value="POR_DEMANDA">Por Demanda / Ordem de Serviço</option>
                <option value="POR_EVENTO">Por Etapa / Evento</option>
              </select>
            </div>
          </div>
        </div>

        {/* SEÇÃO 4: REAJUSTE E DATA-BASE */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
            <DollarSign className="w-4 h-4 text-blue-700" />
            <span>Regras de Reajuste e Interregno (Art. 63 da IN 01/2026)</span>
          </div>

          <div className="space-y-1.5 max-w-sm">
            <label className="text-xs font-bold text-slate-700">Data do Orçamento Estimado da Licitação (Data-Base)</label>
            <input
              type="date"
              value={dataOrcamentoEstimado}
              onChange={(e) => setDataOrcamentoEstimado(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={indiceIpca}
                onChange={(e) => setIndiceIpca(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span>Índice Geral: IPCA (IBGE)</span>
            </label>

            <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={indiceSetorial}
                onChange={(e) => setIndiceSetorial(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span>Índice Setorial Específico</span>
            </label>

            <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={indiceCct}
                onChange={(e) => setIndiceCct(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span>Repactuação por Convenção Coletiva (CCT)</span>
            </label>
          </div>

          {indiceSetorial && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Nome do Índice Setorial *</label>
                <input
                  type="text"
                  value={nomeIndiceSetorial}
                  onChange={(e) => setNomeIndiceSetorial(e.target.value)}
                  placeholder="Ex: INCC, IGPM, IGP-DI"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Justificativa do Índice Setorial *</label>
                <input
                  type="text"
                  value={justificativaSetorial}
                  onChange={(e) => setJustificativaSetorial(e.target.value)}
                  placeholder="Justificativa conforme termo de referência"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO 5: ITENS DO CONTRATO */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center space-x-2 text-sm font-bold text-slate-800">
                <Layers className="w-4 h-4 text-blue-700" />
                <span>Relação de Itens Contratados ({itens.length} itens)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Aditamentos limitados a {tipoContrato === 'OBRA' ? '50%' : '25%'} conforme Lei 14.133/2021.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-xl transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Importar Planilha</span>
              </button>

              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Item</span>
              </button>
            </div>
          </div>

          {/* Busca de Itens */}
          {itens.length > 5 && (
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Pesquisar itens por descrição ou número..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Página {currentPage} de {totalPages} ({itens.length} itens no total)
              </div>
            </div>
          )}

          {/* Tabela de Itens */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 w-14 text-center">Item</th>
                  <th className="py-2.5 px-3">Descrição Detalhada do Objeto / Serviço</th>
                  <th className="py-2.5 px-3 w-20">Unidade</th>
                  <th className="py-2.5 px-3 w-28">Quantidade</th>
                  <th className="py-2.5 px-3 w-32">Valor Unit. (R$)</th>
                  <th className="py-2.5 px-3 w-32 text-right">Subtotal (R$)</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItens.map((item, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx;
                  const q = parseFloat(item.quantidade) || 0;
                  const v = parseFloat(item.valorUnitario) || 0;
                  const subtotal = q * v;

                  return (
                    <tr key={globalIdx} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 text-center font-bold text-slate-700">
                        {item.numeroItem}
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.descricao}
                          onChange={(e) => handleItemChange(globalIdx, 'descricao', e.target.value)}
                          placeholder="Descrição do item"
                          required
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.unidade}
                          onChange={(e) => handleItemChange(globalIdx, 'unidade', e.target.value)}
                          placeholder="UN"
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs uppercase outline-none text-center"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="any"
                          value={item.quantidade}
                          onChange={(e) => handleItemChange(globalIdx, 'quantidade', e.target.value)}
                          required
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.0001"
                          value={item.valorUnitario}
                          onChange={(e) => handleItemChange(globalIdx, 'valorUnitario', e.target.value)}
                          required
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-800">
                        {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(globalIdx)}
                          disabled={itens.length === 1}
                          className="p-1 text-slate-400 hover:text-red-600 rounded disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
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

          {/* Totalizador de Itens e Sincronização */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="space-y-1">
              <div className="text-xs text-slate-600">
                Soma dos {itens.length} itens calculados:{' '}
                <strong className="text-slate-800 text-sm">
                  {totalCalculadoItens.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </strong>
              </div>
              {Math.abs(totalCalculadoItens - (parseFloat(valorGlobal) || 0)) > 0.01 && (
                <div className="text-[11px] text-amber-700 flex items-center space-x-1 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>
                    Diferença de {(totalCalculadoItens - (parseFloat(valorGlobal) || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em relação ao Valor Global do Contrato.
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={sincronizarValorGlobal}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer self-end sm:self-center"
            >
              Sincronizar com Valor Global
            </button>
          </div>
        </div>

        {/* BOTOES DE AÇÃO */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
          <Link
            href={`/contratos/${id}`}
            className="px-5 py-2.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={salvando}
            className="px-6 py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center space-x-2 disabled:opacity-60 cursor-pointer"
          >
            {salvando ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Alterações do Contrato</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* MODAL DE IMPORTAÇÃO DE PLANILHA */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Importar ou Atualizar Itens via Planilha
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Formatos suportados: Excel (.xlsx, .xls) ou CSV
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4 overflow-y-auto flex-1">
              <div
                onClick={() => document.getElementById('edit-sheet-upload-input')?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 rounded-2xl p-6 text-center transition-all cursor-pointer group"
              >
                <input
                  id="edit-sheet-upload-input"
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) processarPlanilhaItens(f);
                  }}
                  className="hidden"
                />
                <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-emerald-600 mx-auto transition-colors" />
                <p className="text-xs font-bold text-slate-700 mt-2">
                  Clique para selecionar a planilha de itens
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  ou arraste e solte o arquivo Excel aqui
                </p>
              </div>

              {importFileName && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Arquivo: <strong>{importFileName}</strong></span>
                  </div>
                  <span className="font-bold">{previewItens.length} itens identificados</span>
                </div>
              )}

              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}

              {previewItens.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Modo de Aplicação:</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className={`p-3 rounded-xl border cursor-pointer flex items-center space-x-2.5 text-xs ${
                      importMode === 'REPLACE' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 font-bold' : 'border-slate-200 bg-white text-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="editImportMode"
                        value="REPLACE"
                        checked={importMode === 'REPLACE'}
                        onChange={() => setImportMode('REPLACE')}
                        className="text-emerald-600"
                      />
                      <div>
                        <span>Substituir Itens Atuais</span>
                        <span className="text-[10px] text-slate-500 block font-normal">Substitui os {itens.length} itens existentes</span>
                      </div>
                    </label>

                    <label className={`p-3 rounded-xl border cursor-pointer flex items-center space-x-2.5 text-xs ${
                      importMode === 'APPEND' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 font-bold' : 'border-slate-200 bg-white text-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="editImportMode"
                        value="APPEND"
                        checked={importMode === 'APPEND'}
                        onChange={() => setImportMode('APPEND')}
                        className="text-emerald-600"
                      />
                      <div>
                        <span>Acrescentar aos Existentes</span>
                        <span className="text-[10px] text-slate-500 block font-normal">Mantém os {itens.length} atuais e adiciona estes</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={previewItens.length === 0}
                onClick={confirmarImportacao}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-900/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar e Carregar ({previewItens.length} itens)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
