'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  FileCheck2,
  PlusCircle,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Printer,
  ShieldCheck,
  Building,
  Check,
  X,
  Download,
  UploadCloud,
  MapPin,
  Search,
  Filter,
  Edit3,
  Trash2,
  ShoppingCart,
  Calendar
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function ExecucaoPage() {
  const [activeTab, setActiveTab] = useState<'MEDICOES' | 'ORDENS_SERVICO' | 'SALDOS_DESPESAS'>('SALDOS_DESPESAS');
  const [contratos, setContratos] = useState<any[]>([]);
  const [medicoes, setMedicoes] = useState<any[]>([]);
  const [ordens, setOrdens] = useState<any[]>([]);
  const [despesasExecucao, setDespesasExecucao] = useState<any[]>([]);
  const [totaisSaldos, setTotaisSaldos] = useState({
    valorGlobalContratos: 0,
    valorProvisionado: 0,
    valorAtestado: 0,
    saldoContrato: 0,
    quantidadeDespesas: 0,
    totalEstimado: 0,
    totalExecutado: 0,
    saldoTotalAberto: 0,
  });
  const [filtroContratoSaldos, setFiltroContratoSaldos] = useState('TODOS');
  const [loading, setLoading] = useState(true);
  const [loadingSaldos, setLoadingSaldos] = useState(false);
  const [filtroCidadeSaldos, setFiltroCidadeSaldos] = useState('TODAS');
  const [buscaSaldos, setBuscaSaldos] = useState('');
  const [showImportSaldosModal, setShowImportSaldosModal] = useState(false);
  const [importSaldosFile, setImportSaldosFile] = useState<File | null>(null);
  const [importingSaldos, setImportingSaldos] = useState(false);
  const [importSaldosResult, setImportSaldosResult] = useState<any>(null);

  // Modals de Criação
  const [showNovaOsModal, setShowNovaOsModal] = useState(false);
  const [showNovaMedicaoModal, setShowNovaMedicaoModal] = useState(false);

  // Modals de Edição Administrativa
  const [showEditMedicaoModal, setShowEditMedicaoModal] = useState(false);
  const [editingMedicaoId, setEditingMedicaoId] = useState<string | null>(null);
  const [salvandoMedicao, setSalvandoMedicao] = useState(false);
  const [editMedicaoForm, setEditMedicaoForm] = useState({
    referenciaMesAno: '',
    processoSeiDespesa: '',
    numeroNotaFiscal: '',
    dataEmissaoNf: '',
    valorNotaFiscal: '',
    valorGlosa: '',
    motivoGlosa: '',
    status: '',
  });

  const [showEditDespesaModal, setShowEditDespesaModal] = useState(false);
  const [editingDespesaId, setEditingDespesaId] = useState<string | null>(null);
  const [salvandoDespesa, setSalvandoDespesa] = useState(false);
  const [editDespesaForm, setEditDespesaForm] = useState({
    numeroContratoRef: '',
    processoSeiDespesa: '',
    numeroNotaFiscal: '',
    dataAtesto: '',
    referencia: '',
    cidade: 'Mossoró',
    valorEstimado: '',
    valorAtestado: '',
    status: 'ABERTA',
    observacoes: '',
  });

  const [showEditOsModal, setShowEditOsModal] = useState(false);
  const [editingOsId, setEditingOsId] = useState<string | null>(null);
  const [editingOsIsOc, setEditingOsIsOc] = useState(false);
  const [salvandoOs, setSalvandoOs] = useState(false);
  const [editOsForm, setEditOsForm] = useState({
    numeroOs: '',
    ano: '',
    processoSeiDespesa: '',
    descricaoServico: '',
    valorEstimado: '',
  });

  const [currentUser, setCurrentUser] = useState<any>(null);

  // Form OS / OC
  const [osForm, setOsForm] = useState({
    contratoId: '',
    tipoOrdem: 'ORDEM_SERVICO', // ORDEM_SERVICO ou ORDEM_COMPRA
    numeroOs: '',
    ano: new Date().getFullYear().toString(),
    processoSeiDespesa: '',
    descricaoServico: '',
    valorEstimado: '',
  });

  // Form Medição
  const [medicaoForm, setMedicaoForm] = useState({
    contratoId: '',
    referenciaMesAno: '',
    processoSeiDespesa: '',
    numeroNotaFiscal: '',
    dataEmissaoNf: '',
    valorNotaFiscal: '',
    valorGlosa: '0',
    motivoGlosa: '',
  });

  // Filtro de Ordens (OS vs OC)
  const [filtroTipoOrdemTab, setFiltroTipoOrdemTab] = useState<'TODAS' | 'ORDEM_SERVICO' | 'ORDEM_COMPRA'>('TODAS');

  // Helpers de Classificação de Contratos conforme IN 01/2026 e orientações da PROAD
  const isAquisicaoContrato = (tipo?: string) =>
    tipo === 'FORNECIMENTO_SIMPLES' || tipo === 'FORNECIMENTO_CONTINUADO';

  const isServicoContrato = (tipo?: string) =>
    tipo === 'SERVICO_SEM_DEDICACAO' ||
    tipo === 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO' ||
    tipo === 'SERVICOS_TECNICOS_PROFISSIONAIS' ||
    tipo === 'OBRA' ||
    tipo === 'LOCACAO_IMOVEL';

  // Verifica se o usuário atua como Gestor ou Fiscal Administrativo no contrato
  const userAtuaComoGestorOuFiscalAdm = (c: any) => {
    if (currentUser?.isAdmin) return true;
    if (!currentUser?.id) return false;

    // Verificar se o usuário está designado formalmente como GESTOR, SUPLENTE ou FISCAL_ADMINISTRATIVO neste contrato
    if (c.responsaveis && Array.isArray(c.responsaveis) && c.responsaveis.length > 0) {
      const designacao = c.responsaveis.find(
        (r: any) => (r.userId === currentUser.id || r.user?.id === currentUser.id) && r.ativo !== false
      );
      if (designacao) {
        return (
          designacao.tipoAtuacao === 'GESTOR' ||
          designacao.tipoAtuacao === 'SUPLENTE' ||
          designacao.tipoAtuacao === 'FISCAL_ADMINISTRATIVO'
        );
      }
    }

    // Fallback: se o contrato está na lista do usuário e ele tem papel global de Gestor ou Fiscal Adm
    return Boolean(
      currentUser.canIssueOrder ||
      currentUser.isGestor ||
      currentUser.isFiscalAdm
    );
  };

  // Listas segregadas de contratos onde o usuário atua como gestor ou fiscal administrativo
  const contratosHabilitados = contratos.filter((c) => userAtuaComoGestorOuFiscalAdm(c));
  const contratosAquisicao = contratosHabilitados.filter((c) => isAquisicaoContrato(c.tipoContrato));
  const contratosServico = contratosHabilitados.filter((c) => isServicoContrato(c.tipoContrato));

  // Permissões de contexto para emissão de OS e OC (exclusivo Gestor, Fiscal Adm e Admin)
  const podeEmitir = Boolean(currentUser?.isAdmin || currentUser?.canIssueOrder || currentUser?.isGestor || currentUser?.isFiscalAdm);
  const temContratoServico = podeEmitir && (currentUser?.isAdmin ? contratosServico.length > 0 || contratos.some(c => isServicoContrato(c.tipoContrato)) : contratosServico.length > 0);
  const temContratoAquisicao = podeEmitir && (currentUser?.isAdmin ? contratosAquisicao.length > 0 || contratos.some(c => isAquisicaoContrato(c.tipoContrato)) : contratosAquisicao.length > 0);

  const handleOpenNovaOrdem = (tipo: 'ORDEM_SERVICO' | 'ORDEM_COMPRA') => {
    const listaCompativel = tipo === 'ORDEM_COMPRA' ? contratosAquisicao : contratosServico;
    const contratoInicial = listaCompativel.length > 0 ? listaCompativel[0].id : '';

    setOsForm({
      contratoId: contratoInicial,
      tipoOrdem: tipo,
      numeroOs: '',
      ano: new Date().getFullYear().toString(),
      processoSeiDespesa: '',
      descricaoServico: '',
      valorEstimado: '',
    });
    setShowNovaOsModal(true);
  };

  const carregarSaldos = async (cidadeParam?: string, contratoParam?: string) => {
    setLoadingSaldos(true);
    try {
      const cid = cidadeParam !== undefined ? cidadeParam : filtroCidadeSaldos;
      const cId = contratoParam !== undefined ? contratoParam : filtroContratoSaldos;
      let url = `/api/execucao/saldos?cidade=${encodeURIComponent(cid)}`;
      if (cId && cId !== 'TODOS') url += `&contratoId=${encodeURIComponent(cId)}`;
      if (buscaSaldos) url += `&q=${encodeURIComponent(buscaSaldos)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.despesas) {
        setDespesasExecucao(data.despesas);
        if (data.totais) setTotaisSaldos(data.totais);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSaldos(false);
    }
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resUser, resC, resM, resO] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/contratos'),
        fetch('/api/execucao/medicoes'),
        fetch('/api/execucao/os'),
      ]);
      const dataUser = await resUser.json();
      const dataC = await resC.json();
      const dataM = await resM.json();
      const dataO = await resO.json();

      let cidadeInicial = 'TODAS';
      if (dataUser.user) {
        setCurrentUser(dataUser.user);
        if (dataUser.user.isFiscalSetorial && dataUser.user.campusSetor) {
          cidadeInicial = dataUser.user.campusSetor;
          setFiltroCidadeSaldos(cidadeInicial);
        }
      }

      if (dataC.contratos) setContratos(dataC.contratos);
      if (dataM.medicoes) setMedicoes(dataM.medicoes);
      if (dataO.ordens) setOrdens(dataO.ordens);
      carregarSaldos(cidadeInicial);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    carregarSaldos();
  }, [filtroCidadeSaldos, filtroContratoSaldos]);

  const handleImportSaldosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importSaldosFile) return;

    setImportingSaldos(true);
    setImportSaldosResult(null);

    const formData = new FormData();
    formData.append('file', importSaldosFile);

    try {
      const res = await fetch('/api/execucao/saldos', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setImportSaldosResult(data);
      if (data.success) {
        carregarSaldos();
      }
    } catch (err: any) {
      setImportSaldosResult({ error: 'Erro ao processar planilha: ' + err.message });
    } finally {
      setImportingSaldos(false);
    }
  };

  const exportarSaldosExcel = () => {
    if (despesasExecucao.length === 0) return;

    const dataToExport = despesasExecucao.map((d) => ({
      'Contrato / SEI': d.numeroContratoRef || d.processoSeiMaeRef || d.contrato?.numeroContrato || 'S/N',
      'Processo de Despesa': d.processoSeiDespesa,
      'Nº da Nota Fiscal': d.numeroNotaFiscal || '-',
      'Data do Atesto': d.dataAtesto ? new Date(d.dataAtesto).toLocaleDateString('pt-BR') : '-',
      'Referência': d.referencia,
      'Local da Prestação (Campus)': d.cidade,
      'Valor Estimado (Provisão)': d.valorEstimado,
      'Valor Atestado (Efetivo)': d.valorAtestado,
      'Status do Processo': d.status === 'ATESTADA' ? 'Atestada (Executada)' : 'Aberta (Provisionada)',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Saldos_Despesas');
    XLSX.writeFile(wb, `Saldos_Contratos_UERN_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleCreateOs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!osForm.contratoId) {
      alert('Por favor, selecione um contrato válido compatível com o documento.');
      return;
    }
    try {
      const res = await fetch('/api/execucao/os', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(osForm),
      });
      if (res.ok) {
        setShowNovaOsModal(false);
        setOsForm({
          contratoId: '',
          tipoOrdem: 'ORDEM_SERVICO',
          numeroOs: '',
          ano: new Date().getFullYear().toString(),
          processoSeiDespesa: '',
          descricaoServico: '',
          valorEstimado: '',
        });
        carregarDados();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao emitir ordem');
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Erro ao emitir ordem');
    }
  };

  const handleCreateMedicao = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/execucao/medicoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(medicaoForm),
      });
      if (res.ok) {
        setShowNovaMedicaoModal(false);
        setMedicaoForm({
          contratoId: '',
          referenciaMesAno: '',
          processoSeiDespesa: '',
          numeroNotaFiscal: '',
          dataEmissaoNf: '',
          valorNotaFiscal: '',
          valorGlosa: '0',
          motivoGlosa: '',
        });
        carregarDados();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAtestar = async (medicaoId: string, acao: 'ATESTE_PROVISORIO' | 'ATESTE_DEFINITIVO') => {
    try {
      const res = await fetch('/api/execucao/medicoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicaoId, acao }),
      });
      if (res.ok) {
        carregarDados();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handlers de Edição Administrativa
  const handleOpenEditMedicao = (m: any) => {
    setEditingMedicaoId(m.id);
    setEditMedicaoForm({
      referenciaMesAno: m.referenciaMesAno || '',
      processoSeiDespesa: m.processoSeiDespesa || '',
      numeroNotaFiscal: m.numeroNotaFiscal || '',
      dataEmissaoNf: m.dataEmissaoNf ? new Date(m.dataEmissaoNf).toISOString().split('T')[0] : '',
      valorNotaFiscal: String(m.valorNotaFiscal || 0),
      valorGlosa: String(m.valorGlosa || 0),
      motivoGlosa: m.motivoGlosa || '',
      status: m.status || 'EM_CONFERENCIA_ADM',
    });
    setShowEditMedicaoModal(true);
  };

  const handleSaveEditMedicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedicaoId) return;
    setSalvandoMedicao(true);
    try {
      const res = await fetch('/api/execucao/medicoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingMedicaoId, ...editMedicaoForm }),
      });
      if (res.ok) {
        setShowEditMedicaoModal(false);
        setEditingMedicaoId(null);
        carregarDados();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao editar medição');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSalvandoMedicao(false);
    }
  };

  const handleOpenEditDespesa = (d: any) => {
    setEditingDespesaId(d.id);
    setEditDespesaForm({
      numeroContratoRef: d.numeroContratoRef || '',
      processoSeiDespesa: d.processoSeiDespesa || '',
      numeroNotaFiscal: d.numeroNotaFiscal || '',
      dataAtesto: d.dataAtesto ? new Date(d.dataAtesto).toISOString().split('T')[0] : '',
      referencia: d.referencia || '',
      cidade: d.cidade || 'Mossoró',
      valorEstimado: String(d.valorEstimado || 0),
      valorAtestado: String(d.valorAtestado || 0),
      status: d.status || 'ABERTA',
      observacoes: d.observacoes || '',
    });
    setShowEditDespesaModal(true);
  };

  const handleSaveEditDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDespesaId) return;
    setSalvandoDespesa(true);
    try {
      const res = await fetch('/api/execucao/saldos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingDespesaId, ...editDespesaForm }),
      });
      if (res.ok) {
        setShowEditDespesaModal(false);
        setEditingDespesaId(null);
        carregarSaldos();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao editar despesa/saldo');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSalvandoDespesa(false);
    }
  };

  const handleOpenEditOs = (o: any) => {
    const isOc =
      o.hashAssinaturaEletronica?.includes('OC') ||
      o.numeroOs?.toUpperCase().includes('OC') ||
      isAquisicaoContrato(o.contrato?.tipoContrato);
    setEditingOsIsOc(isOc);
    setEditingOsId(o.id);
    setEditOsForm({
      numeroOs: o.numeroOs || '',
      ano: o.ano ? o.ano.toString() : new Date().getFullYear().toString(),
      processoSeiDespesa: o.processoSeiDespesa || '',
      descricaoServico: o.descricaoServico || '',
      valorEstimado: String(o.valorEstimado || 0),
    });
    setShowEditOsModal(true);
  };

  const handleSaveEditOs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOsId) return;
    setSalvandoOs(true);
    try {
      const res = await fetch('/api/execucao/os', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingOsId, ...editOsForm }),
      });
      if (res.ok) {
        setShowEditOsModal(false);
        setEditingOsId(null);
        carregarDados();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao editar ordem de serviço');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSalvandoOs(false);
    }
  };

  // Handlers de Exclusão Administrativa
  const handleDeleteMedicao = async (m: any) => {
    if (
      !confirm(
        `Tem certeza de que deseja excluir a medição da NF ${m.numeroNotaFiscal || 'sem número'} (Ref: ${m.referenciaMesAno}) no valor de ${m.valorNotaFiscal?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}? Esta ação é irreversível.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/execucao/medicoes?id=${m.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao excluir medição.');
      carregarDados();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteDespesa = async (d: any) => {
    if (
      !confirm(
        `Tem certeza de que deseja excluir o lançamento de despesa aberta do processo SEI ${d.processoSeiDespesa} (${d.referencia} - ${d.cidade}) no valor estimado de ${d.valorEstimado?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}? Esta ação é irreversível.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/execucao/saldos?id=${d.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao excluir despesa.');
      carregarSaldos();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteOs = async (o: any) => {
    const isOc =
      o.hashAssinaturaEletronica?.includes('OC') ||
      o.numeroOs?.toUpperCase().includes('OC') ||
      isAquisicaoContrato(o.contrato?.tipoContrato);
    const tipoNome = isOc ? 'Ordem de Compra' : 'Ordem de Serviço';
    if (
      !confirm(
        `Tem certeza de que deseja excluir a ${tipoNome} nº ${o.numeroOs}/${o.ano} (Processo SEI: ${o.processoSeiDespesa})? Esta ação é irreversível.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/execucao/os?id=${o.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao excluir ordem.');
      carregarDados();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Gerar PDF da Ordem de Serviço ou Ordem de Compra com Assinatura Eletrônica Institucional
  const gerarPdfOs = (ordem: any) => {
    const doc = new jsPDF();

    const isOrdemCompra =
      ordem.hashAssinaturaEletronica?.includes('OC') ||
      ordem.numeroOs?.toUpperCase().includes('OC') ||
      ordem.contrato?.tipoContrato?.includes('FORNECIMENTO');

    const tipoDocTitulo = isOrdemCompra
      ? `ORDEM DE COMPRA E FORNECIMENTO Nº ${ordem.numeroOs}/${ordem.ano}`
      : `ORDEM DE SERVIÇO Nº ${ordem.numeroOs}/${ordem.ano}`;

    // Cabeçalho Oficial UERN
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102); // #003366
    doc.text('UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - UERN', 105, 20, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text('PRÓ-REITORIA DE ADMINISTRAÇÃO - PROAD', 105, 26, { align: 'center' });
    doc.text('DIRETORIA DE ADMINISTRAÇÃO E SERVIÇOS - DAS', 105, 31, { align: 'center' });

    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.8);
    doc.line(15, 36, 195, 36);

    // Título do Documento
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(tipoDocTitulo, 105, 46, { align: 'center' });

    // Dados do Contrato e Empresa
    autoTable(doc, {
      startY: 52,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9 },
      head: [['Identificação Contratual', 'Dados de Referência']],
      body: [
        ['Contrato / Empenho', ordem.contrato.numeroContrato ? `Contrato nº ${ordem.contrato.numeroContrato}` : `Empenho nº ${ordem.contrato.numeroEmpenho}`],
        ['Processo SEI da Despesa', ordem.processoSeiDespesa],
        ['Processo SEI Mãe (Contratação)', ordem.contrato.processoSeiMae],
        ['Empresa Contratada', ordem.contrato.fornecedor.razaoSocial],
        ['CNPJ', ordem.contrato.fornecedor.cnpj],
        ['Objeto Geral', ordem.contrato.objeto],
        ['Valor Estimado da Execução', ordem.valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
        ['Data de Emissão', new Date(ordem.dataEmissao).toLocaleDateString('pt-BR')],
      ],
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Descrição do Serviço / Bens
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(
      isOrdemCompra
        ? '1. ESPECIFICAÇÃO DOS MATERIAIS / BENS AUTORIZADOS:'
        : '1. DESCRIÇÃO DETALHADA DOS SERVIÇOS AUTORIZADOS:',
      15,
      finalY
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitDescricao = doc.splitTextToSize(ordem.descricaoServico, 180);
    doc.text(splitDescricao, 15, finalY + 6);

    const assinaturasY = finalY + 10 + splitDescricao.length * 5;

    // Quadro de Assinatura Eletrônica Institucional
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, assinaturasY, 180, 45, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 51, 102);
    doc.text('CHANCELA DE ASSINATURA ELETRÔNICA INSTITUCIONAL (IN nº 01/2026 - PROAD/UERN)', 20, assinaturasY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    const cargoEmissor = ordem.fiscalAdm?.role?.replace(/_/g, ' ') || 'Gestor / Fiscal';
    doc.text(`Emitido por: ${ordem.fiscalAdm.nome} (${cargoEmissor})`, 20, assinaturasY + 16);
    doc.text(`E-mail: ${ordem.fiscalAdm.email} | Matrícula: ${ordem.fiscalAdm.matricula || 'Institucional'}`, 20, assinaturasY + 22);
    doc.text(`Data/Hora da Emissão: ${new Date(ordem.createdAt).toLocaleString('pt-BR')}`, 20, assinaturasY + 28);
    
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`Código Verificador / Hash: ${ordem.hashAssinaturaEletronica}`, 20, assinaturasY + 36);

    doc.save(`${isOrdemCompra ? 'OC' : 'OS'}_${ordem.numeroOs}_${ordem.ano}_UERN.pdf`);
  };

  // Ordens filtradas para a visualização na aba correspondente
  const ordensFiltradas = ordens.filter((ordem) => {
    const isOc =
      ordem.hashAssinaturaEletronica?.includes('OC') ||
      ordem.numeroOs?.toUpperCase().includes('OC') ||
      isAquisicaoContrato(ordem.contrato?.tipoContrato);

    // Se o fiscal/gestor atua apenas em serviço/obra, exibe apenas OS
    if (temContratoServico && !temContratoAquisicao) return !isOc;
    // Se o fiscal/gestor atua apenas em aquisição de bens, exibe apenas OC
    if (temContratoAquisicao && !temContratoServico) return isOc;

    // Se possui ambos ou é Admin, aplica o seletor da aba
    if (filtroTipoOrdemTab === 'ORDEM_SERVICO') return !isOc;
    if (filtroTipoOrdemTab === 'ORDEM_COMPRA') return isOc;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg md:text-xl">
            <FileSpreadsheet className="w-6 h-6 text-blue-700" />
            <h2>Controle de Execução, Ordens de Serviço & Saldo</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Módulo 5 - Ambiente integrado para Fiscais Administrativos, Fiscais Técnicos e Gestores conforme Capítulo IV da IN 01/2026.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Botão de Ordem de Serviço (visível apenas se o usuário tiver contratos de serviço/obra ou for admin) */}
          {temContratoServico && (
            <button
              onClick={() => handleOpenNovaOrdem('ORDEM_SERVICO')}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-blue-200 shadow-sm"
              title="Emitir Ordem de Serviço para contratos de prestação de serviços ou obras"
            >
              <FileCheck2 className="w-4 h-4 text-blue-700" />
              <span>Emitir Ordem de Serviço (OS)</span>
            </button>
          )}

          {/* Botão de Ordem de Compra (visível apenas se o usuário tiver contratos de aquisição de bens ou for admin) */}
          {temContratoAquisicao && (
            <button
              onClick={() => handleOpenNovaOrdem('ORDEM_COMPRA')}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-emerald-200 shadow-sm"
              title="Emitir Ordem de Compra para contratos de aquisição de bens e materiais"
            >
              <ShoppingCart className="w-4 h-4 text-emerald-700" />
              <span>Emitir Ordem de Compra (OC)</span>
            </button>
          )}

          <button
            onClick={() => setShowNovaMedicaoModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Lançar Fatura / Medição</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('SALDOS_DESPESAS')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'SALDOS_DESPESAS'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-600" />
          <span>Saldos de Contratos & Despesas Abertas ({despesasExecucao.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('MEDICOES')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'MEDICOES'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Controle de Saldo & Atestes ({medicoes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ORDENS_SERVICO')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'ORDENS_SERVICO'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>
            {temContratoServico && !temContratoAquisicao
              ? `Ordens de Serviço Emitidas (${ordens.length})`
              : temContratoAquisicao && !temContratoServico
              ? `Ordens de Compra Emitidas (${ordens.length})`
              : `Ordens de Serviço & Compra (${ordens.length})`}
          </span>
        </button>
      </div>

      {/* TAB 1: CONTROLE DE SALDO & MEDIÇÕES */}
      {activeTab === 'MEDICOES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Referência & SEI</th>
                  <th className="py-3.5 px-4">Contrato & Empresa</th>
                  <th className="py-3.5 px-4">Nota Fiscal</th>
                  <th className="py-3.5 px-4">Valor da NF</th>
                  <th className="py-3.5 px-4">Glosa Aplicada</th>
                  <th className="py-3.5 px-4">Valor Atestado</th>
                  <th className="py-3.5 px-4">Recebimento Provisório (Téc)</th>
                  <th className="py-3.5 px-4">Recebimento Definitivo (Gestor)</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400">
                      Carregando medições...
                    </td>
                  </tr>
                ) : medicoes.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400">
                      Nenhuma medição cadastrada no período.
                    </td>
                  </tr>
                ) : (
                  medicoes.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 text-sm">{m.referenciaMesAno}</div>
                        <div className="text-[10px] text-blue-600 font-mono">SEI: {m.processoSeiDespesa}</div>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-800 truncate">
                          {m.contrato.numeroContrato ? `Contrato nº ${m.contrato.numeroContrato}` : `Empenho: ${m.contrato.numeroEmpenho}`}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate" title={m.contrato.fornecedor.razaoSocial}>
                          {m.contrato.fornecedor.razaoSocial}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-800">
                          {m.numeroNotaFiscal || 'Aguardando'}
                        </span>
                        {m.dataEmissaoNf && (
                          <div className="text-[10px] text-slate-400">
                            {new Date(m.dataEmissaoNf).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {m.valorNotaFiscal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>

                      <td className="py-3 px-4 font-mono text-red-600 font-medium">
                        {m.valorGlosa > 0 ? (
                          <span title={m.motivoGlosa || ''}>
                            - {m.valorGlosa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        ) : (
                          <span className="text-slate-400">R$ 0,00</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                        {m.valorAtestadoFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>

                      {/* Recebimento Provisório (Fiscal Técnico / Administrativo / Setorial / Admin) */}
                      <td className="py-3 px-4">
                        {m.dataRecebimentoProvisorio ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 text-[11px] font-semibold">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{new Date(m.dataRecebimentoProvisorio).toLocaleDateString('pt-BR')}</span>
                          </span>
                        ) : (currentUser?.canProvisionalAttest || currentUser?.isAdmin) ? (
                          <button
                            onClick={() => handleAtestar(m.id, 'ATESTE_PROVISORIO')}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                          >
                            Dar Ateste Provisório
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Pendente</span>
                        )}
                      </td>

                      {/* Recebimento Definitivo (Exclusivo do Gestor do Contrato ou PROAD) */}
                      <td className="py-3 px-4">
                        {m.dataRecebimentoDefinitivo ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 text-[11px] font-semibold">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{new Date(m.dataRecebimentoDefinitivo).toLocaleDateString('pt-BR')}</span>
                          </span>
                        ) : (currentUser?.canDefinitiveAttest || currentUser?.isAdmin) ? (
                          m.dataRecebimentoProvisorio ? (
                            <button
                              onClick={() => handleAtestar(m.id, 'ATESTE_DEFINITIVO')}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                            >
                              Dar Ateste Definitivo
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Aguardando provisório</span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-400 italic font-mono" title="Apenas o Gestor formal do contrato pode emitir o Ateste Definitivo">
                            Privativo do Gestor
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-700">
                          {m.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-center">
                        {currentUser?.isAdmin && (
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditMedicao(m)}
                              className="inline-flex items-center space-x-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                              title="Editar Medição"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Editar</span>
                            </button>
                            {!m.dataRecebimentoDefinitivo && m.status !== 'LIQUIDADO_PAGO' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMedicao(m)}
                                className="inline-flex items-center space-x-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                                title="Excluir Medição Não Atestada"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Excluir</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ORDENS DE SERVIÇO & COMPRA */}
      {activeTab === 'ORDENS_SERVICO' && (
        <div className="space-y-4">
          {temContratoServico && temContratoAquisicao && (
            <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                Filtrar Tipo:
              </span>
              <button
                type="button"
                onClick={() => setFiltroTipoOrdemTab('TODAS')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filtroTipoOrdemTab === 'TODAS'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todas ({ordens.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipoOrdemTab('ORDEM_SERVICO')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filtroTipoOrdemTab === 'ORDEM_SERVICO'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                Apenas Ordens de Serviço (OS)
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipoOrdemTab('ORDEM_COMPRA')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filtroTipoOrdemTab === 'ORDEM_COMPRA'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Apenas Ordens de Compra (OC)
              </button>
            </div>
          )}

          {ordensFiltradas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-sm">Nenhuma ordem encontrada para os critérios selecionados.</p>
              <p className="text-xs text-slate-400 mt-1">
                Utilize os botões no topo para emitir uma nova ordem oficial.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ordensFiltradas.map((ordem) => (
                <div
                  key={ordem.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <div>
                        {ordem.hashAssinaturaEletronica?.includes('OC') ||
                        ordem.numeroOs?.toUpperCase().includes('OC') ||
                        isAquisicaoContrato(ordem.contrato?.tipoContrato) ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 uppercase flex items-center gap-1 w-fit">
                            <ShoppingCart className="w-3 h-3" />
                            Ordem de Compra Oficial (OC)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase flex items-center gap-1 w-fit">
                            <FileCheck2 className="w-3 h-3" />
                            Ordem de Serviço Oficial (OS)
                          </span>
                        )}
                        <h3 className="font-bold text-slate-900 text-base mt-1">
                          {ordem.hashAssinaturaEletronica?.includes('OC') ||
                          ordem.numeroOs?.toUpperCase().includes('OC') ||
                          isAquisicaoContrato(ordem.contrato?.tipoContrato)
                            ? 'OC'
                            : 'OS'}{' '}
                          nº {ordem.numeroOs}/{ordem.ano}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        {currentUser?.isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditOs(ordem)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-amber-200"
                              title="Editar Ordem"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                            {(!ordem.medicoes || !ordem.medicoes.some((m: any) => m.dataRecebimentoDefinitivo !== null || m.status === 'LIQUIDADO_PAGO')) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteOs(ordem)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-rose-200"
                                title="Excluir Ordem"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir</span>
                              </button>
                            )}
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => gerarPdfOs(ordem)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-blue-200"
                          title="Baixar PDF com Assinatura Eletrônica"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>PDF Oficial</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div>
                        <span className="font-semibold text-slate-800">Contrato: </span>{' '}
                        {ordem.contrato.numeroContrato || ordem.contrato.numeroEmpenho}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">Contratada: </span>{' '}
                        {ordem.contrato.fornecedor.razaoSocial}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">Processo SEI: </span>{' '}
                        <span className="font-mono text-blue-700">{ordem.processoSeiDespesa}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">Valor Estimado: </span>{' '}
                        <span className="font-bold text-slate-900">
                          {ordem.valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      <p className="mt-2 text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 line-clamp-3">
                        {ordem.descricaoServico}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Emitido por: {ordem.fiscalAdm.nome}</span>
                    <span className="font-mono text-[9px] text-slate-400" title={ordem.hashAssinaturaEletronica}>
                      {ordem.hashAssinaturaEletronica.slice(0, 18)}...
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Nova Ordem de Serviço ou Compra */}
      {showNovaOsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800 text-base">
                Emitir {osForm.tipoOrdem === 'ORDEM_COMPRA' ? 'Ordem de Compra e Fornecimento (OC)' : 'Ordem de Serviço (OS)'}
              </h3>
              <button
                type="button"
                onClick={() => setShowNovaOsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              {osForm.tipoOrdem === 'ORDEM_COMPRA'
                ? 'Autorização formal para aquisição e entrega de bens/materiais conforme IN nº 01/2026 - PROAD/UERN.'
                : 'Autorização formal para execução de serviços e obras conforme modelo da DAS/PROAD com chancela eletrônica.'}
            </p>

            <form onSubmit={handleCreateOs} className="space-y-4">
              {/* Identificação Clara e Exclusiva do Tipo de Documento Oficial */}
              {osForm.tipoOrdem === 'ORDEM_COMPRA' ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900 font-medium">
                  <ShoppingCart className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  <div>
                    <span className="font-bold">Documento Oficial: Ordem de Compra (OC)</span>
                    <span className="block text-[11px] text-emerald-700 mt-0.5">
                      Exclusivo para aquisição e fornecimento de bens/materiais.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2.5 text-xs text-blue-900 font-medium">
                  <FileCheck2 className="w-4 h-4 text-blue-700 flex-shrink-0" />
                  <div>
                    <span className="font-bold">Documento Oficial: Ordem de Serviço (OS)</span>
                    <span className="block text-[11px] text-blue-700 mt-0.5">
                      Exclusivo para prestação de serviços continuados, técnicos e obras.
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contrato Vinculado ({osForm.tipoOrdem === 'ORDEM_COMPRA' ? 'Apenas Aquisição de Bens' : 'Apenas Serviços e Obras'}) *
                </label>
                <select
                  required
                  value={osForm.contratoId}
                  onChange={(e) => setOsForm({ ...osForm, contratoId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                >
                  <option value="">Selecione o contrato...</option>
                  {(osForm.tipoOrdem === 'ORDEM_COMPRA' ? contratosAquisicao : contratosServico).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.numeroContrato ? `Contrato nº ${c.numeroContrato}` : `Empenho: ${c.numeroEmpenho}`} - {c.objeto.slice(0, 50)}...
                    </option>
                  ))}
                </select>
                {(osForm.tipoOrdem === 'ORDEM_COMPRA' ? contratosAquisicao : contratosServico).length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    Nenhum contrato de {osForm.tipoOrdem === 'ORDEM_COMPRA' ? 'aquisição de bens/materiais' : 'serviços/obras'} vinculado sob sua responsabilidade.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {osForm.tipoOrdem === 'ORDEM_COMPRA' ? 'Número da OC *' : 'Número da OS *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={osForm.numeroOs}
                    onChange={(e) => setOsForm({ ...osForm, numeroOs: e.target.value })}
                    placeholder="Ex: 01"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ano *</label>
                  <input
                    type="number"
                    required
                    value={osForm.ano}
                    onChange={(e) => setOsForm({ ...osForm, ano: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Processo SEI da Despesa *</label>
                  <input
                    type="text"
                    required
                    value={osForm.processoSeiDespesa}
                    onChange={(e) => setOsForm({ ...osForm, processoSeiDespesa: e.target.value })}
                    placeholder="Ex: 04410022.001234/2026-11"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Valor Estimado (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={osForm.valorEstimado}
                    onChange={(e) => setOsForm({ ...osForm, valorEstimado: e.target.value })}
                    placeholder="0,00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {osForm.tipoOrdem === 'ORDEM_COMPRA' ? 'Especificação dos Materiais / Bens a Fornecer *' : 'Descrição Detalhada do Serviço *'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={osForm.descricaoServico}
                  onChange={(e) => setOsForm({ ...osForm, descricaoServico: e.target.value })}
                  placeholder={
                    osForm.tipoOrdem === 'ORDEM_COMPRA'
                      ? 'Discriminação detalhada dos materiais, marcas, itens e local de entrega...'
                      : 'Instruções para execução dos serviços pelo fornecedor...'
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNovaOsModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003366] text-white text-xs font-semibold rounded-lg hover:bg-[#002244]"
                >
                  Emitir e Assinar Eletronicamente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Medição */}
      {showNovaMedicaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-800 text-base mb-1">Lançar Nova Medição / Fatura</h3>
            <p className="text-xs text-slate-500 mb-4">
              Registro mensal de faturamento para conferência e fluxo de atestes.
            </p>

            <form onSubmit={handleCreateMedicao} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contrato Vinculado *</label>
                <select
                  required
                  value={medicaoForm.contratoId}
                  onChange={(e) => setMedicaoForm({ ...medicaoForm, contratoId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                >
                  <option value="">Selecione o contrato...</option>
                  {contratos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.numeroContrato ? `Contrato nº ${c.numeroContrato}` : `Empenho: ${c.numeroEmpenho}`} - {c.objeto.slice(0, 40)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Referência (Mês/Ano) *</label>
                  <input
                    type="text"
                    required
                    value={medicaoForm.referenciaMesAno}
                    onChange={(e) => setMedicaoForm({ ...medicaoForm, referenciaMesAno: e.target.value })}
                    placeholder="Ex: 03/2026"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Processo SEI da Despesa *</label>
                  <input
                    type="text"
                    required
                    value={medicaoForm.processoSeiDespesa}
                    onChange={(e) => setMedicaoForm({ ...medicaoForm, processoSeiDespesa: e.target.value })}
                    placeholder="04410022.001234/2026-11"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Número da NF</label>
                  <input
                    type="text"
                    value={medicaoForm.numeroNotaFiscal}
                    onChange={(e) => setMedicaoForm({ ...medicaoForm, numeroNotaFiscal: e.target.value })}
                    placeholder="Ex: 10452"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data Emissão NF</label>
                  <input
                    type="date"
                    value={medicaoForm.dataEmissaoNf}
                    onChange={(e) => setMedicaoForm({ ...medicaoForm, dataEmissaoNf: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Valor da NF (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={medicaoForm.valorNotaFiscal}
                    onChange={(e) => setMedicaoForm({ ...medicaoForm, valorNotaFiscal: e.target.value })}
                    placeholder="0,00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Glosa (R$ se houver)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={medicaoForm.valorGlosa}
                    onChange={(e) => setMedicaoForm({ ...medicaoForm, valorGlosa: e.target.value })}
                    placeholder="0,00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 text-rose-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo da Glosa</label>
                  <input
                    type="text"
                    value={medicaoForm.motivoGlosa}
                    onChange={(e) => setMedicaoForm({ ...medicaoForm, motivoGlosa: e.target.value })}
                    placeholder="Ex: Faltas não repostas conforme IMR"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNovaMedicaoModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003366] text-white text-xs font-semibold rounded-lg hover:bg-[#002244]"
                >
                  Cadastrar Medição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: SALDOS DE CONTRATOS & DESPESAS ABERTAS */}
      {activeTab === 'SALDOS_DESPESAS' && (
        <div className="space-y-6">
          {/* 4 CARDS EXECUTIVOS: VALOR GLOBAL -> PROVISIONADO -> ATESTADO -> SALDO DO CONTRATO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Valor Global do Contrato */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>Valor Global do Contrato</span>
                <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-800">
                {(totaisSaldos.valorGlobalContratos || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-[11px] text-slate-500">
                Montante total pactuado com aditivos
              </p>
            </div>

            {/* Card 2: Valor Provisionado (Estimado em Aberto) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-800">
                <span>Valor Provisionado (Estimado)</span>
                <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-amber-700">
                {(totaisSaldos.valorProvisionado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-[11px] text-slate-500">
                Processos abertos debitando provisoriamente
              </p>
            </div>

            {/* Card 3: Valor Atestado (Executado Real) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                <span>Valor Atestado (Executado)</span>
                <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <CheckCircle className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-700">
                {(totaisSaldos.valorAtestado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-[11px] text-slate-500">
                Despesas atestadas (substituem a provisão)
              </p>
            </div>

            {/* Card 4: Saldo do Contrato */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                <span>Saldo Disponível do Contrato</span>
                <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                  <FileText className="w-4 h-4" />
                </span>
              </div>
              <div className={`text-2xl font-black ${totaisSaldos.saldoContrato < 0 ? 'text-rose-600' : 'text-indigo-700'}`}>
                {(totaisSaldos.saldoContrato || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-[11px] text-slate-500">
                Global subtraído de (Provisionado + Atestado)
              </p>
            </div>
          </div>

          {/* BARRA DE FILTROS & AÇÕES */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Filtro por Contrato */}
              <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                <FileText className="w-4 h-4 text-blue-700 flex-shrink-0" />
                <span className="font-bold text-slate-700">Contrato:</span>
                <select
                  value={filtroContratoSaldos}
                  onChange={(e) => setFiltroContratoSaldos(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer max-w-[200px] truncate"
                >
                  <option value="TODOS">Todos os Contratos</option>
                  {contratos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.numeroContrato ? `Contrato nº ${c.numeroContrato}` : `Empenho nº ${c.numeroEmpenho}`} - {c.fornecedor?.razaoSocial || c.objeto?.slice(0, 30)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Campus */}
              <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                <MapPin className="w-4 h-4 text-blue-700 flex-shrink-0" />
                <span className="font-bold text-slate-700">Campus:</span>
                <select
                  value={filtroCidadeSaldos}
                  onChange={(e) => setFiltroCidadeSaldos(e.target.value)}
                  disabled={currentUser?.isFiscalSetorial}
                  className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer disabled:cursor-not-allowed"
                >
                  {currentUser?.isFiscalSetorial && currentUser?.campusSetor ? (
                    <option value={currentUser.campusSetor}>
                      Campus {currentUser.campusSetor} (Meu Campus Designado)
                    </option>
                  ) : (
                    <>
                      <option value="TODAS">Todos os Campi UERN</option>
                      <option value="Mossoró">Campus Central - Mossoró</option>
                      <option value="Assú">Campus Assú</option>
                      <option value="Patu">Campus Patu</option>
                      <option value="Pau dos Ferros">Campus Pau dos Ferros</option>
                      <option value="Caicó">Campus Caicó</option>
                      <option value="Natal">Campus Natal</option>
                    </>
                  )}
                </select>
              </div>

              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={buscaSaldos}
                  onChange={(e) => setBuscaSaldos(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && carregarSaldos()}
                  placeholder="Buscar contrato, SEI, NF..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                />
              </div>

              <button
                type="button"
                onClick={() => carregarSaldos()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Filtrar
              </button>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <a
                href="/api/modelos-planilhas/saldos"
                download="Modelo_Importacao_Saldos_Despesas_UERN.xlsx"
                className="inline-flex items-center space-x-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
                title="Baixar planilha de exemplo para preenchimento"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Modelo (.xlsx)</span>
              </a>

              <button
                type="button"
                onClick={exportarSaldosExcel}
                disabled={despesasExecucao.length === 0}
                className="inline-flex items-center space-x-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Exportar Excel</span>
              </button>

              <Link
                href="/relatorios"
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
                title="Acessar Relatório de Fechamento Contábil Anual (Indicação de Empenhos a Manter ou Anular para a Contabilidade)"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Fechamento Contábil</span>
              </Link>

              {(currentUser?.isAdmin || currentUser?.isGestor || currentUser?.isFiscalAdm) && (
                <button
                  type="button"
                  onClick={() => setShowImportSaldosModal(true)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Importar Planilha de Saldos</span>
                </button>
              )}
            </div>
          </div>

          {/* TABELA DE SALDOS & DESPESAS ABERTAS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Contrato / SEI</th>
                    <th className="py-3 px-4">Processo de Despesa</th>
                    <th className="py-3 px-4">Nº Nota Fiscal</th>
                    <th className="py-3 px-4">Data Atesto</th>
                    <th className="py-3 px-4">Referência</th>
                    <th className="py-3 px-4">Local (Cidade)</th>
                    <th className="py-3 px-4 text-right">Valor Estimado (Provisão)</th>
                    <th className="py-3 px-4 text-right">Valor Atestado (Efetivo)</th>
                    <th className="py-3 px-4 text-center">Status / Débito no Contrato</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loadingSaldos ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-slate-400">
                        Carregando planilha de saldos e despesas abertas...
                      </td>
                    </tr>
                  ) : despesasExecucao.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-slate-400">
                        Nenhuma despesa ou saldo registrado para este filtro. Importe a planilha de saldos para iniciar o acompanhamento.
                      </td>
                    </tr>
                  ) : (
                    despesasExecucao.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">
                            {d.numeroContratoRef || d.contrato?.numeroContrato ? `Contrato nº ${d.numeroContratoRef || d.contrato?.numeroContrato}` : 'Contrato UERN'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {d.processoSeiMaeRef || d.contrato?.processoSeiMae}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono font-semibold text-blue-900">
                          {d.processoSeiDespesa}
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-700">
                          {d.numeroNotaFiscal || '-'}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {d.dataAtesto ? new Date(d.dataAtesto).toLocaleDateString('pt-BR') : '-'}
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {d.referencia}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="inline-flex items-center space-x-1 font-semibold text-slate-700">
                            <MapPin className="w-3 h-3 text-blue-600" />
                            <span>{d.cidade}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-medium text-slate-700">
                          {d.valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>

                        <td className="py-3 px-4 text-right font-bold text-emerald-700">
                          {d.valorAtestado > 0 ? (
                            d.valorAtestado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          ) : (
                            <span className="text-slate-400 font-normal italic">Aguardando</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          {d.status === 'ATESTADA' ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Atestada (Efetiva)
                              </span>
                              <span className="text-[10px] text-emerald-600 font-mono font-medium mt-0.5">
                                Debita {d.valorAtestado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex flex-col items-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Aberta (Provisionada)
                              </span>
                              <span className="text-[10px] text-amber-600 font-mono font-medium mt-0.5">
                                Provisão {d.valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </div>
                          )}

                          {/* Decisão Contábil Anual para Fechamento */}
                          {d.decisaoContabil === 'ANULAR_CANCELAR' && (
                            <div className="mt-1">
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                                title={d.justificativaContabil || 'Parecer Contábil: Empenho a ser Anulado no Fechamento do Exercício'}
                              >
                                Anular Empenho
                              </span>
                            </div>
                          )}
                          {d.decisaoContabil === 'MANTER' && (
                            <div className="mt-1">
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                title={d.justificativaContabil || 'Parecer Contábil: Empenho a Manter no Fechamento do Exercício'}
                              >
                                Manter Empenho
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          {currentUser?.isAdmin ? (
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditDespesa(d)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                                title="Editar Registro de Saldo"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Editar</span>
                              </button>
                              {(d.status === 'ABERTA' || !d.dataAtesto || d.valorAtestado === 0) && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDespesa(d)}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                                  title="Excluir Despesa em Aberto"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Excluir</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Homologado</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO DE PLANILHA DE SALDOS */}
      {showImportSaldosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Importar Planilha de Saldos e Despesas
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Carga em lote de despesas abertas, valores atestados e saldos por cidade
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportSaldosModal(false);
                  setImportSaldosFile(null);
                  setImportSaldosResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 space-y-1">
              <p className="font-semibold">Colunas da planilha aceitas:</p>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Contrato / SEI, Processo de Despesa, Nº Nota Fiscal, Data do Atesto, Referência (Mês/Ano ou Medição), Local da prestação (Mossoró, Assú, Patu, Pau dos Ferros, Caicó ou Natal), Valor Estimado, Valor Atestado e Saldo.
              </p>
              <div className="pt-1">
                <a
                  href="/api/modelos-planilhas/saldos"
                  download="Modelo_Importacao_Saldos_Despesas_UERN.xlsx"
                  className="inline-flex items-center space-x-1 text-xs font-bold text-blue-800 hover:text-blue-900 underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Modelo Oficial de Saldos (.xlsx)</span>
                </a>
              </div>
            </div>

            {importSaldosResult && (
              <div
                className={`p-3 rounded-xl text-xs ${
                  importSaldosResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {importSaldosResult.success ? (
                  <p className="font-bold">{importSaldosResult.mensagem || 'Planilha importada com sucesso!'}</p>
                ) : (
                  <p>{importSaldosResult.error || 'Erro ao processar planilha.'}</p>
                )}
              </div>
            )}

            <form onSubmit={handleImportSaldosSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50/50 cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setImportSaldosFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="saldos-file-upload"
                />
                <label htmlFor="saldos-file-upload" className="cursor-pointer block">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <span className="text-xs font-semibold text-slate-700 block">
                    {importSaldosFile ? importSaldosFile.name : 'Clique para selecionar a planilha de saldos'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Formatos suportados: .xlsx, .xls, .csv
                  </span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportSaldosModal(false);
                    setImportSaldosFile(null);
                    setImportSaldosResult(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={!importSaldosFile || importingSaldos}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {importingSaldos ? 'Importando Saldos...' : 'Processar Planilha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR MEDIÇÃO */}
      {showEditMedicaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Editar Medição / Fatura
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ajuste administrativo de dados da fatura, valores e atestes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditMedicaoModal(false);
                  setEditingMedicaoId(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditMedicao} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Referência (Mês/Ano)
                  </label>
                  <input
                    type="text"
                    required
                    value={editMedicaoForm.referenciaMesAno}
                    onChange={(e) => setEditMedicaoForm({ ...editMedicaoForm, referenciaMesAno: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                    placeholder="Ex: 03/2026"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Processo SEI da Despesa
                  </label>
                  <input
                    type="text"
                    required
                    value={editMedicaoForm.processoSeiDespesa}
                    onChange={(e) => setEditMedicaoForm({ ...editMedicaoForm, processoSeiDespesa: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                    placeholder="Ex: 04410024.000123/2026-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Nº Nota Fiscal
                  </label>
                  <input
                    type="text"
                    value={editMedicaoForm.numeroNotaFiscal}
                    onChange={(e) => setEditMedicaoForm({ ...editMedicaoForm, numeroNotaFiscal: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                    placeholder="Ex: 10452"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Data Emissão NF
                  </label>
                  <input
                    type="date"
                    value={editMedicaoForm.dataEmissaoNf}
                    onChange={(e) => setEditMedicaoForm({ ...editMedicaoForm, dataEmissaoNf: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Valor da Nota Fiscal (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editMedicaoForm.valorNotaFiscal}
                    onChange={(e) => setEditMedicaoForm({ ...editMedicaoForm, valorNotaFiscal: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Valor da Glosa (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editMedicaoForm.valorGlosa}
                    onChange={(e) => setEditMedicaoForm({ ...editMedicaoForm, valorGlosa: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Motivo da Glosa (se houver)
                </label>
                <input
                  type="text"
                  value={editMedicaoForm.motivoGlosa}
                  onChange={(e) => setEditMedicaoForm({ ...editMedicaoForm, motivoGlosa: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  placeholder="Ex: Desconto por descumprimento do IMR"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Status da Medição
                </label>
                <select
                  value={editMedicaoForm.status}
                  onChange={(e) => setEditMedicaoForm({ ...editMedicaoForm, status: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                >
                  <option value="EM_CONFERENCIA_ADM">Em Conferência Administrativa</option>
                  <option value="ATESTE_PROVISORIO">Ateste Provisório (Técnico)</option>
                  <option value="ATESTE_DEFINITIVO">Ateste Definitivo (Gestor)</option>
                  <option value="PAGA">Paga / Liquidada</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditMedicaoModal(false);
                    setEditingMedicaoId(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoMedicao}
                  className="px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
                >
                  {salvandoMedicao ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR SALDO / DESPESA ABERTA */}
      {showEditDespesaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Editar Registro de Saldo e Despesa
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ajuste administrativo dos valores, atestos e saldos abertos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditDespesaModal(false);
                  setEditingDespesaId(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDespesa} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Contrato / Ref
                  </label>
                  <input
                    type="text"
                    value={editDespesaForm.numeroContratoRef}
                    onChange={(e) => setEditDespesaForm({ ...editDespesaForm, numeroContratoRef: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                    placeholder="Ex: 012/2024"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Processo SEI de Despesa
                  </label>
                  <input
                    type="text"
                    required
                    value={editDespesaForm.processoSeiDespesa}
                    onChange={(e) => setEditDespesaForm({ ...editDespesaForm, processoSeiDespesa: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                    placeholder="Ex: 04410024.000123/2026-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Nº Nota Fiscal
                  </label>
                  <input
                    type="text"
                    value={editDespesaForm.numeroNotaFiscal}
                    onChange={(e) => setEditDespesaForm({ ...editDespesaForm, numeroNotaFiscal: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                    placeholder="Ex: 9812"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Data do Atesto
                  </label>
                  <input
                    type="date"
                    value={editDespesaForm.dataAtesto}
                    onChange={(e) => setEditDespesaForm({ ...editDespesaForm, dataAtesto: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Referência (Mês/Ano ou Medição)
                  </label>
                  <input
                    type="text"
                    required
                    value={editDespesaForm.referencia}
                    onChange={(e) => setEditDespesaForm({ ...editDespesaForm, referencia: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                    placeholder="Ex: 01/2026"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Campus / Cidade
                  </label>
                  <select
                    value={editDespesaForm.cidade}
                    onChange={(e) => setEditDespesaForm({ ...editDespesaForm, cidade: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 font-semibold"
                  >
                    <option value="Mossoró">Campus Central - Mossoró</option>
                    <option value="Assú">Campus Assú</option>
                    <option value="Patu">Campus Patu</option>
                    <option value="Pau dos Ferros">Campus Pau dos Ferros</option>
                    <option value="Caicó">Campus Caicó</option>
                    <option value="Natal">Campus Natal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Valor Estimado (Provisão) (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editDespesaForm.valorEstimado}
                    onChange={(e) => setEditDespesaForm({ ...editDespesaForm, valorEstimado: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Valor Atestado (Efetivo) (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editDespesaForm.valorAtestado}
                    onChange={(e) => setEditDespesaForm({ ...editDespesaForm, valorAtestado: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 font-semibold text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Status
                  </label>
                  <select
                    value={editDespesaForm.status}
                    onChange={(e) => setEditDespesaForm({ ...editDespesaForm, status: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  >
                    <option value="ABERTA">Aberta / A Atestar</option>
                    <option value="ATESTADA">Atestada</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Observações
                  </label>
                  <input
                    type="text"
                    value={editDespesaForm.observacoes}
                    onChange={(e) => setEditDespesaForm({ ...editDespesaForm, observacoes: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                    placeholder="Observações administrativas..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditDespesaModal(false);
                    setEditingDespesaId(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoDespesa}
                  className="px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
                >
                  {salvandoDespesa ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR ORDEM DE SERVIÇO */}
      {showEditOsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Editar {editingOsIsOc ? 'Ordem de Compra (OC)' : 'Ordem de Serviço (OS)'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ajuste os dados cadastrais e o valor estimado da {editingOsIsOc ? 'OC' : 'OS'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditOsModal(false);
                  setEditingOsId(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditOs} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Número da {editingOsIsOc ? 'OC' : 'OS'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editOsForm.numeroOs}
                    onChange={(e) => setEditOsForm({ ...editOsForm, numeroOs: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                    placeholder="Ex: 001"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Ano da {editingOsIsOc ? 'OC' : 'OS'}
                  </label>
                  <input
                    type="number"
                    required
                    value={editOsForm.ano}
                    onChange={(e) => setEditOsForm({ ...editOsForm, ano: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Processo SEI da Despesa
                  </label>
                  <input
                    type="text"
                    required
                    value={editOsForm.processoSeiDespesa}
                    onChange={(e) => setEditOsForm({ ...editOsForm, processoSeiDespesa: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                    placeholder="Ex: 04410024.000123/2026-11"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Valor Estimado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editOsForm.valorEstimado}
                    onChange={(e) => setEditOsForm({ ...editOsForm, valorEstimado: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  {editingOsIsOc ? 'Especificação dos Materiais / Bens' : 'Descrição dos Serviços / Objeto'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={editOsForm.descricaoServico}
                  onChange={(e) => setEditOsForm({ ...editOsForm, descricaoServico: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  placeholder={editingOsIsOc ? 'Especificação dos bens, materiais ou equipamentos...' : 'Detalhamento do serviço ou demanda solicitada...'}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditOsModal(false);
                    setEditingOsId(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoOs}
                  className="px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
                >
                  {salvandoOs ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
