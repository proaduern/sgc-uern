'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Info
} from 'lucide-react';

export default function NovoContratoPage() {
  const router = useRouter();
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

  useEffect(() => {
    fetch('/api/fornecedores')
      .then((r) => r.json())
      .then((d) => {
        if (d.fornecedores) setFornecedores(d.fornecedores);
      })
      .catch(console.error);
  }, []);

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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2 text-sm font-bold text-slate-800">
              <Layers className="w-4 h-4 text-blue-700" />
              <span>5. Itens do Contrato & Limite de Aditamento (Lei 14.133)</span>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <span className="font-semibold text-slate-600">Tipo de Licitação:</span>
              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="radio"
                  name="tipoAgrupamento"
                  checked={tipoAgrupamento === 'ITEM_INDIVIDUAL'}
                  onChange={() => setTipoAgrupamento('ITEM_INDIVIDUAL')}
                  className="text-blue-600"
                />
                <span>Por Item</span>
              </label>

              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="radio"
                  name="tipoAgrupamento"
                  checked={tipoAgrupamento === 'GRUPO_UNICO'}
                  onChange={() => setTipoAgrupamento('GRUPO_UNICO')}
                  className="text-blue-600"
                />
                <span>Grupo Único</span>
              </label>
            </div>
          </div>

          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-blue-900">
            <span className="font-bold">Regra de Acréscimo Legal ({limiteAcrescimoLegal}%):</span>{' '}
            {tipoAgrupamento === 'GRUPO_UNICO'
              ? `Como a licitação é Grupo Único, o limite de acréscimo de ${limiteAcrescimoLegal}% aplica-se sobre o valor global do contrato.`
              : `Como a licitação é Por Item, o limite de acréscimo de ${limiteAcrescimoLegal}% aplica-se a cada item individualmente.`}
          </div>

          {/* Tabela de Itens */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-16">Item</th>
                  <th className="py-2.5 px-3">Descrição do Item</th>
                  <th className="py-2.5 px-3 w-20">Unidade</th>
                  <th className="py-2.5 px-3 w-28">Quantidade</th>
                  <th className="py-2.5 px-3 w-32">Valor Unit. (R$)</th>
                  <th className="py-2.5 px-3 w-32">Total (R$)</th>
                  <th className="py-2.5 px-2 w-12 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itens.map((it, idx) => {
                  const subtotal = (parseFloat(it.quantidade) || 0) * (parseFloat(it.valorUnitario) || 0);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-bold text-slate-800">{it.numeroItem}</td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          required
                          value={it.descricao}
                          onChange={(e) => handleItemChange(idx, 'descricao', e.target.value)}
                          placeholder="Descrição do material ou serviço..."
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={it.unidade}
                          onChange={(e) => handleItemChange(idx, 'unidade', e.target.value)}
                          placeholder="UN, MÊS"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-center"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={it.quantidade}
                          onChange={(e) => handleItemChange(idx, 'quantidade', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-right font-semibold"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={it.valorUnitario}
                          onChange={(e) => handleItemChange(idx, 'valorUnitario', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-right font-semibold"
                        />
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900 text-right">
                        {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={itens.length === 1}
                          className="text-slate-400 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-blue-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Mais Um Item</span>
            </button>

            <div className="text-xs text-slate-700">
              <span className="font-semibold">Soma Total dos Itens: </span>
              <span className="font-bold text-slate-900 text-sm">
                {totalCalculadoItens.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>
        </div>

        {/* BOTOES DE AÇÃO */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
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
      </form>
    </div>
  );
}
