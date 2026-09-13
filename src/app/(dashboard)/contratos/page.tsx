'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  PlusCircle,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Eye,
  Building2,
  Calendar,
  DollarSign,
  AlertCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  UploadCloud
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ContratosPage() {
  const [contratos, setContratos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const carregarContratos = async () => {
    setLoading(true);
    try {
      let url = '/api/contratos?';
      if (search) url += `q=${encodeURIComponent(search)}&`;
      if (statusFilter) url += `status=${statusFilter}&`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.contratos) {
        setContratos(data.contratos);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarContratos();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    carregarContratos();
  };

  const calcularTempoTotal = (inicio: string, fim: string) => {
    const d1 = new Date(inicio);
    const d2 = new Date(fim);
    const meses = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24 * 30.4375));
    if (meses < 12) return `${meses} meses`;
    const anos = (meses / 12).toFixed(1);
    return `${anos} anos (${meses}m)`;
  };

  const obterLimiteLegalTexto = (tipoVigencia: string) => {
    if (tipoVigencia === 'CONTINUADO') return 'Limite legal: até 10 anos';
    if (tipoVigencia === 'LOCACAO_IMOVEL') return 'Sem limite de 10 anos (Lei do Inquilinato)';
    return 'Limite legal: 1 ano';
  };

  const exportarParaExcel = () => {
    if (contratos.length === 0) return;

    const dataToExport = contratos.map((c) => {
      const gestor = c.responsaveis?.find((r: any) => r.tipoAtuacao === 'GESTOR')?.user?.nome || 'Não designado';
      const suplente = c.responsaveis?.find((r: any) => r.tipoAtuacao === 'SUPLENTE')?.user?.nome || '-';
      const fiscalAdm = c.responsaveis?.find((r: any) => r.tipoAtuacao === 'FISCAL_ADMINISTRATIVO')?.user?.nome || 'Não designado';
      const fiscalTec = c.responsaveis?.find((r: any) => r.tipoAtuacao === 'FISCAL_TECNICO')?.user?.nome || 'Não designado';
      const fiscalSetorial = c.responsaveis?.find((r: any) => r.tipoAtuacao === 'FISCAL_SETORIAL')?.user?.nome || '-';

      return {
        'Status': c.status,
        'Contrato / Empenho': c.empenhoSubstituiContrato ? `Empenho: ${c.numeroEmpenho}` : (c.numeroContrato || c.numeroEmpenho || 'S/N'),
        'Objeto': c.objeto,
        'Processo SEI Mãe': c.processoSeiMae,
        'Contratada': c.fornecedor.razaoSocial,
        'CNPJ': c.fornecedor.cnpj,
        'E-mail': c.fornecedor.email,
        'Preposto': c.fornecedor.nomePreposto || '-',
        'Telefone': c.fornecedor.telefone || '-',
        'Gestor': gestor,
        'Suplente': suplente,
        'Fiscal Adm': fiscalAdm,
        'Fiscal Técnico': fiscalTec,
        'Fiscal Setorial': fiscalSetorial,
        'Início Vigência': new Date(c.vigenciaInicio).toLocaleDateString('pt-BR'),
        'Fim Vigência': new Date(c.vigenciaFim).toLocaleDateString('pt-BR'),
        'Valor Global (R$)': c.valorGlobal,
        'Valor Atualizado (R$)': c.valorAtualizado,
        'Tipo Vigência': c.tipoVigencia,
        'Tipo Contrato': c.tipoContrato,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contratos_UERN');
    XLSX.writeFile(workbook, `Contratos_UERN_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('planilha', importFile);

    try {
      const res = await fetch('/api/contratos/importar', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setImportResult(data);
      if (data.success) {
        carregarContratos();
      }
    } catch (err) {
      console.error(err);
      setImportResult({ error: 'Falha na comunicação com o servidor.' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg md:text-xl">
            <FileText className="w-6 h-6 text-blue-700" />
            <h2>Controle e Listagem Geral de Contratos</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Módulo 1 & 2 - Monitoramento contínuo de vigências, empenhos, fiscais e saldos contratuais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-slate-200"
          >
            <UploadCloud className="w-4 h-4 text-slate-500" />
            <span>Importar Planilha</span>
          </button>

          <button
            onClick={exportarParaExcel}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-emerald-200"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>

          <Link
            href="/contratos/novo"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Novo Contrato</span>
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por contrato, objeto, empresa, CNPJ ou SEI..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none"
          />
        </form>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Todos os Status</option>
            <option value="ATIVO">Ativo</option>
            <option value="INATIVO">Inativo</option>
            <option value="SUSPENSO">Suspenso</option>
            <option value="RESCINDIDO">Rescindido</option>
            <option value="ENCERRADO">Encerrado</option>
          </select>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Contrato / Empenho</th>
                <th className="py-3.5 px-4">Objeto & Processo SEI</th>
                <th className="py-3.5 px-4">Contratada & CNPJ</th>
                <th className="py-3.5 px-4">Vigência & Duração</th>
                <th className="py-3.5 px-4">Valor Global</th>
                <th className="py-3.5 px-4">Equipe de Fiscalização</th>
                <th className="py-3.5 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Carregando contratos da UERN...
                  </td>
                </tr>
              ) : contratos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Nenhum contrato encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                contratos.map((c) => {
                  const gestor = c.responsaveis?.find((r: any) => r.tipoAtuacao === 'GESTOR')?.user?.nome;
                  const fiscalAdm = c.responsaveis?.find((r: any) => r.tipoAtuacao === 'FISCAL_ADMINISTRATIVO')?.user?.nome;
                  const fiscalTec = c.responsaveis?.find((r: any) => r.tipoAtuacao === 'FISCAL_TECNICO')?.user?.nome;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            c.status === 'ATIVO'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : c.status === 'SUSPENSO'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>

                      {/* Contrato / Empenho */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">
                          {c.empenhoSubstituiContrato
                            ? `Empenho: ${c.numeroEmpenho}`
                            : c.numeroContrato
                            ? `Contrato nº ${c.numeroContrato}`
                            : `Empenho nº ${c.numeroEmpenho || 'S/N'}`}
                        </div>
                        {c.empenhoSubstituiContrato && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 font-semibold">
                            Empenho substitui contrato
                          </span>
                        )}
                      </td>

                      {/* Objeto & Processo */}
                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-semibold text-slate-800 line-clamp-2 leading-tight" title={c.objeto}>
                          {c.objeto}
                        </p>
                        <span className="text-[10px] text-blue-700 font-mono mt-0.5 block">
                          SEI: {c.processoSeiMae}
                        </span>
                      </td>

                      {/* Contratada */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-800 truncate" title={c.fornecedor.razaoSocial}>
                          {c.fornecedor.razaoSocial}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          CNPJ: {c.fornecedor.cnpj}
                        </div>
                        {c.fornecedor.nomePreposto && (
                          <div className="text-[10px] text-slate-500 truncate">
                            Preposto: {c.fornecedor.nomePreposto}
                          </div>
                        )}
                      </td>

                      {/* Vigência & Duração */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-xs text-slate-700">
                          {new Date(c.vigenciaInicio).toLocaleDateString('pt-BR')} a{' '}
                          <span className="font-bold text-slate-800">
                            {new Date(c.vigenciaFim).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="text-[10px] text-blue-600 font-semibold mt-0.5">
                          {calcularTempoTotal(c.vigenciaInicio, c.vigenciaFim)}
                        </div>
                        <div className="text-[9px] text-slate-400" title={obterLimiteLegalTexto(c.tipoVigencia)}>
                          {c.tipoVigencia.replace('_', ' ')}
                        </div>
                      </td>

                      {/* Valor Global */}
                      <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-800">
                        {c.valorGlobal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        {c.valorAtualizado !== c.valorGlobal && (
                          <div className="text-[10px] text-emerald-600">
                            Atualizado: {c.valorAtualizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </div>
                        )}
                      </td>

                      {/* Equipe Fiscalização */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="space-y-0.5 text-[10px]">
                          <div><span className="font-bold text-slate-700">Gestor:</span> {gestor || <span className="text-rose-500 font-semibold">Pendente</span>}</div>
                          <div><span className="font-bold text-slate-700">F. Adm:</span> {fiscalAdm || <span className="text-rose-500 font-semibold">Pendente</span>}</div>
                          <div><span className="font-bold text-slate-700">F. Téc:</span> {fiscalTec || <span className="text-rose-500 font-semibold">Pendente</span>}</div>
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/contratos/${c.id}`}
                          className="inline-flex items-center space-x-1 p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                          title="Detalhar Contrato"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Importação de Planilha */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-2 font-bold text-slate-800 text-base mb-2">
              <UploadCloud className="w-5 h-5 text-blue-600" />
              <h3>Importar Contratos por Planilha</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Faça upload de arquivo Excel (.xlsx, .xls) ou CSV contendo as colunas padronizadas de contratos.
            </p>

            {importResult && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs ${
                  importResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {importResult.success ? (
                  <div>
                    <p className="font-bold">Importação concluída!</p>
                    <p>{importResult.sucessos} contratos inseridos com sucesso.</p>
                  </div>
                ) : (
                  <p>{importResult.error || 'Erro ao processar arquivo.'}</p>
                )}
              </div>
            )}

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-500 transition-colors bg-slate-50/50">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer block">
                  <FileSpreadsheet className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <span className="text-xs font-semibold text-slate-700 block">
                    {importFile ? importFile.name : 'Clique para selecionar a planilha'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Formatos suportados: .xlsx, .xls, .csv
                  </span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={!importFile || importing}
                  className="px-4 py-2 bg-[#003366] text-white text-xs font-semibold rounded-lg hover:bg-[#002244] disabled:opacity-50"
                >
                  {importing ? 'Importando...' : 'Iniciar Importação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
