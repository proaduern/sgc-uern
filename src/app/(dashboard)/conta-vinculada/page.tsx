'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
  Trash2,
  X,
  Users,
  MapPin,
  Landmark,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  CreditCard,
  PlusCircle,
  Search,
  Filter,
  Check,
  ArrowLeft,
  FileSpreadsheet,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import OficioLiberacaoModal from '@/components/conta-vinculada/OficioLiberacaoModal';
import OficioCadastroModal from '@/components/conta-vinculada/OficioCadastroModal';
import DadosContaVinculadaModal from '@/components/conta-vinculada/DadosContaVinculadaModal';
import EditarRetencaoModal from '@/components/conta-vinculada/EditarRetencaoModal';
import RegistroLiberacaoModal from '@/components/conta-vinculada/RegistroLiberacaoModal';

function ContaVinculadaContent() {
  const searchParams = useSearchParams();
  const queryContratoId = searchParams.get('contratoId');

  const [contratos, setContratos] = useState<any[]>([]);
  const [selectedContratoId, setSelectedContratoId] = useState('');
  const [contratoConfig, setContratoConfig] = useState<any>(null);

  // Dados carregados da API
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [lancamentosMensais, setLancamentosMensais] = useState<any[]>([]);
  const [liberacoes, setLiberacoes] = useState<any[]>([]);
  const [saldosPorRubrica, setSaldosPorRubrica] = useState<Record<string, number>>({});
  const [saldoTotal, setSaldoTotal] = useState(0);
  const [trabalhadores, setTrabalhadores] = useState<any[]>([]);
  const [saldosPorTrabalhador, setSaldosPorTrabalhador] = useState<Record<string, any>>({});

  // Abas de navegação
  const [activeTab, setActiveTab] = useState<'competencias' | 'trabalhadores' | 'liberacoes' | 'extrato'>('competencias');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Filtros
  const [filtroCompetencia, setFiltroCompetencia] = useState<string>('TODAS');
  const [buscaTrabalhador, setBuscaTrabalhador] = useState('');
  const [filtroStatusTrabalhador, setFiltroStatusTrabalhador] = useState<'TODOS' | 'ATIVO' | 'DEMITIDO'>('TODOS');
  const [trabalhadorSelecionadoDetalhe, setTrabalhadorSelecionadoDetalhe] = useState<any | null>(null);

  // Modals
  const [showDadosBancariosModal, setShowDadosBancariosModal] = useState(false);
  const [showRegistroLiberacaoModal, setShowRegistroLiberacaoModal] = useState(false);
  const [showOficioModal, setShowOficioModal] = useState(false);
  const [showOficioCadastroModal, setShowOficioCadastroModal] = useState(false);
  const [showRetencaoAutomaticaModal, setShowRetencaoAutomaticaModal] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState<any | null>(null);

  // Competência form para retenção automática
  const [competenciaAutomatica, setCompetenciaAutomatica] = useState('09/2026');

  const carregarContratos = async () => {
    try {
      const [resC, resUser] = await Promise.all([fetch('/api/contratos'), fetch('/api/auth/me')]);
      const data = await resC.json();
      const dataUser = await resUser.json();
      if (dataUser.user) setCurrentUser(dataUser.user);
      if (data.contratos && data.contratos.length > 0) {
        setContratos(data.contratos);
        if (queryContratoId && data.contratos.some((c: any) => c.id === queryContratoId)) {
          setSelectedContratoId(queryContratoId);
        } else {
          // Priorizar contrato de terceirização / dedicação exclusiva (ex: 035/2025)
          const ctrPcd = data.contratos.find((c: any) => c.numeroContrato?.includes('035/2025'));
          setSelectedContratoId(ctrPcd ? ctrPcd.id : data.contratos[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const carregarDadosContaVinculada = async (cId: string) => {
    if (!cId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/conta-vinculada?contratoId=${cId}`);
      const data = await res.json();
      if (data) {
        setMovimentacoes(data.movimentacoes || []);
        setLancamentosMensais(data.lancamentosMensais || []);
        setLiberacoes(data.liberacoes || []);
        setSaldosPorRubrica(data.saldosPorRubrica || {});
        setSaldoTotal(data.saldoTotal || 0);
        setTrabalhadores(data.trabalhadores || []);
        setSaldosPorTrabalhador(data.saldosPorTrabalhador || {});
        setContratoConfig(data.contratoConfig || null);

        // Se houver competências e o filtro estiver vazio, sugerir a última
        const comps = Array.from(new Set((data.lancamentosMensais || []).map((l: any) => l.competenciaMesAno)));
        if (comps.length > 0 && filtroCompetencia === 'TODAS') {
          setFiltroCompetencia(comps[0] as string);
        }
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
      carregarDadosContaVinculada(selectedContratoId);
      setTrabalhadorSelecionadoDetalhe(null);
    }
  }, [selectedContratoId]);

  // Lista única e ordenada de competências encontradas
  const listaCompetencias = useMemo(() => {
    const setC = new Set<string>();
    lancamentosMensais.forEach((l) => {
      if (l.competenciaMesAno) setC.add(l.competenciaMesAno);
    });
    return Array.from(setC).sort().reverse();
  }, [lancamentosMensais]);

  // Lançamentos filtrados por competência
  const lancamentosFiltrados = useMemo(() => {
    return lancamentosMensais.filter((l) => {
      const matchComp = filtroCompetencia === 'TODAS' || l.competenciaMesAno === filtroCompetencia;
      const matchBusca =
        !buscaTrabalhador.trim() ||
        l.trabalhadorNome.toLowerCase().includes(buscaTrabalhador.toLowerCase()) ||
        l.trabalhadorCpf.includes(buscaTrabalhador);
      return matchComp && matchBusca;
    });
  }, [lancamentosMensais, filtroCompetencia, buscaTrabalhador]);

  // Totais da competência selecionada
  const totaisCompetencia = useMemo(() => {
    return lancamentosFiltrados.reduce(
      (acc, l) => {
        acc.postos += 1;
        acc.ferias += l.ferias || 0;
        acc.terco += l.tercoFerias || 0;
        acc.feriasTotal += l.feriasTotal || 0;
        acc.decimo += l.decimoTerceiro || 0;
        acc.fgts += l.multaFgts || 0;
        acc.encargos += l.encargos || 0;
        acc.total += l.total || 0;
        return acc;
      },
      { postos: 0, ferias: 0, terco: 0, feriasTotal: 0, decimo: 0, fgts: 0, encargos: 0, total: 0 }
    );
  }, [lancamentosFiltrados]);

  // Trabalhadores filtrados para a visão de trabalhadores
  const trabalhadoresFiltrados = useMemo(() => {
    return trabalhadores.filter((t) => {
      const matchStatus = filtroStatusTrabalhador === 'TODOS' || t.status === filtroStatusTrabalhador;
      const matchBusca =
        !buscaTrabalhador.trim() ||
        t.nomeCompleto.toLowerCase().includes(buscaTrabalhador.toLowerCase()) ||
        t.cpf.includes(buscaTrabalhador) ||
        (t.campus && t.campus.toLowerCase().includes(buscaTrabalhador.toLowerCase()));
      return matchStatus && matchBusca;
    });
  }, [trabalhadores, filtroStatusTrabalhador, buscaTrabalhador]);

  // Total de Liberações
  const totalLiberadoAcumulado = useMemo(() => {
    return liberacoes.reduce((acc, lib) => acc + (lib.valor || 0), 0);
  }, [liberacoes]);

  // 1. Exportar Relatório da Fatura Mensal em PDF (Layout Oficial UERN)
  const exportarPdfFaturaMensal = (competencia: string) => {
    const doc = new jsPDF('landscape');
    const compLabel = competencia === 'TODAS' ? 'CONSOLIDADO DE TODAS AS FATURAS' : `FATURA DE ${competencia}`;

    // Cabeçalho Institucional
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 51, 102);
    doc.text('UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - UERN', 148, 14, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    doc.text('PRÓ-REITORIA DE ADMINISTRAÇÃO - PROAD • DIRETORIA DE ADMINISTRAÇÃO E SERVIÇOS - DAS', 148, 19, { align: 'center' });
    doc.text(`EXTRATO MENSAL DE RETENÇÕES DE CONTA VINCULADA • ${compLabel}`, 148, 24, { align: 'center' });

    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.5);
    doc.line(14, 27, 283, 27);

    // Dados do Contrato
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    doc.text(
      `Contrato nº: ${contratoConfig?.numeroContrato || '035/2025'} • Contratada: ${contratoConfig?.fornecedor?.razaoSocial || 'LCL FACILITIES LTDA'} (CNPJ: ${contratoConfig?.fornecedor?.cnpj || '-'})`,
      14,
      33
    );
    doc.text(
      `Processo-Mãe: ${contratoConfig?.processoSeiMae || '-'} • Conta Vinculada: ${contratoConfig?.contaVinculadaBanco || 'Banco do Brasil'} Ag: ${contratoConfig?.contaVinculadaAgencia || '-'} C/C: ${contratoConfig?.contaVinculadaNumeroConta || '-'}`,
      14,
      38
    );
    doc.text(`Alíquota Aplicada: ${(contratoConfig?.percentualTotalRetencao ?? 31.77).toFixed(2)}% (IN nº 02/2024 SEAD/RN)`, 283, 33, { align: 'right' });
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 283, 38, { align: 'right' });

    // Tabela dos Trabalhadores
    const rows = lancamentosFiltrados.map((l, idx) => [
      idx + 1,
      l.trabalhadorNome,
      l.trabalhadorCpf,
      l.campus,
      l.salarioBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      l.feriasTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      l.decimoTerceiro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      l.multaFgts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      l.encargos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      l.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      l.numeroOficio || '-',
    ]);

    // Linha de total
    rows.push([
      '',
      `TOTAL DA FATURA (${totaisCompetencia.postos} POSTOS)`,
      '',
      '',
      '',
      totaisCompetencia.feriasTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      totaisCompetencia.decimo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      totaisCompetencia.fgts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      totaisCompetencia.encargos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      totaisCompetencia.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      '',
    ]);

    autoTable(doc, {
      startY: 43,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
      styles: { fontSize: 6.5, cellPadding: 2 },
      head: [['Nº', 'TRABALHADOR', 'CPF', 'CAMPUS', 'SALÁRIO BASE', 'FÉRIAS + 1/3', '13º SALÁRIO', 'MULTA FGTS', 'ENCARGOS 4.1', 'TOTAL RETIDO', 'PROCESSO SEI']],
      body: rows,
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 160;

    // Assinaturas
    if (finalY < 175) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Atesto que as provisões acima foram calculadas e conferidas em conformidade com a folha e a IN nº 02/2024 SEAD/RN.', 14, finalY + 12);

      doc.setDrawColor(120, 120, 120);
      doc.line(40, finalY + 30, 120, finalY + 30);
      doc.text('Fiscal Administrativo do Contrato', 80, finalY + 34, { align: 'center' });

      doc.line(170, finalY + 30, 250, finalY + 30);
      doc.text('Gestor do Contrato / Diretoria DAS', 210, finalY + 34, { align: 'center' });
    }

    doc.save(`Extrato_Fatura_${competencia.replace(/[^a-zA-Z0-9]/g, '_')}_CTR_${contratoConfig?.numeroContrato || '035_2025'}.pdf`);
  };

  // 2. Exportar Ficha Individual do Trabalhador em PDF
  const exportarPdfFichaTrabalhador = (t: any) => {
    const doc = new jsPDF('portrait');
    const saldos = saldosPorTrabalhador[t.id] || { retido: 0, liberado: 0, saldo: 0, porRubrica: {} };
    const lancamentosDoTrabalhador = lancamentosMensais.filter((l) => l.trabalhadorId === t.id);
    const liberacoesDoTrabalhador = liberacoes.filter((lib) => lib.trabalhadorId === t.id);

    // Cabeçalho Institucional
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 51, 102);
    doc.text('UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - UERN', 105, 14, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    doc.text('PRÓ-REITORIA DE ADMINISTRAÇÃO - PROAD • DIRETORIA DE ADMINISTRAÇÃO E SERVIÇOS - DAS', 105, 19, { align: 'center' });
    doc.text('FICHA FINANCEIRA INDIVIDUAL • CONTA VINCULADA DE PROVISÕES TRABALHISTAS', 105, 24, { align: 'center' });

    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.5);
    doc.line(14, 27, 196, 27);

    // Dados do Trabalhador
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text(`Nome: ${t.nomeCompleto}`, 14, 34);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`CPF: ${t.cpf} • Cargo: ${t.funcao || 'Técnico em Assuntos Educacionais'} • Lotação: ${t.campus || 'Campus Central'}`, 14, 39);
    doc.text(
      `Dados Bancários: ${t.banco || '-'} | Agência: ${t.agencia || '-'} | Conta: ${t.contaCorrente || '-'} | Status: ${t.status || 'ATIVO'}`,
      14,
      44
    );
    if (t.dataAdmissao) {
      doc.text(
        `Data Admissão: ${new Date(t.dataAdmissao).toLocaleDateString('pt-BR')}${t.dataDemissao ? ` • Demissão: ${new Date(t.dataDemissao).toLocaleDateString('pt-BR')}` : ''}`,
        14,
        49
      );
    }
    doc.text(
      `Contrato nº ${contratoConfig?.numeroContrato || '035/2025'} • Contratada: ${contratoConfig?.fornecedor?.razaoSocial || 'LCL Facilities'}`,
      14,
      54
    );

    // Resumo de Saldos
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, 58, 182, 16, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 51, 102);
    doc.text(`Total Retido (+): ${saldos.retido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 20, 68);
    doc.setTextColor(180, 30, 30);
    doc.text(`Total Liberado (-): ${saldos.liberado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 85, 68);
    doc.setTextColor(16, 120, 60);
    doc.text(`Saldo Bloqueado: ${saldos.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 145, 68);

    // Tabela de Retenções
    const retRows = lancamentosDoTrabalhador.map((l) => [
      l.competenciaMesAno,
      l.salarioBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      l.feriasTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      l.decimoTerceiro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      l.multaFgts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      l.encargos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      l.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      l.numeroOficio || '-',
    ]);

    autoTable(doc, {
      startY: 78,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
      styles: { fontSize: 6.5, cellPadding: 2 },
      head: [['COMPETÊNCIA', 'SALÁRIO', 'FÉRIAS + 1/3', '13º SALÁRIO', 'MULTA FGTS', 'ENCARGOS 4.1', 'TOTAL RETIDO', 'PROCESSO SEI']],
      body: retRows,
    });

    let nextY = (doc as any).lastAutoTable?.finalY || 130;

    // Tabela de Liberações (se houver)
    if (liberacoesDoTrabalhador.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(180, 30, 30);
      doc.text('HISTÓRICO DE SAQUES / LIBERAÇÕES EFETIVADAS (-)', 14, nextY + 8);

      const libRows = liberacoesDoTrabalhador.map((lib) => [
        new Date(lib.data).toLocaleDateString('pt-BR'),
        lib.rubrica.replace(/_/g, ' '),
        lib.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        lib.numeroOficio || '-',
        lib.motivoLiberacao || '-',
      ]);

      autoTable(doc, {
        startY: nextY + 11,
        theme: 'grid',
        headStyles: { fillColor: [180, 30, 30], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
        styles: { fontSize: 6.5, cellPadding: 2 },
        head: [['DATA', 'RUBRICA', 'VALOR LIBERADO', 'OFÍCIO BANCÁRIO', 'MOTIVO / EVENTO']],
        body: libRows,
      });

      nextY = (doc as any).lastAutoTable?.finalY || nextY + 30;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text(`Declaro que as informações acima conferem com os depósitos bancários na Conta Vinculada nº ${contratoConfig?.contaVinculadaNumeroConta || '-'} do Banco do Brasil.`, 14, nextY + 14);

    doc.save(`Ficha_Conta_Vinculada_${t.nomeCompleto.replace(/\s+/g, '_')}.pdf`);
  };

  // Excluir movimentação
  const handleExcluirMovimentacao = async (id: string) => {
    if (!window.confirm('Confirma a exclusão deste lançamento de conta vinculada?')) return;
    try {
      const res = await fetch(`/api/conta-vinculada?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedContratoId) carregarDadosContaVinculada(selectedContratoId);
      } else {
        alert('Erro ao excluir');
      }
    } catch (e: any) {
      alert(e.message || 'Erro');
    }
  };

  // Processar retenção automática do mês
  const handleProcessarRetencaoAutomatica = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/conta-vinculada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contratoId: selectedContratoId,
          competenciaMesAno: competenciaAutomatica,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Retenção de ${competenciaAutomatica} gerada com sucesso para ${data.totalTrabalhadores} trabalhadores!`);
        setShowRetencaoAutomaticaModal(false);
        carregarDadosContaVinculada(selectedContratoId);
      } else {
        alert(data.error || 'Erro ao processar retenção');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de conexão');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-700">
              <PiggyBank className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                Gestão e Fiscalização de Conta Vinculada
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Controle nominal de retenções mensais em fatura, liberações bancárias e saldos por trabalhador
              </p>
            </div>
          </div>
        </div>

        {/* Seletor de Contrato */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-bold text-slate-500 shrink-0">Contrato:</label>
          <select
            value={selectedContratoId}
            onChange={(e) => setSelectedContratoId(e.target.value)}
            className="text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-2xs focus:outline-none focus:border-blue-600 cursor-pointer min-w-[280px]"
          >
            {contratos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.numeroContrato || c.numeroEmpenho || 'Sem número'} - {c.fornecedor?.razaoSocial || 'Fornecedor'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Card Oficial da Conta Vinculada Bancária (Solicitação do Usuário) */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-3xl shadow-lg border border-blue-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent)] pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Conta Vinculada de Garantia (Bloqueada)</span>
              </span>
              <span className="text-xs font-mono text-blue-200 font-bold">
                Contrato nº {contratoConfig?.numeroContrato || '035/2025'}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white flex items-center space-x-2">
              <Landmark className="w-5 h-5 text-amber-300 shrink-0" />
              <span>
                {contratoConfig?.contaVinculadaBanco || 'Banco do Brasil S.A.'} • Agência {contratoConfig?.contaVinculadaAgencia || '3795-8'}
              </span>
            </h2>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-blue-100">
              <div>
                <strong>Conta Corrente Vinculada:</strong>{' '}
                <span className="font-mono font-bold text-amber-300">
                  {contratoConfig?.contaVinculadaNumeroConta || 'Aguardando cadastro da conta aberta'}
                </span>
              </div>
              {contratoConfig?.contaVinculadaStatusConta && (
                <div className="flex items-center space-x-1">
                  <strong>Status:</strong>
                  <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md text-[10px] font-bold border border-emerald-400/30">
                    {contratoConfig.contaVinculadaStatusConta}
                  </span>
                </div>
              )}
              {contratoConfig?.processoSeiMae && (
                <div>
                  <strong>Processo SEI:</strong> <span className="font-mono">{contratoConfig.processoSeiMae}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowDadosBancariosModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold rounded-xl transition-all cursor-pointer backdrop-blur-xs"
            >
              <Landmark className="w-3.5 h-3.5 text-amber-300" />
              <span>Dados da Conta Bancária</span>
            </button>

            <button
              type="button"
              onClick={() => setShowOficioCadastroModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold rounded-xl transition-all cursor-pointer backdrop-blur-xs"
            >
              <FileText className="w-3.5 h-3.5 text-blue-300" />
              <span>Ofício de Abertura</span>
            </button>

            <Link
              href={`/contratos/${selectedContratoId}/editar`}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Alíquotas ({(contratoConfig?.percentualTotalRetencao ?? 31.77).toFixed(2)}%)</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Cards de Métricas Gerais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Saldo Total em Conta</span>
          <span className="text-xl font-black text-blue-900 mt-1 block">
            {saldoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Valor bloqueado acumulado</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Retido (Entradas)</span>
          <span className="text-xl font-black text-emerald-700 mt-1 block">
            {saldoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          <span className="text-[11px] text-emerald-600 mt-1 block">
            {lancamentosMensais.length} lançamentos nominais
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Liberado (Saídas)</span>
          <span className="text-xl font-black text-rose-600 mt-1 block">
            {totalLiberadoAcumulado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {liberacoes.length} ofícios/liberações pagas
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Trabalhadores Vinculados</span>
          <span className="text-xl font-black text-slate-800 mt-1 block">
            {trabalhadores.length} colaboradores
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {trabalhadores.filter((t) => t.status === 'ATIVO').length} ativos • {trabalhadores.filter((t) => t.status === 'DEMITIDO').length} demitidos
          </span>
        </div>
      </div>

      {/* Abas Especializadas de Navegação */}
      <div className="flex border-b border-slate-200 gap-4 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => {
            setActiveTab('competencias');
            setTrabalhadorSelecionadoDetalhe(null);
          }}
          className={`pb-3 text-xs font-bold transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'competencias'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Visão por Competência / Fatura (Espelho da Planilha)</span>
          <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
            {listaCompetencias.length} faturas
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('trabalhadores')}
          className={`pb-3 text-xs font-bold transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'trabalhadores'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Visão por Trabalhador (Ficha Financeira)</span>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
            {trabalhadores.length} colaboradores
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('liberacoes');
            setTrabalhadorSelecionadoDetalhe(null);
          }}
          className={`pb-3 text-xs font-bold transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'liberacoes'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-rose-500" />
          <span>Histórico de Liberações (Saídas)</span>
          <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
            {liberacoes.length} saídas
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('extrato');
            setTrabalhadorSelecionadoDetalhe(null);
          }}
          className={`pb-3 text-xs font-bold transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'extrato'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Extrato Contábil Global</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: VISÃO POR COMPETÊNCIA / FATURA (ESPELHO DA PLANILHA MENSAL) */}
      {/* ========================================================================= */}
      {activeTab === 'competencias' && (
        <div className="space-y-4">
          {/* Barra de Filtro de Competências + Ações Rápidas */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase mr-1">Fatura / Mês:</span>
              <button
                type="button"
                onClick={() => setFiltroCompetencia('TODAS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filtroCompetencia === 'TODAS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todas as Faturas
              </button>

              {listaCompetencias.map((comp) => (
                <button
                  key={comp}
                  type="button"
                  onClick={() => setFiltroCompetencia(comp)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-mono ${
                    filtroCompetencia === comp
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {comp}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => exportarPdfFaturaMensal(filtroCompetencia)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                title="Exportar Relatório Mensal Timbrado em PDF"
              >
                <Printer className="w-4 h-4" />
                <span>Exportar Fatura em PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRetencaoAutomaticaModal(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Calculator className="w-4 h-4" />
                <span>+ Calcular Retenções do Mês</span>
              </button>
            </div>
          </div>

          {/* Resumo da Fatura Selecionada */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-600">
            <div>
              <strong>Competência Atual:</strong>{' '}
              <span className="font-bold text-slate-800">
                {filtroCompetencia === 'TODAS' ? 'Consolidado Geral' : `Fatura de ${filtroCompetencia}`}
              </span>
              <span className="mx-2">•</span>
              <strong>Postos Faturados:</strong> <span className="font-bold text-slate-800">{totaisCompetencia.postos} trabalhadores</span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <div>
                Férias + 1/3:{' '}
                <strong className="text-slate-800">
                  {totaisCompetencia.feriasTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </strong>
              </div>
              <div>
                13º Salário:{' '}
                <strong className="text-slate-800">
                  {totaisCompetencia.decimo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </strong>
              </div>
              <div>
                Multa FGTS:{' '}
                <strong className="text-slate-800">
                  {totaisCompetencia.fgts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </strong>
              </div>
              <div>
                Encargos 4.1:{' '}
                <strong className="text-slate-800">
                  {totaisCompetencia.encargos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </strong>
              </div>
              <div className="bg-emerald-100 text-emerald-950 px-2.5 py-1 rounded-lg font-black text-xs">
                Total Retido: {totaisCompetencia.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
          </div>

          {/* Tabela Matricial Nominal (Espelho da Planilha) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">Nº</th>
                    <th className="py-3 px-4">Funcionário</th>
                    <th className="py-3 px-4">Campus / Lotação</th>
                    <th className="py-3 px-4 text-right">Salário Base</th>
                    <th className="py-3 px-4 text-right">Férias (+ 1/3)</th>
                    <th className="py-3 px-4 text-right">13º Salário</th>
                    <th className="py-3 px-4 text-right">Multa FGTS</th>
                    <th className="py-3 px-4 text-right">Encargos 4.1</th>
                    <th className="py-3 px-4 text-right bg-emerald-50/50 font-black text-emerald-900">Total Retido</th>
                    <th className="py-3 px-4">Processo SEI</th>
                    <th className="py-3 px-4 text-center w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="text-center py-12 text-slate-400">
                        Carregando lançamentos nominais da fatura...
                      </td>
                    </tr>
                  ) : lancamentosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-12 text-slate-400">
                        Nenhuma retenção encontrada para a competência selecionada.
                      </td>
                    </tr>
                  ) : (
                    lancamentosFiltrados.map((l, idx) => (
                      <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-slate-800">{l.trabalhadorNome}</div>
                          <div className="text-[10px] text-slate-400 font-mono">CPF: {l.trabalhadorCpf}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="inline-flex items-center space-x-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-semibold">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{l.campus || 'Mossoró'}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-700">
                          {l.salarioBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-800">
                          {l.feriasTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-800">
                          {l.decimoTerceiro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-800">
                          {l.multaFgts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-800">
                          {l.encargos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-black text-emerald-800 bg-emerald-50/30">
                          {l.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                          {l.numeroOficio || '-'}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setEditingLancamento(l)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                            title="Editar Valores desta Retenção"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Rodapé Somatório */}
                {lancamentosFiltrados.length > 0 && (
                  <tfoot className="bg-slate-50/80 font-black text-slate-900 border-t-2 border-slate-200">
                    <tr>
                      <td colSpan={4} className="py-3 px-4 text-right uppercase text-[10px] text-slate-500 tracking-wider">
                        Total da Fatura ({totaisCompetencia.postos} Trabalhadores):
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {totaisCompetencia.feriasTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {totaisCompetencia.decimo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {totaisCompetencia.fgts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {totaisCompetencia.encargos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-800 bg-emerald-100/70 text-sm">
                        {totaisCompetencia.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: VISÃO POR TRABALHADOR (FICHA FINANCEIRA INDIVIDUAL) */}
      {/* ========================================================================= */}
      {activeTab === 'trabalhadores' && (
        <div className="space-y-4">
          {/* Se estiver visualizando a ficha de um trabalhador específico */}
          {trabalhadorSelecionadoDetalhe ? (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Botão Voltar */}
              <button
                type="button"
                onClick={() => setTrabalhadorSelecionadoDetalhe(null)}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para a Lista de Trabalhadores</span>
              </button>

              {/* Card Cabeçalho do Trabalhador */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-black text-slate-800">
                      {trabalhadorSelecionadoDetalhe.nomeCompleto}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        trabalhadorSelecionadoDetalhe.status === 'DEMITIDO'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {trabalhadorSelecionadoDetalhe.status === 'DEMITIDO' ? 'Demitido' : 'Ativo'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    CPF: {trabalhadorSelecionadoDetalhe.cpf} • Cargo: {trabalhadorSelecionadoDetalhe.funcao || 'Técnico em Assuntos Educacionais'} • Campus:{' '}
                    {trabalhadorSelecionadoDetalhe.campus}
                  </p>
                  {trabalhadorSelecionadoDetalhe.banco && (
                    <p className="text-[11px] text-slate-600 flex items-center space-x-2 pt-1">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        <strong>Domicílio Bancário:</strong> {trabalhadorSelecionadoDetalhe.banco} • Agência: {trabalhadorSelecionadoDetalhe.agencia} • Conta Corrente: {trabalhadorSelecionadoDetalhe.contaCorrente}
                      </span>
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => exportarPdfFichaTrabalhador(trabalhadorSelecionadoDetalhe)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
                >
                  <Printer className="w-4 h-4" />
                  <span>Exportar Ficha Individual (PDF)</span>
                </button>
              </div>

              {/* Quadro de Saldos Acumulados */}
              {(() => {
                const s = saldosPorTrabalhador[trabalhadorSelecionadoDetalhe.id] || { retido: 0, liberado: 0, saldo: 0, porRubrica: {} };
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase block">Total Retido (+)</span>
                      <span className="text-xl font-black text-emerald-900 mt-1 block">
                        {s.retido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>

                    <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200">
                      <span className="text-[10px] font-bold text-rose-700 uppercase block">Total Liberado / Sacado (-)</span>
                      <span className="text-xl font-black text-rose-900 mt-1 block">
                        {s.liberado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>

                    <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200">
                      <span className="text-[10px] font-bold text-blue-700 uppercase block">Saldo Bloqueado Disponível</span>
                      <span className="text-xl font-black text-blue-900 mt-1 block">
                        {s.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Tabela de Retenções Mês a Mês deste Trabalhador */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 uppercase tracking-wide">
                  Histórico de Retenções Mensais (Entradas)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Competência</th>
                        <th className="py-3 px-4 text-right">Salário Base</th>
                        <th className="py-3 px-4 text-right">Férias (+ 1/3)</th>
                        <th className="py-3 px-4 text-right">13º Salário</th>
                        <th className="py-3 px-4 text-right">Multa FGTS</th>
                        <th className="py-3 px-4 text-right">Encargos 4.1</th>
                        <th className="py-3 px-4 text-right font-black text-emerald-900">Total Retido</th>
                        <th className="py-3 px-4">Processo SEI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {lancamentosMensais
                        .filter((l) => l.trabalhadorId === trabalhadorSelecionadoDetalhe.id)
                        .map((l) => (
                          <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{l.competenciaMesAno}</td>
                            <td className="py-2.5 px-4 text-right font-mono">
                              {l.salarioBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono">
                              {l.feriasTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono">
                              {l.decimoTerceiro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono">
                              {l.multaFgts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono">
                              {l.encargos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-800">
                              {l.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{l.numeroOficio || '-'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Lista Geral de Todos os Trabalhadores */
            <div className="space-y-4">
              {/* Barra de Busca e Filtro de Status */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={buscaTrabalhador}
                    onChange={(e) => setBuscaTrabalhador(e.target.value)}
                    placeholder="Buscar colaborador por nome, CPF ou campus..."
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500">Status:</span>
                  {(['TODOS', 'ATIVO', 'DEMITIDO'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFiltroStatusTrabalhador(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        filtroStatusTrabalhador === st
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st === 'TODOS' ? 'Todos' : st === 'ATIVO' ? 'Ativos' : 'Demitidos'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabela de Trabalhadores */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Funcionário</th>
                        <th className="py-3 px-4">Campus / Local</th>
                        <th className="py-3 px-4 text-right">Salário Base</th>
                        <th className="py-3 px-4 text-right">Total Retido (+)</th>
                        <th className="py-3 px-4 text-right">Total Liberado (-)</th>
                        <th className="py-3 px-4 text-right">Saldo Bloqueado</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {trabalhadoresFiltrados.map((t) => {
                        const s = saldosPorTrabalhador[t.id] || { retido: 0, liberado: 0, saldo: 0 };
                        return (
                          <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-800">{t.nomeCompleto}</div>
                              <div className="text-[10px] text-slate-400 font-mono">CPF: {t.cpf}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center space-x-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-semibold">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{t.campus || 'Mossoró'}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                              {(t.salarioBaseCct || 2626.71).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-700 font-mono">
                              {s.retido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-rose-600 font-mono">
                              {s.liberado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-blue-900 font-mono">
                              {s.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {t.status === 'ATIVO' ? (
                                <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Ativo</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  <span>Demitido</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => setTrabalhadorSelecionadoDetalhe(t)}
                                className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                              >
                                <span>Ver Ficha</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: HISTÓRICO DE LIBERAÇÕES (SAÍDAS CATALOGADAS) */}
      {/* ========================================================================= */}
      {activeTab === 'liberacoes' && (
        <div className="space-y-4">
          {/* Top Actions */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-800 flex items-center space-x-2">
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>Controle de Saques e Liberações Autorizadas</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Catalogação de débitos autorizados para pagamento de férias gozadas, 13º salário e rescisões de contrato
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowRegistroLiberacaoModal(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Registrar Liberação Individual</span>
              </button>

              <button
                type="button"
                onClick={() => setShowOficioModal(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Emitir Ofício Bancário em Lote</span>
              </button>
            </div>
          </div>

          {/* Tabela de Saídas */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Funcionário</th>
                    <th className="py-3 px-4">Rubrica Liberada</th>
                    <th className="py-3 px-4 text-right">Valor Liberado (-)</th>
                    <th className="py-3 px-4">Ofício Bancário</th>
                    <th className="py-3 px-4">Motivo / Evento</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {liberacoes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        Nenhuma liberação / saída registrada até o momento para este contrato.
                        <br />
                        <span className="text-[11px] text-slate-500">
                          Clique em "+ Registrar Liberação Individual" para lançar um saque de férias ou rescisão comprovada.
                        </span>
                      </td>
                    </tr>
                  ) : (
                    liberacoes.map((lib) => (
                      <tr key={lib.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-700">
                          {new Date(lib.data).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-slate-800">{lib.trabalhadorNome}</div>
                          <div className="text-[10px] text-slate-400 font-mono">CPF: {lib.trabalhadorCpf}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md font-bold text-[10px]">
                            {lib.rubrica.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-black text-rose-700">
                          {lib.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-700">{lib.numeroOficio || '-'}</td>
                        <td className="py-2.5 px-4 text-[11px] text-slate-600 max-w-xs truncate">{lib.motivoLiberacao || '-'}</td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleExcluirMovimentacao(lib.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Excluir Lançamento de Liberação"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* ========================================================================= */}
      {/* ABA 4: EXTRATO CONTÁBIL GLOBAL */}
      {/* ========================================================================= */}
      {activeTab === 'extrato' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">
              Livro Razão de Movimentações (Total: {movimentacoes.length} registros)
            </span>
          </div>
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Competência</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Rubrica</th>
                  <th className="py-3 px-4">Trabalhador</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4">Processo / Ofício</th>
                  <th className="py-3 px-4">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {movimentacoes.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{m.competenciaMesAno}</td>
                    <td className="py-2.5 px-4">
                      {m.tipoOperacao === 'RETENCAO_ENTRADA' ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">Retenção (+)</span>
                      ) : (
                        <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[10px] font-bold">Liberação (-)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-[11px] font-semibold text-slate-700">{m.rubrica}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">{m.trabalhador?.nomeCompleto || 'Global'}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      {m.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{m.numeroOficio || '-'}</td>
                    <td className="py-2.5 px-4 text-[11px] text-slate-500 truncate max-w-xs">{m.motivoLiberacao || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modais Integrados */}
      {showDadosBancariosModal && contratoConfig && (
        <DadosContaVinculadaModal
          contrato={contratoConfig}
          onClose={() => setShowDadosBancariosModal(false)}
          onSucesso={() => carregarDadosContaVinculada(selectedContratoId)}
        />
      )}

      {showRegistroLiberacaoModal && contratoConfig && (
        <RegistroLiberacaoModal
          contrato={contratoConfig}
          trabalhadores={trabalhadores}
          saldosPorTrabalhador={saldosPorTrabalhador}
          onClose={() => setShowRegistroLiberacaoModal(false)}
          onSucesso={() => carregarDadosContaVinculada(selectedContratoId)}
        />
      )}

      {editingLancamento && (
        <EditarRetencaoModal
          lancamento={editingLancamento}
          contratoId={selectedContratoId}
          onClose={() => setEditingLancamento(null)}
          onSucesso={() => carregarDadosContaVinculada(selectedContratoId)}
        />
      )}

      {showOficioCadastroModal && contratoConfig && (
        <OficioCadastroModal
          contrato={contratoConfig}
          onClose={() => setShowOficioCadastroModal(false)}
        />
      )}

      {showOficioModal && contratoConfig && (
        <OficioLiberacaoModal
          contrato={contratoConfig}
          trabalhadores={trabalhadores}
          saldosPorTrabalhador={saldosPorTrabalhador}
          onClose={() => setShowOficioModal(false)}
          onSucesso={() => carregarDadosContaVinculada(selectedContratoId)}
        />
      )}

      {/* Modal Cálculo Retenção Automática */}
      {showRetencaoAutomaticaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-extrabold text-base text-slate-800 mb-1">
              Calcular Retenções do Mês
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Aplica a alíquota de {(contratoConfig?.percentualTotalRetencao ?? 31.77).toFixed(2)}% (IN nº 02/2024 SEAD/RN) sobre o salário de cada colaborador ativo.
            </p>

            <form onSubmit={handleProcessarRetencaoAutomatica} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Competência (MM/AAAA)
                </label>
                <input
                  type="text"
                  value={competenciaAutomatica}
                  onChange={(e) => setCompetenciaAutomatica(e.target.value)}
                  placeholder="Ex: 09/2026"
                  className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRetencaoAutomaticaModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                >
                  Processar e Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContaVinculadaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-semibold">Carregando painel de Conta Vinculada...</div>}>
      <ContaVinculadaContent />
    </Suspense>
  );
}
