'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Download,
  FileText,
  Calendar,
  Building,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet,
  MapPin,
  Filter,
  DollarSign,
  Search,
  RefreshCw,
  Check,
  X,
  Edit3,
  Info
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const CIDADES_UERN = [
  'Mossoró',
  'Assú',
  'Patu',
  'Pau dos Ferros',
  'Caicó',
  'Natal',
];

export default function RelatoriosPage() {
  const [activeTab, setActiveTab] = useState<'FECHAMENTO_CONTABIL' | 'DESPESAS_MULTI' | 'AUDITORIA_INDIVIDUAL'>('FECHAMENTO_CONTABIL');
  const [contratos, setContratos] = useState<any[]>([]);
  const [selectedContratoId, setSelectedContratoId] = useState('');
  const [loadingContratos, setLoadingContratos] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Filtros Multi-Critério de Despesas
  const [filtroCidade, setFiltroCidade] = useState('TODAS');
  const [filtroContratoId, setFiltroContratoId] = useState('TODOS');
  const [filtroObjeto, setFiltroObjeto] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');

  // Dados de Despesas Executadas
  const [despesas, setDespesas] = useState<any[]>([]);
  const [totais, setTotais] = useState({
    valorGlobalContratos: 0,
    valorProvisionado: 0,
    valorAtestado: 0,
    saldoContrato: 0,
    quantidadeDespesas: 0,
  });
  const [loadingDespesas, setLoadingDespesas] = useState(false);

  // Carregar lista de contratos e dados do usuário
  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/contratos').then((r) => r.json()),
    ])
      .then(([dataUser, dataC]) => {
        if (dataUser.user) setCurrentUser(dataUser.user);
        if (dataC.contratos) {
          setContratos(dataC.contratos);
          if (dataC.contratos.length > 0) setSelectedContratoId(dataC.contratos[0].id);
        }
      })
      .finally(() => setLoadingContratos(false));
  }, []);

  // Carregar despesas conforme os filtros multi-critério
  const carregarDespesas = async () => {
    setLoadingDespesas(true);
    try {
      const params = new URLSearchParams();
      if (filtroCidade && filtroCidade !== 'TODAS') params.append('cidade', filtroCidade);
      if (filtroContratoId && filtroContratoId !== 'TODOS') params.append('contratoId', filtroContratoId);
      if (filtroObjeto) params.append('objeto', filtroObjeto);
      if (filtroDataInicio) params.append('dataInicio', filtroDataInicio);
      if (filtroDataFim) params.append('dataFim', filtroDataFim);
      if (filtroStatus && filtroStatus !== 'TODOS') params.append('status', filtroStatus);

      const res = await fetch(`/api/execucao/saldos?${params.toString()}`);
      const data = await res.json();
      if (data.despesas) {
        setDespesas(data.despesas);
        setTotais(data.totais || {
          valorGlobalContratos: 0,
          valorProvisionado: 0,
          valorAtestado: 0,
          saldoContrato: 0,
          quantidadeDespesas: 0,
        });
      }
    } catch (err) {
      console.error('Erro ao carregar despesas:', err);
    } finally {
      setLoadingDespesas(false);
    }
  };

  useEffect(() => {
    carregarDespesas();
  }, [filtroCidade, filtroContratoId, filtroDataInicio, filtroDataFim, filtroStatus]);

  const handleBuscarObjeto = (e: React.FormEvent) => {
    e.preventDefault();
    carregarDespesas();
  };

  const contratoAtual = contratos.find((c) => c.id === selectedContratoId);

  // Estados para Fechamento Contábil Anual (Fim de Ano - Contabilidade)
  const [fechamentoAno, setFechamentoAno] = useState('2026');
  const [fechamentoDecisao, setFechamentoDecisao] = useState('TODAS');
  const [fechamentoCidade, setFechamentoCidade] = useState('TODAS');
  const [fechamentoContratoId, setFechamentoContratoId] = useState('TODOS');
  const [fechamentoDespesas, setFechamentoDespesas] = useState<any[]>([]);
  const [fechamentoTotais, setFechamentoTotais] = useState({
    totalEstimado: 0,
    totalManter: 0,
    totalAnular: 0,
    qtdTotal: 0,
    qtdManter: 0,
    qtdAnular: 0,
  });
  const [loadingFechamento, setLoadingFechamento] = useState(false);

  // Modal de Decisão Contábil
  const [modalDecisaoOpen, setModalDecisaoOpen] = useState(false);
  const [despesaEmEdicao, setDespesaEmEdicao] = useState<any | null>(null);
  const [formDecisao, setFormDecisao] = useState<'MANTER' | 'ANULAR_CANCELAR'>('MANTER');
  const [formJustificativa, setFormJustificativa] = useState('');
  const [salvandoDecisao, setSalvandoDecisao] = useState(false);

  const carregarFechamentoContabil = async () => {
    setLoadingFechamento(true);
    try {
      const params = new URLSearchParams();
      if (fechamentoAno && fechamentoAno !== 'TODOS') params.append('ano', fechamentoAno);
      if (fechamentoDecisao && fechamentoDecisao !== 'TODAS') params.append('decisao', fechamentoDecisao);
      if (fechamentoCidade && fechamentoCidade !== 'TODAS') params.append('cidade', fechamentoCidade);
      if (fechamentoContratoId && fechamentoContratoId !== 'TODOS') params.append('contratoId', fechamentoContratoId);

      const res = await fetch(`/api/relatorios/fechamento-contabil?${params.toString()}`);
      const data = await res.json();
      if (data.despesas) {
        setFechamentoDespesas(data.despesas);
        setFechamentoTotais(data.totais || {
          totalEstimado: 0,
          totalManter: 0,
          totalAnular: 0,
          qtdTotal: 0,
          qtdManter: 0,
          qtdAnular: 0,
        });
      }
    } catch (err) {
      console.error('Erro ao carregar fechamento contábil:', err);
    } finally {
      setLoadingFechamento(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'FECHAMENTO_CONTABIL') {
      carregarFechamentoContabil();
    }
  }, [activeTab, fechamentoAno, fechamentoDecisao, fechamentoCidade, fechamentoContratoId]);

  const handleOpenModalDecisao = (d: any) => {
    setDespesaEmEdicao(d);
    setFormDecisao((d.decisaoContabil as any) || 'MANTER');
    setFormJustificativa(d.justificativaContabil || '');
    setModalDecisaoOpen(true);
  };

  const handleSalvarDecisao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!despesaEmEdicao) return;
    setSalvandoDecisao(true);
    try {
      const res = await fetch('/api/relatorios/fechamento-contabil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          despesaId: despesaEmEdicao.id,
          decisaoContabil: formDecisao,
          justificativaContabil: formJustificativa,
          anoExercicio: fechamentoAno !== 'TODOS' ? parseInt(fechamentoAno) : new Date().getFullYear(),
        }),
      });
      if (res.ok) {
        setModalDecisaoOpen(false);
        setDespesaEmEdicao(null);
        carregarFechamentoContabil();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao salvar parecer contábil.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de conexão.');
    } finally {
      setSalvandoDecisao(false);
    }
  };

  const exportarExcelFechamentoContabil = () => {
    if (fechamentoDespesas.length === 0) {
      alert('Nenhuma despesa para exportar no filtro atual.');
      return;
    }

    const rows = fechamentoDespesas.map((d) => ({
      'Contrato / Empenho': d.contrato?.numeroContrato ? `Contrato nº ${d.contrato.numeroContrato}` : (d.contrato?.numeroEmpenho ? `Empenho nº ${d.contrato.numeroEmpenho}` : d.numeroContratoRef || '-'),
      'Processo SEI Despesa': d.processoSeiDespesa,
      'Processo SEI Mãe': d.contrato?.processoSeiMae || d.processoSeiMaeRef || '-',
      'Fornecedor Contratado': d.contrato?.fornecedor?.razaoSocial || '-',
      'CNPJ': d.contrato?.fornecedor?.cnpj || '-',
      'Campus / Cidade': d.cidade,
      'Referência / Período': d.referencia,
      'Valor Estimado Aberto (R$)': (d.status === 'ABERTA' ? d.valorEstimado : (d.saldo > 0 ? d.saldo : d.valorEstimado)),
      'Decisão Contábil': d.decisaoContabil === 'ANULAR_CANCELAR' ? 'ANULAR / CANCELAR EMPENHO' : 'MANTER EMPENHO',
      'Perspectiva de Execução?': d.decisaoContabil === 'ANULAR_CANCELAR' ? 'NÃO (Liberar Saldo Orçamentário)' : 'SIM (Manter Dotação)',
      'Parecer / Justificativa Contábil': d.justificativaContabil || 'Sem observações adicionais.',
      'Status Operacional': d.status,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Fechamento_${fechamentoAno}`);
    XLSX.writeFile(wb, `Fechamento_Contabil_Despesas_UERN_${fechamentoAno}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const emitirPdfFechamentoContabil = () => {
    if (fechamentoDespesas.length === 0) {
      alert('Nenhuma despesa para gerar relatório no filtro atual.');
      return;
    }

    const doc = new jsPDF('landscape');

    // Cabeçalho Institucional
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 51, 102);
    doc.text('UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - UERN', 148, 16, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);
    doc.text('PRÓ-REITORIA DE ADMINISTRAÇÃO (PROAD) / SETOR DE CONTABILIDADE E ORÇAMENTO', 148, 22, { align: 'center' });
    doc.text(`DEMONSTRATIVO DE FECHAMENTO DE EXERCÍCIO: DESPESAS ESTIMADAS & EMPENHOS (EXERCÍCIO ${fechamentoAno})`, 148, 27, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(`Emissão em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} | Módulo de Gestão Contábil (IN nº 01/2026-PROAD)`, 148, 32, { align: 'center' });

    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.6);
    doc.line(14, 35, 283, 35);

    // Sumário Executivo / KPIs Contábeis
    autoTable(doc, {
      startY: 38,
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 3 },
      body: [
        [
          {
            content: `TOTAL ESTIMADO EM ABERTO:\n${fechamentoTotais.totalEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n(${fechamentoTotais.qtdTotal} processos analisados)`,
            styles: { halign: 'center', fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] }
          },
          {
            content: `EMPENHOS A MANTER (Perspectiva de Execução):\n${fechamentoTotais.totalManter.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n(${fechamentoTotais.qtdManter} processos com previsão)`,
            styles: { halign: 'center', fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [4, 120, 87] }
          },
          {
            content: `EMPENHOS A ANULAR/CANCELAR (Liberar Orçamento):\n${fechamentoTotais.totalAnular.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n(${fechamentoTotais.qtdAnular} processos recomendados para anulação)`,
            styles: { halign: 'center', fontStyle: 'bold', fillColor: [255, 241, 242], textColor: [190, 18, 60] }
          }
        ]
      ]
    });

    const yAfterKpis = (doc as any).lastAutoTable.finalY + 6;

    // Tabela Detalhada dos Processos
    const tableBody = fechamentoDespesas.map((d) => {
      const valorBase = d.status === 'ABERTA' ? d.valorEstimado : (d.saldo > 0 ? d.saldo : d.valorEstimado);
      const isAnular = d.decisaoContabil === 'ANULAR_CANCELAR';
      const numContrato = d.contrato?.numeroContrato ? `Contrato ${d.contrato.numeroContrato}` : (d.contrato?.numeroEmpenho ? `Empenho ${d.contrato.numeroEmpenho}` : d.numeroContratoRef || '-');

      return [
        numContrato,
        d.processoSeiDespesa,
        (d.contrato?.fornecedor?.razaoSocial || '-').slice(0, 25),
        d.cidade,
        d.referencia,
        valorBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        isAnular ? 'ANULAR EMPENHO\n(Liberar Saldo)' : 'MANTER EMPENHO\n(Há Perspectiva)',
        (d.justificativaContabil || 'Sem ressalvas do gestor.').slice(0, 50)
      ];
    });

    autoTable(doc, {
      startY: yAfterKpis,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      head: [['Contrato', 'Processo SEI', 'Fornecedor', 'Campus', 'Referência', 'Valor Estimado', 'Decisão Contábil', 'Parecer / Justificativa']],
      body: tableBody,
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 35, font: 'courier' },
        2: { cellWidth: 40 },
        3: { cellWidth: 22 },
        4: { cellWidth: 24 },
        5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 34, halign: 'center', fontStyle: 'bold' },
        7: { cellWidth: 'auto' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 6) {
          if (data.cell.raw && String(data.cell.raw).includes('ANULAR')) {
            data.cell.styles.textColor = [190, 18, 60];
            data.cell.styles.fillColor = [255, 241, 242];
          } else {
            data.cell.styles.textColor = [4, 120, 87];
            data.cell.styles.fillColor = [236, 253, 245];
          }
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;

    let signY = finalY;
    if (signY > 175) {
      doc.addPage();
      signY = 30;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text('Declaro que os processos estimativos acima foram analisados pelo Gestor/Fiscal do Contrato para subsidiar o Fechamento Contábil e o Balanço Geral da UERN.', 14, signY);

    signY += 16;
    doc.setDrawColor(180, 180, 180);
    doc.line(30, signY, 120, signY);
    doc.line(160, signY, 250, signY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(20, 20, 20);
    doc.text('Gestão e Fiscalização de Contratos', 75, signY + 4, { align: 'center' });
    doc.text('PROAD / UERN', 75, signY + 8, { align: 'center' });

    doc.text('Setor de Contabilidade e Orçamento', 205, signY + 4, { align: 'center' });
    doc.text('PROPLAN / UERN', 205, signY + 8, { align: 'center' });

    doc.save(`Fechamento_Contabil_Despesas_UERN_${fechamentoAno}.pdf`);
  };

  // Exportar Relatório de Despesas em Excel (.xlsx)
  const exportarExcelDespesas = () => {
    if (despesas.length === 0) {
      alert('Não há despesas com os filtros selecionados para exportar.');
      return;
    }

    const dataToExport = despesas.map((d, index) => ({
      'Item': index + 1,
      'Contrato / Empenho': d.contrato?.numeroContrato ? `Contrato ${d.contrato.numeroContrato}` : (d.numeroContratoRef || 'S/N'),
      'Processo SEI Mãe': d.processoSeiMaeRef || d.contrato?.processoSeiMae || '',
      'Processo de Despesa': d.processoSeiDespesa || '',
      'Nota Fiscal': d.numeroNotaFiscal || 'S/N',
      'Data do Atesto': d.dataAtesto ? new Date(d.dataAtesto).toLocaleDateString('pt-BR') : '-',
      'Referência': d.referencia || '',
      'Campus / Cidade': d.cidade || 'Mossoró',
      'Fornecedor': d.contrato?.fornecedor?.razaoSocial || '',
      'CNPJ Fornecedor': d.contrato?.fornecedor?.cnpj || '',
      'Objeto': d.contrato?.objeto || '',
      'Valor Estimado (Provisão) (R$)': d.valorEstimado,
      'Valor Real Atestado (Efetivo) (R$)': d.valorAtestado,
      'Status': d.status === 'ATESTADA' ? 'Atestada (Efetiva)' : 'Aberta (Provisionada)',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Despesas_e_Saldos');
    XLSX.writeFile(wb, `Relatorio_Despesas_UERN_${filtroCidade}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Emitir Relatório Consolidado de Despesas em PDF
  const emitirPdfDespesasMulti = () => {
    const doc = new jsPDF('landscape');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 51, 102);
    doc.text('UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - UERN', 148, 16, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('PRÓ-REITORIA DE ADMINISTRAÇÃO - PROAD', 148, 22, { align: 'center' });
    doc.text('RELATÓRIO CONSOLIDADO DE EXECUÇÃO DE DESPESAS E SALDOS POR CIDADE E CONTRATO', 148, 27, { align: 'center' });

    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.8);
    doc.line(14, 31, 282, 31);

    // Parâmetros do Filtro
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    const cidadeDesc = filtroCidade === 'TODAS' ? 'Todos os Campi' : filtroCidade;
    const contratoDesc = filtroContratoId === 'TODOS' ? 'Todos os Contratos' : (contratos.find(c => c.id === filtroContratoId)?.numeroContrato || 'Selecionado');
    const periodoDesc = filtroDataInicio || filtroDataFim ? `${filtroDataInicio || 'Início'} até ${filtroDataFim || 'Hoje'}` : 'Todo o Período Histórico';
    doc.text(`Filtros Aplicados: Campus: [${cidadeDesc}] | Contrato: [${contratoDesc}] | Período: [${periodoDesc}] | Status: [${filtroStatus}]`, 14, 37);

    // Totais Executivos em Destaque
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 51, 102);
    doc.text(`VALOR GLOBAL: ${totais.valorGlobalContratos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, 43);
    doc.setTextColor(180, 100, 10);
    doc.text(`PROVISIONADO: ${totais.valorProvisionado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 78, 43);
    doc.setTextColor(16, 120, 60);
    doc.text(`REAL ATESTADO: ${totais.valorAtestado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 145, 43);
    doc.setTextColor(totais.saldoContrato < 0 ? 180 : 0, totais.saldoContrato < 0 ? 30 : 51, totais.saldoContrato < 0 ? 30 : 102);
    doc.text(`SALDO CONTRATO: ${totais.saldoContrato.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 212, 43);

    const rows = despesas.map((d) => [
      d.contrato?.numeroContrato ? `Contr. ${d.contrato.numeroContrato}` : (d.numeroContratoRef || '-'),
      d.processoSeiDespesa || '-',
      d.numeroNotaFiscal || '-',
      d.dataAtesto ? new Date(d.dataAtesto).toLocaleDateString('pt-BR') : '-',
      d.referencia || '-',
      d.cidade || 'Mossoró',
      (d.contrato?.fornecedor?.razaoSocial || '').slice(0, 22),
      d.valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      d.valorAtestado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      d.status === 'ATESTADA' ? 'Atestada (Efetiva)' : 'Aberta (Provisão)',
    ]);

    autoTable(doc, {
      startY: 48,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2 },
      head: [
        [
          'Contrato',
          'Proc. Despesa',
          'NF',
          'Data Atesto',
          'Ref.',
          'Campus / Cidade',
          'Fornecedor',
          'Vlr. Estimado',
          'Vlr. Atestado',
          'Status / Débito'
        ]
      ],
      body: rows.length > 0 ? rows : [['Nenhum registro encontrado para os filtros selecionados.', '', '', '', '', '', '', '', '', '']],
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Relatório emitido automaticamente pelo Sistema de Gestão de Contratos da UERN (SGC-UERN) em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}.`, 14, finalY);

    doc.save(`Relatorio_Despesas_Consolidado_UERN_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Emitir Relatório Consolidado de Ficha do Contrato em PDF
  const emitirRelatorioPdf = () => {
    if (!contratoAtual) return;
    const doc = new jsPDF();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 51, 102);
    doc.text('UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - UERN', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('PRÓ-REITORIA DE ADMINISTRAÇÃO - PROAD', 105, 26, { align: 'center' });
    doc.text('RELATÓRIO GERENCIAL EXECUTIVO DE EXECUÇÃO CONTRATUAL', 105, 31, { align: 'center' });

    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.8);
    doc.line(15, 36, 195, 36);

    autoTable(doc, {
      startY: 44,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9 },
      head: [['Identificação', 'Detalhes do Contrato']],
      body: [
        ['Número do Instrumento', contratoAtual.numeroContrato ? `Contrato nº ${contratoAtual.numeroContrato}` : `Empenho nº ${contratoAtual.numeroEmpenho}`],
        ['Processo SEI Mãe', contratoAtual.processoSeiMae],
        ['Procedimento Licitatório', contratoAtual.licitacaoProcedimento],
        ['Contratada', contratoAtual.fornecedor?.razaoSocial || ''],
        ['CNPJ', contratoAtual.fornecedor?.cnpj || ''],
        ['Endereço Fornecedor', contratoAtual.fornecedor?.endereco || 'Não informado'],
        ['Representante Legal (Signatário)', contratoAtual.fornecedor?.nomeRepresentanteLegal ? `${contratoAtual.fornecedor.nomeRepresentanteLegal} (CPF: ${contratoAtual.fornecedor.cpfRepresentanteLegal || '-'})` : 'Não informado'],
        ['Preposto Operacional', contratoAtual.fornecedor?.nomePreposto ? `${contratoAtual.fornecedor.nomePreposto} (Tel: ${contratoAtual.fornecedor.telefonePreposto || '-'})` : 'Não informado'],
        ['Objeto', contratoAtual.objeto],
        ['Vigência', `${new Date(contratoAtual.vigenciaInicio).toLocaleDateString('pt-BR')} a ${new Date(contratoAtual.vigenciaFim).toLocaleDateString('pt-BR')}`],
        ['Valor Global Original', contratoAtual.valorGlobal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
        ['Valor Global Atualizado', contratoAtual.valorAtualizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
        ['Status Atual', contratoAtual.status],
      ],
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('DECLARAÇÃO DE CONFORMIDADE E AUDITORIA', 15, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Relatório emitido pelo SGC-UERN contendo histórico de medições, glosas e retenções aplicadas no exercício de fiscalização em estrita consonância com a IN nº 01/2026 - PROAD.', 15, finalY + 6, { maxWidth: 180 });

    doc.save(`Relatorio_Contrato_${contratoAtual.numeroContrato || 'UERN'}.pdf`);
  };

  // Apenas bloqueia usuários que não são Admin, nem Gestor, nem Fiscal Administrativo (ex: Fiscais Técnicos/Setoriais)
  if (currentUser && !currentUser.isAdmin && !currentUser.isGestor && !currentUser.isFiscalAdm) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-2xl mx-auto my-12 shadow-sm space-y-4">
        <div className="w-16 h-16 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center mx-auto border border-blue-100">
          <BarChart3 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Módulo Restrito à PROAD e Gestores</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Conforme a <strong>Instrução Normativa nº 01/2026-PROAD</strong>, a emissão do demonstrativo de fechamento contábil e de relatórios executivos é privativa da Pró-Reitoria de Administração e dos Gestores e Fiscais Administrativos de contratos.
        </p>
        <p className="text-xs text-slate-500">
          Como Fiscal Técnico ou Fiscal Setorial, utilize os módulos de <strong>Execução & Medições</strong> para acompanhar e emitir atestes dos contratos sob sua responsabilidade.
        </p>
        <div className="pt-4">
          <Link
            href="/contratos"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow transition-colors"
          >
            <span>Voltar aos Contratos</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg md:text-xl">
            <BarChart3 className="w-6 h-6 text-blue-700" />
            <h2>{currentUser?.isAdmin ? 'Relatórios Gerenciais & Auditoria' : 'Fechamento Contábil Anual'}</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {currentUser?.isAdmin
              ? 'Geração de relatórios de despesas por campus/cidade, contrato, objeto, período e ficha analítica de auditoria.'
              : 'Relatório de fechamento contábil para avaliação de despesas estimadas/empenhadas a manter ou anular para a Contabilidade e PROPLAN.'}
          </p>
        </div>

        {activeTab === 'FECHAMENTO_CONTABIL' ? (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={exportarExcelFechamentoContabil}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
              title="Baixar demonstrativo de despesas estimadas em planilha Excel oficial"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={emitirPdfFechamentoContabil}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
              title="Emitir relatório oficial timbrado em PDF para a Contabilidade e PROPLAN"
            >
              <Printer className="w-4 h-4" />
              <span>Emitir Relatório PDF</span>
            </button>
          </div>
        ) : activeTab === 'DESPESAS_MULTI' ? (
          <div className="flex items-center space-x-2">
            <button
              onClick={exportarExcelDespesas}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Excel (.xlsx)</span>
            </button>
            <button
              onClick={emitirPdfDespesasMulti}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Emitir Relatório PDF</span>
            </button>
          </div>
        ) : (
          <button
            onClick={emitirRelatorioPdf}
            disabled={!contratoAtual}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Emitir Ficha em PDF</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('FECHAMENTO_CONTABIL')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'FECHAMENTO_CONTABIL'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4 text-blue-700" />
          <span>Fechamento Contábil Anual (Fim de Ano - Contabilidade)</span>
        </button>

        <button
          onClick={() => setActiveTab('DESPESAS_MULTI')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'DESPESAS_MULTI'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Relatório de Despesas & Saldos (Multi-Critério)</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDITORIA_INDIVIDUAL')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'AUDITORIA_INDIVIDUAL'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Ficha Individual do Contrato & Auditoria</span>
        </button>
      </div>

      {/* TAB: FECHAMENTO CONTÁBIL ANUAL (FIM DE ANO - CONTABILIDADE) */}
      {activeTab === 'FECHAMENTO_CONTABIL' && (
        <div className="space-y-6">
          {/* Card explicativo / Instruções da IN 01/2026 e Fechamento Contábil */}
          <div className="bg-gradient-to-r from-blue-900 to-[#003366] text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center space-x-2">
                <span className="bg-blue-500/30 text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-blue-400/30">
                  Encerramento do Exercício Financeiro
                </span>
                <span className="text-xs text-blue-200 font-medium">Instrução Normativa nº 01/2026 - PROAD/UERN</span>
              </div>
              <h3 className="font-bold text-base md:text-lg">
                Demonstrativo de Processos Estimativos & Anulação de Empenhos
              </h3>
              <p className="text-xs text-blue-100/90 leading-relaxed">
                Relatório anual solicitado pela Contabilidade e PROPLAN para o fechamento do balanço orçamentário. 
                Classifique quais processos com estimativa aberta devem ter seu <strong>empenho mantido</strong> (com perspectiva real de execução nos meses seguintes ou restos a pagar) e quais podem ter seu <strong>empenho anulado</strong> (liberando orçamento de despesas que não serão mais executadas).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={carregarFechamentoContabil}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer border border-white/20"
                title="Atualizar dados do relatório"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingFechamento ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
            </div>
          </div>

          {/* KPI CARDS CONSOLIDADOS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Estimado em Aberto */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Total Estimado em Aberto
                </span>
                <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                  {fechamentoTotais.totalEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                  {fechamentoTotais.qtdTotal} processo(s) estimativo(s) no exercício
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            {/* Empenhos a Manter */}
            <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                  Empenhos a Manter (Perspectiva)
                </span>
                <span className="text-2xl font-extrabold text-emerald-900 mt-1 block">
                  {fechamentoTotais.totalManter.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[11px] text-emerald-700 font-medium mt-0.5 block">
                  {fechamentoTotais.qtdManter} processo(s) com perspectiva de execução
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            {/* Empenhos a Anular / Liberar */}
            <div className="bg-rose-50/70 p-5 rounded-2xl border border-rose-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
                  Empenhos a Anular (Liberar Orçamento)
                </span>
                <span className="text-2xl font-extrabold text-rose-900 mt-1 block">
                  {fechamentoTotais.totalAnular.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[11px] text-rose-700 font-medium mt-0.5 block">
                  {fechamentoTotais.qtdAnular} processo(s) para devolução ao orçamento
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* BARRA DE FILTROS */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Exercício Financeiro</label>
              <select
                value={fechamentoAno}
                onChange={(e) => setFechamentoAno(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
              >
                <option value="2026">Exercício 2026</option>
                <option value="2025">Exercício 2025</option>
                <option value="2024">Exercício 2024</option>
                <option value="TODOS">Todos os Exercícios</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Decisão Contábil</label>
              <select
                value={fechamentoDecisao}
                onChange={(e) => setFechamentoDecisao(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
              >
                <option value="TODAS">Todas as Decisões</option>
                <option value="MANTER">🟢 Manter Empenho (Há Perspectiva)</option>
                <option value="ANULAR_CANCELAR">🔴 Anular Empenho (Liberar Orçamento)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Campus / Unidade</label>
              <select
                value={fechamentoCidade}
                onChange={(e) => setFechamentoCidade(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white"
              >
                <option value="TODAS">Todos os Campi</option>
                {CIDADES_UERN.map((c) => (
                  <option key={c} value={c}>
                    Campus {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Filtrar Contrato</label>
              <select
                value={fechamentoContratoId}
                onChange={(e) => setFechamentoContratoId(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 bg-white max-w-xs truncate"
              >
                <option value="TODOS">Todos os Contratos</option>
                {contratos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.numeroContrato ? `Contrato nº ${c.numeroContrato}` : `Empenho nº ${c.numeroEmpenho}`} - {c.fornecedor?.razaoSocial}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* TABELA DE PROCESSOS ESTIMATIVOS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-700" />
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Listagem Analítica de Despesas e Parecer para a Contabilidade ({fechamentoDespesas.length})
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Clique em <strong>Alterar Decisão</strong> para registrar ou modificar o parecer contábil.
              </span>
            </div>

            {loadingFechamento ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                Carregando dados de fechamento contábil...
              </div>
            ) : fechamentoDespesas.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Nenhum processo estimativo em aberto encontrado para os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Contrato & Fornecedor</th>
                      <th className="py-3 px-4">Processo SEI</th>
                      <th className="py-3 px-4">Campus</th>
                      <th className="py-3 px-4">Referência</th>
                      <th className="py-3 px-4 text-right">Valor Estimado (R$)</th>
                      <th className="py-3 px-4 text-center">Decisão Contábil</th>
                      <th className="py-3 px-4">Parecer / Justificativa</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fechamentoDespesas.map((d) => {
                      const valorBase = d.status === 'ABERTA' ? d.valorEstimado : (d.saldo > 0 ? d.saldo : d.valorEstimado);
                      const isAnular = d.decisaoContabil === 'ANULAR_CANCELAR';

                      return (
                        <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">
                              {d.contrato?.numeroContrato
                                ? `Contrato nº ${d.contrato.numeroContrato}`
                                : (d.contrato?.numeroEmpenho ? `Empenho nº ${d.contrato.numeroEmpenho}` : d.numeroContratoRef || '-')}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium line-clamp-1">
                              {d.contrato?.fornecedor?.razaoSocial}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              CNPJ: {d.contrato?.fornecedor?.cnpj}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-mono text-blue-700 font-semibold text-[11px] block">
                              {d.processoSeiDespesa}
                            </span>
                            {d.contrato?.processoSeiMae && (
                              <span className="text-[10px] text-slate-400 font-mono block">
                                Mãe: {d.contrato.processoSeiMae}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{d.cidade}</span>
                            </span>
                          </td>

                          <td className="py-3 px-4 font-medium text-slate-700">
                            {d.referencia}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <span className="font-extrabold text-slate-900">
                              {valorBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                            {d.valorAtestado > 0 && (
                              <span className="block text-[10px] text-slate-400">
                                Atestado: {d.valorAtestado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            {isAnular ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                <X className="w-3 h-3 text-rose-600" />
                                <span>ANULAR EMPENHO</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>MANTER EMPENHO</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 max-w-xs">
                            <p className="text-xs text-slate-700 line-clamp-2" title={d.justificativaContabil || 'Sem ressalvas'}>
                              {d.justificativaContabil || (
                                <span className="italic text-slate-400">Há perspectiva de execução contratual normal.</span>
                              )}
                            </p>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenModalDecisao(d)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-bold rounded-xl transition-colors cursor-pointer border border-blue-200"
                              title="Alterar Parecer Contábil"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Parecer</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* MODAL DE ALTERAÇÃO DA DECISÃO CONTÁBIL */}
          {modalDecisaoOpen && despesaEmEdicao && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        Parecer Contábil de Fechamento de Exercício
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Processo SEI: {despesaEmEdicao.processoSeiDespesa}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setModalDecisaoOpen(false);
                      setDespesaEmEdicao(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div>
                    <span className="font-semibold text-slate-700">Contrato: </span>
                    {despesaEmEdicao.contrato?.numeroContrato ? `Contrato nº ${despesaEmEdicao.contrato.numeroContrato}` : despesaEmEdicao.numeroContratoRef || 'S/N'}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Fornecedor: </span>
                    {despesaEmEdicao.contrato?.fornecedor?.razaoSocial}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Valor Estimado em Aberto: </span>
                    <span className="font-bold text-slate-900">
                      {(despesaEmEdicao.status === 'ABERTA' ? despesaEmEdicao.valorEstimado : (despesaEmEdicao.saldo > 0 ? despesaEmEdicao.saldo : despesaEmEdicao.valorEstimado)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSalvarDecisao} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Decisão para a Contabilidade e Fechamento do Balanço *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormDecisao('MANTER')}
                        className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                          formDecisao === 'MANTER'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-sm ring-1 ring-emerald-600'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 font-bold text-xs text-emerald-800">
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>MANTER EMPENHO</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                          Há perspectiva de execução real nos próximos meses ou inscrição em Restos a Pagar.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormDecisao('ANULAR_CANCELAR')}
                        className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                          formDecisao === 'ANULAR_CANCELAR'
                            ? 'bg-rose-50 border-rose-600 text-rose-900 shadow-sm ring-1 ring-rose-600'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 font-bold text-xs text-rose-800">
                          <X className="w-4 h-4 text-rose-600" />
                          <span>ANULAR EMPENHO</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                          Não será executado. Liberar dotação orçamentária para fechar o balanço contábil.
                        </p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Justificativa / Parecer do Gestor ou Fiscal *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={formJustificativa}
                      onChange={(e) => setFormJustificativa(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                      placeholder="Descreva a razão operacional (ex: fornecedor confirmou entrega para janeiro; ou empresa comunicou impossibilidade de fornecer, autorizando a anulação do saldo do empenho)..."
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setModalDecisaoOpen(false);
                        setDespesaEmEdicao(null);
                      }}
                      className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={salvandoDecisao}
                      className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {salvandoDecisao ? 'Salvando...' : 'Confirmar Parecer'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: RELATÓRIO DE DESPESAS MULTI-CRITÉRIO */}
      {activeTab === 'DESPESAS_MULTI' && (
        <div className="space-y-6">
          {/* BARRA DE FILTROS MULTI-CRITÉRIO */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                <Filter className="w-4 h-4 text-blue-600" />
                <span>Filtros de Relatório (Combine Cidade, Contrato, Objeto e Período)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFiltroCidade('TODAS');
                  setFiltroContratoId('TODOS');
                  setFiltroObjeto('');
                  setFiltroDataInicio('');
                  setFiltroDataFim('');
                  setFiltroStatus('TODOS');
                }}
                className="text-[11px] text-slate-400 hover:text-blue-600 underline cursor-pointer"
              >
                Limpar Todos os Filtros
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Filtro Cidade / Campus UERN */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Campus / Cidade UERN</span>
                </label>
                <select
                  value={filtroCidade}
                  onChange={(e) => setFiltroCidade(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-600"
                >
                  <option value="TODAS">Todos os Campi UERN</option>
                  {CIDADES_UERN.map((cid) => (
                    <option key={cid} value={cid}>
                      {cid}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro Contrato */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center space-x-1">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  <span>Contrato / Instrumento</span>
                </label>
                <select
                  value={filtroContratoId}
                  onChange={(e) => setFiltroContratoId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-600"
                >
                  <option value="TODOS">Todos os Contratos</option>
                  {contratos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.numeroContrato ? `Contrato nº ${c.numeroContrato}` : `Empenho: ${c.numeroEmpenho}`} - {c.fornecedor?.razaoSocial?.slice(0, 20)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro Período: Início */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Data do Atesto (De)</span>
                </label>
                <input
                  type="date"
                  value={filtroDataInicio}
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-600"
                />
              </div>

              {/* Filtro Período: Fim */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Data do Atesto (Até)</span>
                </label>
                <input
                  type="date"
                  value={filtroDataFim}
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Linha 2: Busca por Objeto e Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <form onSubmit={handleBuscarObjeto} className="md:col-span-2 flex space-x-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={filtroObjeto}
                    onChange={(e) => setFiltroObjeto(e.target.value)}
                    placeholder="Filtrar por palavras-chave no Objeto da Contratação..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-600"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Filtrar Objeto
                </button>
              </form>

              <div className="flex items-center space-x-2">
                <label className="text-[11px] font-bold text-slate-700 whitespace-nowrap">Status:</label>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-600"
                >
                  <option value="TODOS">Todos os Status</option>
                  <option value="ATESTADA">Atestadas (Executadas)</option>
                  <option value="ABERTA">Abertas (Pendentes de Atesto)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4 CARDS EXECUTIVOS COM OS TOTAIS DO FILTRO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Valor Global do(s) Contrato(s)
                </span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <Building className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-blue-900 mt-2">
                {totais.valorGlobalContratos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Instrumentos no escopo do filtro</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Valor Provisionado (Estimado)
                </span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-amber-700 mt-2">
                {totais.valorProvisionado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Processos em aberto (estimativas)</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Valor Atestado (Executado)
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-emerald-700 mt-2">
                {totais.valorAtestado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Valores com medição e ateste confirmados</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Saldo Geral do(s) Contrato(s)
                </span>
                <div className={`p-2 rounded-xl ${totais.saldoContrato >= 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700'}`}>
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className={`text-xl font-extrabold mt-2 ${totais.saldoContrato >= 0 ? 'text-indigo-900' : 'text-rose-700'}`}>
                {totais.saldoContrato.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Global - (Provisionado + Atestado) • {totais.quantidadeDespesas} lançamentos
              </p>
            </div>
          </div>

          {/* TABELA DE DESPESAS FILTRADAS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-bold text-slate-700">
                Detalhamento dos Lançamentos ({despesas.length} registros)
              </span>
              <button
                onClick={carregarDespesas}
                className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Atualizar</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Contrato & Objeto</th>
                    <th className="py-3 px-4">Processo de Despesa</th>
                    <th className="py-3 px-4">NF / Atesto</th>
                    <th className="py-3 px-4">Referência</th>
                    <th className="py-3 px-4">Campus / Cidade</th>
                    <th className="py-3 px-4 text-right">Valor Estimado (Provisão)</th>
                    <th className="py-3 px-4 text-right">Valor Atestado (Efetivo)</th>
                    <th className="py-3 px-4 text-center">Status / Débito no Contrato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loadingDespesas ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">
                        Carregando registros de despesa...
                      </td>
                    </tr>
                  ) : despesas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">
                        Nenhuma despesa localizada com a combinação de filtros selecionada.
                      </td>
                    </tr>
                  ) : (
                    despesas.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-bold text-slate-800">
                            {d.contrato?.numeroContrato ? `Contrato ${d.contrato.numeroContrato}` : (d.numeroContratoRef || 'Contrato S/N')}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate" title={d.contrato?.objeto}>
                            {d.contrato?.objeto || 'Objeto não especificado'}
                          </div>
                          {d.contrato?.fornecedor?.razaoSocial && (
                            <div className="text-[10px] text-blue-600 font-medium truncate">
                              {d.contrato.fornecedor.razaoSocial}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                          {d.processoSeiDespesa || '-'}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{d.numeroNotaFiscal || 'Aguardando NF'}</div>
                          <div className="text-[10px] text-slate-400">
                            {d.dataAtesto ? new Date(d.dataAtesto).toLocaleDateString('pt-BR') : 'Sem data atesto'}
                          </div>
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

      {/* TAB 2: AUDITORIA INDIVIDUAL & FICHA DO CONTRATO */}
      {activeTab === 'AUDITORIA_INDIVIDUAL' && (
        <div className="space-y-6">
          {/* Contract Selector */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
            <Building className="w-5 h-5 text-blue-700 flex-shrink-0" />
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Selecione o Contrato:</label>
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

          {/* Resumo do Contrato */}
          {contratoAtual && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 uppercase">
                    {contratoAtual.tipoContrato.replace(/_/g, ' ')}
                  </span>
                  <h3 className="font-bold text-slate-900 text-lg mt-1">
                    {contratoAtual.numeroContrato ? `Contrato nº ${contratoAtual.numeroContrato}` : `Empenho: ${contratoAtual.numeroEmpenho}`}
                  </h3>
                  <p className="text-xs text-blue-700 font-mono mt-0.5">SEI: {contratoAtual.processoSeiMae}</p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Valor Global Atualizado</span>
                  <span className="text-xl font-extrabold text-slate-900">
                    {contratoAtual.valorAtualizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="font-bold text-slate-700 block mb-1">Empresa Contratada</span>
                  <div className="font-semibold text-slate-900">{contratoAtual.fornecedor?.razaoSocial}</div>
                  <div className="text-[11px] text-slate-500 font-mono">CNPJ: {contratoAtual.fornecedor?.cnpj}</div>
                  <div className="text-[11px] text-slate-500">Endereço: {contratoAtual.fornecedor?.endereco || 'Não informado'}</div>
                  <div className="text-[11px] text-slate-500">Signatário: {contratoAtual.fornecedor?.nomeRepresentanteLegal || 'Não informado'}</div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-700 block mb-1">Vigência & Regime</span>
                  <div className="text-slate-800">
                    {new Date(contratoAtual.vigenciaInicio).toLocaleDateString('pt-BR')} a {new Date(contratoAtual.vigenciaFim).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="text-[11px] text-blue-700 font-semibold mt-1">
                    Tipo: {contratoAtual.tipoVigencia.replace(/_/g, ' ')}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-700 block mb-1">Equipe de Fiscalização</span>
                  <div className="space-y-0.5 text-[11px]">
                    {contratoAtual.responsaveis?.map((r: any) => (
                      <div key={r.id}>
                        <span className="font-semibold text-slate-700">{r.tipoAtuacao.replace(/_/g, ' ')}:</span> {r.user.nome}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 text-xs block mb-1.5">Descrição do Objeto:</span>
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                  {contratoAtual.objeto}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
