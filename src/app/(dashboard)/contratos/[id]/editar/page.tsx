'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Save,
  UserCheck,
  MapPin,
  Phone,
  Mail,
  User,
  Edit3,
  Landmark,
  ShieldCheck,
  History
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

  // Fornecedor Selection & Dados Detalhados
  const [fornecedorId, setFornecedorId] = useState('');
  const [mostrarEdicaoFornecedor, setMostrarEdicaoFornecedor] = useState(false);
  const [salvandoFornecedor, setSalvandoFornecedor] = useState(false);
  const [supplierEndereco, setSupplierEndereco] = useState('');
  const [supplierTelefone, setSupplierTelefone] = useState('');
  const [supplierNomeRepresentante, setSupplierNomeRepresentante] = useState('');
  const [supplierCpfRepresentante, setSupplierCpfRepresentante] = useState('');
  const [supplierTelefoneRepresentante, setSupplierTelefoneRepresentante] = useState('');
  const [supplierEmailRepresentante, setSupplierEmailRepresentante] = useState('');
  const [supplierNomePreposto, setSupplierNomePreposto] = useState('');
  const [supplierTelefonePreposto, setSupplierTelefonePreposto] = useState('');
  const [supplierEmailPreposto, setSupplierEmailPreposto] = useState('');
  const [sucessoFornecedor, setSucessoFornecedor] = useState<string | null>(null);

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

  // Tipos & Regime de Execução
  const [tipoContrato, setTipoContrato] = useState('FORNECIMENTO_SIMPLES');
  const [regimeExecucao, setRegimeExecucao] = useState<'SEM_DEDICACAO_EXCLUSIVA' | 'DEDICACAO_EXCLUSIVA' | 'MISTO'>('SEM_DEDICACAO_EXCLUSIVA');
  const [anosVigencia, setAnosVigencia] = useState(1);
  const [tipoEmpreitada, setTipoEmpreitada] = useState('PRECO_UNITARIO');
  const [tipoMedicao, setTipoMedicao] = useState('MENSAL');

  // Reajuste & Data-Base
  const [indiceIpca, setIndiceIpca] = useState(false);
  const [indiceSetorial, setIndiceSetorial] = useState(false);
  const [nomeIndiceSetorial, setNomeIndiceSetorial] = useState('');
  const [justificativaSetorial, setJustificativaSetorial] = useState('');
  const [indiceCct, setIndiceCct] = useState(false);
  const [dataOrcamentoEstimado, setDataOrcamentoEstimado] = useState('');

  // Conta Vinculada & Alíquotas de Retenção (IN nº 02/2024 SEAD/RN)
  const [retencaoContaVinculadaAtiva, setRetencaoContaVinculadaAtiva] = useState(false);
  const [nivelContaVinculada, setNivelContaVinculada] = useState<'NIVEL_1_LEVE_31_54' | 'NIVEL_2_MEDIO_31_77' | 'NIVEL_3_GRAVE_32_00' | 'PERSONALIZADO'>('NIVEL_1_LEVE_31_54');
  const [percentualDecimoTerceiro, setPercentualDecimoTerceiro] = useState('8.33');
  const [percentualFerias, setPercentualFerias] = useState('8.33');
  const [percentualTercoConstitucional, setPercentualTercoConstitucional] = useState('2.78');
  const [percentualMultaFgts, setPercentualMultaFgts] = useState('4.00');
  const [percentualEncargosSubmodulo, setPercentualEncargosSubmodulo] = useState('8.10');
  const [normativoContaVinculadaRef, setNormativoContaVinculadaRef] = useState('Instrução Normativa-SEI nº 2, de 02 de julho de 2024 - SEAD/RN (Anexo I)');
  const [justificativaAlteracaoAliquota, setJustificativaAlteracaoAliquota] = useState('');
  const [historicoAliquotas, setHistoricoAliquotas] = useState<any[]>([]);

  // Dados Bancários da Conta Vinculada
  const [contaVinculadaBanco, setContaVinculadaBanco] = useState('BANCO DO BRASIL S.A.');
  const [contaVinculadaAgencia, setContaVinculadaAgencia] = useState('');
  const [contaVinculadaNumeroConta, setContaVinculadaNumeroConta] = useState('');
  const [contaVinculadaDataAbertura, setContaVinculadaDataAbertura] = useState('');
  const [contaVinculadaOficioAbertura, setContaVinculadaOficioAbertura] = useState('');
  const [contaVinculadaProcessoSei, setContaVinculadaProcessoSei] = useState('');
  const [contaVinculadaStatusConta, setContaVinculadaStatusConta] = useState('ATIVA');
  const [contaVinculadaObservacoes, setContaVinculadaObservacoes] = useState('');

  // Total calculado dinamicamente
  const percentualTotalRetencao = useMemo(() => {
    const p1 = parseFloat(percentualDecimoTerceiro) || 0;
    const p2 = parseFloat(percentualFerias) || 0;
    const p3 = parseFloat(percentualTercoConstitucional) || 0;
    const p4 = parseFloat(percentualMultaFgts) || 0;
    const p5 = parseFloat(percentualEncargosSubmodulo) || 0;
    return Number((p1 + p2 + p3 + p4 + p5).toFixed(2));
  }, [percentualDecimoTerceiro, percentualFerias, percentualTercoConstitucional, percentualMultaFgts, percentualEncargosSubmodulo]);

  const aplicarNivelContaVinculada = (nivel: 'NIVEL_1_LEVE_31_54' | 'NIVEL_2_MEDIO_31_77' | 'NIVEL_3_GRAVE_32_00' | 'PERSONALIZADO') => {
    setNivelContaVinculada(nivel);
    if (nivel === 'NIVEL_1_LEVE_31_54') {
      setPercentualDecimoTerceiro('8.33');
      setPercentualFerias('8.33');
      setPercentualTercoConstitucional('2.78');
      setPercentualMultaFgts('4.00');
      setPercentualEncargosSubmodulo('8.10');
      setNormativoContaVinculadaRef('Instrução Normativa-SEI nº 2/2024 - SEAD/RN (Anexo I - Nível 1: SAT 1%)');
    } else if (nivel === 'NIVEL_2_MEDIO_31_77') {
      setPercentualDecimoTerceiro('8.33');
      setPercentualFerias('8.33');
      setPercentualTercoConstitucional('2.78');
      setPercentualMultaFgts('4.00');
      setPercentualEncargosSubmodulo('8.33');
      setNormativoContaVinculadaRef('Instrução Normativa-SEI nº 2/2024 - SEAD/RN (Anexo I - Nível 2: SAT 2%)');
    } else if (nivel === 'NIVEL_3_GRAVE_32_00') {
      setPercentualDecimoTerceiro('8.33');
      setPercentualFerias('8.33');
      setPercentualTercoConstitucional('2.78');
      setPercentualMultaFgts('4.00');
      setPercentualEncargosSubmodulo('8.56');
      setNormativoContaVinculadaRef('Instrução Normativa-SEI nº 2/2024 - SEAD/RN (Anexo I - Nível 3: SAT 3%)');
    }
  };

  // Módulo 2 - Itens
  const [tipoAgrupamento, setTipoAgrupamento] = useState('ITEM_INDIVIDUAL');
  const [mistoFiltroCategoria, setMistoFiltroCategoria] = useState<'TODOS' | 'DEMO' | 'NAO_DEMO'>('TODOS');
  const [itens, setItens] = useState<Array<{
    id?: string;
    numeroItem: number;
    cidade?: string;
    descricao: string;
    unidade: string;
    tipoReajuste?: string;
    indiceReferencia?: string;
    cctVinculada?: string;
    quantidade: string;
    quantidadeAnual?: string;
    valorUnitario: string;
    categoriaItem?: 'DEMO' | 'NAO_DEMO';
  }>>([]);

  // Estados para Importação em Lote de Itens via Planilha
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [previewItens, setPreviewItens] = useState<Array<{
    numeroItem: number;
    cidade?: string;
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

          if (c.vigenciaInicio && c.vigenciaFim) {
            const d1 = new Date(c.vigenciaInicio);
            const d2 = new Date(c.vigenciaFim);
            if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 > d1) {
              let months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
              if (d2.getDate() >= d1.getDate() - 2) months += 1;
              setAnosVigencia(Math.max(1, Math.round(months / 12)));
            }
          }

          setValorGlobal(c.valorGlobal ? String(c.valorGlobal) : '0');
          setTipoVigencia(c.tipoVigencia || 'NAO_CONTINUADO');
          setPortariaContinuadosRef(c.portariaContinuadosRef || '');
          setPortariaContinuadosIdSei(c.portariaContinuadosIdSei || '');
          setPortariaContinuadosUrl(c.portariaContinuadosUrl || '');

          setTipoContrato(c.tipoContrato || 'FORNECIMENTO_SIMPLES');
          const regCarregado = (c.regimeExecucao || (c.tipoContrato === 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO' ? 'DEDICACAO_EXCLUSIVA' : 'SEM_DEDICACAO_EXCLUSIVA')) as any;
          setRegimeExecucao(regCarregado);

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

          // Parâmetros de Conta Vinculada (IN 02/2024 SEAD/RN)
          setRetencaoContaVinculadaAtiva(!!c.retencaoContaVinculadaAtiva);
          setNivelContaVinculada(c.nivelContaVinculada || 'NIVEL_1_LEVE_31_54');
          if (c.percentualDecimoTerceiro !== null && c.percentualDecimoTerceiro !== undefined) {
            setPercentualDecimoTerceiro(String(c.percentualDecimoTerceiro));
          }
          if (c.percentualFerias !== null && c.percentualFerias !== undefined) {
            setPercentualFerias(String(c.percentualFerias));
          }
          if (c.percentualTercoConstitucional !== null && c.percentualTercoConstitucional !== undefined) {
            setPercentualTercoConstitucional(String(c.percentualTercoConstitucional));
          }
          if (c.percentualMultaFgts !== null && c.percentualMultaFgts !== undefined) {
            setPercentualMultaFgts(String(c.percentualMultaFgts));
          }
          if (c.percentualEncargosSubmodulo !== null && c.percentualEncargosSubmodulo !== undefined) {
            setPercentualEncargosSubmodulo(String(c.percentualEncargosSubmodulo));
          }
          if (c.normativoContaVinculadaRef) {
            setNormativoContaVinculadaRef(c.normativoContaVinculadaRef);
          }
          if (c.justificativaAlteracaoAliquota) {
            setJustificativaAlteracaoAliquota(c.justificativaAlteracaoAliquota);
          }
          if (c.historicoAliquotasJson && Array.isArray(c.historicoAliquotasJson)) {
            setHistoricoAliquotas(c.historicoAliquotasJson);
          }

          // Dados Bancários da Conta Vinculada
          setContaVinculadaBanco(c.contaVinculadaBanco || 'BANCO DO BRASIL S.A.');
          setContaVinculadaAgencia(c.contaVinculadaAgencia || '');
          setContaVinculadaNumeroConta(c.contaVinculadaNumeroConta || '');
          setContaVinculadaDataAbertura(c.contaVinculadaDataAbertura ? new Date(c.contaVinculadaDataAbertura).toISOString().split('T')[0] : '');
          setContaVinculadaOficioAbertura(c.contaVinculadaOficioAbertura || '');
          setContaVinculadaProcessoSei(c.contaVinculadaProcessoSei || '');
          setContaVinculadaStatusConta(c.contaVinculadaStatusConta || 'ATIVA');
          setContaVinculadaObservacoes(c.contaVinculadaObservacoes || '');

          // Itens
          if (c.itens && Array.isArray(c.itens) && c.itens.length > 0) {
            setItens(
              c.itens.map((it: any) => ({
                id: it.id,
                numeroItem: it.numeroItem,
                cidade: it.cidade || 'Mossoró',
                descricao: it.descricao,
                unidade: it.unidade || 'UN',
                quantidade: String(it.quantidadeAtual ?? it.quantidadeOriginal ?? 1),
                quantidadeAnual: String(it.quantidadeAnual ?? it.quantidadeAtual ?? 1),
                valorUnitario: String(it.valorUnitarioAtual ?? it.valorUnitarioOriginal ?? 0),
                categoriaItem: (it.categoriaItem || (regCarregado === 'DEDICACAO_EXCLUSIVA' ? 'DEMO' : 'NAO_DEMO')) as 'DEMO' | 'NAO_DEMO',
                tipoReajuste: it.tipoReajuste || (
                  ['MÊS', 'MES', 'POSTO'].includes((it.unidade || '').toUpperCase()) && c.tipoContrato === 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO'
                    ? 'REPACTUACAO_CCT'
                    : 'REAJUSTE_INDICE'
                ),
                indiceReferencia: it.indiceReferencia || '',
                cctVinculada: it.cctVinculada || '',
              }))
            );
            if (c.itens[0]?.tipoGrupo) {
              setTipoAgrupamento(c.itens[0].tipoGrupo);
            }
          } else {
            setItens([
              {
                numeroItem: 1,
                cidade: 'Mossoró',
                descricao: '',
                unidade: 'UN',
                quantidade: '1',
                quantidadeAnual: '1',
                valorUnitario: '0',
                categoriaItem: 'NAO_DEMO',
                tipoReajuste: 'REAJUSTE_INDICE'
              }
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

  useEffect(() => {
    if (fornecedorId && fornecedores.length > 0) {
      const f = fornecedores.find((x) => x.id === fornecedorId);
      if (f) {
        setSupplierEndereco(f.endereco || '');
        setSupplierTelefone(f.telefone || '');
        setSupplierNomeRepresentante(f.nomeRepresentanteLegal || '');
        setSupplierCpfRepresentante(f.cpfRepresentanteLegal || '');
        setSupplierTelefoneRepresentante(f.telefoneRepresentanteLegal || '');
        setSupplierEmailRepresentante(f.emailRepresentanteLegal || '');
        setSupplierNomePreposto(f.nomePreposto || '');
        setSupplierTelefonePreposto(f.telefonePreposto || '');
        setSupplierEmailPreposto(f.emailPreposto || '');
      }
    }
  }, [fornecedorId, fornecedores]);

  const handleSalvarFornecedor = async () => {
    if (!fornecedorId) return;
    setSalvandoFornecedor(true);
    setSucessoFornecedor(null);
    try {
      const res = await fetch(`/api/fornecedores/${fornecedorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endereco: supplierEndereco,
          telefone: supplierTelefone,
          nomeRepresentanteLegal: supplierNomeRepresentante,
          cpfRepresentanteLegal: supplierCpfRepresentante,
          telefoneRepresentanteLegal: supplierTelefoneRepresentante,
          emailRepresentanteLegal: supplierEmailRepresentante,
          nomePreposto: supplierNomePreposto,
          telefonePreposto: supplierTelefonePreposto,
          emailPreposto: supplierEmailPreposto,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar fornecedor');

      setFornecedores((prev) =>
        prev.map((f) => (f.id === fornecedorId ? { ...f, ...data.fornecedor } : f))
      );
      setSucessoFornecedor('Dados do fornecedor, representante legal e preposto atualizados com sucesso!');
      setTimeout(() => setSucessoFornecedor(null), 4000);
      setMostrarEdicaoFornecedor(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSalvandoFornecedor(false);
    }
  };

  const handleAddItem = (forcedCategoria?: 'DEMO' | 'NAO_DEMO') => {
    const isDemo = forcedCategoria
      ? forcedCategoria === 'DEMO'
      : regimeExecucao === 'DEDICACAO_EXCLUSIVA';

    setItens([
      ...itens,
      {
        numeroItem: itens.length + 1,
        cidade: 'Mossoró',
        descricao: '',
        unidade: isDemo ? 'MÊS' : 'UN',
        quantidade: isDemo ? '1' : '1',
        quantidadeAnual: isDemo ? '12' : '1',
        valorUnitario: '0',
        tipoReajuste: isDemo ? 'REPACTUACAO_CCT' : 'REAJUSTE_INDICE',
        indiceReferencia: '',
        categoriaItem: isDemo ? 'DEMO' : 'NAO_DEMO',
      }
    ]);
  };

  const handleAddItemDemo = () => handleAddItem('DEMO');
  const handleAddItemNaoDemo = () => handleAddItem('NAO_DEMO');

  const handleRemoveItem = (index: number) => {
    if (itens.length === 1) return;
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const updated = [...itens];
    (updated[index] as any)[field] = value;
    if (field === 'quantidadeAnual' && updated[index].categoriaItem !== 'DEMO') {
      const qA = parseFloat(value) || 0;
      updated[index].quantidade = String(anosVigencia > 1 ? qA * anosVigencia : qA);
    }
    setItens(updated);
  };

  const calcularValoresItem = (it: {
    quantidade: string;
    quantidadeAnual?: string;
    valorUnitario: string;
    unidade?: string;
    categoriaItem?: 'DEMO' | 'NAO_DEMO';
  }) => {
    const isDemo = regimeExecucao === 'DEDICACAO_EXCLUSIVA'
      ? true
      : regimeExecucao === 'SEM_DEDICACAO_EXCLUSIVA'
      ? false
      : (it.categoriaItem === 'DEMO');

    const v = parseFloat(it.valorUnitario) || 0;

    if (isDemo) {
      const q = parseFloat(it.quantidade) || 0;
      const totalMensal = q * v;
      const totalAnual = totalMensal * 12;
      const totalPlurianual = anosVigencia > 1 ? totalMensal * 12 * anosVigencia : 0;
      const totalEfetivo = anosVigencia > 1 ? totalPlurianual : totalAnual;
      return { totalMensal, totalAnual, totalPlurianual, totalEfetivo, isDemo: true };
    } else {
      const qAnual = parseFloat(it.quantidadeAnual || it.quantidade) || 0;
      const totalAnual = qAnual * v;
      const totalPlurianual = anosVigencia > 1 ? totalAnual * anosVigencia : 0;
      const totalEfetivo = anosVigencia > 1 ? totalPlurianual : totalAnual;
      const totalMensal = totalAnual / 12;
      return { totalMensal, totalAnual, totalPlurianual, totalEfetivo, isDemo: false };
    }
  };

  const totaisConsolidados = useMemo(() => {
    return itens.reduce(
      (acc, it) => {
        const { totalMensal, totalAnual, totalPlurianual, totalEfetivo, isDemo } = calcularValoresItem(it);
        acc.mensal += totalMensal;
        acc.anual += totalAnual;
        acc.plurianual += totalPlurianual;
        acc.global += totalEfetivo;
        if (isDemo) {
          acc.demoAnual += totalAnual;
          acc.demoGlobal += totalEfetivo;
        } else {
          acc.naoDemoAnual += totalAnual;
          acc.naoDemoGlobal += totalEfetivo;
        }
        return acc;
      },
      {
        mensal: 0,
        anual: 0,
        plurianual: 0,
        global: 0,
        demoAnual: 0,
        demoGlobal: 0,
        naoDemoAnual: 0,
        naoDemoGlobal: 0,
      }
    );
  }, [itens, anosVigencia, regimeExecucao]);

  const totalCalculadoItens = totaisConsolidados.global;

  const sincronizarValorGlobal = () => {
    setValorGlobal(totaisConsolidados.global.toFixed(2));
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
          cidade?: string;
          descricao: string;
          unidade: string;
          quantidade: string;
          valorUnitario: string;
          subtotal: number;
        }> = [];

        rows.forEach((row, index) => {
          const keys = Object.keys(row);
          let numeroItem = index + 1;
          let cidade = 'Mossoró';
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
            } else if (norm.includes('cidade') || norm.includes('municipio') || norm.includes('campus') || norm.includes('local')) {
              cidade = String(val || '').trim();
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
              cidade: cidade || 'Mossoró',
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

    const mapItemImportado = (p: typeof previewItens[0], idx: number) => {
      const isDemo = regimeExecucao === 'DEDICACAO_EXCLUSIVA'
        ? true
        : regimeExecucao === 'SEM_DEDICACAO_EXCLUSIVA'
        ? false
        : ['MÊS', 'MES', 'POSTO'].includes((p.unidade || '').toUpperCase());

      return {
        numeroItem: idx,
        cidade: p.cidade || 'Mossoró',
        descricao: p.descricao,
        unidade: p.unidade,
        quantidade: p.quantidade,
        quantidadeAnual: p.quantidade,
        valorUnitario: p.valorUnitario,
        categoriaItem: (isDemo ? 'DEMO' : 'NAO_DEMO') as 'DEMO' | 'NAO_DEMO',
        tipoReajuste: isDemo ? 'REPACTUACAO_CCT' : 'REAJUSTE_INDICE',
        indiceReferencia: '',
      };
    };

    if (importMode === 'REPLACE') {
      setItens(previewItens.map((p, idx) => mapItemImportado(p, idx + 1)));
    } else {
      const proximoNum = itens.length > 0 ? Math.max(...itens.map((i) => i.numeroItem)) + 1 : 1;
      const novos = previewItens.map((p, idx) => mapItemImportado(p, proximoNum + idx));
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
        regimeExecucao,
        tipoEmpreitada,
        tipoMedicao,
        dataOrcamentoEstimado: dataOrcamentoEstimado || null,
        fornecedorId,
        indices: listaIndices,
        // Parâmetros de Conta Vinculada (IN 02/2024 SEAD/RN)
        retencaoContaVinculadaAtiva,
        nivelContaVinculada,
        percentualDecimoTerceiro: parseFloat(percentualDecimoTerceiro) || 8.33,
        percentualFerias: parseFloat(percentualFerias) || 8.33,
        percentualTercoConstitucional: parseFloat(percentualTercoConstitucional) || 2.78,
        percentualMultaFgts: parseFloat(percentualMultaFgts) || 4.00,
        percentualEncargosSubmodulo: parseFloat(percentualEncargosSubmodulo) || 8.10,
        percentualTotalRetencao: percentualTotalRetencao,
        normativoContaVinculadaRef,
        justificativaAlteracaoAliquota: justificativaAlteracaoAliquota || null,
        // Dados Bancários da Conta Vinculada
        contaVinculadaBanco: contaVinculadaBanco || null,
        contaVinculadaAgencia: contaVinculadaAgencia || null,
        contaVinculadaNumeroConta: contaVinculadaNumeroConta || null,
        contaVinculadaDataAbertura: contaVinculadaDataAbertura ? new Date(contaVinculadaDataAbertura) : null,
        contaVinculadaOficioAbertura: contaVinculadaOficioAbertura || null,
        contaVinculadaProcessoSei: contaVinculadaProcessoSei || null,
        contaVinculadaStatusConta: contaVinculadaStatusConta || null,
        contaVinculadaObservacoes: contaVinculadaObservacoes || null,
        itens: itens.map((it) => {
          const isDemo = regimeExecucao === 'DEDICACAO_EXCLUSIVA'
            ? true
            : regimeExecucao === 'SEM_DEDICACAO_EXCLUSIVA'
            ? false
            : (it.categoriaItem === 'DEMO');

          return {
            ...it,
            categoriaItem: isDemo ? 'DEMO' : 'NAO_DEMO',
            quantidadeAnual: parseFloat(it.quantidadeAnual || it.quantidade) || 0,
            tipoGrupo: tipoAgrupamento,
          };
        }),
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
            {fornecedorId && (
              <button
                type="button"
                onClick={() => setMostrarEdicaoFornecedor(!mostrarEdicaoFornecedor)}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{mostrarEdicaoFornecedor ? 'Fechar Edição' : 'Editar Dados do Fornecedor / Representante'}</span>
              </button>
            )}
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

          {sucessoFornecedor && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{sucessoFornecedor}</span>
            </div>
          )}

          {/* DADOS VISUAIS DO FORNECEDOR SELECIONADO */}
          {fornecedorId && !mostrarEdicaoFornecedor && (() => {
            const f = fornecedores.find((x) => x.id === fornecedorId);
            if (!f) return null;
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                {/* Cartão 1: Empresa & Endereço */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Dados da Empresa</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    <strong className="text-slate-700">Endereço:</strong> {f.endereco || <span className="italic text-slate-400">Não informado</span>}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    <strong className="text-slate-700">Telefone:</strong> {f.telefone || <span className="italic text-slate-400">Não informado</span>}
                  </p>
                  <p className="text-[11px] text-slate-600 truncate">
                    <strong className="text-slate-700">E-mail:</strong> {f.email || <span className="italic text-slate-400">Não informado</span>}
                  </p>
                </div>

                {/* Cartão 2: Representante Legal */}
                <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 text-xs space-y-1.5">
                  <div className="flex items-center space-x-1.5 font-bold text-blue-900">
                    <UserCheck className="w-3.5 h-3.5 text-blue-700" />
                    <span>Representante Legal (Signatário)</span>
                  </div>
                  <p className="text-[11px] text-slate-700">
                    <strong>Nome:</strong> {f.nomeRepresentanteLegal || <span className="italic text-slate-400">Não informado</span>}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    <strong>Contato:</strong> {f.telefoneRepresentanteLegal || f.emailRepresentanteLegal || <span className="italic text-slate-400">Não informado</span>}
                  </p>
                </div>

                {/* Cartão 3: Preposto Operacional */}
                <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100 text-xs space-y-1.5">
                  <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                    <User className="w-3.5 h-3.5 text-amber-700" />
                    <span>Preposto Operacional</span>
                  </div>
                  <p className="text-[11px] text-slate-700">
                    <strong>Nome:</strong> {f.nomePreposto || <span className="italic text-slate-400">Não informado</span>}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    <strong>Telefone:</strong> {f.telefonePreposto || <span className="italic text-slate-400">Não informado</span>}
                  </p>
                  <p className="text-[11px] text-slate-600 truncate">
                    <strong>E-mail:</strong> {f.emailPreposto || <span className="italic text-slate-400">Não informado</span>}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* FORMULÁRIO DE EDIÇÃO INLINE DO FORNECEDOR */}
          {fornecedorId && mostrarEdicaoFornecedor && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 animate-in fade-in">
              <div className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-2 flex items-center justify-between">
                <span>Atualizar Informações do Fornecedor e Representantes</span>
                <span className="text-[10px] text-slate-500 font-normal">Distinga o Representante Legal (quem assina) do Preposto (operacional)</span>
              </div>

              {/* Endereço e Telefone da Empresa */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Endereço Completo da Empresa</label>
                  <input
                    type="text"
                    value={supplierEndereco}
                    onChange={(e) => setSupplierEndereco(e.target.value)}
                    placeholder="Rua, Número, Bairro, Cidade - UF, CEP"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Telefone da Empresa</label>
                  <input
                    type="text"
                    value={supplierTelefone}
                    onChange={(e) => setSupplierTelefone(e.target.value)}
                    placeholder="(84) 3333-0000"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Representante Legal */}
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-900">
                  <UserCheck className="w-4 h-4 text-blue-700" />
                  <span>Representante Legal (Signatário do Contrato)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700">Nome do Representante Legal</label>
                    <input
                      type="text"
                      value={supplierNomeRepresentante}
                      onChange={(e) => setSupplierNomeRepresentante(e.target.value)}
                      placeholder="Nome completo do signatário"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700">E-mail do Representante</label>
                    <input
                      type="email"
                      value={supplierEmailRepresentante}
                      onChange={(e) => setSupplierEmailRepresentante(e.target.value)}
                      placeholder="representante@empresa.com"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700">Telefone do Representante</label>
                    <input
                      type="text"
                      value={supplierTelefoneRepresentante}
                      onChange={(e) => setSupplierTelefoneRepresentante(e.target.value)}
                      placeholder="(84) 99999-0000"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Preposto Operacional */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-900">
                  <User className="w-4 h-4 text-amber-700" />
                  <span>Preposto Operacional (Gestão do dia-a-dia)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700">Nome do Preposto</label>
                    <input
                      type="text"
                      value={supplierNomePreposto}
                      onChange={(e) => setSupplierNomePreposto(e.target.value)}
                      placeholder="Nome do preposto"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700">Telefone do Preposto</label>
                    <input
                      type="text"
                      value={supplierTelefonePreposto}
                      onChange={(e) => setSupplierTelefonePreposto(e.target.value)}
                      placeholder="(84) 98888-0000"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700">E-mail do Preposto</label>
                    <input
                      type="email"
                      value={supplierEmailPreposto}
                      onChange={(e) => setSupplierEmailPreposto(e.target.value)}
                      placeholder="preposto@empresa.com"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setMostrarEdicaoFornecedor(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarFornecedor}
                  disabled={salvandoFornecedor}
                  className="px-3 py-1.5 bg-blue-700 text-white text-xs font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
                >
                  {salvandoFornecedor ? 'Salvando...' : 'Salvar Alterações do Fornecedor'}
                </button>
              </div>
            </div>
          )}
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
                min="2000-01-01"
                max="2099-12-31"
                value={vigenciaInicio}
                onChange={(e) => {
                  let val = e.target.value;
                  if (val && val.includes('-')) {
                    const parts = val.split('-');
                    if (parts[0] && parts[0].length > 4) {
                      const cleanYear = parts[0].length === 5 && parts[0].startsWith('200')
                        ? '20' + parts[0].slice(3)
                        : parts[0].slice(0, 4);
                      val = `${cleanYear}-${parts[1] || '01'}-${parts[2] || '01'}`;
                    }
                  }
                  setVigenciaInicio(val);
                }}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Fim da Vigência *</label>
              <input
                type="date"
                min="2000-01-01"
                max="2099-12-31"
                value={vigenciaFim}
                onChange={(e) => {
                  let val = e.target.value;
                  if (val && val.includes('-')) {
                    const parts = val.split('-');
                    if (parts[0] && parts[0].length > 4) {
                      const cleanYear = parts[0].length === 5 && parts[0].startsWith('200')
                        ? '20' + parts[0].slice(3)
                        : parts[0].slice(0, 4);
                      val = `${cleanYear}-${parts[1] || '01'}-${parts[2] || '01'}`;
                    }
                  }
                  setVigenciaFim(val);
                }}
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
                onChange={(e) => {
                  const val = e.target.value;
                  setTipoContrato(val);
                  if (val === 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO') {
                    setRegimeExecucao('DEDICACAO_EXCLUSIVA');
                  } else if (val === 'LOCACAO_IMOVEL') {
                    setTipoVigencia('LOCACAO_IMOVEL');
                    setRegimeExecucao('SEM_DEDICACAO_EXCLUSIVA');
                  } else {
                    setRegimeExecucao('SEM_DEDICACAO_EXCLUSIVA');
                  }
                }}
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

          {/* Seletor de Regime de Execução de Mão de Obra */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Regime de Execução de Mão de Obra *
              </label>
              <span className="text-[11px] text-slate-400">
                Determina o layout da planilha de itens e fórmulas de cálculo
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div
                onClick={() => setRegimeExecucao('SEM_DEDICACAO_EXCLUSIVA')}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  regimeExecucao === 'SEM_DEDICACAO_EXCLUSIVA'
                    ? 'border-blue-600 bg-blue-50/70 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-base">🛠️</span>
                  <span className="text-xs font-bold text-slate-800">Sem Dedicação Exclusiva (Não DEMO)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Climatização, refrigeração, manutenção, aquisição de bens e serviços sem postos fixos. Fórmulas: <strong>Qtd Anual × Valor Unitário</strong>.
                </p>
              </div>

              <div
                onClick={() => setRegimeExecucao('DEDICACAO_EXCLUSIVA')}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  regimeExecucao === 'DEDICACAO_EXCLUSIVA'
                    ? 'border-amber-600 bg-amber-50/70 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-base">👥</span>
                  <span className="text-xs font-bold text-slate-800">Com Dedicação Exclusiva (DEMO)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Postos de trabalho terceirizados residentes vinculados à Convenção Coletiva (CCT) e Planilha da IN 05/2017.
                </p>
              </div>

              <div
                onClick={() => setRegimeExecucao('MISTO')}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  regimeExecucao === 'MISTO'
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-base">🔀</span>
                  <span className="text-xs font-bold text-slate-800">Contrato Misto (DEMO + Não DEMO)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Mescla postos de trabalho residentes com fornecimento de peças, materiais ou serviços sob demanda, unificando no Valor Global.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO 4: REAJUSTE E DATA-BASE */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
            <DollarSign className="w-4 h-4 text-blue-700" />
            <span>Regras de Reajuste e Interregno (Art. 63 da IN 01/2026)</span>
          </div>

          {/* Banners Inteligentes de Reajuste / Repactuação */}
          {indiceCct && (indiceIpca || indiceSetorial) && (
            <div className="p-4 bg-gradient-to-r from-amber-50 to-blue-50 rounded-xl border border-amber-300 text-xs text-slate-800 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Contrato Híbrido Detectado (Mão de Obra + Insumos/Serviços - Ex: Manutenção Predial):</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] pt-1">
                <div className="bg-white/90 p-3 rounded-lg border border-amber-200">
                  <span className="font-bold text-emerald-800 block mb-1">Trilha 1: Mão de Obra Residente (CCT)</span>
                  <p className="text-slate-600 leading-relaxed">
                    <strong>Sem exigência de interregno de 01 ano.</strong> A repactuação é admitida e produz efeitos tão logo exista nova Convenção Coletiva de Trabalho da categoria homologada/registrada.
                  </p>
                </div>
                <div className="bg-white/90 p-3 rounded-lg border border-blue-200">
                  <span className="font-bold text-blue-800 block mb-1">
                    Trilha 2: Insumos, Materiais & Peças ({nomeIndiceSetorial || (indiceIpca ? 'IPCA' : 'Índice Setorial')})
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    <strong>Sujeito ao interregno obrigatório de 01 ano</strong> (365 dias) a contar da Data do Orçamento Estimado da Licitação ou do último reajuste por índice.
                  </p>
                </div>
              </div>
            </div>
          )}

          {indiceCct && !indiceIpca && !indiceSetorial && (
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Regime Exclusivo de Repactuação por Convenção Coletiva (CCT):</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                <strong>Não há interregno de 01 ano para repactuação.</strong> Conforme o Art. 135 da Lei 14.133/2021, a repactuação vincula-se ao registro da nova convenção coletiva ou data-base sindical, não subordinando-se à trava anual dos índices de preços.
              </p>
            </div>
          )}

          {!indiceCct && (indiceIpca || indiceSetorial) && (
            <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>Regime de Reajuste em Sentido Estrito por Índice de Preços:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Sujeito ao <strong>interregno obrigatório de 01 ano (365 dias)</strong> contado da data do orçamento estimado da licitação ou do último reajuste concedido.
              </p>
            </div>
          )}

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

        {/* SEÇÃO 4.1: RETENÇÃO DE CONTA VINCULADA (IN nº 02/2024 SEAD/RN) */}
        <div className="bg-white rounded-2xl p-6 border border-emerald-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-100/80 text-emerald-800 rounded-xl">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    4.1. Provisões Trabalhistas - Conta-Depósito Vinculada
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    IN nº 02/2024 SEAD/RN
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Retenção mensal obrigatória em contratos de mão de obra exclusiva para provisionamento de encargos e verbas rescisórias
                </p>
              </div>
            </div>

            <label className="flex items-center space-x-2 text-xs font-bold text-emerald-950 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={retencaoContaVinculadaAtiva}
                onChange={(e) => setRetencaoContaVinculadaAtiva(e.target.checked)}
                className="rounded text-emerald-700 focus:ring-emerald-600 h-4 w-4"
              />
              <span>Ativar Retenção de Conta Vinculada</span>
            </label>
          </div>

          {retencaoContaVinculadaAtiva && (
            <div className="space-y-4">
              {/* Seletor de Níveis / Presets da IN 2/2024 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Selecione o Grau de Risco / Alíquota Legal de Referência:</span>
                  </span>
                  <span className="text-[11px] text-slate-500 italic">
                    Conforme Grau de Risco SAT/GIIL-RAT x FAP (Anexo I)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => aplicarNivelContaVinculada('NIVEL_1_LEVE_31_54')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      nivelContaVinculada === 'NIVEL_1_LEVE_31_54'
                        ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-200 text-emerald-950 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Nível 1 (Risco Leve)</span>
                      <span className="px-1.5 py-0.5 bg-emerald-200/70 text-emerald-900 rounded font-black text-[11px]">
                        31,54%
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      SAT 1% • Subtotal 23,44% + Encargos 8,10%
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => aplicarNivelContaVinculada('NIVEL_2_MEDIO_31_77')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      nivelContaVinculada === 'NIVEL_2_MEDIO_31_77'
                        ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-200 text-emerald-950 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Nível 2 (Risco Médio)</span>
                      <span className="px-1.5 py-0.5 bg-emerald-200/70 text-emerald-900 rounded font-black text-[11px]">
                        31,77%
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      SAT 2% • Subtotal 23,44% + Encargos 8,33%
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => aplicarNivelContaVinculada('NIVEL_3_GRAVE_32_00')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      nivelContaVinculada === 'NIVEL_3_GRAVE_32_00'
                        ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-200 text-emerald-950 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Nível 3 (Risco Grave)</span>
                      <span className="px-1.5 py-0.5 bg-emerald-200/70 text-emerald-900 rounded font-black text-[11px]">
                        32,00%
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      SAT 3% • Subtotal 23,44% + Encargos 8,56%
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNivelContaVinculada('PERSONALIZADO')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      nivelContaVinculada === 'PERSONALIZADO'
                        ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-200 text-amber-950 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Personalizado / Outras</span>
                      <span className="px-1.5 py-0.5 bg-amber-200/70 text-amber-900 rounded font-black text-[11px]">
                        {percentualTotalRetencao.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Edição livre de rubricas ou legislação superveniente
                    </div>
                  </button>
                </div>
              </div>

              {/* Rubricas Detalhadas Editáveis */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    13º Salário (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={percentualDecimoTerceiro}
                      onChange={(e) => {
                        setPercentualDecimoTerceiro(e.target.value);
                        setNivelContaVinculada('PERSONALIZADO');
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-emerald-600"
                    />
                    <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Padrão: 8,33%</span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Férias (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={percentualFerias}
                      onChange={(e) => {
                        setPercentualFerias(e.target.value);
                        setNivelContaVinculada('PERSONALIZADO');
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-emerald-600"
                    />
                    <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Padrão: 8,33%</span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    1/3 Constitucional (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={percentualTercoConstitucional}
                      onChange={(e) => {
                        setPercentualTercoConstitucional(e.target.value);
                        setNivelContaVinculada('PERSONALIZADO');
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-emerald-600"
                    />
                    <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Padrão: 2,78%</span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Multa FGTS / Rescisão (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={percentualMultaFgts}
                      onChange={(e) => {
                        setPercentualMultaFgts(e.target.value);
                        setNivelContaVinculada('PERSONALIZADO');
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-emerald-600"
                    />
                    <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Padrão: 4,00%</span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Encargos / RAT x FAP (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={percentualEncargosSubmodulo}
                      onChange={(e) => {
                        setPercentualEncargosSubmodulo(e.target.value);
                        setNivelContaVinculada('PERSONALIZADO');
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-emerald-600"
                    />
                    <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Nível 1=8,10% | 2=8,33% | 3=8,56%</span>
                </div>

                <div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-2.5 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase text-emerald-950">
                    Total a Reter em Fatura
                  </span>
                  <div className="text-xl font-black text-emerald-900 tracking-tight">
                    {percentualTotalRetencao.toFixed(2)}%
                  </div>
                  <span className="text-[10px] text-emerald-800 font-semibold">
                    Subtotal provisões: {( (parseFloat(percentualDecimoTerceiro)||0) + (parseFloat(percentualFerias)||0) + (parseFloat(percentualTercoConstitucional)||0) + (parseFloat(percentualMultaFgts)||0) ).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Fundamentação Normativa & Justificativa para Auditoria */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Normativo Legal de Referência:
                  </label>
                  <input
                    type="text"
                    value={normativoContaVinculadaRef}
                    onChange={(e) => setNormativoContaVinculadaRef(e.target.value)}
                    placeholder="Ex: Instrução Normativa-SEI nº 2, de 02 de julho de 2024 - SEAD/RN"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Justificativa / Enquadramento Legal da Alteração:
                  </label>
                  <input
                    type="text"
                    value={justificativaAlteracaoAliquota}
                    onChange={(e) => setJustificativaAlteracaoAliquota(e.target.value)}
                    placeholder="Ex: Alteração decorrente de novo decreto estadual ou enquadramento FAP 2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 font-medium"
                  />
                </div>
              </div>

              {/* Histórico e Auditoria de Alterações de Alíquotas */}
              {historicoAliquotas && historicoAliquotas.length > 0 && (
                <div className="mt-3 bg-slate-50/80 border border-slate-200 rounded-xl p-3">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 mb-2">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>Histórico de Parametrizações de Alíquotas ({historicoAliquotas.length} registros)</span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {historicoAliquotas.slice().reverse().map((h: any, idx: number) => (
                      <div key={idx} className="bg-white p-2 rounded-lg border border-slate-100 text-[11px] flex flex-col sm:flex-row justify-between sm:items-center gap-1 shadow-2xs">
                        <div>
                          <span className="font-bold text-slate-800">{h.usuario || 'Usuário PROAD'}</span>: {h.motivo || 'Ajuste de alíquotas'}
                          {h.aliquotas?.total && (
                            <span className="ml-1 text-emerald-800 font-bold">
                              (Alíquota Total: {h.aliquotas.total}%)
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {h.data ? new Date(h.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dados Oficiais da Conta Bancária Vinculada */}
              <div className="mt-4 pt-4 border-t border-emerald-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        Dados Bancários da Conta Vinculada (Garantia Bloqueada)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Informações fornecidas pelo banco após a abertura da conta. São puxadas automaticamente nos ofícios de liberação.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold self-start sm:self-auto">
                    {contaVinculadaStatusConta || 'ATIVA'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Instituição Financeira:
                    </label>
                    <input
                      type="text"
                      value={contaVinculadaBanco}
                      onChange={(e) => setContaVinculadaBanco(e.target.value)}
                      placeholder="Ex: BANCO DO BRASIL S.A."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Agência Bancária:
                    </label>
                    <input
                      type="text"
                      value={contaVinculadaAgencia}
                      onChange={(e) => setContaVinculadaAgencia(e.target.value)}
                      placeholder="Ex: 3795-8"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 font-mono font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Conta Corrente Bloqueada:
                    </label>
                    <input
                      type="text"
                      value={contaVinculadaNumeroConta}
                      onChange={(e) => setContaVinculadaNumeroConta(e.target.value)}
                      placeholder="Ex: 4900101224108"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 font-mono font-bold text-emerald-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Status da Conta:
                    </label>
                    <select
                      value={contaVinculadaStatusConta}
                      onChange={(e) => setContaVinculadaStatusConta(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 font-medium"
                    >
                      <option value="ATIVA">ATIVA / OPERACIONAL</option>
                      <option value="PENDENTE_ABERTURA">AGUARDANDO ABERTURA PELO BANCO</option>
                      <option value="ENCERRADA">ENCERRADA / EXTINTA</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Data da Abertura da Conta:
                    </label>
                    <input
                      type="date"
                      value={contaVinculadaDataAbertura}
                      onChange={(e) => setContaVinculadaDataAbertura(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nº do Ofício de Abertura:
                    </label>
                    <input
                      type="text"
                      value={contaVinculadaOficioAbertura}
                      onChange={(e) => setContaVinculadaOficioAbertura(e.target.value)}
                      placeholder="Ex: Ofício nº 084/2025-PROAD"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Processo SEI da Conta:
                    </label>
                    <input
                      type="text"
                      value={contaVinculadaProcessoSei}
                      onChange={(e) => setContaVinculadaProcessoSei(e.target.value)}
                      placeholder="Ex: 04410017.001048/2025-04"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Observações Bancárias:
                    </label>
                    <input
                      type="text"
                      value={contaVinculadaObservacoes}
                      onChange={(e) => setContaVinculadaObservacoes(e.target.value)}
                      placeholder="Ex: BB Setor Público RN"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 font-medium"
                    />
                  </div>
                </div>
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

              {regimeExecucao === 'MISTO' ? (
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={handleAddItemNaoDemo}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold rounded-xl transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Item Não DEMO</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddItemDemo}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold rounded-xl transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Posto DEMO</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleAddItem()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{regimeExecucao === 'DEDICACAO_EXCLUSIVA' ? 'Adicionar Posto' : 'Adicionar Item'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Banner Informativo do Regime de Execução */}
          <div className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            regimeExecucao === 'SEM_DEDICACAO_EXCLUSIVA'
              ? 'bg-blue-50/70 border-blue-200 text-blue-950'
              : regimeExecucao === 'DEDICACAO_EXCLUSIVA'
              ? 'bg-amber-50/70 border-amber-200 text-amber-950'
              : 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
          }`}>
            <div className="flex items-start sm:items-center space-x-2.5">
              <span className="text-lg">
                {regimeExecucao === 'SEM_DEDICACAO_EXCLUSIVA' ? '🛠️' : regimeExecucao === 'DEDICACAO_EXCLUSIVA' ? '👥' : '🔀'}
              </span>
              <div>
                <p className="font-bold">
                  {regimeExecucao === 'SEM_DEDICACAO_EXCLUSIVA' && 'Regime: Sem Dedicação Exclusiva de Mão de Obra (Não DEMO)'}
                  {regimeExecucao === 'DEDICACAO_EXCLUSIVA' && 'Regime: Com Dedicação Exclusiva de Mão de Obra (DEMO / Terceirização)'}
                  {regimeExecucao === 'MISTO' && 'Regime: Contrato Misto (Postos DEMO + Serviços/Peças Não DEMO)'}
                </p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  {regimeExecucao === 'SEM_DEDICACAO_EXCLUSIVA' && (
                    <>Cálculo: <strong>Total Anual = Qtd Anual × Valor Unitário</strong>, e <strong>Total Plurianual = Qtd Anual × Valor Unitário × {anosVigencia} anos</strong>.</>
                  )}
                  {regimeExecucao === 'DEDICACAO_EXCLUSIVA' && (
                    <>Cálculo: <strong>Total Anual = Qtd × Valor Mensal × 12</strong>, e <strong>Total Plurianual = Qtd × Valor Mensal × 12 × {anosVigencia} anos</strong>.</>
                  )}
                  {regimeExecucao === 'MISTO' && (
                    <>Consolidação de postos residentes e itens de serviços sob demanda no Valor Global.</>
                  )}
                </p>
              </div>
            </div>

            {regimeExecucao === 'MISTO' && (
              <div className="flex items-center space-x-1.5 self-end sm:self-center bg-white p-1 rounded-lg border border-indigo-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setMistoFiltroCategoria('TODOS')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                    mistoFiltroCategoria === 'TODOS' ? 'bg-indigo-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Todos ({itens.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMistoFiltroCategoria('DEMO')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                    mistoFiltroCategoria === 'DEMO' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  👥 DEMO ({itens.filter(i => i.categoriaItem === 'DEMO').length})
                </button>
                <button
                  type="button"
                  onClick={() => setMistoFiltroCategoria('NAO_DEMO')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                    mistoFiltroCategoria === 'NAO_DEMO' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  🛠️ Não DEMO ({itens.filter(i => i.categoriaItem !== 'DEMO').length})
                </button>
              </div>
            )}
          </div>

          {/* Tipo de Licitação & Regra de Acréscimo (Por Item vs Grupo Único) */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center space-x-4">
              <span className="font-bold text-slate-800">Tipo de Licitação / Agrupamento:</span>
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="tipoAgrupamento"
                  checked={tipoAgrupamento === 'ITEM_INDIVIDUAL'}
                  onChange={() => setTipoAgrupamento('ITEM_INDIVIDUAL')}
                  className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="font-semibold text-slate-800">🏷️ Por Item (Individual)</span>
              </label>

              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="tipoAgrupamento"
                  checked={tipoAgrupamento === 'GRUPO_UNICO'}
                  onChange={() => setTipoAgrupamento('GRUPO_UNICO')}
                  className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="font-semibold text-slate-800">📦 Grupo Único (Lote Global)</span>
              </label>
            </div>

            <div className="text-slate-600 text-[11px] bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
              <span className="font-bold text-slate-800">Regra Legal (Lei 14.133):</span>{' '}
              {tipoAgrupamento === 'GRUPO_UNICO'
                ? `Limite legal de aditamento (${tipoContrato === 'OBRA' ? '50%' : '25%'}) calculado sobre o valor global do grupo.`
                : `Limite legal de aditamento (${tipoContrato === 'OBRA' ? '50%' : '25%'}) verificado individualmente por item.`}
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

          {/* Tabela de Itens Dinâmica */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">Item</th>
                  {regimeExecucao === 'MISTO' && (
                    <th className="py-2.5 px-2.5 w-28 text-center">Categoria</th>
                  )}
                  <th className="py-2.5 px-3 min-w-[200px]">
                    {regimeExecucao === 'DEDICACAO_EXCLUSIVA' ? 'Função / Posto de Mão de Obra' : 'Descrição do Objeto / Serviço'}
                  </th>
                  <th className="py-2.5 px-3 w-28 text-center">Cidade</th>
                  <th className="py-2.5 px-3 w-20 text-center">Unidade</th>
                  <th className="py-2.5 px-3 w-40 text-center">Regra Reajuste</th>
                  <th className="py-2.5 px-3 w-28 text-right">
                    {regimeExecucao === 'DEDICACAO_EXCLUSIVA' ? 'Qtd Postos/Mês' : 'Qtd Anual'}
                  </th>
                  <th className="py-2.5 px-3 w-28 text-right">
                    {regimeExecucao === 'DEDICACAO_EXCLUSIVA' ? 'Valor Mensal (R$)' : 'Valor Unit. (R$)'}
                  </th>
                  <th className="py-2.5 px-3 w-28 text-right bg-blue-50/50">Total Anual</th>
                  <th className={`py-2.5 px-3 w-32 text-right ${anosVigencia > 1 ? 'font-black text-blue-950 bg-blue-100/50' : 'text-slate-400 bg-slate-50'}`}>
                    Total Plurianual ({anosVigencia > 1 ? `${anosVigencia}a` : '0'})
                  </th>
                  <th className="py-2.5 px-2 w-10 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItens.map((item, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx;
                  const { totalAnual, totalPlurianual, isDemo } = calcularValoresItem(item);

                  return (
                    <tr key={globalIdx} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 text-center font-bold text-slate-700">
                        {item.numeroItem}
                      </td>

                      {regimeExecucao === 'MISTO' && (
                        <td className="py-2 px-2.5 text-center">
                          <select
                            value={item.categoriaItem || 'NAO_DEMO'}
                            onChange={(e) => {
                              const novaCat = e.target.value as 'DEMO' | 'NAO_DEMO';
                              handleItemChange(globalIdx, 'categoriaItem', novaCat);
                              if (novaCat === 'DEMO') {
                                handleItemChange(globalIdx, 'unidade', 'MÊS');
                                handleItemChange(globalIdx, 'tipoReajuste', 'REPACTUACAO_CCT');
                              } else {
                                handleItemChange(globalIdx, 'unidade', 'UN');
                                handleItemChange(globalIdx, 'tipoReajuste', 'REAJUSTE_INDICE');
                              }
                            }}
                            className={`w-full px-1.5 py-1 rounded text-[10px] font-bold border ${
                              item.categoriaItem === 'DEMO'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-blue-100 text-blue-900 border-blue-300'
                            }`}
                          >
                            <option value="NAO_DEMO">🛠️ Não DEMO</option>
                            <option value="DEMO">👥 DEMO</option>
                          </select>
                        </td>
                      )}

                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.descricao}
                          onChange={(e) => handleItemChange(globalIdx, 'descricao', e.target.value)}
                          placeholder={isDemo ? 'Posto de trabalho...' : 'Descrição do serviço ou material...'}
                          required
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                        />
                      </td>

                      <td className="py-2 px-3">
                        <select
                          value={item.cidade || 'Mossoró'}
                          onChange={(e) => handleItemChange(globalIdx, 'cidade', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                        >
                          <option value="Mossoró">Mossoró</option>
                          <option value="Assú">Assú</option>
                          <option value="Caicó">Caicó</option>
                          <option value="Patu">Patu</option>
                          <option value="Pau dos Ferros">Pau dos Ferros</option>
                          <option value="Natal">Natal</option>
                          <option value="Geral/Todos">Geral/Todos</option>
                        </select>
                      </td>

                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.unidade}
                          onChange={(e) => handleItemChange(globalIdx, 'unidade', e.target.value)}
                          placeholder={isDemo ? 'MÊS' : 'UN'}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs uppercase outline-none text-center font-bold"
                        />
                      </td>

                      <td className="py-2 px-3">
                        <select
                          value={item.tipoReajuste || (isDemo ? 'REPACTUACAO_CCT' : 'REAJUSTE_INDICE')}
                          onChange={(e) => handleItemChange(globalIdx, 'tipoReajuste', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold outline-none focus:border-blue-600"
                        >
                          <option value="REAJUSTE_INDICE">Insumos/Serviços (Índice)</option>
                          <option value="REPACTUACAO_CCT">Mão de Obra (CCT)</option>
                          <option value="NAO_REAJUSTAVEL">Não Reajustável</option>
                        </select>
                      </td>

                      <td className="py-2 px-3">
                        {isDemo ? (
                          <input
                            type="number"
                            step="any"
                            value={item.quantidade}
                            onChange={(e) => handleItemChange(globalIdx, 'quantidade', e.target.value)}
                            required
                            placeholder="1"
                            title="Quantidade do posto no mês"
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none text-right font-semibold"
                          />
                        ) : (
                          <input
                            type="number"
                            step="any"
                            value={item.quantidadeAnual || item.quantidade}
                            onChange={(e) => handleItemChange(globalIdx, 'quantidadeAnual', e.target.value)}
                            required
                            placeholder="1"
                            title="Quantidade anual estimada"
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none text-right font-semibold"
                          />
                        )}
                      </td>

                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.0001"
                          value={item.valorUnitario}
                          onChange={(e) => handleItemChange(globalIdx, 'valorUnitario', e.target.value)}
                          required
                          placeholder="0,00"
                          title={isDemo ? 'Valor mensal do posto' : 'Valor unitário'}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none text-right font-semibold"
                        />
                      </td>

                      <td className="py-2 px-3 text-right font-bold text-slate-800 bg-blue-50/30 whitespace-nowrap">
                        {totalAnual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>

                      <td className={`py-2 px-3 text-right whitespace-nowrap ${anosVigencia > 1 ? 'font-bold text-blue-900 bg-blue-100/40' : 'text-slate-400 bg-slate-50'}`}>
                        {anosVigencia > 1 ? (
                          totalPlurianual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400">R$ 0,00</span>
                        )}
                      </td>

                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(globalIdx)}
                          disabled={itens.length === 1}
                          className="p-1 text-slate-400 hover:text-red-600 rounded disabled:opacity-30 cursor-pointer"
                          title="Remover item"
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            {regimeExecucao === 'MISTO' ? (
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <span className="text-[10px] text-amber-800 font-bold uppercase block">Subtotal DEMO:</span>
                  <span className="font-semibold text-slate-800">
                    {totaisConsolidados.demoGlobal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />
                <div>
                  <span className="text-[10px] text-blue-800 font-bold uppercase block">Subtotal Não DEMO:</span>
                  <span className="font-semibold text-slate-800">
                    {totaisConsolidados.naoDemoGlobal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />
                <div>
                  <span className="text-[10px] text-indigo-900 font-bold uppercase block">Consolidado ({anosVigencia > 1 ? `${anosVigencia} anos` : '1 ano'}):</span>
                  <span className="font-bold text-indigo-950 text-sm">
                    {totaisConsolidados.global.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-xs text-slate-600">
                  Soma calculada ({anosVigencia > 1 ? `Plurianual de ${anosVigencia} anos` : 'Anual de 1 ano'}):{' '}
                  <strong className="text-slate-800 text-sm">
                    {totaisConsolidados.global.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong>
                </div>
                {Math.abs(totaisConsolidados.global - (parseFloat(valorGlobal) || 0)) > 0.05 && (
                  <div className="text-[11px] text-amber-700 flex items-center space-x-1 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>
                      Diferença de {(totaisConsolidados.global - (parseFloat(valorGlobal) || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em relação ao Valor Global do Contrato.
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={sincronizarValorGlobal}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer self-end sm:self-center"
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
