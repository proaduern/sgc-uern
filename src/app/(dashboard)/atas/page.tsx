'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layers,
  PlusCircle,
  Calendar,
  Building,
  DollarSign,
  Package,
  Users,
  Search,
  CheckCircle2,
  Trash2,
  Plus,
  Edit3,
  X,
  FileText,
  Percent,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
  Printer,
  TrendingUp,
  Clock,
  ArrowRight
} from 'lucide-react';

export default function AtasPage() {
  const [activeTab, setActiveTab] = useState<'ATAS_ITENS' | 'AUTORIZACOES_EXECUCAO' | 'CARONAS_ADESOES'>('ATAS_ITENS');
  const [atas, setAtas] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [autorizacoes, setAutorizacoes] = useState<any[]>([]);
  const [adesoes, setAdesoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modais
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReajusteModal, setShowReajusteModal] = useState(false);
  const [showAeaModal, setShowAeaModal] = useState(false);
  const [showCaronaModal, setShowCaronaModal] = useState(false);
  const [selectedTermoAea, setSelectedTermoAea] = useState<any | null>(null);

  // Estados de Edição da Ata
  const [editingAtaId, setEditingAtaId] = useState<string | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [editForm, setEditForm] = useState({
    numeroAta: '',
    ano: '',
    processoSei: '',
    objeto: '',
    fornecedorId: '',
    vigenciaInicio: '',
    vigenciaFim: '',
    valorGlobal: '',
    status: 'VIGENTE',
    indiceReajuste: 'IPCA',
  });
  const [editItens, setEditItens] = useState<Array<{
    id?: string;
    numeroItem: number;
    descricao: string;
    marcaModelo: string;
    unidade: string;
    quantidadeRegistrada: string;
    quantidadeSaldo: string;
    valorUnitario: string;
  }>>([]);

  // Form Reajuste de Ata
  const [reajusteAta, setReajusteAta] = useState<any | null>(null);
  const [reajusteForm, setReajusteForm] = useState({
    indiceReajuste: 'IPCA',
    percentualReajuste: '',
    dataReajuste: new Date().toISOString().split('T')[0],
  });
  const [salvandoReajuste, setSalvandoReajuste] = useState(false);

  // Form Nova Ata
  const [form, setForm] = useState({
    numeroAta: '',
    ano: new Date().getFullYear().toString(),
    processoSei: '',
    objeto: '',
    fornecedorId: '',
    vigenciaInicio: '',
    vigenciaFim: '',
    valorGlobal: '',
    indiceReajuste: 'IPCA',
  });

  const [itens, setItens] = useState<Array<{
    numeroItem: number;
    descricao: string;
    marcaModelo: string;
    unidade: string;
    quantidade: string;
    valorUnitario: string;
  }>>([
    { numeroItem: 1, descricao: '', marcaModelo: '', unidade: 'UN', quantidade: '10', valorUnitario: '0' }
  ]);

  // Form Nova Autorização de Execução (AEA)
  const [aeaForm, setAeaForm] = useState({
    ataId: '',
    numeroAutorizacao: '',
    processoSei: '',
    orgaoRequisitante: '',
    descricao: '',
    observacoes: '',
  });
  const [aeaItensDeducao, setAeaItensDeducao] = useState<Array<{
    itemId: string;
    numeroItem: number;
    descricao: string;
    unidade: string;
    quantidadeSaldo: number;
    valorUnitario: number;
    quantidadeAutorizada: string;
  }>>([]);
  const [salvandoAea, setSalvandoAea] = useState(false);

  // Form Nova Carona (Adesão)
  const [caronaForm, setCaronaForm] = useState({
    ataId: '',
    orgaoRequisitante: '',
    processoSeiAdesao: '',
    valorAdesao: '',
    justificativa: '',
  });
  const [salvandoCarona, setSalvandoCarona] = useState(false);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resUser, resA, resF, resAut, resAde] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/atas'),
        fetch('/api/fornecedores'),
        fetch('/api/atas/autorizacoes'),
        fetch('/api/atas/adesao'),
      ]);
      const dataUser = await resUser.json();
      if (dataUser.user) setCurrentUser(dataUser.user);

      if (resA.ok) {
        const dataA = await resA.json();
        if (dataA.atas) setAtas(dataA.atas);
      }
      if (resF.ok) {
        const dataF = await resF.json();
        if (dataF.fornecedores) setFornecedores(dataF.fornecedores);
      }
      if (resAut.ok) {
        const dataAut = await resAut.json();
        if (dataAut.autorizacoes) setAutorizacoes(dataAut.autorizacoes);
      }
      if (resAde.ok) {
        const dataAde = await resAde.json();
        if (dataAde.adesoes) setAdesoes(dataAde.adesoes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Handler para itens da nova ata
  const handleAddItem = () => {
    setItens([
      ...itens,
      { numeroItem: itens.length + 1, descricao: '', marcaModelo: '', unidade: 'UN', quantidade: '10', valorUnitario: '0' }
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

  // Cadastrar nova ata
  const handleCreateAta = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/atas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, itens }),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({
          numeroAta: '',
          ano: new Date().getFullYear().toString(),
          processoSei: '',
          objeto: '',
          fornecedorId: '',
          vigenciaInicio: '',
          vigenciaFim: '',
          valorGlobal: '',
          indiceReajuste: 'IPCA',
        });
        carregarDados();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao registrar Ata');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Funções de Edição da Ata
  const handleOpenEdit = (ata: any) => {
    setEditingAtaId(ata.id);
    setEditForm({
      numeroAta: ata.numeroAta,
      ano: ata.ano ? ata.ano.toString() : new Date().getFullYear().toString(),
      processoSei: ata.processoSei || '',
      objeto: ata.objeto || '',
      fornecedorId: ata.fornecedorId || '',
      vigenciaInicio: ata.vigenciaInicio ? new Date(ata.vigenciaInicio).toISOString().split('T')[0] : '',
      vigenciaFim: ata.vigenciaFim ? new Date(ata.vigenciaFim).toISOString().split('T')[0] : '',
      valorGlobal: ata.valorGlobalAtual ? String(ata.valorGlobalAtual) : String(ata.valorGlobalOriginal),
      status: ata.status || 'VIGENTE',
      indiceReajuste: ata.indiceReajuste || 'IPCA',
    });
    setEditItens(
      ata.itens && ata.itens.length > 0
        ? ata.itens.map((it: any) => ({
            id: it.id,
            numeroItem: it.numeroItem,
            descricao: it.descricao,
            marcaModelo: it.marcaModelo || '',
            unidade: it.unidade || 'UN',
            quantidadeRegistrada: String(it.quantidadeRegistrada),
            quantidadeSaldo: String(it.quantidadeSaldo),
            valorUnitario: String(it.valorUnitario),
          }))
        : [{ numeroItem: 1, descricao: '', marcaModelo: '', unidade: 'UN', quantidadeRegistrada: '10', quantidadeSaldo: '10', valorUnitario: '0' }]
    );
    setShowEditModal(true);
  };

  const handleEditItemChange = (index: number, field: string, value: string) => {
    const updated = [...editItens];
    (updated[index] as any)[field] = value;
    setEditItens(updated);
  };

  const handleAddEditItem = () => {
    setEditItens([
      ...editItens,
      {
        numeroItem: editItens.length + 1,
        descricao: '',
        marcaModelo: '',
        unidade: 'UN',
        quantidadeRegistrada: '10',
        quantidadeSaldo: '10',
        valorUnitario: '0',
      },
    ]);
  };

  const handleRemoveEditItem = (index: number) => {
    if (editItens.length === 1) return;
    setEditItens(editItens.filter((_, i) => i !== index));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAtaId) return;
    setSalvandoEdicao(true);
    try {
      const res = await fetch(`/api/atas/${editingAtaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, itens: editItens }),
      });
      if (res.ok) {
        setShowEditModal(false);
        setEditingAtaId(null);
        carregarDados();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao atualizar ata');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  // Reajuste de Ata
  const handleOpenReajuste = (ata: any) => {
    setReajusteAta(ata);
    setReajusteForm({
      indiceReajuste: ata.indiceReajuste || 'IPCA',
      percentualReajuste: '',
      dataReajuste: new Date().toISOString().split('T')[0],
    });
    setShowReajusteModal(true);
  };

  const handleSaveReajuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reajusteAta) return;
    setSalvandoReajuste(true);
    try {
      const res = await fetch(`/api/atas/${reajusteAta.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          indiceReajuste: reajusteForm.indiceReajuste,
          aplicarReajustePercentual: reajusteForm.percentualReajuste,
          dataUltimoReajuste: reajusteForm.dataReajuste,
        }),
      });
      if (res.ok) {
        setShowReajusteModal(false);
        setReajusteAta(null);
        carregarDados();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao aplicar reajuste');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSalvandoReajuste(false);
    }
  };

  const handleDeleteAta = async (ata: any) => {
    if (
      !confirm(
        `ATENÇÃO ADMINISTRADOR:\nDeseja realmente excluir a Ata de Registro de Preço nº ${ata.numeroAta}/${ata.ano}?\n\nEsta ação excluirá em cascata todos os itens registrados, autorizações de execução e caronas vinculadas a esta ata. Esta ação é irreversível.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/atas/${ata.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir ata');
      alert(data.message || 'Ata excluída com sucesso!');
      carregarDados();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAea = async (aea: any) => {
    if (
      !confirm(
        `Deseja realmente excluir a Autorização de Execução nº ${aea.numeroAutorizacao} no valor de ${aea.valorTotal?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}? Esta ação é irreversível.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/atas/autorizacoes?id=${aea.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir autorização');
      alert(data.message || 'Autorização excluída com sucesso!');
      carregarDados();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAdesao = async (adesao: any) => {
    if (
      !confirm(
        `Deseja realmente excluir a Autorização de Carona para ${adesao.orgaoRequisitante} no valor de ${adesao.valorAdesao?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}? Esta ação é irreversível.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/atas/adesao?id=${adesao.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir adesão');
      alert(data.message || 'Adesão excluída com sucesso!');
      carregarDados();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Abertura do Modal de Autorização de Execução (AEA)
  const handleOpenAeaModal = (preselectedAtaId?: string) => {
    const defaultAtaId = preselectedAtaId || (atas.length > 0 ? atas[0].id : '');
    setAeaForm({
      ataId: defaultAtaId,
      numeroAutorizacao: '',
      processoSei: '',
      orgaoRequisitante: '',
      descricao: '',
      observacoes: '',
    });

    if (defaultAtaId) {
      const selected = atas.find((a) => a.id === defaultAtaId);
      if (selected && selected.itens) {
        setAeaItensDeducao(
          selected.itens.map((it: any) => ({
            itemId: it.id,
            numeroItem: it.numeroItem,
            descricao: it.descricao,
            unidade: it.unidade,
            quantidadeSaldo: it.quantidadeSaldo,
            valorUnitario: it.valorUnitario,
            quantidadeAutorizada: '0',
          }))
        );
      } else {
        setAeaItensDeducao([]);
      }
    }
    setShowAeaModal(true);
  };

  const handleAeaAtaChange = (ataId: string) => {
    setAeaForm({ ...aeaForm, ataId });
    const selected = atas.find((a) => a.id === ataId);
    if (selected && selected.itens) {
      setAeaItensDeducao(
        selected.itens.map((it: any) => ({
          itemId: it.id,
          numeroItem: it.numeroItem,
          descricao: it.descricao,
          unidade: it.unidade,
          quantidadeSaldo: it.quantidadeSaldo,
          valorUnitario: it.valorUnitario,
          quantidadeAutorizada: '0',
        }))
      );
    } else {
      setAeaItensDeducao([]);
    }
  };

  const handleSaveAea = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoAea(true);
    try {
      // Calcular total a partir dos itens selecionados
      const itensComQtd = aeaItensDeducao.filter((it) => parseFloat(it.quantidadeAutorizada) > 0);
      let valorTotalCalculado = itensComQtd.reduce((acc, it) => {
        return acc + (parseFloat(it.quantidadeAutorizada) * it.valorUnitario);
      }, 0);

      // Se nenhum item foi pontuado, exige que informe ou defina valor
      if (valorTotalCalculado <= 0) {
        alert('Por favor, informe a quantidade a autorizar de ao menos 1 item com saldo.');
        setSalvandoAea(false);
        return;
      }

      const res = await fetch('/api/atas/autorizacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ataId: aeaForm.ataId,
          numeroAutorizacao: aeaForm.numeroAutorizacao,
          processoSei: aeaForm.processoSei,
          orgaoRequisitante: aeaForm.orgaoRequisitante,
          descricao: aeaForm.descricao,
          valorTotal: valorTotalCalculado,
          observacoes: aeaForm.observacoes,
          itensDeducao: itensComQtd.map((it) => ({
            itemId: it.itemId,
            quantidade: parseFloat(it.quantidadeAutorizada),
            valorUnitario: it.valorUnitario,
          })),
        }),
      });

      if (res.ok) {
        setShowAeaModal(false);
        carregarDados();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao emitir autorização de execução.');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSalvandoAea(false);
    }
  };

  // Carona / Adesão Modal
  const handleOpenCaronaModal = (preselectedAtaId?: string) => {
    const defaultAtaId = preselectedAtaId || (atas.length > 0 ? atas[0].id : '');
    setCaronaForm({
      ataId: defaultAtaId,
      orgaoRequisitante: '',
      processoSeiAdesao: '',
      valorAdesao: '',
      justificativa: '',
    });
    setShowCaronaModal(true);
  };

  const handleSaveCarona = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoCarona(true);
    try {
      const res = await fetch('/api/atas/adesao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(caronaForm),
      });

      if (res.ok) {
        setShowCaronaModal(false);
        carregarDados();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao registrar autorização de carona.');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSalvandoCarona(false);
    }
  };

  // Controle de Acesso Restrito (Apenas Administrador PROAD ou Gestor de Ata de Registro de Preço)
  if (currentUser && !currentUser.isAdmin && currentUser.role !== 'GESTOR_ATA') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-2xl mx-auto my-12 shadow-sm space-y-4">
        <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
          <Layers className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Módulo Restrito à PROAD e Gestor de Ata (ARP)</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Conforme a <strong>Instrução Normativa nº 01/2026-PROAD</strong> e a <strong>Lei Federal nº 14.133/2021</strong>, a gestão de <strong>Atas de Registro de Preço (ARP)</strong>, controle de saldos, reajustes, emissão de Autorizações de Execução de Ata e autorizações de adesão ("carona") é de competência privativa dos Administradores da Pró-Reitoria de Administração e do servidor formalmente designado como <strong>Gestor de Ata de Registro de Preço</strong>.
        </p>
        <p className="text-xs text-slate-500">
          Como Gestor ou Fiscal de Contrato, utilize os módulos de <strong>Contratos Vinculados</strong> ou <strong>Execução & Medições</strong> para gerenciar suas ordens de serviço/compra e atestes.
        </p>
        <div className="pt-4">
          <Link
            href="/contratos"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow transition-colors"
          >
            <span>Ir para Meus Contratos Vinculados</span>
          </Link>
        </div>
      </div>
    );
  }

  // Cálculos de Indicadores Globais
  const totalValorRegistrado = atas.reduce((acc, a) => acc + (a.valorGlobalAtual || a.valorGlobalOriginal || 0), 0);
  const totalItens = atas.reduce((acc, a) => acc + (a.itens?.length || 0), 0);
  const totalAutorizacoesValor = autorizacoes.reduce((acc, a) => acc + (a.valorTotal || 0), 0);
  const totalAdesoesValor = adesoes.filter((ad) => ad.statusAprovacao === 'AUTORIZADA').reduce((acc, ad) => acc + (ad.valorAdesao || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header Institucional */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg md:text-xl">
            <Layers className="w-6 h-6 text-blue-700" />
            <h2>Gestão de Atas de Registro de Preço (ARP)</h2>
            <span className="ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 uppercase tracking-wide">
              {currentUser?.role === 'GESTOR_ATA' ? 'Gestor de Ata' : 'PROAD Admin'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Controle integrado de saldo de ata, vigência, reajustes, autorizações para execução e autorizações de carona (Lei nº 14.133/2021).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === 'ATAS_ITENS' && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Cadastrar Nova Ata (ARP)</span>
            </button>
          )}

          {activeTab === 'AUTORIZACOES_EXECUCAO' && (
            <button
              onClick={() => handleOpenAeaModal()}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Nova Autorização de Execução</span>
            </button>
          )}

          {activeTab === 'CARONAS_ADESOES' && (
            <button
              onClick={() => handleOpenCaronaModal()}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Autorizar Nova Carona</span>
            </button>
          )}
        </div>
      </div>

      {/* Cards de Métricas e Saldos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center flex-shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Atas Cadastradas</span>
            <div className="text-xl font-extrabold text-slate-800">{atas.length}</div>
            <span className="text-[10px] text-emerald-600 font-semibold">{atas.filter(a => a.status === 'VIGENTE').length} Vigentes</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Valor Global em Atas</span>
            <div className="text-xl font-extrabold text-slate-800">
              {totalValorRegistrado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">{totalItens} itens catalogados</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Execuções Autorizadas</span>
            <div className="text-xl font-extrabold text-slate-800">
              {totalAutorizacoesValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <span className="text-[10px] text-indigo-600 font-semibold">{autorizacoes.length} ordens de execução</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Caronas Autorizadas</span>
            <div className="text-xl font-extrabold text-slate-800">
              {totalAdesoesValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <span className="text-[10px] text-amber-700 font-semibold">{adesoes.length} adesões externas</span>
          </div>
        </div>
      </div>

      {/* Tabs de Navegação */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-sm">
        <button
          onClick={() => setActiveTab('ATAS_ITENS')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'ATAS_ITENS'
              ? 'bg-[#003366] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>1. Atas e Itens Registrados ({atas.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('AUTORIZACOES_EXECUCAO')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'AUTORIZACOES_EXECUCAO'
              ? 'bg-[#003366] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>2. Autorizações para Execução de Ata ({autorizacoes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CARONAS_ADESOES')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'CARONAS_ADESOES'
              ? 'bg-[#003366] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>3. Autorizações de Carona de Ata ({adesoes.length})</span>
        </button>
      </div>

      {/* ABA 1: ATAS E ITENS REGISTRADOS */}
      {activeTab === 'ATAS_ITENS' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Carregando Atas de Registro de Preço...</div>
          ) : atas.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              Nenhuma Ata de Registro de Preço cadastrada.
            </div>
          ) : (
            atas.map((ata) => {
              const vigFim = new Date(ata.vigenciaFim);
              const diasRestantes = Math.ceil((vigFim.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              const vigenciaCritica = diasRestantes <= 60 && diasRestantes > 0;
              const vigenciaVencida = diasRestantes <= 0;

              return (
                <div
                  key={ata.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          ata.status === 'VIGENTE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          ARP {ata.status || 'VIGENTE'}
                        </span>
                        <span className="text-xs text-blue-700 font-mono font-semibold">
                          Processo SEI: {ata.processoSei}
                        </span>
                        {vigenciaCritica && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Expira em {diasRestantes} dias
                          </span>
                        )}
                        {vigenciaVencida && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Vigência Expirada
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 text-base mt-1">
                        Ata de Registro de Preço nº {ata.numeroAta}/{ata.ano}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-right mr-2">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Valor Global Registrado</span>
                        <span className="text-lg font-extrabold text-slate-800">
                          {(ata.valorGlobalAtual ?? ata.valorGlobalOriginal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>

                      <button
                        onClick={() => handleOpenReajuste(ata)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        title="Aplicar Reajuste Contratual na Ata"
                      >
                        <Percent className="w-3.5 h-3.5" />
                        <span>Reajuste</span>
                      </button>

                      <button
                        onClick={() => handleOpenAeaModal(ata.id)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        title="Emitir Autorização de Execução desta Ata"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>Autorizar Execução</span>
                      </button>

                      <button
                        onClick={() => handleOpenCaronaModal(ata.id)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        title="Autorizar Adesão de Carona desta Ata"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Carona</span>
                      </button>

                      <button
                        onClick={() => handleOpenEdit(ata)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        title="Editar Dados Cadastrais e Saldos"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      {currentUser?.isAdmin && (
                        <button
                          onClick={() => handleDeleteAta(ata)}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                          title="Excluir Ata de Registro de Preços (Admin)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-800 block">Fornecedor Beneficiário:</span>
                      <span className="font-bold text-slate-700">{ata.fornecedor.razaoSocial}</span>
                      <span className="text-[11px] text-slate-400 block font-mono">CNPJ: {ata.fornecedor.cnpj}</span>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-800 block">Vigência da Ata:</span>
                      <span>
                        {new Date(ata.vigenciaInicio).toLocaleDateString('pt-BR')} a{' '}
                        {new Date(ata.vigenciaFim).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        Prazo máximo: 1 ano (Art. 84, Lei 14.133)
                      </span>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-800 block">Gestor da Ata Designado:</span>
                      <span className="font-bold text-blue-900">{ata.gestor?.nome || 'PROAD / UERN'}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {ata.gestor?.matricula ? `Matrícula: ${ata.gestor.matricula}` : ata.gestor?.email || ''}
                      </span>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-800 block">Reajuste & Índice:</span>
                      <span className="font-semibold text-slate-700">Índice: {ata.indiceReajuste || 'IPCA'}</span>
                      <span className="text-[10px] text-slate-500 block">
                        {ata.percentualUltimoReajuste
                          ? `Último: +${ata.percentualUltimoReajuste}% (${new Date(ata.dataUltimoReajuste).toLocaleDateString('pt-BR')})`
                          : 'Nenhum reajuste aplicado'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-800 text-xs block mb-1">Objeto Registrado:</span>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {ata.objeto}
                    </p>
                  </div>

                  {/* Tabela de Itens da Ata com controle de saldo */}
                  {ata.itens && ata.itens.length > 0 && (
                    <div className="pt-2">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-slate-700 text-xs uppercase tracking-wider block">
                          Itens Registrados & Controle de Saldo:
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {ata.itens.length} {ata.itens.length === 1 ? 'item' : 'itens'} no catálogo
                        </span>
                      </div>
                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-3">Item</th>
                              <th className="py-2.5 px-3">Descrição do Material/Serviço</th>
                              <th className="py-2.5 px-3">Marca / Modelo</th>
                              <th className="py-2.5 px-3 text-right">Qtd. Registrada</th>
                              <th className="py-2.5 px-3 text-right">Qtd. Saldo Remanescente</th>
                              <th className="py-2.5 px-3 text-center">Consumo</th>
                              <th className="py-2.5 px-3 text-right">Valor Unit.</th>
                              <th className="py-2.5 px-3 text-right">Valor Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {ata.itens.map((it: any) => {
                              const percConsumido = Math.max(0, Math.min(100, Math.round(((it.quantidadeRegistrada - it.quantidadeSaldo) / it.quantidadeRegistrada) * 100)));
                              return (
                                <tr key={it.id} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="py-2 px-3 font-bold text-slate-800">{it.numeroItem}</td>
                                  <td className="py-2 px-3 text-slate-800">{it.descricao}</td>
                                  <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{it.marcaModelo || '-'}</td>
                                  <td className="py-2 px-3 text-right font-medium text-slate-600">{it.quantidadeRegistrada} {it.unidade}</td>
                                  <td className="py-2 px-3 text-right font-bold text-blue-700">{it.quantidadeSaldo} {it.unidade}</td>
                                  <td className="py-2 px-3">
                                    <div className="w-24 mx-auto">
                                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                        <div
                                          className={`h-1.5 rounded-full ${
                                            percConsumido > 80 ? 'bg-rose-500' : percConsumido > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                                          }`}
                                          style={{ width: `${percConsumido}%` }}
                                        />
                                      </div>
                                      <div className="text-[9px] text-center text-slate-400 mt-0.5 font-mono">{percConsumido}% consumido</div>
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono">{it.valorUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                  <td className="py-2 px-3 text-right font-semibold text-slate-900 font-mono">{it.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ABA 2: AUTORIZAÇÕES PARA EXECUÇÃO DE ATA */}
      {activeTab === 'AUTORIZACOES_EXECUCAO' && (
        <div className="space-y-4">
          <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-2xl text-xs text-blue-900 flex items-start space-x-3">
            <FileCheck2 className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Autorizações de Execução de Ata (AEA):</span> O Gestor de Ata emite as ordens formais de fornecimento ou execução para os campi da UERN (Mossoró, Assú, Caicó, Patu, Pau dos Ferros, Natal) deduzindo o saldo correspondente de cada item da Ata licitada.
            </div>
          </div>

          {autorizacoes.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              Nenhuma autorização de execução emitida até o momento.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Nº Autorização</th>
                      <th className="py-3 px-4">Ata / Fornecedor</th>
                      <th className="py-3 px-4">Processo SEI</th>
                      <th className="py-3 px-4">Órgão / Campus Requisitante</th>
                      <th className="py-3 px-4">Descrição da Demanda</th>
                      <th className="py-3 px-4 text-right">Valor Autorizado</th>
                      <th className="py-3 px-4 text-center">Data</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {autorizacoes.map((aut) => (
                      <tr key={aut.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-blue-800 font-mono">
                          {aut.numeroAutorizacao}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block">
                            Ata nº {aut.ata?.numeroAta}/{aut.ata?.ano}
                          </span>
                          <span className="text-[11px] text-slate-400 block">{aut.ata?.fornecedor?.razaoSocial}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                          {aut.processoSei}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {aut.orgaoRequisitante}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate" title={aut.descricao}>
                          {aut.descricao}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-slate-900 font-mono">
                          {aut.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3 px-4 text-center text-[11px] text-slate-500">
                          {new Date(aut.dataAutorizacao).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => setSelectedTermoAea(aut)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Imprimir Termo</span>
                            </button>

                            {currentUser?.isAdmin && (
                              <button
                                onClick={() => handleDeleteAea(aut)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                title="Excluir Autorização de Execução da Ata (Admin)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 3: AUTORIZAÇÕES DE CARONA DE ATA (ADESÕES) */}
      {activeTab === 'CARONAS_ADESOES' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-900 flex items-start space-x-3">
            <Users className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Regras Legais para Carona (Art. 86 da Lei Federal nº 14.133/2021):</span>
              <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px]">
                <li><strong>Limite Individual (§ 4º):</strong> Cada órgão não participante pode aderir a no máximo <strong>50%</strong> do valor registrado na Ata.</li>
                <li><strong>Teto Global (§ 5º):</strong> A soma de todas as caronas concedidas não pode ultrapassar o <strong>dobro (2x / 200%)</strong> do valor da Ata.</li>
              </ul>
            </div>
          </div>

          {/* Cards de Saldo para Carona por Ata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {atas.map((ata) => {
              const valorOriginal = ata.valorGlobalOriginal || 0;
              const tetoGlobal200 = valorOriginal * 2.0;
              const adesoesAta = adesoes.filter((ad) => ad.ataId === ata.id && ad.statusAprovacao === 'AUTORIZADA');
              const totalAdesoesAta = adesoesAta.reduce((acc, ad) => acc + ad.valorAdesao, 0);
              const saldoGlobalCarona = Math.max(0, tetoGlobal200 - totalAdesoesAta);
              const percConsumidoGlobal = Math.round((totalAdesoesAta / tetoGlobal200) * 100);

              return (
                <div key={ata.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-slate-800">
                        Ata nº {ata.numeroAta}/{ata.ano}
                      </span>
                      <span className="text-[11px] text-slate-400 block">{ata.fornecedor?.razaoSocial}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                      Original: {valorOriginal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Teto Global de Carona (2x / 200%):</span>
                      <span className="font-bold text-slate-800">
                        {tetoGlobal200.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${
                          percConsumidoGlobal > 80 ? 'bg-rose-500' : percConsumidoGlobal > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percConsumidoGlobal}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                      <span>Consumido: {totalAdesoesAta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({percConsumidoGlobal}%)</span>
                      <span className="text-emerald-700 font-bold">Saldo Carona: {saldoGlobalCarona.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 font-medium">
                      Limite Máximo por Órgão (50%): <strong>{(valorOriginal * 0.5).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                    </span>
                    <button
                      onClick={() => handleOpenCaronaModal(ata.id)}
                      className="text-amber-700 hover:text-amber-800 font-bold hover:underline cursor-pointer"
                    >
                      + Autorizar Adesão
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabela de Adesões Concedidas */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Adesões e Caronas Autorizadas pela UERN:
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Órgão Requisitante</th>
                    <th className="py-3 px-4">Ata / Fornecedor</th>
                    <th className="py-3 px-4">Processo SEI</th>
                    <th className="py-3 px-4 text-right">Valor Aderido</th>
                    <th className="py-3 px-4 text-center">% da Ata</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Data</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {adesoes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        Nenhuma carona solicitada ou autorizada.
                      </td>
                    </tr>
                  ) : (
                    adesoes.map((ad) => (
                      <tr key={ad.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {ad.orgaoRequisitante}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block">
                            Ata nº {ad.ata?.numeroAta}/{ad.ata?.ano}
                          </span>
                          <span className="text-[11px] text-slate-400 block">{ad.ata?.fornecedor?.razaoSocial}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                          {ad.processoSeiAdesao}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                          {ad.valorAdesao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {ad.percentualAdesao}% (limite 50%)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            ad.statusAprovacao === 'AUTORIZADA'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {ad.statusAprovacao}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-[11px] text-slate-500">
                          {ad.dataAprovacao ? new Date(ad.dataAprovacao).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {currentUser?.isAdmin && (
                            <button
                              onClick={() => handleDeleteAdesao(ad)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                              title="Excluir Adesão de Carona (Admin)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir</span>
                            </button>
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

      {/* MODAL 1: CADASTRAR NOVA ATA (ARP) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-800 text-base mb-1">Cadastrar Nova Ata de Registro de Preços (ARP)</h3>
            <p className="text-xs text-slate-500 mb-4">
              Cadastro oficial da Ata licitatória, vigência, índice de reajuste e relação de itens com saldos.
            </p>

            <form onSubmit={handleCreateAta} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Número da Ata *</label>
                  <input
                    type="text"
                    required
                    value={form.numeroAta}
                    onChange={(e) => setForm({ ...form, numeroAta: e.target.value })}
                    placeholder="Ex: 01"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ano *</label>
                  <input
                    type="number"
                    required
                    value={form.ano}
                    onChange={(e) => setForm({ ...form, ano: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Processo SEI da Licitação *</label>
                  <input
                    type="text"
                    required
                    value={form.processoSei}
                    onChange={(e) => setForm({ ...form, processoSei: e.target.value })}
                    placeholder="04410022.000911/2026-29"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fornecedor Beneficiário *</label>
                  <select
                    required
                    value={form.fornecedorId}
                    onChange={(e) => setForm({ ...form, fornecedorId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                  >
                    <option value="">Selecione o fornecedor...</option>
                    {fornecedores.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.razaoSocial} (CNPJ: {f.cnpj})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Início da Vigência *</label>
                  <input
                    type="date"
                    required
                    value={form.vigenciaInicio}
                    onChange={(e) => setForm({ ...form, vigenciaInicio: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fim da Vigência *</label>
                  <input
                    type="date"
                    required
                    value={form.vigenciaFim}
                    onChange={(e) => setForm({ ...form, vigenciaFim: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Índice de Reajuste *</label>
                  <select
                    value={form.indiceReajuste}
                    onChange={(e) => setForm({ ...form, indiceReajuste: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                  >
                    <option value="IPCA">IPCA (IBGE)</option>
                    <option value="INPC">INPC</option>
                    <option value="IGP-M">IGP-M</option>
                    <option value="SETORIAL">Índice Setorial</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Valor Global Registrado (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.valorGlobal}
                  onChange={(e) => setForm({ ...form, valorGlobal: e.target.value })}
                  placeholder="0,00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Objeto da Ata *</label>
                <textarea
                  rows={2}
                  required
                  value={form.objeto}
                  onChange={(e) => setForm({ ...form, objeto: e.target.value })}
                  placeholder="Descrição do objeto da ata de registro de preços..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                />
              </div>

              {/* Itens */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-700 text-xs uppercase">Itens da Ata:</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-blue-700 hover:underline font-semibold cursor-pointer"
                  >
                    + Adicionar Item
                  </button>
                </div>

                <div className="space-y-2">
                  {itens.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-6 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                      <div className="col-span-2">
                        <input
                          type="text"
                          required
                          placeholder="Descrição do item"
                          value={it.descricao}
                          onChange={(e) => handleItemChange(idx, 'descricao', e.target.value)}
                          className="w-full p-1.5 border border-slate-200 rounded bg-white text-xs"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Marca/Mod."
                          value={it.marcaModelo}
                          onChange={(e) => handleItemChange(idx, 'marcaModelo', e.target.value)}
                          className="w-full p-1.5 border border-slate-200 rounded bg-white text-xs"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Qtd."
                          value={it.quantidade}
                          onChange={(e) => handleItemChange(idx, 'quantidade', e.target.value)}
                          className="w-full p-1.5 border border-slate-200 rounded bg-white text-xs"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Valor Unit."
                          value={it.valorUnitario}
                          onChange={(e) => handleItemChange(idx, 'valorUnitario', e.target.value)}
                          className="w-full p-1.5 border border-slate-200 rounded bg-white text-xs"
                        />
                      </div>
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={itens.length === 1}
                          className="text-slate-400 hover:text-red-600 disabled:opacity-20 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003366] text-white text-xs font-semibold rounded-lg hover:bg-[#002244] cursor-pointer"
                >
                  Salvar Ata e Itens
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR ATA DE REGISTRO DE PREÇOS */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Editar Ata de Registro de Preços</h3>
                  <p className="text-xs text-slate-500">
                    Retifique os dados cadastrais, vigência, valores e saldos de itens registrados.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Número da Ata *</label>
                  <input
                    type="text"
                    required
                    value={editForm.numeroAta}
                    onChange={(e) => setEditForm({ ...editForm, numeroAta: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ano *</label>
                  <input
                    type="number"
                    required
                    value={editForm.ano}
                    onChange={(e) => setEditForm({ ...editForm, ano: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Processo SEI da Licitação *</label>
                  <input
                    type="text"
                    required
                    value={editForm.processoSei}
                    onChange={(e) => setEditForm({ ...editForm, processoSei: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fornecedor Beneficiário *</label>
                  <select
                    required
                    value={editForm.fornecedorId}
                    onChange={(e) => setEditForm({ ...editForm, fornecedorId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                  >
                    <option value="">Selecione o fornecedor...</option>
                    {fornecedores.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.razaoSocial} (CNPJ: {f.cnpj})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Início da Vigência *</label>
                  <input
                    type="date"
                    required
                    value={editForm.vigenciaInicio}
                    onChange={(e) => setEditForm({ ...editForm, vigenciaInicio: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fim da Vigência *</label>
                  <input
                    type="date"
                    required
                    value={editForm.vigenciaFim}
                    onChange={(e) => setEditForm({ ...editForm, vigenciaFim: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status da Ata</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                  >
                    <option value="VIGENTE">Vigente</option>
                    <option value="CANCELADA">Cancelada</option>
                    <option value="ENCERRADA">Encerrada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Valor Global Atualizado (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editForm.valorGlobal}
                  onChange={(e) => setEditForm({ ...editForm, valorGlobal: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-bold text-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Objeto da Ata *</label>
                <textarea
                  required
                  rows={2}
                  value={editForm.objeto}
                  onChange={(e) => setEditForm({ ...editForm, objeto: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 resize-none"
                />
              </div>

              {/* Tabela de Itens Editáveis */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Itens e Saldos Registrados</span>
                  <button
                    type="button"
                    onClick={handleAddEditItem}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-1.5 text-[10px] font-bold text-slate-500 uppercase px-1">
                    <span className="col-span-1">Item</span>
                    <span className="col-span-4">Descrição</span>
                    <span className="col-span-2">Marca/Mod.</span>
                    <span className="col-span-2">Qtd Reg / Saldo</span>
                    <span className="col-span-2">Vlr Unit (R$)</span>
                    <span className="col-span-1 text-center">Excluir</span>
                  </div>

                  {editItens.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                      <div className="col-span-1 text-center font-bold text-xs text-slate-700">
                        {it.numeroItem}
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          required
                          placeholder="Descrição do item"
                          value={it.descricao}
                          onChange={(e) => handleEditItemChange(idx, 'descricao', e.target.value)}
                          className="w-full p-1.5 border border-slate-200 rounded bg-white text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="Marca/Mod."
                          value={it.marcaModelo}
                          onChange={(e) => handleEditItemChange(idx, 'marcaModelo', e.target.value)}
                          className="w-full p-1.5 border border-slate-200 rounded bg-white text-xs"
                        />
                      </div>
                      <div className="col-span-2 flex space-x-1">
                        <input
                          type="number"
                          placeholder="Reg."
                          title="Quantidade Registrada"
                          value={it.quantidadeRegistrada}
                          onChange={(e) => handleEditItemChange(idx, 'quantidadeRegistrada', e.target.value)}
                          className="w-1/2 p-1.5 border border-slate-200 rounded bg-white text-xs"
                        />
                        <input
                          type="number"
                          placeholder="Saldo"
                          title="Quantidade Saldo"
                          value={it.quantidadeSaldo}
                          onChange={(e) => handleEditItemChange(idx, 'quantidadeSaldo', e.target.value)}
                          className="w-1/2 p-1.5 border border-slate-200 rounded bg-white text-xs font-bold text-blue-700"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Valor Unit."
                          value={it.valorUnitario}
                          onChange={(e) => handleEditItemChange(idx, 'valorUnitario', e.target.value)}
                          className="w-full p-1.5 border border-slate-200 rounded bg-white text-xs"
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveEditItem(idx)}
                          disabled={editItens.length === 1}
                          className="text-slate-400 hover:text-red-600 disabled:opacity-20 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEdicao}
                  className="px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {salvandoEdicao ? 'Salvando Alterações...' : 'Salvar Alterações da Ata'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REAJUSTE DA ATA DE REGISTRO DE PREÇOS */}
      {showReajusteModal && reajusteAta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-2 mb-4">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Aplicar Reajuste Contratual (ARP)</h3>
                <p className="text-xs text-slate-500">
                  Ata nº {reajusteAta.numeroAta}/{reajusteAta.ano} - {reajusteAta.fornecedor?.razaoSocial}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveReajuste} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Valor Atual Registrado:</span>
                  <span className="font-bold text-slate-800">
                    {(reajusteAta.valorGlobalAtual || reajusteAta.valorGlobalOriginal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Itens a atualizar:</span>
                  <span className="font-semibold text-slate-700">{reajusteAta.itens?.length || 0} itens</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Índice Oficial *</label>
                <select
                  value={reajusteForm.indiceReajuste}
                  onChange={(e) => setReajusteForm({ ...reajusteForm, indiceReajuste: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                >
                  <option value="IPCA">IPCA (IBGE)</option>
                  <option value="INPC">INPC (IBGE)</option>
                  <option value="IGP-M">IGP-M (FGV)</option>
                  <option value="SETORIAL">Índice Setorial Especial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Percentual de Reajuste (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ex: 4.62"
                  value={reajusteForm.percentualReajuste}
                  onChange={(e) => setReajusteForm({ ...reajusteForm, percentualReajuste: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-bold text-emerald-800"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  O percentual será aplicado em cascata no valor unitário de todos os itens e no valor global da Ata.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Data de Aplicação do Reajuste *</label>
                <input
                  type="date"
                  required
                  value={reajusteForm.dataReajuste}
                  onChange={(e) => setReajusteForm({ ...reajusteForm, dataReajuste: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReajusteModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoReajuste}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {salvandoReajuste ? 'Aplicando...' : 'Confirmar Reajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: EMITIR AUTORIZAÇÃO PARA EXECUÇÃO DE ATA (AEA) */}
      {showAeaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-4">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Emitir Autorização de Execução de Ata (AEA)</h3>
                <p className="text-xs text-slate-500">
                  Liberação de fornecimento com dedução automática no saldo de itens da Ata.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveAea} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ata de Registro de Preços *</label>
                  <select
                    required
                    value={aeaForm.ataId}
                    onChange={(e) => handleAeaAtaChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                  >
                    <option value="">Selecione a Ata...</option>
                    {atas.map((a) => (
                      <option key={a.id} value={a.id}>
                        Ata nº {a.numeroAta}/{a.ano} - {a.fornecedor?.razaoSocial}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Processo SEI do Pedido *</label>
                  <input
                    type="text"
                    required
                    placeholder="04410022.000123/2026-11"
                    value={aeaForm.processoSei}
                    onChange={(e) => setAeaForm({ ...aeaForm, processoSei: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Órgão / Campus Requisitante *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Campus Central Mossoró - DAF / Reitoria"
                    value={aeaForm.orgaoRequisitante}
                    onChange={(e) => setAeaForm({ ...aeaForm, orgaoRequisitante: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nº da Autorização (opcional)</label>
                  <input
                    type="text"
                    placeholder="Gerado automaticamente se em branco"
                    value={aeaForm.numeroAutorizacao}
                    onChange={(e) => setAeaForm({ ...aeaForm, numeroAutorizacao: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição / Finalidade da Demanda *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Justificativa e destinação dos materiais/serviços a serem fornecidos..."
                  value={aeaForm.descricao}
                  onChange={(e) => setAeaForm({ ...aeaForm, descricao: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 resize-none"
                />
              </div>

              {/* Tabela de Itens e Dedução de Saldo */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">Selecione as Quantidades dos Itens a Autorizar</span>
                  <span className="text-[11px] text-blue-800 font-bold">
                    Total: {aeaItensDeducao.reduce((acc, it) => acc + (parseFloat(it.quantidadeAutorizada || '0') * it.valorUnitario), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                {aeaItensDeducao.length === 0 ? (
                  <div className="text-xs text-slate-400 py-3 text-center">Nenhum item disponível na ata selecionada.</div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase px-2">
                      <span className="col-span-1">Item</span>
                      <span className="col-span-5">Descrição</span>
                      <span className="col-span-2 text-right">Saldo Disp.</span>
                      <span className="col-span-2 text-right">Valor Unit.</span>
                      <span className="col-span-2 text-right">Qtd. a Autorizar</span>
                    </div>

                    {aeaItensDeducao.map((it, idx) => (
                      <div key={it.itemId} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-xl border border-slate-200 text-xs">
                        <span className="col-span-1 font-bold text-slate-700 text-center">{it.numeroItem}</span>
                        <span className="col-span-5 text-slate-800 truncate" title={it.descricao}>{it.descricao}</span>
                        <span className="col-span-2 text-right font-bold text-blue-700">{it.quantidadeSaldo} {it.unidade}</span>
                        <span className="col-span-2 text-right font-mono">{it.valorUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="0"
                            max={it.quantidadeSaldo}
                            value={it.quantidadeAutorizada}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updated = [...aeaItensDeducao];
                              updated[idx].quantidadeAutorizada = val;
                              setAeaItensDeducao(updated);
                            }}
                            className="w-full p-1 border border-slate-200 rounded text-right font-bold text-indigo-700 text-xs focus:border-indigo-600 outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAeaModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoAea}
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {salvandoAea ? 'Emitindo...' : 'Emitir Autorização de Execução'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: REGISTRAR AUTORIZAÇÃO DE CARONA (ADESÃO) */}
      {showCaronaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-4">
              <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Autorizar Carona de Ata (Lei 14.133)</h3>
                <p className="text-xs text-slate-500">
                  Adesão de órgão não participante com controle de teto de 50% e limite global de 2x.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveCarona} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ata de Registro de Preços *</label>
                <select
                  required
                  value={caronaForm.ataId}
                  onChange={(e) => setCaronaForm({ ...caronaForm, ataId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                >
                  <option value="">Selecione a Ata...</option>
                  {atas.map((a) => (
                    <option key={a.id} value={a.id}>
                      Ata nº {a.numeroAta}/{a.ano} - {a.fornecedor?.razaoSocial}
                    </option>
                  ))}
                </select>
              </div>

              {caronaForm.ataId && (() => {
                const ataSel = atas.find((a) => a.id === caronaForm.ataId);
                if (!ataSel) return null;
                const vOrig = ataSel.valorGlobalOriginal || 0;
                const teto50 = vOrig * 0.5;
                const teto200 = vOrig * 2.0;
                const adesoesExistentes = adesoes.filter((ad) => ad.ataId === ataSel.id && ad.statusAprovacao === 'AUTORIZADA').reduce((acc, ad) => acc + ad.valorAdesao, 0);
                const saldoGlobal = Math.max(0, teto200 - adesoesExistentes);

                return (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Limite Individual Permitido (50%):</span>
                      <span className="font-bold text-amber-900">{teto50.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Saldo Global para Novas Caronas:</span>
                      <span className="font-bold text-emerald-800">{saldoGlobal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Órgão Não-Participante Solicitante *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Prefeitura Municipal de Mossoró, IFRN, etc."
                  value={caronaForm.orgaoRequisitante}
                  onChange={(e) => setCaronaForm({ ...caronaForm, orgaoRequisitante: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Processo SEI da Adesão *</label>
                <input
                  type="text"
                  required
                  placeholder="04410022.000456/2026-88"
                  value={caronaForm.processoSeiAdesao}
                  onChange={(e) => setCaronaForm({ ...caronaForm, processoSeiAdesao: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Valor Solicitado na Adesão (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={caronaForm.valorAdesao}
                  onChange={(e) => setCaronaForm({ ...caronaForm, valorAdesao: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-bold text-amber-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Justificativa / Parecer do Gestor de Ata</label>
                <textarea
                  rows={2}
                  placeholder="Manifestação do gestor acerca da capacidade do fornecedor e vantajosidade..."
                  value={caronaForm.justificativa}
                  onChange={(e) => setCaronaForm({ ...caronaForm, justificativa: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCaronaModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoCarona}
                  className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {salvandoCarona ? 'Autorizando...' : 'Autorizar Carona (Adesão)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: VISUALIZAR / IMPRIMIR TERMO DE AUTORIZAÇÃO DE EXECUÇÃO DE ATA (AEA) */}
      {selectedTermoAea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:p-0">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-8 max-h-[95vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:m-0">
            {/* Header do Termo */}
            <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - UERN
              </h2>
              <h3 className="text-xs font-bold text-slate-700 uppercase">
                PRÓ-REITORIA DE ADMINISTRAÇÃO - PROAD
              </h3>
              <p className="text-[10px] text-slate-500 uppercase mt-0.5">
                SISTEMA DE GESTÃO DE CONTRATOS & ATAS DE REGISTRO DE PREÇOS
              </p>
              <div className="mt-4 inline-block bg-slate-100 px-4 py-1.5 rounded-full border border-slate-300">
                <span className="text-xs font-black text-slate-900 tracking-wider">
                  AUTORIZAÇÃO DE EXECUÇÃO DE ATA Nº {selectedTermoAea.numeroAutorizacao}
                </span>
              </div>
            </div>

            {/* Conteúdo do Termo */}
            <div className="space-y-4 text-xs text-slate-800 leading-relaxed">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Ata de Registro de Preço:</span>
                  <span className="font-bold">Ata nº {selectedTermoAea.ata?.numeroAta}/{selectedTermoAea.ata?.ano}</span>
                  <span className="text-[11px] text-slate-600 block">Processo SEI: {selectedTermoAea.ata?.processoSei}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Fornecedor Beneficiário:</span>
                  <span className="font-bold">{selectedTermoAea.ata?.fornecedor?.razaoSocial}</span>
                  <span className="text-[11px] text-slate-600 block">CNPJ: {selectedTermoAea.ata?.fornecedor?.cnpj}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Órgão Requisitante / Destino:</span>
                  <span className="font-bold text-slate-900">{selectedTermoAea.orgaoRequisitante}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Processo SEI da Demanda:</span>
                  <span className="font-mono font-bold text-blue-900">{selectedTermoAea.processoSei}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Descrição / Finalidade da Demanda:</span>
                <p className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {selectedTermoAea.descricao}
                </p>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-emerald-800 font-bold uppercase block">Valor Total da Autorização:</span>
                  <span className="text-xl font-black text-emerald-900">
                    {selectedTermoAea.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="text-right text-[11px] text-emerald-700 font-semibold">
                  Status: {selectedTermoAea.status}<br />
                  Data: {new Date(selectedTermoAea.dataAutorizacao).toLocaleDateString('pt-BR')}
                </div>
              </div>

              <div className="pt-8 text-center space-y-8">
                <div className="border-t border-slate-300 pt-2 max-w-xs mx-auto">
                  <span className="font-bold text-slate-900 block">{currentUser?.nome || 'Gestor de Ata de Registro de Preço'}</span>
                  <span className="text-[10px] text-slate-500 block">
                    Gestor de Ata de Registro de Preço - UERN<br />
                    Matrícula: {currentUser?.matricula || '-'}
                  </span>
                </div>

                <div className="text-[10px] text-slate-400">
                  Documento emitido eletronicamente pelo SGC - UERN nos termos da Lei Federal nº 14.133/2021 e da IN nº 01/2026-PROAD.
                </div>
              </div>
            </div>

            {/* Ações de Fechar e Imprimir */}
            <div className="flex justify-end space-x-2 pt-6 border-t border-slate-100 mt-6 print:hidden">
              <button
                type="button"
                onClick={() => setSelectedTermoAea(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center space-x-2 px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / Salvar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
