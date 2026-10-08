'use client';

import React, { useState, useEffect } from 'react';
import {
  PiggyBank,
  DollarSign,
  Calculator,
  FileText,
  Printer,
  Download,
  AlertCircle,
  Building,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Edit3,
  X,
  Users,
  MapPin
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import OficioLiberacaoModal from '@/components/conta-vinculada/OficioLiberacaoModal';
import OficioCadastroModal from '@/components/conta-vinculada/OficioCadastroModal';

export default function ContaVinculadaPage() {
  const [contratos, setContratos] = useState<any[]>([]);
  const [selectedContratoId, setSelectedContratoId] = useState('');
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [saldosPorRubrica, setSaldosPorRubrica] = useState<Record<string, number>>({});
  const [saldoTotal, setSaldoTotal] = useState(0);
  const [trabalhadores, setTrabalhadores] = useState<any[]>([]);
  const [saldosPorTrabalhador, setSaldosPorTrabalhador] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'extrato' | 'trabalhadores'>('extrato');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modals
  const [showRetencaoModal, setShowRetencaoModal] = useState(false);
  const [showLiberacaoModal, setShowLiberacaoModal] = useState(false);
  const [showOficioModal, setShowOficioModal] = useState(false);
  const [showOficioCadastroModal, setShowOficioCadastroModal] = useState(false);

  // Estados de Edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMovimentacaoId, setEditingMovimentacaoId] = useState<string | null>(null);
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    competenciaMesAno: '',
    tipoOperacao: 'RETENCAO_ENTRADA',
    rubrica: 'FERIAS_8_33',
    valor: '0',
    numeroOficio: '',
    motivoLiberacao: '',
  });

  const handleOpenEdit = (m: any) => {
    setEditingMovimentacaoId(m.id);
    setEditForm({
      competenciaMesAno: m.competenciaMesAno || '',
      tipoOperacao: m.tipoOperacao || 'RETENCAO_ENTRADA',
      rubrica: m.rubrica || 'FERIAS_8_33',
      valor: String(m.valor || 0),
      numeroOficio: m.numeroOficio || '',
      motivoLiberacao: m.motivoLiberacao || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovimentacaoId) return;
    setSalvandoEdit(true);
    try {
      const res = await fetch('/api/conta-vinculada', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMovimentacaoId,
          ...editForm,
        }),
      });
      if (res.ok) {
        setShowEditModal(false);
        setEditingMovimentacaoId(null);
        if (selectedContratoId) {
          carregarMovimentacoes(selectedContratoId);
        }
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao editar movimentação');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de conexão');
    } finally {
      setSalvandoEdit(false);
    }
  };

  // Form Retenção Automática
  const [competencia, setCompetencia] = useState('03/2026');

  // Form Liberação Manual & Ofício
  const [liberacaoForm, setLiberacaoForm] = useState({
    rubrica: 'FERIAS_8_33',
    valor: '',
    numeroOficio: 'OFÍCIO-PROAD/012/2026',
    motivoLiberacao: 'Férias gozadas no período de 01/02 a 02/03',
    instituicaoBancaria: 'Banco do Brasil S.A. - Agência Setor Público',
  });

  const carregarContratos = async () => {
    try {
      const [resC, resUser] = await Promise.all([
        fetch('/api/contratos'),
        fetch('/api/auth/me'),
      ]);
      const data = await resC.json();
      const dataUser = await resUser.json();
      if (dataUser.user) setCurrentUser(dataUser.user);
      if (data.contratos) {
        // Filtrar preferencialmente contratos de terceirização
        setContratos(data.contratos);
        if (data.contratos.length > 0) {
          setSelectedContratoId(data.contratos[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const carregarMovimentacoes = async (cId: string) => {
    if (!cId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/conta-vinculada?contratoId=${cId}`);
      const data = await res.json();
      if (data.movimentacoes) {
        setMovimentacoes(data.movimentacoes);
        setSaldosPorRubrica(data.saldosPorRubrica || {});
        setSaldoTotal(data.saldoTotal || 0);
        setTrabalhadores(data.trabalhadores || []);
        setSaldosPorTrabalhador(data.saldosPorTrabalhador || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarContratos();
  }, []);

  useEffect(() => {
    if (selectedContratoId) {
      carregarMovimentacoes(selectedContratoId);
    }
  }, [selectedContratoId]);

  const handleProcessarRetencaoAutomatica = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/conta-vinculada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contratoId: selectedContratoId,
          competenciaMesAno: competencia,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowRetencaoModal(false);
        carregarMovimentacoes(selectedContratoId);
      } else {
        alert(data.error || 'Falha ao processar retenção.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleProcessarLiberacao = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/conta-vinculada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contratoId: selectedContratoId,
          tipoOperacao: 'LIBERACAO_SAIDA',
          rubrica: liberacaoForm.rubrica,
          valor: liberacaoForm.valor,
          numeroOficio: liberacaoForm.numeroOficio,
          motivoLiberacao: liberacaoForm.motivoLiberacao,
        }),
      });
      if (res.ok) {
        setShowLiberacaoModal(false);
        carregarMovimentacoes(selectedContratoId);
        // Gerar Ofício Bancário em PDF imediatamente
        gerarOficioBancarioPdf();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const gerarOficioBancarioPdf = () => {
    const contratoSel = contratos.find((c) => c.id === selectedContratoId);
    const doc = new jsPDF();

    // Cabeçalho Oficial
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 51, 102);
    doc.text('UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - UERN', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('PRÓ-REITORIA DE ADMINISTRAÇÃO - PROAD', 105, 26, { align: 'center' });
    doc.text('SETOR DE GESTÃO E FISCALIZAÇÃO DE CONTRATOS', 105, 31, { align: 'center' });

    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.8);
    doc.line(15, 36, 195, 36);

    // Número do Ofício
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`${liberacaoForm.numeroOficio}`, 15, 46);
    doc.text(`Mossoró/RN, ${new Date().toLocaleDateString('pt-BR')}`, 195, 46, { align: 'right' });

    // Destinatário Bancário
    doc.setFont('helvetica', 'bold');
    doc.text(`À Gerência do ${liberacaoForm.instituicaoBancaria}`, 15, 56);
    doc.setFont('helvetica', 'normal');
    doc.text('Assunto: Autorização de Movimentação e Liberação de Recursos - Conta Vinculada', 15, 62);

    // Texto Legal Conforme Lei Estadual 10.841 e Decreto 33.782
    const textoOficio = [
      'Senhor(a) Gerente,',
      '',
      `Com fundamento na Lei Estadual nº 10.841/2021, no Decreto Estadual nº 33.782/2024 e na Instrução Normativa nº 01/2026 - PROAD/UERN, AUTORIZAMOS a liberação e transferência de recursos retidos na Conta Vinculada bloqueada para movimentação, referente ao contrato abaixo caracterizado:`,
      '',
    ];

    doc.text(textoOficio, 15, 72);

    autoTable(doc, {
      startY: 90,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
      head: [['Parâmetro', 'Informação']],
      body: [
        ['Contrato Administrativo', contratoSel ? (contratoSel.numeroContrato || contratoSel.numeroEmpenho) : '-'],
        ['Empresa Titular da Conta', contratoSel ? contratoSel.fornecedor.razaoSocial : '-'],
        ['CNPJ da Empresa', contratoSel ? contratoSel.fornecedor.cnpj : '-'],
        ['Rubrica Autorizada', liberacaoForm.rubrica.replace(/_/g, ' ')],
        ['Valor Autorizado para Saque', parseFloat(liberacaoForm.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
        ['Finalidade Comprovada', liberacaoForm.motivoLiberacao],
      ],
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    doc.setFontSize(9);
    doc.text('Certificamos que a documentação comprobatória do fato gerador que ensejou a presente liberação foi regularmente conferida pela Fiscalização Administrativa e ratificada pelo Gestor do Contrato.', 15, finalY, { maxWidth: 180 });

    // Bloco de Assinatura Eletrônica
    doc.setFont('helvetica', 'bold');
    doc.text('Pró-Reitoria de Administração - PROAD / UERN', 105, finalY + 30, { align: 'center' });
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.text(`Documento assinado eletronicamente com chave de segurança institucional UERN-CV-${Date.now()}`, 105, finalY + 36, { align: 'center' });

    doc.save(`Oficio_Conta_Vinculada_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const getRubricaFormatada = (r: string) => {
    switch (r) {
      case 'FERIAS_8_33':
        return 'Férias (8,33%)';
      case 'TERCO_FERIAS_2_78':
        return '1/3 Constitucional de Férias (2,78%)';
      case 'DECIMO_TERCEIRO_8_33':
        return '13º Salário (8,33%)';
      case 'FGTS_SOBRE_PROVISOES':
        return 'FGTS sobre Provisões (8,00%)';
      case 'MULTA_RESCISORIA_FGTS':
        return 'Multa Rescisória de FGTS (4,00%)';
      default:
        return r;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg md:text-xl">
            <PiggyBank className="w-6 h-6 text-blue-700" />
            <h2>Gestão & Controle de Conta Vinculada</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Caderno de Logística & Lei Estadual nº 10.841/2021 - Retenção de provisões trabalhistas (férias, 13º e multa FGTS).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowOficioCadastroModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-300" />
            <span>Ofício Cadastro & Ficha BB</span>
          </button>

          <button
            onClick={() => setShowOficioModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Emitir Ofício Bancário & Liberar</span>
          </button>

          <button
            onClick={() => setShowRetencaoModal(true)}
            className="inline-flex items-center space-x-2 px-3.5 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer"
          >
            <Calculator className="w-4 h-4" />
            <span>Calcular Retenções do Mês</span>
          </button>
        </div>
      </div>

      {/* Contract Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <Building className="w-5 h-5 text-blue-700 flex-shrink-0" />
          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Contrato Selecionado:</label>
          <select
            value={selectedContratoId}
            onChange={(e) => setSelectedContratoId(e.target.value)}
            className="w-full md:w-96 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
          >
            {contratos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.numeroContrato ? `Contrato nº ${c.numeroContrato}` : `Empenho: ${c.numeroEmpenho}`} - {c.objeto.slice(0, 45)}...
              </option>
            ))}
          </select>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Bloqueado Total</span>
          <span className="text-xl font-extrabold text-emerald-700">
            {saldoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      </div>

      {/* Provisões Rubricas Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Férias (8,33%)</span>
          <span className="text-base font-extrabold text-slate-800 mt-1 block">
            {(saldosPorRubrica['FERIAS_8_33'] || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">1/3 Férias (2,78%)</span>
          <span className="text-base font-extrabold text-slate-800 mt-1 block">
            {(saldosPorRubrica['TERCO_FERIAS_2_78'] || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">13º Salário (8,33%)</span>
          <span className="text-base font-extrabold text-slate-800 mt-1 block">
            {(saldosPorRubrica['DECIMO_TERCEIRO_8_33'] || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">FGTS Provisões (8%)</span>
          <span className="text-base font-extrabold text-slate-800 mt-1 block">
            {(saldosPorRubrica['FGTS_SOBRE_PROVISOES'] || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Multa FGTS (4%)</span>
          <span className="text-base font-extrabold text-slate-800 mt-1 block">
            {(saldosPorRubrica['MULTA_RESCISORIA_FGTS'] || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      </div>

      {/* Abas de Visualização */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('extrato')}
          className={`pb-3 text-xs font-bold transition-colors flex items-center space-x-2 border-b-2 cursor-pointer ${
            activeTab === 'extrato'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Extrato de Movimentações</span>
          <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
            {movimentacoes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('trabalhadores')}
          className={`pb-3 text-xs font-bold transition-colors flex items-center space-x-2 border-b-2 cursor-pointer ${
            activeTab === 'trabalhadores'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Saldos por Funcionário (Controle Individual)</span>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
            {trabalhadores.length} funcionários
          </span>
        </button>
      </div>

      {activeTab === 'extrato' ? (
        /* Extrato de Movimentações */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Extrato Detalhado de Retenções e Liberações:
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {movimentacoes.length} lançamentos registrados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Competência</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Rubrica Provisionada</th>
                  <th className="py-3 px-4">Trabalhador Vinculado</th>
                  <th className="py-3 px-4">Valor (R$)</th>
                  <th className="py-3 px-4">Documento / Ofício</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      Carregando extrato da conta vinculada...
                    </td>
                  </tr>
                ) : movimentacoes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      Nenhuma movimentação registrada para este contrato. Clique em "Calcular Retenções do Mês".
                    </td>
                  </tr>
                ) : (
                  movimentacoes.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{m.competenciaMesAno}</td>
                      <td className="py-2.5 px-4">
                        {m.tipoOperacao === 'RETENCAO_ENTRADA' ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold text-[10px]">
                            <ArrowDownRight className="w-3 h-3 text-emerald-600" />
                            <span>Retenção (+)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-bold text-[10px]">
                            <ArrowUpRight className="w-3 h-3 text-rose-600" />
                            <span>Liberação (-)</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">
                        {getRubricaFormatada(m.rubrica)}
                      </td>
                      <td className="py-2.5 px-4">
                        {m.trabalhador ? (
                          <div>
                            <span className="font-semibold text-slate-800">{m.trabalhador.nomeCompleto}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">{m.trabalhador.cpf}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Rateio Global</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {m.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-2.5 px-4 text-[11px] text-slate-500">
                        {m.numeroOficio || 'Retenção em Fatura'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {currentUser?.isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(m)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                            title="Editar Movimentação"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Lançado</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Aba de Saldos por Funcionário (Controle Individual Exigido) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-700" />
                <span>Controle de Saldos Individuais por Funcionário (Art. 10 da Lei 10.841/2021)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Os valores retidos na Conta Vinculada são discriminados por trabalhador. Ao enviar o ofício ao banco, o débito individual é computado.
              </p>
            </div>

            <button
              onClick={() => setShowOficioModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>Emitir Ofício e Debitar Trabalhadores</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Funcionário</th>
                  <th className="py-3 px-4">Função / Cargo</th>
                  <th className="py-3 px-4">Campus / Local</th>
                  <th className="py-3 px-4 text-right">Salário Base</th>
                  <th className="py-3 px-4 text-right">Total Retido (+)</th>
                  <th className="py-3 px-4 text-right">Total Liberado (-)</th>
                  <th className="py-3 px-4 text-right">Saldo Bloqueado Atual</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      Carregando funcionários do contrato...
                    </td>
                  </tr>
                ) : trabalhadores.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      Nenhum trabalhador cadastrado para este contrato. Cadastre trabalhadores na aba Mão de Obra para habilitar o controle individualizado.
                    </td>
                  </tr>
                ) : (
                  trabalhadores.map((t) => {
                    const saldos = saldosPorTrabalhador[t.id] || { retido: 0, liberado: 0, saldo: 0 };
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{t.nomeCompleto}</div>
                          <div className="text-[10px] text-slate-400 font-mono">CPF: {t.cpf}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {t.funcao || 'Operacional'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center space-x-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-semibold">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{t.localidade || 'Campus Central Mossoró'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                          {(t.salarioBase || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700 font-mono">
                          {saldos.retido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-600 font-mono">
                          {saldos.liberado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-blue-900 font-mono">
                          {saldos.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {t.status === 'ATIVO' ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Ativo</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                              <span>Inativo</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Cálculo de Retenção Automática */}
      {showRetencaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-800 text-base mb-1">Cálculo Mensal de Retenções (Caderno de Logística)</h3>
            <p className="text-xs text-slate-500 mb-4">
              Calcula e lança automaticamente as provisões para todos os trabalhadores ativos com base nas fórmulas oficiais:
              <br />• Férias: 8,33% | 1/3 Férias: 2,78%
              <br />• 13º Salário: 8,33% | FGTS Provisões: 8,00%
              <br />• Multa Rescisória FGTS: 4,00%
            </p>

            <form onSubmit={handleProcessarRetencaoAutomatica} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Competência de Referência (MM/AAAA) *</label>
                <input
                  type="text"
                  required
                  value={competencia}
                  onChange={(e) => setCompetencia(e.target.value)}
                  placeholder="Ex: 03/2026"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono font-bold"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRetencaoModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003366] text-white text-xs font-semibold rounded-lg hover:bg-[#002244]"
                >
                  Executar Cálculos e Retenções
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Liberação de Conta Vinculada & Emissão de Ofício */}
      {showLiberacaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-800 text-base mb-1">Autorizar Liberação & Emitir Ofício Bancário</h3>
            <p className="text-xs text-slate-500 mb-4">
              Registra o resgate de provisão e gera o PDF oficial do ofício para a instituição bancária.
            </p>

            <form onSubmit={handleProcessarLiberacao} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rubrica a Liberar *</label>
                <select
                  value={liberacaoForm.rubrica}
                  onChange={(e) => setLiberacaoForm({ ...liberacaoForm, rubrica: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
                >
                  <option value="FERIAS_8_33">Férias Gozadas</option>
                  <option value="TERCO_FERIAS_2_78">1/3 Constitucional de Férias</option>
                  <option value="DECIMO_TERCEIRO_8_33">13º Salário Efetivamente Pago</option>
                  <option value="MULTA_RESCISORIA_FGTS">Multa Rescisória (Demissão Sem Justa Causa)</option>
                  <option value="FGTS_SOBRE_PROVISOES">FGTS sobre Provisões</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Valor a Liberar (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={liberacaoForm.valor}
                  onChange={(e) => setLiberacaoForm({ ...liberacaoForm, valor: e.target.value })}
                  placeholder="0,00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Número do Ofício *</label>
                  <input
                    type="text"
                    required
                    value={liberacaoForm.numeroOficio}
                    onChange={(e) => setLiberacaoForm({ ...liberacaoForm, numeroOficio: e.target.value })}
                    placeholder="OFÍCIO-PROAD/012/2026"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Banco Depositário *</label>
                  <input
                    type="text"
                    required
                    value={liberacaoForm.instituicaoBancaria}
                    onChange={(e) => setLiberacaoForm({ ...liberacaoForm, instituicaoBancaria: e.target.value })}
                    placeholder="Banco do Brasil S.A."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo / Fato Gerador Comprovado *</label>
                <textarea
                  rows={2}
                  required
                  value={liberacaoForm.motivoLiberacao}
                  onChange={(e) => setLiberacaoForm({ ...liberacaoForm, motivoLiberacao: e.target.value })}
                  placeholder="Comprovação de pagamento de férias referente ao período..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLiberacaoModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003366] text-white text-xs font-semibold rounded-lg hover:bg-[#002244]"
                >
                  Autorizar e Gerar Ofício PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR MOVIMENTAÇÃO DA CONTA VINCULADA */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Editar Movimentação da Conta Vinculada
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ajuste administrativo da retenção/liberação, valores e ofício
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMovimentacaoId(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Competência (Mês/Ano)
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.competenciaMesAno}
                    onChange={(e) => setEditForm({ ...editForm, competenciaMesAno: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                    placeholder="Ex: 03/2026"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Tipo de Operação
                  </label>
                  <select
                    value={editForm.tipoOperacao}
                    onChange={(e) => setEditForm({ ...editForm, tipoOperacao: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 font-semibold"
                  >
                    <option value="RETENCAO_ENTRADA">Retenção (+)</option>
                    <option value="LIBERACAO_SAIDA">Liberação (-)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Rubrica Provisionada
                  </label>
                  <select
                    value={editForm.rubrica}
                    onChange={(e) => setEditForm({ ...editForm, rubrica: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  >
                    <option value="FERIAS_8_33">Férias (8,33%)</option>
                    <option value="TERCO_FERIAS_2_78">1/3 Constitucional de Férias (2,78%)</option>
                    <option value="DECIMO_TERCEIRO_8_33">13º Salário (8,33%)</option>
                    <option value="FGTS_SOBRE_PROVISOES">FGTS sobre Provisões (8%)</option>
                    <option value="MULTA_RESCISORIA_FGTS">Multa Rescisória FGTS (4%)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Valor da Movimentação (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editForm.valor}
                    onChange={(e) => setEditForm({ ...editForm, valor: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Número do Documento / Ofício
                </label>
                <input
                  type="text"
                  value={editForm.numeroOficio}
                  onChange={(e) => setEditForm({ ...editForm, numeroOficio: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  placeholder="Ex: OFÍCIO-PROAD/012/2026"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Motivo da Liberação / Observação
                </label>
                <textarea
                  rows={2}
                  value={editForm.motivoLiberacao}
                  onChange={(e) => setEditForm({ ...editForm, motivoLiberacao: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  placeholder="Ex: Férias gozadas no período..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingMovimentacaoId(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEdit}
                  className="px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
                >
                  {salvandoEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Emissão de Ofício Bancário com Cálculo Automático e Débito por Funcionário */}
      {showOficioModal && (
        <OficioLiberacaoModal
          contrato={contratos.find((c) => c.id === selectedContratoId)}
          trabalhadores={trabalhadores}
          saldosPorTrabalhador={saldosPorTrabalhador}
          onClose={() => setShowOficioModal(false)}
          onSucesso={() => {
            setShowOficioModal(false);
            if (selectedContratoId) {
              carregarMovimentacoes(selectedContratoId);
            }
          }}
        />
      )}

      {/* Modal Emissão de Ofício de Cadastro de Convênio & Ficha Cadastral BB */}
      {showOficioCadastroModal && (
        <OficioCadastroModal
          contrato={contratos.find((c) => c.id === selectedContratoId)}
          onClose={() => setShowOficioCadastroModal(false)}
        />
      )}
    </div>
  );
}
