'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Trash2,
  RefreshCw,
  HelpCircle,
  Layers,
  Calculator,
  Building2,
  UserCheck,
  DollarSign
} from 'lucide-react';

interface PlanilhaCustosModalProps {
  isOpen: boolean;
  onClose: () => void;
  contratoId: string;
  contratoNumero?: string;
  itensContrato?: Array<{ id: string; numeroItem: number; descricao: string; unidade?: string; quantidadeAtual?: number; valorUnitarioAtual?: number }>;
  onSuccess: () => void;
  planilhaParaEditar?: any;
}

export default function PlanilhaCustosModal({
  isOpen,
  onClose,
  contratoId,
  contratoNumero,
  itensContrato = [],
  onSuccess,
  planilhaParaEditar,
}: PlanilhaCustosModalProps) {
  const [modoEntrada, setModoEntrada] = useState<'UPLOAD' | 'FORMULARIO'>('UPLOAD');
  const [arquivoUpload, setArquivoUpload] = useState<File | null>(null);
  const [lendoArquivo, setLendoArquivo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Campos do Cabeçalho e Função
  const [itemId, setItemId] = useState(planilhaParaEditar?.itemId || '');
  const [funcao, setFuncao] = useState(planilhaParaEditar?.funcao || '');
  const [cbo, setCbo] = useState(planilhaParaEditar?.cbo || '');
  const [municipio, setMunicipio] = useState(planilhaParaEditar?.municipio || 'Mossoró/RN');
  const [jornada, setJornada] = useState(planilhaParaEditar?.jornada || '44 horas semanais');
  const [cctReferencia, setCctReferencia] = useState(planilhaParaEditar?.cctReferencia || '');
  const [mesesExecucao, setMesesExecucao] = useState(planilhaParaEditar?.mesesExecucao ? String(planilhaParaEditar.mesesExecucao) : '12');
  const [quantidadeEmpregados, setQuantidadeEmpregados] = useState(planilhaParaEditar?.quantidadeEmpregados ? String(planilhaParaEditar.quantidadeEmpregados) : '1');
  const [quantidadePostos, setQuantidadePostos] = useState(planilhaParaEditar?.quantidadePostos ? String(planilhaParaEditar.quantidadePostos) : '1');
  const [salarioBase, setSalarioBase] = useState(planilhaParaEditar?.salarioBase ? String(planilhaParaEditar.salarioBase) : '0');

  // Módulos
  const [totalModulo1, setTotalModulo1] = useState(planilhaParaEditar?.totalModulo1 ? String(planilhaParaEditar.totalModulo1) : '0');
  const [totalModulo2, setTotalModulo2] = useState(planilhaParaEditar?.totalModulo2 ? String(planilhaParaEditar.totalModulo2) : '0');
  const [totalModulo3, setTotalModulo3] = useState(planilhaParaEditar?.totalModulo3 ? String(planilhaParaEditar.totalModulo3) : '0');
  const [totalModulo4, setTotalModulo4] = useState(planilhaParaEditar?.totalModulo4 ? String(planilhaParaEditar.totalModulo4) : '0');
  const [totalModulo5, setTotalModulo5] = useState(planilhaParaEditar?.totalModulo5 ? String(planilhaParaEditar.totalModulo5) : '0');
  const [totalModulo6, setTotalModulo6] = useState(planilhaParaEditar?.totalModulo6 ? String(planilhaParaEditar.totalModulo6) : '0');

  // Percentuais Módulo 6
  const [custosIndiretosPercent, setCustosIndiretosPercent] = useState(planilhaParaEditar?.custosIndiretosPercent ? String(planilhaParaEditar.custosIndiretosPercent) : '3.0');
  const [lucroPercent, setLucroPercent] = useState(planilhaParaEditar?.lucroPercent ? String(planilhaParaEditar.lucroPercent) : '3.2');
  const [tributosPercent, setTributosPercent] = useState(planilhaParaEditar?.tributosPercent ? String(planilhaParaEditar.tributosPercent) : '14.25');

  // Totais Finais
  const [precoTotalEmpregado, setPrecoTotalEmpregado] = useState(planilhaParaEditar?.precoTotalEmpregado ? String(planilhaParaEditar.precoTotalEmpregado) : '0');
  const [valorMensalTotal, setValorMensalTotal] = useState(planilhaParaEditar?.valorMensalTotal ? String(planilhaParaEditar.valorMensalTotal) : '0');
  const [valorGlobalTotal, setValorGlobalTotal] = useState(planilhaParaEditar?.valorGlobalTotal ? String(planilhaParaEditar.valorGlobalTotal) : '0');
  const [fatorK, setFatorK] = useState(planilhaParaEditar?.fatorK ? String(planilhaParaEditar.fatorK) : '0');
  const [dadosDetalhados, setDadosDetalhados] = useState<any>(planilhaParaEditar?.dadosDetalhados || null);

  useEffect(() => {
    if (planilhaParaEditar) {
      setItemId(planilhaParaEditar.itemId || '');
      setFuncao(planilhaParaEditar.funcao || '');
      setCbo(planilhaParaEditar.cbo || '');
      setMunicipio(planilhaParaEditar.municipio || 'Mossoró/RN');
      setJornada(planilhaParaEditar.jornada || '44 horas semanais');
      setCctReferencia(planilhaParaEditar.cctReferencia || '');
      setMesesExecucao(String(planilhaParaEditar.mesesExecucao || 12));
      setQuantidadeEmpregados(String(planilhaParaEditar.quantidadeEmpregados || 1));
      setQuantidadePostos(String(planilhaParaEditar.quantidadePostos || 1));
      setSalarioBase(String(planilhaParaEditar.salarioBase || 0));
      setTotalModulo1(String(planilhaParaEditar.totalModulo1 || 0));
      setTotalModulo2(String(planilhaParaEditar.totalModulo2 || 0));
      setTotalModulo3(String(planilhaParaEditar.totalModulo3 || 0));
      setTotalModulo4(String(planilhaParaEditar.totalModulo4 || 0));
      setTotalModulo5(String(planilhaParaEditar.totalModulo5 || 0));
      setTotalModulo6(String(planilhaParaEditar.totalModulo6 || 0));
      setCustosIndiretosPercent(String(planilhaParaEditar.custosIndiretosPercent || 3.0));
      setLucroPercent(String(planilhaParaEditar.lucroPercent || 3.2));
      setTributosPercent(String(planilhaParaEditar.tributosPercent || 14.25));
      setPrecoTotalEmpregado(String(planilhaParaEditar.precoTotalEmpregado || 0));
      setValorMensalTotal(String(planilhaParaEditar.valorMensalTotal || 0));
      setValorGlobalTotal(String(planilhaParaEditar.valorGlobalTotal || 0));
      setFatorK(String(planilhaParaEditar.fatorK || 0));
      setDadosDetalhados(planilhaParaEditar.dadosDetalhados || null);
      setModoEntrada('FORMULARIO');
    }
  }, [planilhaParaEditar]);

  // Se o usuário selecionar um item do contrato, sugerir a descrição como nome da função
  const handleItemSelect = (selectedItemId: string) => {
    setItemId(selectedItemId);
    const item = itensContrato.find((i) => i.id === selectedItemId);
    if (item && !funcao) {
      setFuncao(item.descricao);
    }
  };

  // Recalcular totais automáticos quando em modo formulário
  const recalcularTotais = () => {
    const sBase = parseFloat(salarioBase) || 0;
    let m1 = parseFloat(totalModulo1) || sBase;
    if (m1 === 0 && sBase > 0) m1 = sBase;

    // Encargos M2 aproximados se não preenchidos:
    // 2.1 (13º e férias): 11.11%
    // 2.2 (GPS e FGTS): 36.80%
    let m2 = parseFloat(totalModulo2) || 0;
    let m3 = parseFloat(totalModulo3) || 0;
    let m4 = parseFloat(totalModulo4) || 0;
    let m5 = parseFloat(totalModulo5) || 0;
    let m6 = parseFloat(totalModulo6) || 0;

    const subtotalDireto = m1 + m2 + m3 + m4 + m5;

    // Se M6 não foi preenchido manualmente, calcular BDI e tributos: Po / (1 - To) = P1
    if (m6 === 0 && subtotalDireto > 0) {
      const cIndiretos = subtotalDireto * ((parseFloat(custosIndiretosPercent) || 3) / 100);
      const lucro = subtotalDireto * ((parseFloat(lucroPercent) || 3.2) / 100);
      const to = (parseFloat(tributosPercent) || 14.25) / 100;
      const po = subtotalDireto + cIndiretos + lucro;
      const p1 = to < 1 ? po / (1 - to) : po;
      m6 = parseFloat((p1 - subtotalDireto).toFixed(2));
      setTotalModulo6(String(m6));
    }

    const precoEmp = parseFloat((subtotalDireto + m6).toFixed(2));
    const qtdEmp = parseInt(quantidadeEmpregados, 10) || 1;
    const qtdPostos = parseInt(quantidadePostos, 10) || 1;
    const vMensal = parseFloat((precoEmp * qtdEmp * qtdPostos).toFixed(2));
    const nMeses = parseInt(mesesExecucao, 10) || 12;
    const vGlobal = parseFloat((vMensal * nMeses).toFixed(2));
    const fK = sBase > 0 ? parseFloat((precoEmp / sBase).toFixed(4)) : 0;

    setTotalModulo1(String(m1));
    setPrecoTotalEmpregado(String(precoEmp));
    setValorMensalTotal(String(vMensal));
    setValorGlobalTotal(String(vGlobal));
    setFatorK(String(fK));
  };

  // Processar upload de arquivo Excel da IN 05/2017
  const handleUploadArquivo = async (file: File) => {
    setLendoArquivo(true);
    setErro(null);
    setArquivoUpload(file);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      let fNome = '';
      let fMunicipio = 'Mossoró/RN';
      let fCbo = '';
      let fJornada = '44 horas semanais';
      let fCct = '';
      let fMeses = 12;
      let sBase = 0;
      let m1 = 0;
      let m2 = 0;
      let m3 = 0;
      let m4 = 0;
      let m5 = 0;
      let m6 = 0;
      let pEmp = 0;
      let vMensal = 0;
      let vGlobal = 0;
      let fk = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const text = row.map((c) => String(c).trim()).join(' | ');

        if (text.includes('Item') && row[2] && !fNome) fNome = String(row[2]).trim();
        if (text.includes('Município') && row[2]) fMunicipio = String(row[2]).trim();
        if (text.includes('Classificação Brasileira de Ocupações') && row[2]) fCbo = String(row[2]).trim();
        if (text.includes('Jornada') && row[2]) fJornada = String(row[2]).trim();
        if (text.includes('Acordo, Convenção ou Dissídio') && row[2]) fCct = String(row[2]).trim();
        if (text.includes('Salário Normativo') && (row[1] || row[2])) sBase = parseFloat(row[2] || row[1]) || 0;
        if (text.includes('meses de execução contratual') && (row[1] || row[2])) fMeses = parseInt(row[2] || row[1], 10) || 12;

        if (text.toUpperCase().includes('TOTAL DO MÓDULO 1') || text.toUpperCase().includes('TOTAL DO MODULO 1')) {
          m1 = parseFloat(row[row.length - 1] || row[1]) || 0;
        }
        if (text.toUpperCase().includes('TOTAL DO MÓDULO 2') || text.toUpperCase().includes('TOTAL DO MODULO 2')) {
          m2 = parseFloat(row[row.length - 1] || row[1]) || 0;
        }
        if (text.toUpperCase().includes('TOTAL DO MÓDULO 3') || text.toUpperCase().includes('TOTAL DO MODULO 3')) {
          m3 = parseFloat(row[row.length - 1] || row[1]) || 0;
        }
        if (text.toUpperCase().includes('TOTAL DO MÓDULO 4') || text.toUpperCase().includes('TOTAL DO MODULO 4')) {
          m4 = parseFloat(row[row.length - 1] || row[1]) || 0;
        }
        if (text.toUpperCase().includes('TOTAL DO MÓDULO 5') || text.toUpperCase().includes('TOTAL DO MODULO 5')) {
          m5 = parseFloat(row[row.length - 1] || row[2] || row[1]) || 0;
        }
        if (text.toUpperCase().includes('TOTAL DO MÓDULO 6') || text.toUpperCase().includes('TOTAL DO MODULO 6')) {
          m6 = parseFloat(row[row.length - 1] || row[1]) || 0;
        }

        if (text.toUpperCase().includes('PREÇO TOTAL POR EMPREGADO') || text.toUpperCase().includes('PRECO TOTAL POR EMPREGADO')) {
          pEmp = parseFloat(row[row.length - 1] || row[1]) || 0;
        }
        if (text.toUpperCase().includes('VALOR MENSAL DOS SERVIÇOS') || text.toUpperCase().includes('VALOR MENSAL DOS SERVICOS')) {
          vMensal = parseFloat(row[row.length - 1] || row[1]) || 0;
        }
        if (text.toUpperCase().includes('VALOR GLOBAL DA PROPOSTA') && row.some((c) => typeof c === 'number' && c > 100)) {
          vGlobal = parseFloat(row.find((c) => typeof c === 'number' && c > 100)) || 0;
        }
        if (text.toUpperCase().includes('FATOR K')) {
          fk = parseFloat(row[row.length - 1] || row[1]) || 0;
        }
      }

      if (sBase === 0 && m1 > 0) sBase = m1;
      if (m1 === 0 && sBase > 0) m1 = sBase;
      if (pEmp === 0) pEmp = m1 + m2 + m3 + m4 + m5 + m6;
      if (vMensal === 0) vMensal = pEmp;
      if (vGlobal === 0) vGlobal = vMensal * fMeses;
      if (fk === 0 && sBase > 0) fk = parseFloat((pEmp / sBase).toFixed(4));

      if (fNome) setFuncao(fNome);
      if (fCbo) setCbo(fCbo);
      if (fMunicipio) setMunicipio(fMunicipio);
      if (fJornada) setJornada(fJornada);
      if (fCct) setCctReferencia(fCct);
      setMesesExecucao(String(fMeses));
      setSalarioBase(String(sBase));
      setTotalModulo1(String(m1));
      setTotalModulo2(String(m2));
      setTotalModulo3(String(m3));
      setTotalModulo4(String(m4));
      setTotalModulo5(String(m5));
      setTotalModulo6(String(m6));
      setPrecoTotalEmpregado(String(pEmp));
      setValorMensalTotal(String(vMensal));
      setValorGlobalTotal(String(vGlobal));
      setFatorK(String(fk));
      setDadosDetalhados({ importadoDeArquivo: file.name, dataImportacao: new Date().toISOString() });

      // Trocar automaticamente para a aba de conferência
      setModoEntrada('FORMULARIO');
    } catch (e: any) {
      setErro('Erro ao processar arquivo Excel: ' + (e.message || 'Verifique o formato da planilha.'));
    } finally {
      setLendoArquivo(false);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!funcao.trim()) {
      setErro('O nome da função ou posto é obrigatório.');
      return;
    }

    setSalvando(true);
    setErro(null);

    try {
      const payload = {
        contratoId,
        itemId: itemId || null,
        funcao: funcao.trim(),
        cbo: cbo.trim() || null,
        municipio: municipio.trim() || 'Mossoró/RN',
        jornada: jornada.trim() || '44 horas semanais',
        cctReferencia: cctReferencia.trim() || null,
        mesesExecucao: parseInt(mesesExecucao, 10) || 12,
        quantidadeEmpregados: parseInt(quantidadeEmpregados, 10) || 1,
        quantidadePostos: parseInt(quantidadePostos, 10) || 1,
        salarioBase: parseFloat(salarioBase) || 0,
        totalModulo1: parseFloat(totalModulo1) || 0,
        totalModulo2: parseFloat(totalModulo2) || 0,
        totalModulo3: parseFloat(totalModulo3) || 0,
        totalModulo4: parseFloat(totalModulo4) || 0,
        totalModulo5: parseFloat(totalModulo5) || 0,
        totalModulo6: parseFloat(totalModulo6) || 0,
        custosIndiretosPercent: parseFloat(custosIndiretosPercent) || 3.0,
        lucroPercent: parseFloat(lucroPercent) || 3.2,
        tributosPercent: parseFloat(tributosPercent) || 14.25,
        precoTotalEmpregado: parseFloat(precoTotalEmpregado) || 0,
        valorMensalTotal: parseFloat(valorMensalTotal) || 0,
        valorGlobalTotal: parseFloat(valorGlobalTotal) || 0,
        fatorK: parseFloat(fatorK) || 0,
        dadosDetalhados,
        arquivoOriginalNome: arquivoUpload ? arquivoUpload.name : planilhaParaEditar?.arquivoOriginalNome,
      };

      const url = planilhaParaEditar
        ? `/api/contratos/planilhas-custos/${planilhaParaEditar.id}`
        : '/api/contratos/planilhas-custos';

      const method = planilhaParaEditar ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar planilha de custos');

      onSuccess();
      onClose();
    } catch (err: any) {
      setErro(err.message || 'Falha de conexão com o servidor');
    } finally {
      setSalvando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        {/* Cabeçalho do Modal */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-900 to-indigo-950 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-white backdrop-blur-sm">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {planilhaParaEditar ? 'Editar Planilha de Composição de Custos' : 'Cadastrar Planilha de Composição de Custos por Função'}
              </h3>
              <p className="text-xs text-blue-200">
                Padrão IN 05/2017 & IN 01/2026 - UERN • Contrato nº {contratoNumero || 'Selecionado'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Ações Rápidas / Modos */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex space-x-1.5 p-1 bg-slate-200/70 rounded-xl">
            <button
              type="button"
              onClick={() => setModoEntrada('UPLOAD')}
              className={`px-3.5 py-1.5 font-semibold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                modoEntrada === 'UPLOAD'
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar Arquivo (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => setModoEntrada('FORMULARIO')}
              className={`px-3.5 py-1.5 font-semibold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                modoEntrada === 'FORMULARIO'
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Conferência & Formulário dos Módulos</span>
            </button>
          </div>

          <a
            href="/api/modelos-planilhas/custos"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Baixar Modelo Oficial (.xlsx)</span>
          </a>
        </div>

        {/* Mensagem de Erro */}
        {erro && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{erro}</span>
            </div>
            <button type="button" onClick={() => setErro(null)} className="text-red-500 hover:text-red-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Conteúdo do Formulário */}
        <form onSubmit={handleSalvar} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* MODO UPLOAD */}
          {modoEntrada === 'UPLOAD' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 rounded-2xl p-8 text-center transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  id="file-upload-custos"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadArquivo(f);
                  }}
                />
                <label htmlFor="file-upload-custos" className="cursor-pointer block space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center mx-auto shadow-sm">
                    {lendoArquivo ? <RefreshCw className="w-6 h-6 animate-spin" /> : <FileSpreadsheet className="w-6 h-6" />}
                  </div>
                  <p className="font-bold text-slate-800 text-sm">
                    {arquivoUpload ? arquivoUpload.name : 'Clique para selecionar a Planilha de Custos (.xlsx)'}
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Compatível com o modelo oficial da <strong>IN 05/2017 - UERN</strong>. Todos os módulos (M1 a M6), salário-base e valor global serão lidos automaticamente.
                  </p>
                </label>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start space-x-3">
                <HelpCircle className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Como funciona o cadastro por função?</p>
                  <p className="text-blue-900 leading-relaxed">
                    Você pode cadastrar <strong>múltiplas planilhas de custos no mesmo contrato</strong> (ex: uma planilha para "Supervisor", outra para "Servente de Limpeza", outra para "Porteiro"). Após importar ou preencher, você poderá vincular diretamente a um item específico do contrato.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* MODO FORMULÁRIO / CONFERÊNCIA DOS MÓDULOS */}
          {modoEntrada === 'FORMULARIO' && (
            <div className="space-y-6 text-xs">
              {/* Vínculo de Item do Contrato e Identificação da Função */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs uppercase border-b border-slate-200 pb-2">
                  <Layers className="w-4 h-4 text-blue-700" />
                  <span>1. Identificação da Função & Item Contratual</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Vincular a Item do Contrato</label>
                    <select
                      value={itemId}
                      onChange={(e) => handleItemSelect(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                    >
                      <option value="">Nenhum item específico (Função Geral)</option>
                      {itensContrato.map((it) => (
                        <option key={it.id} value={it.id}>
                          Item {it.numeroItem} - {it.descricao.slice(0, 40)}...
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nome da Função / Cargo *</label>
                    <input
                      type="text"
                      required
                      value={funcao}
                      onChange={(e) => setFuncao(e.target.value)}
                      placeholder="Ex: Supervisor Operacional, Servente..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">CBO (Classificação de Ocupações)</label>
                    <input
                      type="text"
                      value={cbo}
                      onChange={(e) => setCbo(e.target.value)}
                      placeholder="Ex: 4101-05"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Município de Execução</label>
                    <input
                      type="text"
                      value={municipio}
                      onChange={(e) => setMunicipio(e.target.value)}
                      placeholder="Mossoró/RN, Caicó, etc."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Jornada Semanal</label>
                    <input
                      type="text"
                      value={jornada}
                      onChange={(e) => setJornada(e.target.value)}
                      placeholder="44 horas semanais, 12x36..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">CCT de Referência</label>
                    <input
                      type="text"
                      value={cctReferencia}
                      onChange={(e) => setCctReferencia(e.target.value)}
                      placeholder="RN000009/2025 - SINDLIMP"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Meses de Execução</label>
                    <input
                      type="number"
                      value={mesesExecucao}
                      onChange={(e) => setMesesExecucao(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Salário-Base CCT (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={salarioBase}
                      onChange={(e) => setSalarioBase(e.target.value)}
                      onBlur={recalcularTotais}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600 font-bold text-blue-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Qtd. Empregados por Posto</label>
                    <input
                      type="number"
                      value={quantidadeEmpregados}
                      onChange={(e) => setQuantidadeEmpregados(e.target.value)}
                      onBlur={recalcularTotais}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Quantidade de Postos</label>
                    <input
                      type="number"
                      value={quantidadePostos}
                      onChange={(e) => setQuantidadePostos(e.target.value)}
                      onBlur={recalcularTotais}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Módulos de Composição de Custos (IN 05/2017) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs uppercase">
                    <Calculator className="w-4 h-4 text-blue-700" />
                    <span>2. Módulos de Custos da Proposta (R$)</span>
                  </div>
                  <button
                    type="button"
                    onClick={recalcularTotais}
                    className="inline-flex items-center space-x-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Recalcular Preço</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Módulo 1 */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <span className="font-bold text-slate-800 block mb-0.5">Módulo 1 - Remuneração</span>
                    <span className="text-[10px] text-slate-500 block mb-1.5">Salário-base + Adicionais (Insal./Peric./Noturno)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={totalModulo1}
                      onChange={(e) => setTotalModulo1(e.target.value)}
                      onBlur={recalcularTotais}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* Módulo 2 */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <span className="font-bold text-slate-800 block mb-0.5">Módulo 2 - Encargos & Benefícios</span>
                    <span className="text-[10px] text-slate-500 block mb-1.5">13º/Férias + INSS/FGTS (36.8%) + VR/VT/Saúde</span>
                    <input
                      type="number"
                      step="0.01"
                      value={totalModulo2}
                      onChange={(e) => setTotalModulo2(e.target.value)}
                      onBlur={recalcularTotais}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* Módulo 3 */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <span className="font-bold text-slate-800 block mb-0.5">Módulo 3 - Provisão para Rescisão</span>
                    <span className="text-[10px] text-slate-500 block mb-1.5">Aviso Prévio Trabalhado/Indenizado e Multa FGTS</span>
                    <input
                      type="number"
                      step="0.01"
                      value={totalModulo3}
                      onChange={(e) => setTotalModulo3(e.target.value)}
                      onBlur={recalcularTotais}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* Módulo 4 */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <span className="font-bold text-slate-800 block mb-0.5">Módulo 4 - Reposição do Ausente</span>
                    <span className="text-[10px] text-slate-500 block mb-1.5">Substituto de férias, ausências legais, licenças</span>
                    <input
                      type="number"
                      step="0.01"
                      value={totalModulo4}
                      onChange={(e) => setTotalModulo4(e.target.value)}
                      onBlur={recalcularTotais}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* Módulo 5 */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <span className="font-bold text-slate-800 block mb-0.5">Módulo 5 - Insumos Diversos</span>
                    <span className="text-[10px] text-slate-500 block mb-1.5">Uniformes, EPIs, materiais e equipamentos</span>
                    <input
                      type="number"
                      step="0.01"
                      value={totalModulo5}
                      onChange={(e) => setTotalModulo5(e.target.value)}
                      onBlur={recalcularTotais}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* Módulo 6 */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <span className="font-bold text-slate-800 block mb-0.5">Módulo 6 - BDI, Lucro & Tributos</span>
                    <span className="text-[10px] text-slate-500 block mb-1.5">Custos indiretos + Lucro + PIS/COFINS/ISS</span>
                    <input
                      type="number"
                      step="0.01"
                      value={totalModulo6}
                      onChange={(e) => setTotalModulo6(e.target.value)}
                      onBlur={recalcularTotais}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Taxas do Módulo 6 */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Custos Indiretos (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={custosIndiretosPercent}
                      onChange={(e) => setCustosIndiretosPercent(e.target.value)}
                      onBlur={recalcularTotais}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-center outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Lucro da Empresa (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={lucroPercent}
                      onChange={(e) => setLucroPercent(e.target.value)}
                      onBlur={recalcularTotais}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-center outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Tributos (PIS/COFINS/ISS %)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tributosPercent}
                      onChange={(e) => setTributosPercent(e.target.value)}
                      onBlur={recalcularTotais}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-center outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Quadro Resumo Consolidado */}
              <div className="p-4 bg-gradient-to-r from-slate-900 to-[#003366] text-white rounded-2xl shadow-md grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-[10px] text-blue-200 block uppercase font-bold">Preço por Empregado</span>
                  <span className="text-base font-extrabold text-emerald-400">
                    {(parseFloat(precoTotalEmpregado) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-blue-200 block uppercase font-bold">Valor Mensal do Posto</span>
                  <span className="text-base font-extrabold text-white">
                    {(parseFloat(valorMensalTotal) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-blue-200 block uppercase font-bold">Valor Global da Proposta</span>
                  <span className="text-base font-extrabold text-amber-300">
                    {(parseFloat(valorGlobalTotal) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-blue-200 block uppercase font-bold">Fator K Multiplicador</span>
                  <span className="text-base font-extrabold text-cyan-300">
                    {parseFloat(fatorK) ? parseFloat(fatorK).toFixed(4) : '-'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Rodapé e Ações */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={salvando || lendoArquivo}
              className="px-6 py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {salvando ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando Planilha...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Gravar Planilha de Custos</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
