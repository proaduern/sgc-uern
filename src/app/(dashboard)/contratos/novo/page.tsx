'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Save,
  Bookmark,
  Clock
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

function NovoContratoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rascunhoParam = searchParams.get('rascunhoId');
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fornecedor Selection / New
  const [isNovoFornecedor, setIsNovoFornecedor] = useState(false);
  const [fornecedorId, setFornecedorId] = useState('');
  const [fornecedorNovo, setFornecedorNovo] = useState({
    razaoSocial: '',
    cnpj: '',
    email: '',
    telefone: '',
    nomePreposto: '',
  });

  // Dados Gerais
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
  const [indices, setIndices] = useState<Array<{ tipoIndice: string; nomeIndiceSetorial?: string; justificativaSetorial?: string }>>([]);
  const [indiceIpca, setIndiceIpca] = useState(false);
  const [indiceSetorial, setIndiceSetorial] = useState(false);
  const [nomeIndiceSetorial, setNomeIndiceSetorial] = useState('');
  const [justificativaSetorial, setJustificativaSetorial] = useState('');
  const [indiceCct, setIndiceCct] = useState(false);
  const [dataOrcamentoEstimado, setDataOrcamentoEstimado] = useState('');

  // Módulo 2 - Itens
  const [tipoAgrupamento, setTipoAgrupamento] = useState('ITEM_INDIVIDUAL'); // GRUPO_UNICO ou ITEM_INDIVIDUAL
  const [itens, setItens] = useState<Array<{
    numeroItem: number;
    descricao: string;
    unidade: string;
    quantidade: string;
    valorUnitario: string;
  }>>([
    { numeroItem: 1, descricao: '', unidade: 'UN', quantidade: '1', valorUnitario: '0' }
  ]);

  // Estados de Gerenciamento de Rascunho
  const [rascunhoId, setRascunhoId] = useState<string | null>(null);
  const [rascunhoSalvoEm, setRascunhoSalvoEm] = useState<string | null>(null);
  const [salvandoRascunho, setSalvandoRascunho] = useState(false);
  const [rascunhoDetectado, setRascunhoDetectado] = useState<any | null>(null);
  const [feedbackRascunho, setFeedbackRascunho] = useState<string | null>(null);

  const aplicarDadosRascunho = (dados: any, id?: string) => {
    if (!dados) return;
    if (id) setRascunhoId(id);
    if (dados.fornecedorId !== undefined) setFornecedorId(dados.fornecedorId || '');
    if (dados.isNovoFornecedor !== undefined) setIsNovoFornecedor(!!dados.isNovoFornecedor);
    if (dados.fornecedorNovo) setFornecedorNovo(dados.fornecedorNovo);
    if (dados.numeroContrato !== undefined) setNumeroContrato(dados.numeroContrato || '');
    if (dados.numeroEmpenho !== undefined) setNumeroEmpenho(dados.numeroEmpenho || '');
    if (dados.empenhoSubstituiContrato !== undefined) setEmpenhoSubstituiContrato(!!dados.empenhoSubstituiContrato);
    if (dados.processoSeiMae !== undefined) setProcessoSeiMae(dados.processoSeiMae || '');
    if (dados.licitacaoProcedimento !== undefined) setLicitacaoProcedimento(dados.licitacaoProcedimento || '');
    if (dados.objeto !== undefined) setObjeto(dados.objeto || '');
    if (dados.vigenciaInicio !== undefined) setVigenciaInicio(dados.vigenciaInicio || '');
    if (dados.vigenciaFim !== undefined) setVigenciaFim(dados.vigenciaFim || '');
    if (dados.valorGlobal !== undefined) setValorGlobal(dados.valorGlobal || '');
    if (dados.tipoVigencia !== undefined) setTipoVigencia(dados.tipoVigencia || 'NAO_CONTINUADO');
    if (dados.portariaContinuadosRef !== undefined) setPortariaContinuadosRef(dados.portariaContinuadosRef || '');
    if (dados.portariaContinuadosIdSei !== undefined) setPortariaContinuadosIdSei(dados.portariaContinuadosIdSei || '');
    if (dados.portariaContinuadosUrl !== undefined) setPortariaContinuadosUrl(dados.portariaContinuadosUrl || '');
    if (dados.tipoContrato !== undefined) setTipoContrato(dados.tipoContrato || 'FORNECIMENTO_SIMPLES');
    if (dados.tipoEmpreitada !== undefined) setTipoEmpreitada(dados.tipoEmpreitada || 'PRECO_UNITARIO');
    if (dados.tipoMedicao !== undefined) setTipoMedicao(dados.tipoMedicao || 'MENSAL');
    if (dados.indiceIpca !== undefined) setIndiceIpca(!!dados.indiceIpca);
    if (dados.indiceSetorial !== undefined) setIndiceSetorial(!!dados.indiceSetorial);
    if (dados.nomeIndiceSetorial !== undefined) setNomeIndiceSetorial(dados.nomeIndiceSetorial || '');
    if (dados.justificativaSetorial !== undefined) setJustificativaSetorial(dados.justificativaSetorial || '');
    if (dados.indiceCct !== undefined) setIndiceCct(!!dados.indiceCct);
    if (dados.dataOrcamentoEstimado !== undefined) setDataOrcamentoEstimado(dados.dataOrcamentoEstimado || '');
    if (dados.tipoAgrupamento !== undefined) setTipoAgrupamento(dados.tipoAgrupamento || 'ITEM_INDIVIDUAL');
    if (dados.itens && Array.isArray(dados.itens) && dados.itens.length > 0) {
      setItens(dados.itens);
    }
  };

  const handleSalvarRascunho = async () => {
    setSalvandoRascunho(true);
    setFeedbackRascunho(null);
    try {
      const payload = {
        id: rascunhoId || undefined,
        tituloIdentificador: numeroContrato
          ? `Contrato nº ${numeroContrato}`
          : (objeto ? (objeto.length > 40 ? objeto.substring(0, 37) + '...' : objeto) : 'Rascunho em Andamento'),
        numeroContrato: numeroContrato || null,
        processoSei: processoSeiMae || null,
        objeto: objeto || null,
        dados: {
          fornecedorId,
          isNovoFornecedor,
          fornecedorNovo,
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
          indiceIpca,
          indiceSetorial,
          nomeIndiceSetorial,
          justificativaSetorial,
          indiceCct,
          dataOrcamentoEstimado,
          tipoAgrupamento,
          itens,
        },
      };

      const res = await fetch('/api/contratos/rascunhos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar rascunho.');

      setRascunhoId(data.id);
      const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setRascunhoSalvoEm(hora);
      setFeedbackRascunho(`Rascunho salvo com sucesso às ${hora}! Fica armazenado no sistema mesmo que você deslogue.`);
      setRascunhoDetectado(null);
    } catch (err: any) {
      setError('Erro ao salvar rascunho: ' + err.message);
    } finally {
      setSalvandoRascunho(false);
    }
  };

  const handleDescartarRascunho = async (idParaDescartar?: string) => {
    const targetId = idParaDescartar || rascunhoId || rascunhoDetectado?.id;
    if (!targetId) {
      setRascunhoDetectado(null);
      return;
    }
    if (!confirm('Deseja realmente descartar este rascunho? Os dados preenchidos serão perdidos.')) return;

    try {
      await fetch(`/api/contratos/rascunhos/${targetId}`, { method: 'DELETE' });
      if (rascunhoId === targetId) {
        setRascunhoId(null);
        setRascunhoSalvoEm(null);
      }
      setRascunhoDetectado(null);
      setFeedbackRascunho('Rascunho descartado com sucesso.');
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetch('/api/fornecedores')
      .then((r) => r.json())
      .then((d) => {
        if (d.fornecedores) setFornecedores(d.fornecedores);
      })
      .catch(console.error);

    // Verificar se há rascunho específico solicitado na URL
    if (rascunhoParam) {
      fetch(`/api/contratos/rascunhos/${rascunhoParam}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && data.dados) {
            aplicarDadosRascunho(data.dados, data.id);
            setFeedbackRascunho(`Rascunho carregado (${data.tituloIdentificador || 'Contrato'}). Você pode continuar o preenchimento.`);
          }
        })
        .catch(console.error);
    } else {
      // Verificar se o usuário possui algum rascunho salvo anteriormente
      fetch('/api/contratos/rascunhos')
        .then((r) => r.json())
        .then((list) => {
          if (Array.isArray(list) && list.length > 0) {
            setRascunhoDetectado(list[0]);
          }
        })
        .catch(console.error);
    }
  }, [rascunhoParam]);

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
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Processamento da Planilha Excel (.xlsx, .xls, .csv)
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
          setImportError('A planilha selecionada está vazia ou não contém dados na primeira aba.');
          setPreviewItens([]);
          return;
        }

        // Mapear colunas de forma flexível e inteligente
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
              .replace(/[^a-z0-9]/g, '');

            // Detectar Número do Item
            if (norm === 'item' || norm === 'n' || norm === 'no' || norm === 'numero' || norm === 'num' || norm === 'seq' || norm === 'codigo') {
              const parsedNum = parseInt(String(val).replace(/\D/g, ''), 10);
              if (!isNaN(parsedNum) && parsedNum > 0) numeroItem = parsedNum;
            }
            // Detectar Descrição
            else if (norm.includes('desc') || norm.includes('espec') || norm.includes('objeto') || norm.includes('material') || norm.includes('serv') || norm.includes('prod') || norm === 'itemdescricao') {
              if (val) descricao = String(val).trim();
            }
            // Detectar Unidade
            else if (norm === 'un' || norm === 'und' || norm.includes('unid') || norm.includes('medida')) {
              if (val) unidade = String(val).trim().toUpperCase();
            }
            // Detectar Quantidade
            else if (norm.includes('quant') || norm.includes('qtd') || norm === 'q' || norm === 'qnt') {
              const q = parseBrazilianNumber(val);
              if (q > 0) quantidade = q;
            }
            // Detectar Valor Unitário
            else if (norm.includes('unit') || norm.includes('preco') || norm.includes('valorunit') || norm === 'vu' || norm.includes('vlr')) {
              const v = parseBrazilianNumber(val);
              if (v >= 0) valorUnitario = v;
            }
          });

          // Se a descrição foi encontrada ou se há algum valor na linha
          if (descricao || valorUnitario > 0 || row[keys[0]]) {
            if (!descricao) descricao = String(row[keys[0]] || `Item ${index + 1}`);
            parsedList.push({
              numeroItem,
              descricao,
              unidade: unidade || 'UN',
              quantidade: String(quantidade),
              valorUnitario: String(valorUnitario),
              subtotal: quantidade * valorUnitario,
            });
          }
        });

        if (parsedList.length === 0) {
          setImportError('Nenhum item válido pôde ser extraído da planilha. Baixe o modelo oficial para conferir a estrutura.');
          setPreviewItens([]);
        } else {
          setPreviewItens(parsedList);
        }
      } catch (err: any) {
        console.error('Erro ao ler planilha:', err);
        setImportError('Falha ao processar arquivo. Certifique-se de que é uma planilha Excel (.xlsx, .xls) ou CSV válida.');
        setPreviewItens([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Confirmar Importação
  const confirmarImportacao = () => {
    if (previewItens.length === 0) return;

    let novaLista: typeof itens = [];

    if (importMode === 'REPLACE') {
      novaLista = previewItens.map((p, idx) => ({
        numeroItem: idx + 1,
        descricao: p.descricao,
        unidade: p.unidade,
        quantidade: p.quantidade,
        valorUnitario: p.valorUnitario,
      }));
    } else {
      // APPEND
      const startNum = itens.length;
      const adicionados = previewItens.map((p, idx) => ({
        numeroItem: startNum + idx + 1,
        descricao: p.descricao,
        unidade: p.unidade,
        quantidade: p.quantidade,
        valorUnitario: p.valorUnitario,
      }));
      novaLista = [...itens, ...adicionados];
    }

    setItens(novaLista);

    // Atualizar Valor Global se solicitado
    if (autoUpdateValorGlobal) {
      const somaTotal = novaLista.reduce((acc, it) => {
        const q = parseFloat(it.quantidade) || 0;
        const v = parseFloat(it.valorUnitario) || 0;
        return acc + q * v;
      }, 0);
      setValorGlobal(somaTotal.toFixed(2));
    }

    setImportSuccessMsg(`✅ ${previewItens.length} itens carregados com sucesso da planilha!`);
    setShowImportModal(false);
    setImportFile(null);
    setPreviewItens([]);
    setCurrentPage(1);

    setTimeout(() => {
      setImportSuccessMsg(null);
    }, 6000);
  };

  // Download do Modelo Oficial de Itens
  const baixarModeloItens = () => {
    const dadosModelo = [
      {
        Item: 1,
        Descricao: 'Papel Sulfite A4 75g/m² alcalino resma com 500 folhas',
        Unidade: 'RESMA',
        Quantidade: 500,
        ValorUnitario: 28.50,
      },
      {
        Item: 2,
        Descricao: 'Caneta esferográfica corpo transparente tinta azul 1.0mm',
        Unidade: 'CX',
        Quantidade: 100,
        ValorUnitario: 45.00,
      },
      {
        Item: 3,
        Descricao: 'Toner compatível para impressora HP LaserJet Pro M404n',
        Unidade: 'UN',
        Quantidade: 30,
        ValorUnitario: 175.00,
      },
      {
        Item: 4,
        Descricao: 'Serviço de manutenção preventiva e corretiva em aparelhos de ar-condicionado',
        Unidade: 'MÊS',
        Quantidade: 12,
        ValorUnitario: 3800.00,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(dadosModelo);
    ws['!cols'] = [
      { wch: 8 },
      { wch: 70 },
      { wch: 12 },
      { wch: 14 },
      { wch: 18 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Itens_Contrato_UERN');
    XLSX.writeFile(wb, 'Modelo_Importacao_Itens_Contrato_UERN.xlsx');
  };

  // Exportar Itens Atuais para Excel
  const exportarItensParaExcel = () => {
    if (itens.length === 0) return;
    const dados = itens.map((it) => ({
      Item: it.numeroItem,
      Descricao: it.descricao,
      Unidade: it.unidade,
      Quantidade: parseFloat(it.quantidade) || 0,
      ValorUnitario: parseFloat(it.valorUnitario) || 0,
      Total: (parseFloat(it.quantidade) || 0) * (parseFloat(it.valorUnitario) || 0),
    }));
    const ws = XLSX.utils.json_to_sheet(dados);
    ws['!cols'] = [
      { wch: 8 },
      { wch: 60 },
      { wch: 10 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Itens');
    XLSX.writeFile(wb, `Itens_Contrato_${numeroContrato || 'Rascunho'}.xlsx`);
  };

  // Limpar Todos os Itens
  const handleLimparItens = () => {
    if (confirm('Deseja realmente limpar todos os itens cadastrados?')) {
      setItens([{ numeroItem: 1, descricao: '', unidade: 'UN', quantidade: '1', valorUnitario: '0' }]);
      setCurrentPage(1);
    }
  };

  // Sincronizar Valor Global com Soma dos Itens
  const sincronizarValorGlobal = () => {
    setValorGlobal(totalCalculadoItens.toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Montar lista de índices
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
        fornecedorId: isNovoFornecedor ? null : fornecedorId,
        fornecedorNovo: isNovoFornecedor ? fornecedorNovo : null,
        indices: listaIndices,
        itens: itens.map((it) => ({
          ...it,
          tipoGrupo: tipoAgrupamento,
        })),
      };

      const res = await fetch('/api/contratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao cadastrar contrato.');

      // Se havia um rascunho ativo, excluir após criação bem-sucedida do contrato
      if (rascunhoId) {
        try {
          await fetch(`/api/contratos/rascunhos/${rascunhoId}`, { method: 'DELETE' });
        } catch (e) {
          console.error('Falha ao limpar rascunho:', e);
        }
      }

      router.push('/contratos');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isObra = tipoContrato === 'OBRA';
  const limiteAcrescimoLegal = isObra ? 50 : 25;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <Link
            href="/contratos"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Cadastro de Contrato Administrativo</h1>
            <p className="text-xs text-slate-500">
              Conforme IN nº 01/2026 - PROAD/UERN e Lei Federal nº 14.133/2021
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleSalvarRascunho}
            disabled={salvandoRascunho}
            className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold rounded-xl transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer disabled:opacity-60"
            title="Salvar rascunho parcial para continuar depois, mesmo após logout"
          >
            {salvandoRascunho ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
            ) : (
              <Save className="w-3.5 h-3.5 text-amber-700" />
            )}
            <span>{salvandoRascunho ? 'Salvando...' : 'Salvar Rascunho'}</span>
          </button>
        </div>
      </div>

      {/* Banner de Feedback de Rascunho */}
      {feedbackRascunho && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{feedbackRascunho}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackRascunho(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Banner de Rascunho Detectado */}
      {rascunhoDetectado && !rascunhoId && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in">
          <div className="flex items-start space-x-3">
            <Bookmark className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">
                Você possui um rascunho em andamento salvo no banco:
              </p>
              <p className="text-slate-600 mt-0.5">
                <strong>{rascunhoDetectado.tituloIdentificador || 'Rascunho'}</strong>
                {rascunhoDetectado.numeroContrato ? ` • Contrato nº ${rascunhoDetectado.numeroContrato}` : ''}
                {rascunhoDetectado.objeto ? ` • ${rascunhoDetectado.objeto.substring(0, 60)}...` : ''}
                <span className="text-slate-500 block text-[11px] mt-0.5">
                  Salvo em: {new Date(rascunhoDetectado.updatedAt).toLocaleString('pt-BR')}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => handleDescartarRascunho(rascunhoDetectado.id)}
              className="px-3 py-1.5 border border-slate-300 hover:bg-white text-slate-600 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={() => {
                aplicarDadosRascunho(rascunhoDetectado.dados, rascunhoDetectado.id);
                setRascunhoDetectado(null);
                setFeedbackRascunho('Rascunho restaurado com sucesso! Você pode continuar o preenchimento de onde parou.');
              }}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restaurar Rascunho</span>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SEÇÃO 1: FORNECEDOR / EMPRESA CONTRATADA */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2 text-sm font-bold text-slate-800">
              <Building2 className="w-4 h-4 text-blue-700" />
              <span>1. Fornecedor / Empresa Contratada</span>
            </div>
            <button
              type="button"
              onClick={() => setIsNovoFornecedor(!isNovoFornecedor)}
              className="text-xs text-blue-700 hover:underline font-semibold"
            >
              {isNovoFornecedor ? 'Selecionar Cadastrado' : '+ Cadastrar Novo Fornecedor'}
            </button>
          </div>

          {!isNovoFornecedor ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Empresa Contratada Cadastrada
              </label>
              <select
                required
                value={fornecedorId}
                onChange={(e) => setFornecedorId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600"
              >
                <option value="">Selecione uma empresa...</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.razaoSocial} (CNPJ: {f.cnpj})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Razão Social</label>
                <input
                  type="text"
                  required
                  value={fornecedorNovo.razaoSocial}
                  onChange={(e) => setFornecedorNovo({ ...fornecedorNovo, razaoSocial: e.target.value })}
                  placeholder="Nome empresarial completo"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CNPJ</label>
                <input
                  type="text"
                  required
                  value={fornecedorNovo.cnpj}
                  onChange={(e) => setFornecedorNovo({ ...fornecedorNovo, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail de Contato</label>
                <input
                  type="email"
                  required
                  value={fornecedorNovo.email}
                  onChange={(e) => setFornecedorNovo({ ...fornecedorNovo, email: e.target.value })}
                  placeholder="contato@empresa.com.br"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Preposto</label>
                <input
                  type="text"
                  value={fornecedorNovo.nomePreposto}
                  onChange={(e) => setFornecedorNovo({ ...fornecedorNovo, nomePreposto: e.target.value })}
                  placeholder="Preposto designado no contrato"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO 2: DADOS DA CONTRATAÇÃO & VÍNCULO SEI */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
            <FileText className="w-4 h-4 text-blue-700" />
            <span>2. Identificação da Contratação & Vínculo SEI</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Processo SEI da Contratação (Processo Mãe) *
              </label>
              <input
                type="text"
                required
                value={processoSeiMae}
                onChange={(e) => setProcessoSeiMae(e.target.value)}
                placeholder="Ex: 04410022.000911/2026-29"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Procedimento Licitatório *
              </label>
              <input
                type="text"
                required
                value={licitacaoProcedimento}
                onChange={(e) => setLicitacaoProcedimento(e.target.value)}
                placeholder="Ex: Pregão Eletrônico nº 05/2026"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número do Empenho
              </label>
              <input
                type="text"
                value={numeroEmpenho}
                onChange={(e) => setNumeroEmpenho(e.target.value)}
                placeholder="Ex: 2026NE000124"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center space-x-3">
            <input
              type="checkbox"
              id="empenhoSubstitui"
              checked={empenhoSubstituiContrato}
              onChange={(e) => setEmpenhoSubstituiContrato(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="empenhoSubstitui" className="text-xs text-slate-700 cursor-pointer select-none">
              <span className="font-bold text-blue-900">O empenho substitui o termo de contrato?</span> (Exclusivo para bens/serviços de entrega única, dispensando termo formal).
            </label>
          </div>

          {!empenhoSubstituiContrato && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número do Contrato
              </label>
              <input
                type="text"
                value={numeroContrato}
                onChange={(e) => setNumeroContrato(e.target.value)}
                placeholder="Ex: 012/2026"
                className="w-full md:w-1/3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Objeto do Contrato *</label>
            <textarea
              required
              rows={3}
              value={objeto}
              onChange={(e) => setObjeto(e.target.value)}
              placeholder="Descreva detalhadamente o objeto contratado..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* SEÇÃO 3: VIGÊNCIA, VALORES E CLASSIFICAÇÃO NORMATIVA */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
            <Calendar className="w-4 h-4 text-blue-700" />
            <span>3. Vigência, Valores e Classificação Normativa</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Início da Vigência *</label>
              <input
                type="date"
                required
                value={vigenciaInicio}
                onChange={(e) => setVigenciaInicio(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fim da Vigência *</label>
              <input
                type="date"
                required
                value={vigenciaFim}
                onChange={(e) => setVigenciaFim(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Valor Global (R$) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={valorGlobal}
                onChange={(e) => setValorGlobal(e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-semibold"
              />
            </div>
          </div>

          {/* Tipo de Vigência */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Vigência</label>
              <select
                value={tipoVigencia}
                onChange={(e) => setTipoVigencia(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
              >
                <option value="NAO_CONTINUADO">Não Continuado (Limite legal: 1 ano)</option>
                <option value="CONTINUADO">Contrato Continuado (Limite legal: até 10 anos)</option>
                <option value="LOCACAO_IMOVEL">Locação de Imóvel (Lei do Inquilinato - Sem limite)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Contrato</label>
              <select
                value={tipoContrato}
                onChange={(e) => setTipoContrato(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
              >
                <option value="FORNECIMENTO_SIMPLES">Fornecimento Simples (Material)</option>
                <option value="FORNECIMENTO_CONTINUADO">Fornecimento Continuado (Material)</option>
                <option value="SERVICO_SEM_DEDICACAO">Serviço sem Dedicação Exclusiva de Mão de Obra</option>
                <option value="SERVICO_COM_DEDICACAO_TERCEIRIZACAO">Serviço com Dedicação Exclusiva (Terceirização)</option>
                <option value="LOCACAO_IMOVEL">Locação de Imóvel</option>
                <option value="SERVICOS_TECNICOS_PROFISSIONAIS">Serviços Técnicos Profissionais</option>
                <option value="OBRA">Obra / Engenharia</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo da Empreitada</label>
              <select
                value={tipoEmpreitada}
                onChange={(e) => setTipoEmpreitada(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
              >
                <option value="PRECO_UNITARIO">Preço Unitário</option>
                <option value="PRECO_GLOBAL">Preço Global</option>
                <option value="EMPREITADA_INTEGRAL">Empreitada Integral</option>
                <option value="ESCOPO">Por Escopo</option>
                <option value="TAREFA">Por Tarefa</option>
                <option value="CONTRATACAO_INTEGRADA">Contratação Integrada</option>
                <option value="CONTRATACAO_SEMI_INTEGRADA">Contratação Semi-Integrada</option>
                <option value="FORNECIMENTO_SERVICO_ASSOCIADO">Fornecimento e Serviço Associado</option>
              </select>
            </div>
          </div>

          {/* Portaria de Continuados (se for continuado) */}
          {tipoVigencia === 'CONTINUADO' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-amber-50/70 p-4 rounded-xl border border-amber-200">
              <div>
                <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                  Portaria de Serviços Continuados (Número/Ano)
                </label>
                <input
                  type="text"
                  value={portariaContinuadosRef}
                  onChange={(e) => setPortariaContinuadosRef(e.target.value)}
                  placeholder="Ex: Portaria nº 123/2026-GP"
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-amber-900 mb-1">ID SEI da Portaria</label>
                <input
                  type="text"
                  value={portariaContinuadosIdSei}
                  onChange={(e) => setPortariaContinuadosIdSei(e.target.value)}
                  placeholder="Ex: 39959658"
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-amber-900 mb-1">Caminho / Upload do PDF</label>
                <input
                  type="text"
                  value={portariaContinuadosUrl}
                  onChange={(e) => setPortariaContinuadosUrl(e.target.value)}
                  placeholder="/docs/portarias/portaria123.pdf"
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                />
              </div>
            </div>
          )}

          {/* Tipo de Medição */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Medição</label>
            <select
              value={tipoMedicao}
              onChange={(e) => setTipoMedicao(e.target.value)}
              className="w-full md:w-1/3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
            >
              <option value="ENTREGA_UNICA">Entrega Única (Contratos/Empenho de Bens)</option>
              <option value="MENSAL">Mensal</option>
              <option value="POR_DEMANDA">Por Demanda</option>
              <option value="POR_EVENTO">Por Evento (Obra Global ou Escopo)</option>
              <option value="PERIODO_VARIAVEL">Por Período / Recorte Variável</option>
            </select>
          </div>
        </div>

        {/* SEÇÃO 4: REAJUSTE, ÍNDICES & DATA-BASE */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
            <DollarSign className="w-4 h-4 text-blue-700" />
            <span>4. Regras de Reajuste, Repactuação & Data-Base</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-slate-800">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Regra Legal de Reajustes (Art. 63 da IN 01/2026 - PROAD):</span>
            </div>
            <p>
              Reajustes ordinários ocorrem somente após o interregno de <strong>1 ano da data do orçamento estimado</strong> da licitação. Contratos com terceirização de mão de obra seguem a data-base da Convenção Coletiva (CCT), independente de interregno.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data do Orçamento Estimado de Referência da Licitação
              </label>
              <input
                type="date"
                value={dataOrcamentoEstimado}
                onChange={(e) => setDataOrcamentoEstimado(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Define a data-base para verificação do interregno de 1 ano.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Índices de Reajuste Aplicáveis (Pode marcar mais de um)
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={indiceIpca}
                    onChange={(e) => setIndiceIpca(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>IPCA (Índice de Preços ao Consumidor Amplo)</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={indiceCct}
                    onChange={(e) => setIndiceCct(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Convenção Coletiva de Trabalho (CCT - Terceirização)</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={indiceSetorial}
                    onChange={(e) => setIndiceSetorial(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Índice Setorial Específico</span>
                </label>
              </div>
            </div>
          </div>

          {indiceSetorial && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Índice Setorial</label>
                <input
                  type="text"
                  value={nomeIndiceSetorial}
                  onChange={(e) => setNomeIndiceSetorial(e.target.value)}
                  placeholder="Ex: INCC, IGP-M, FIPE"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Justificativa da Aplicação</label>
                <input
                  type="text"
                  value={justificativaSetorial}
                  onChange={(e) => setJustificativaSetorial(e.target.value)}
                  placeholder="Conforme previsto no item X do Edital..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO 5: MÓDULO 2 - ITENS DO CONTRATO & LIMITES LEGAIS */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-800">5. Itens do Contrato & Limite de Aditamento (Lei 14.133)</h3>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                    {itens.length} {itens.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Cadastre manualmente ou importe todos os itens de uma vez via planilha Excel ou CSV.
                </p>
              </div>
            </div>

            {/* Grupo de Ações em Lote */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setImportError(null);
                  setImportFile(null);
                  setPreviewItens([]);
                  setShowImportModal(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
                title="Carregar itens via arquivo Excel ou CSV"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Importar Planilha</span>
              </button>

              <button
                type="button"
                onClick={baixarModeloItens}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                title="Baixar planilha padrão (.xlsx) com exemplos e formatação correta"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Baixar Modelo (.xlsx)</span>
              </button>

              {itens.length > 0 && itens.some((it) => it.descricao.trim() !== '') && (
                <button
                  type="button"
                  onClick={exportarItensParaExcel}
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  title="Exportar os itens atuais para planilha Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Exportar</span>
                </button>
              )}

              {itens.length > 1 && (
                <button
                  type="button"
                  onClick={handleLimparItens}
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  title="Limpar todos os itens da tabela"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar</span>
                </button>
              )}
            </div>
          </div>

          {/* Tipo de Licitação & Regra de Acréscimo */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center space-x-3">
              <span className="font-semibold text-slate-700">Tipo de Licitação:</span>
              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="radio"
                  name="tipoAgrupamento"
                  checked={tipoAgrupamento === 'ITEM_INDIVIDUAL'}
                  onChange={() => setTipoAgrupamento('ITEM_INDIVIDUAL')}
                  className="text-blue-600"
                />
                <span className="font-medium text-slate-800">Por Item</span>
              </label>

              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="radio"
                  name="tipoAgrupamento"
                  checked={tipoAgrupamento === 'GRUPO_UNICO'}
                  onChange={() => setTipoAgrupamento('GRUPO_UNICO')}
                  className="text-blue-600"
                />
                <span className="font-medium text-slate-800">Grupo Único</span>
              </label>
            </div>

            <div className="text-slate-600 text-[11px]">
              <span className="font-bold text-slate-800">Limite legal de aditamento:</span>{' '}
              {tipoAgrupamento === 'GRUPO_UNICO'
                ? `${limiteAcrescimoLegal}% sobre o valor global do contrato.`
                : `${limiteAcrescimoLegal}% individual para cada item.`}
            </div>
          </div>

          {/* Alerta de Sucesso na Importação */}
          {importSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between animate-in fade-in">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-medium">{importSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setImportSuccessMsg(null)}
                className="text-emerald-600 hover:text-emerald-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Alerta de Divergência entre Soma dos Itens e Valor Global */}
          {totalCalculadoItens > 0 && Math.abs((parseFloat(valorGlobal) || 0) - totalCalculadoItens) > 0.05 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  A soma calculada dos itens é <strong>{totalCalculadoItens.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>, enquanto o Valor Global informado no campo de vigência é <strong>{(parseFloat(valorGlobal) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={sincronizarValorGlobal}
                className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-[11px] shadow-sm transition-colors whitespace-nowrap cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Sincronizar Valor Global</span>
              </button>
            </div>
          )}

          {/* Barra de Filtro e Busca para Contratos com Muitos Itens */}
          {itens.length > 5 && (
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="relative w-full max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Filtrar por descrição, número ou unidade..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                />
              </div>
              <div className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                Exibindo {itens.filter((it) => {
                  if (!itemSearch.trim()) return true;
                  const q = itemSearch.toLowerCase();
                  return it.descricao.toLowerCase().includes(q) || String(it.numeroItem).includes(q) || it.unidade.toLowerCase().includes(q);
                }).length} de {itens.length} itens
              </div>
            </div>
          )}

          {/* Tabela de Itens */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-16 text-center">Item</th>
                  <th className="py-2.5 px-3">Descrição do Item</th>
                  <th className="py-2.5 px-3 w-24 text-center">Unidade</th>
                  <th className="py-2.5 px-3 w-28 text-right">Quantidade</th>
                  <th className="py-2.5 px-3 w-32 text-right">Valor Unit. (R$)</th>
                  <th className="py-2.5 px-3 w-32 text-right">Total (R$)</th>
                  <th className="py-2.5 px-2 w-12 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const filtered = itens
                    .map((item, originalIndex) => ({ ...item, originalIndex }))
                    .filter((item) => {
                      if (!itemSearch.trim()) return true;
                      const q = itemSearch.toLowerCase();
                      return (
                        item.descricao.toLowerCase().includes(q) ||
                        String(item.numeroItem).includes(q) ||
                        item.unidade.toLowerCase().includes(q)
                      );
                    });

                  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
                  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

                  if (paginated.length === 0) {
                    return (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-slate-400 text-xs">
                          Nenhum item encontrado com o filtro "{itemSearch}".
                        </td>
                      </tr>
                    );
                  }

                  return paginated.map((it) => {
                    const idx = it.originalIndex;
                    const subtotal = (parseFloat(it.quantidade) || 0) * (parseFloat(it.valorUnitario) || 0);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-bold text-slate-800 text-center">{it.numeroItem}</td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            required
                            value={it.descricao}
                            onChange={(e) => handleItemChange(idx, 'descricao', e.target.value)}
                            placeholder="Descrição do material ou serviço..."
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={it.unidade}
                            onChange={(e) => handleItemChange(idx, 'unidade', e.target.value)}
                            placeholder="UN, MÊS"
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-center uppercase outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={it.quantidade}
                            onChange={(e) => handleItemChange(idx, 'quantidade', e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-right font-semibold outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={it.valorUnitario}
                            onChange={(e) => handleItemChange(idx, 'valorUnitario', e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-right font-semibold outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 text-right whitespace-nowrap">
                          {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={itens.length === 1}
                            className="text-slate-400 hover:text-red-600 disabled:opacity-30 cursor-pointer p-1 rounded transition-colors"
                            title="Remover item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* Paginação para Planilhas com Muitos Itens */}
          {(() => {
            const filtered = itens.filter((it) => {
              if (!itemSearch.trim()) return true;
              const q = itemSearch.toLowerCase();
              return it.descricao.toLowerCase().includes(q) || String(it.numeroItem).includes(q) || it.unidade.toLowerCase().includes(q);
            });
            const totalPages = Math.ceil(filtered.length / pageSize) || 1;

            if (totalPages <= 1) return null;

            return (
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>
                  Página {currentPage} de {totalPages} (Total: {filtered.length} itens)
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Rodapé da Seção de Itens */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-blue-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Linha Manual</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportError(null);
                  setImportFile(null);
                  setPreviewItens([]);
                  setShowImportModal(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-emerald-200"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Upload de Planilha em Lote</span>
              </button>
            </div>

            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 flex items-center space-x-3 text-xs">
              <span className="font-medium text-slate-600">Soma Total dos {itens.length} Itens:</span>
              <span className="font-bold text-[#003366] text-base">
                {totalCalculadoItens.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>
        </div>

        {/* BOTOES DE AÇÃO */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-500 flex items-center space-x-2">
            {rascunhoSalvoEm && (
              <span className="flex items-center space-x-1.5 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Último rascunho salvo às <strong>{rascunhoSalvoEm}</strong></span>
              </span>
            )}
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={handleSalvarRascunho}
              disabled={salvandoRascunho}
              className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-60"
            >
              {salvandoRascunho ? (
                <RefreshCw className="w-4 h-4 animate-spin text-amber-700" />
              ) : (
                <Save className="w-4 h-4 text-amber-700" />
              )}
              <span>{salvandoRascunho ? 'Salvando...' : 'Salvar como Rascunho'}</span>
            </button>

            <Link
              href="/contratos"
              className="px-5 py-2.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center space-x-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Contrato e Itens</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* MODAL DE IMPORTAÇÃO DE ITENS EM LOTE VIA PLANILHA */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 max-h-[90vh] flex flex-col">
            {/* Cabeçalho do Modal */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Lançamento de Itens em Lote via Planilha</h3>
                  <p className="text-xs text-slate-500">
                    Importe centenas de itens instantaneamente a partir de um arquivo Excel (.xlsx, .xls) ou CSV.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo com Scroll */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* Alertas de Erro */}
              {importError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Área de Seleção e Upload do Arquivo */}
              <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-6 text-center bg-slate-50/50 transition-colors">
                <input
                  type="file"
                  id="modal-planilha-itens"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processarPlanilhaItens(file);
                  }}
                  className="hidden"
                />
                <label htmlFor="modal-planilha-itens" className="cursor-pointer block space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {importFile ? importFile.name : 'Clique para selecionar a planilha de itens'}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Arquivos suportados: Excel (.xlsx, .xls) ou CSV
                    </span>
                  </div>
                  {importFile && (
                    <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-semibold">
                      {(importFile.size / 1024).toFixed(1)} KB carregados
                    </span>
                  )}
                </label>
              </div>

              {/* Botão para Baixar Modelo se tiver dúvida */}
              <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900">
                <div className="flex items-center space-x-2">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>Ainda não preparou a planilha? Use o modelo oficial da PROAD/UERN.</span>
                </div>
                <button
                  type="button"
                  onClick={baixarModeloItens}
                  className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Modelo</span>
                </button>
              </div>

              {/* Pré-visualização dos Dados Carregados */}
              {previewItens.length > 0 && (
                <div className="space-y-3">
                  {/* Resumo da Extração */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Itens Identificados</span>
                      <span className="text-base font-bold text-emerald-700">
                        {previewItens.length} itens
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Soma Financeira Calculada</span>
                      <span className="text-base font-bold text-slate-900">
                        {previewItens.reduce((acc, p) => acc + p.subtotal, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>

                  {/* Amostra dos Primeiros 5 Itens */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                      Pré-visualização dos primeiros itens detectados:
                    </span>
                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-[11px] text-slate-700">
                        <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="py-2 px-2 text-center w-12">Item</th>
                            <th className="py-2 px-3 text-left">Descrição</th>
                            <th className="py-2 px-2 text-center w-16">Und</th>
                            <th className="py-2 px-2 text-right w-16">Qtd</th>
                            <th className="py-2 px-2 text-right w-24">Vlr Unit</th>
                            <th className="py-2 px-3 text-right w-24">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {previewItens.slice(0, 5).map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-1.5 px-2 text-center font-bold text-slate-800">{p.numeroItem}</td>
                              <td className="py-1.5 px-3 truncate max-w-xs">{p.descricao}</td>
                              <td className="py-1.5 px-2 text-center">{p.unidade}</td>
                              <td className="py-1.5 px-2 text-right">{parseFloat(p.quantidade).toLocaleString('pt-BR')}</td>
                              <td className="py-1.5 px-2 text-right font-medium">
                                {parseFloat(p.valorUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                              <td className="py-1.5 px-3 text-right font-bold text-emerald-700">
                                {p.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {previewItens.length > 5 && (
                      <p className="text-[10px] text-slate-400 text-right mt-1">
                        + {previewItens.length - 5} outros itens serão importados...
                      </p>
                    )}
                  </div>

                  {/* Opções de Inserção */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-800 block">Modo de Inserção:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className={`p-3 rounded-xl border cursor-pointer text-xs flex items-center space-x-2 transition-all ${
                        importMode === 'REPLACE' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700'
                      }`}>
                        <input
                          type="radio"
                          name="importMode"
                          value="REPLACE"
                          checked={importMode === 'REPLACE'}
                          onChange={() => setImportMode('REPLACE')}
                          className="text-emerald-600"
                        />
                        <div>
                          <span className="font-bold block">Substituir Itens Atuais</span>
                          <span className="text-[10px] text-slate-500 block">Remove o rascunho anterior e carrega a planilha</span>
                        </div>
                      </label>

                      <label className={`p-3 rounded-xl border cursor-pointer text-xs flex items-center space-x-2 transition-all ${
                        importMode === 'APPEND' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700'
                      }`}>
                        <input
                          type="radio"
                          name="importMode"
                          value="APPEND"
                          checked={importMode === 'APPEND'}
                          onChange={() => setImportMode('APPEND')}
                          className="text-emerald-600"
                        />
                        <div>
                          <span className="font-bold block">Acrescentar aos Existentes</span>
                          <span className="text-[10px] text-slate-500 block">Mantém os {itens.length} itens atuais e adiciona estes</span>
                        </div>
                      </label>
                    </div>

                    <label className="flex items-center space-x-2 pt-1 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoUpdateValorGlobal}
                        onChange={(e) => setAutoUpdateValorGlobal(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span>
                        Atualizar automaticamente o <strong>Valor Global do Contrato</strong> com a soma desta planilha (
                        {previewItens.reduce((acc, p) => acc + p.subtotal, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé do Modal com Ações */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={previewItens.length === 0}
                onClick={confirmarImportacao}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-900/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-2 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar e Carregar {previewItens.length > 0 ? `(${previewItens.length} itens)` : ''}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NovoContratoPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto p-12 text-center text-slate-500 flex items-center justify-center space-x-3">
          <div className="w-5 h-5 border-2 border-[#003366] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Carregando formulário...</span>
        </div>
      }
    >
      <NovoContratoForm />
    </Suspense>
  );
}
