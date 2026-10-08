'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Building,
  DollarSign,
  Users,
  FileSpreadsheet,
  Layers,
  Search,
  Check,
  MapPin
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { valorPorExtenso } from '@/lib/numero-extenso';

interface OficioLiberacaoModalProps {
  contrato: any;
  trabalhadores: any[];
  saldosPorTrabalhador: Record<string, any>;
  onClose: () => void;
  onSucesso: () => void;
}

export default function OficioLiberacaoModal({
  contrato,
  trabalhadores,
  saldosPorTrabalhador,
  onClose,
  onSucesso,
}: OficioLiberacaoModalProps) {
  // Dados do Ofício
  const [numeroOficio, setNumeroOficio] = useState('Ofício nº 162/2026/UERN - PROAD - DAS/UERN');
  const [processoSei, setProcessoSei] = useState(contrato?.processoSeiMae || '04410038.003805/2025-28');
  const [bancoVinculado, setBancoVinculado] = useState('Banco do Brasil S.A.');
  const [agenciaVinculada, setAgenciaVinculada] = useState('3795-8 – Escritório Setor Público RN');
  const [contaVinculada, setContaVinculada] = useState('4900101224108');

  // Conta de Crédito da Contratada
  const [bancoCredito, setBancoCredito] = useState('Caixa Econômica Federal');
  const [agenciaCredito, setAgenciaCredito] = useState('2183');
  const [contaCredito, setContaCredito] = useState('6702-0');
  const [cnpjCredito, setCnpjCredito] = useState(contrato?.fornecedor?.cnpj || '');

  // Rubrica & Alíquota
  const [rubrica, setRubrica] = useState('DECIMO_TERCEIRO_8_33');
  const [aliquotaEncargos, setAliquotaEncargos] = useState(35.30); // Padrão Caderno de Logística UERN (35,30%)
  const [mesesPadrao, setMesesPadrao] = useState(10);
  const [filtroCampus, setFiltroCampus] = useState('TODOS');
  const [busca, setBusca] = useState('');

  // Lista editável de trabalhadores
  const [itensTrabalhador, setItensTrabalhador] = useState(() => {
    return (trabalhadores || []).map((t, idx) => {
      const salario = t.salarioBaseCct || 2000;
      return {
        trabalhadorId: t.id,
        nome: t.nomeCompleto,
        cpf: t.cpf,
        cargo: t.funcao || 'Auxiliar',
        campus: t.cidade || t.campus || (idx % 4 === 0 ? 'Assú' : idx % 5 === 0 ? 'Caicó' : idx % 6 === 0 ? 'Natal' : 'Mossoró'),
        salario: salario,
        mesesRetidos: 10,
        selected: true,
      };
    });
  });

  const [processandoDebito, setProcessandoDebito] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Manipular meses ou seleção por trabalhador
  const handleToggleSelect = (id: string) => {
    setItensTrabalhador((prev) =>
      prev.map((it) => (it.trabalhadorId === id ? { ...it, selected: !it.selected } : it))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setItensTrabalhador((prev) => prev.map((it) => ({ ...it, selected: select })));
  };

  const handleChangeMeses = (id: string, meses: number) => {
    setItensTrabalhador((prev) =>
      prev.map((it) => (it.trabalhadorId === id ? { ...it, mesesRetidos: Math.max(1, meses) } : it))
    );
  };

  const handleAplicarMesesEmLote = () => {
    setItensTrabalhador((prev) =>
      prev.map((it) => ({ ...it, mesesRetidos: mesesPadrao }))
    );
  };

  // Cálculos dinâmicos
  const calculados = useMemo(() => {
    return itensTrabalhador.map((it) => {
      const base = (it.salario / 12) * it.mesesRetidos;
      const encargos = base * (aliquotaEncargos / 100);
      const total = base + encargos;
      return {
        ...it,
        valorBase: base,
        valorEncargos: encargos,
        valorTotal: total,
      };
    });
  }, [itensTrabalhador, aliquotaEncargos]);

  const selecionados = useMemo(() => {
    return calculados.filter((c) => c.selected);
  }, [calculados]);

  const totalGeral = useMemo(() => {
    return selecionados.reduce((acc, it) => acc + it.valorTotal, 0);
  }, [selecionados]);

  const totalPorExtenso = useMemo(() => {
    return valorPorExtenso(totalGeral);
  }, [totalGeral]);

  // Filtragem visual
  const listaFiltrada = useMemo(() => {
    return calculados.filter((it) => {
      const matchCampus = filtroCampus === 'TODOS' || it.campus.toLowerCase().includes(filtroCampus.toLowerCase());
      const matchBusca =
        !busca.trim() ||
        it.nome.toLowerCase().includes(busca.toLowerCase()) ||
        it.cargo.toLowerCase().includes(busca.toLowerCase()) ||
        it.cpf.includes(busca);
      return matchCampus && matchBusca;
    });
  }, [calculados, filtroCampus, busca]);

  // 1. Gerar Ofício em PDF
  const gerarOficioPdf = () => {
    const doc = new jsPDF();

    // Cabeçalho UERN Oficial
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text('Rua Almino Afonso, 478 - Bairro Centro, Mossoró/RN, CEP 59610-210', 15, 18);
    doc.text('Telefone: - http://portal.uern.br/', 15, 23);

    doc.setDrawColor(200, 200, 200);
    doc.line(15, 27, 195, 27);

    // Número do Ofício e Local/Data
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(numeroOficio, 15, 36);

    // Destinatário
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Ao(À) Sr(a) Gerente', 15, 46);
    doc.setFont('helvetica', 'bold');
    doc.text(bancoVinculado, 15, 51);
    doc.setFont('helvetica', 'normal');
    doc.text(agenciaVinculada, 15, 56);

    // Assunto
    doc.setFont('helvetica', 'bold');
    doc.text('Assunto: Movimentação de Conta de Depósitos Vinculados em garantia', 15, 66);

    // Corpo do texto
    doc.setFont('helvetica', 'normal');
    const corpoTexto = [
      'Senhor(a) Gerente,',
      '',
      `Solicitamos providenciar, conforme indicado a seguir, a movimentação de ${totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${totalPorExtenso}), da conta nº ${contaVinculada} vinculada à empresa ${contrato?.fornecedor?.razaoSocial || 'EMPRESA CONTRATADA'}, CNPJ nº ${contrato?.fornecedor?.cnpj || cnpjCredito}, aberta para abrigar os recursos referentes ao contrato administrativo nº ${contrato?.numeroContrato || contrato?.numeroEmpenho || '028/2025'} - FUERN.`,
    ];

    doc.text(corpoTexto, 15, 76, { maxWidth: 180, lineHeightFactor: 1.3 });

    // Tabela de Dados Bancários de Crédito
    autoTable(doc, {
      startY: 105,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 3 },
      head: [['CREDITAR', 'Agência', 'Conta', 'CPF / CNPJ']],
      body: [
        [bancoCredito, agenciaCredito, contaCredito, cnpjCredito || contrato?.fornecedor?.cnpj || '-']
      ],
    });

    let currentY = (doc as any).lastAutoTable.finalY + 20;

    doc.setFont('helvetica', 'normal');
    doc.text('Atenciosamente,', 15, currentY);

    currentY += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('Diretoria de Administração e Serviços - DAS / PROAD', 15, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Documento emitido pelo Sistema SGC-UERN e assinado eletronicamente conforme Decreto Estadual nº 27.685/2018.`, 15, currentY + 5);
    doc.text(`Referência: Caso responda este Ofício, indicar expressamente o Processo nº ${processoSei}`, 15, currentY + 9);

    // Nova Página com o Anexo I - Memória de Cálculo
    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 51, 102);
    doc.text('ANEXO I – MEMÓRIA DE CÁLCULO DE LIBERAÇÃO DE CONTA VINCULADA', 105, 18, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Contrato nº ${contrato?.numeroContrato || contrato?.numeroEmpenho} • Rubrica: ${rubrica.replace(/_/g, ' ')} • Total: ${selecionados.length} empregados`, 105, 24, { align: 'center' });

    const rowsTabela = selecionados.map((s, idx) => [
      idx + 1,
      s.nome,
      s.cargo,
      s.campus,
      `${s.mesesRetidos} MESES`,
      s.salario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      s.valorBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      s.valorEncargos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      s.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    ]);

    // Linha final de total
    rowsTabela.push([
      '',
      'TOTAL A LIBERAR',
      '',
      '',
      '',
      '',
      selecionados.reduce((a, b) => a + b.valorBase, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      selecionados.reduce((a, b) => a + b.valorEncargos, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    ]);

    autoTable(doc, {
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2 },
      head: [['Nº', 'EMPREGADO', 'CARGO', 'CAMPUS', 'MESES', 'REMUNERAÇÃO', 'PROVISÃO BASE', 'ENCARGOS (35,3%)', 'TOTAL']],
      body: rowsTabela,
    });

    doc.save(`Oficio_Liberacao_Conta_Vinculada_${Date.now()}.pdf`);
  };

  // 2. Baixar Memória de Cálculo em Excel (.xlsx)
  const exportarMemoriaCalculoExcel = () => {
    if (selecionados.length === 0) return;

    // Agrupar por Campus conforme modelo oficial
    const campi = Array.from(new Set(selecionados.map((s) => s.campus)));
    const dadosExcel: any[] = [];

    dadosExcel.push({
      N: '',
      EMPREGADO: 'UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - UERN',
      CARGO: '',
      CAMPUS: '',
      MESES_RETIDOS: '',
      REMUNERACAO_MEDIA: '',
      VALOR_PROVISAO: '',
      ENCARGOS_GPS_FGTS: '',
      TOTAL: '',
    });
    dadosExcel.push({
      N: '',
      EMPREGADO: `MEMÓRIA DE CÁLCULO DE LIBERAÇÃO DE CONTA VINCULADA - CONTRATO Nº ${contrato?.numeroContrato || contrato?.numeroEmpenho}`,
      CARGO: '',
      CAMPUS: '',
      MESES_RETIDOS: '',
      REMUNERACAO_MEDIA: '',
      VALOR_PROVISAO: '',
      ENCARGOS_GPS_FGTS: '',
      TOTAL: '',
    });
    dadosExcel.push({});

    campi.forEach((camp) => {
      const grupo = selecionados.filter((s) => s.campus === camp);
      dadosExcel.push({
        N: '',
        EMPREGADO: `CAMPUS ${camp.toUpperCase()}`,
        CARGO: '',
        CAMPUS: '',
        MESES_RETIDOS: '',
        REMUNERACAO_MEDIA: '',
        VALOR_PROVISAO: '',
        ENCARGOS_GPS_FGTS: '',
        TOTAL: '',
      });

      grupo.forEach((item, idx) => {
        dadosExcel.push({
          N: idx + 1,
          EMPREGADO: item.nome,
          CARGO: item.cargo,
          CAMPUS: item.campus,
          MESES_RETIDOS: `${item.mesesRetidos} MESES`,
          REMUNERACAO_MEDIA: item.salario,
          VALOR_PROVISAO: item.valorBase,
          ENCARGOS_GPS_FGTS: item.valorEncargos,
          TOTAL: item.valorTotal,
        });
      });

      const subtotalCampus = grupo.reduce((a, b) => a + b.valorTotal, 0);
      dadosExcel.push({
        N: '',
        EMPREGADO: `TOTAL A LIBERAR - ${camp.toUpperCase()}`,
        CARGO: '',
        CAMPUS: '',
        MESES_RETIDOS: '',
        REMUNERACAO_MEDIA: '',
        VALOR_PROVISAO: '',
        ENCARGOS_GPS_FGTS: '',
        TOTAL: subtotalCampus,
      });
      dadosExcel.push({});
    });

    dadosExcel.push({
      N: '',
      EMPREGADO: 'TOTAL GERAL A LIBERAR',
      CARGO: '',
      CAMPUS: '',
      MESES_RETIDOS: '',
      REMUNERACAO_MEDIA: '',
      VALOR_PROVISAO: '',
      ENCARGOS_GPS_FGTS: '',
      TOTAL: totalGeral,
    });

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 40 },
      { wch: 25 },
      { wch: 15 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Memoria_Calculo_CV');
    XLSX.writeFile(wb, `Memoria_Calculo_CV_${contrato?.numeroContrato || 'Contrato'}.xlsx`);
  };

  // 3. Efetivar Débito e Envio ao Banco
  const handleConfirmarEnvioBanco = async () => {
    if (selecionados.length === 0) {
      alert('Selecione pelo menos um trabalhador para emitir o ofício e efetivar os débitos.');
      return;
    }

    const confirmou = window.confirm(
      `Confirma que o Ofício Bancário (${numeroOficio}) foi protocolado e enviado ao banco?\n\n` +
      `Será efetivado o débito automático de ${totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ` +
      `distribuído nos saldos individuais de ${selecionados.length} funcionários.`
    );

    if (!confirmou) return;

    setProcessandoDebito(true);
    try {
      const liberacoesPayload = selecionados.map((s) => ({
        trabalhadorId: s.trabalhadorId,
        rubrica: rubrica,
        valor: s.valorTotal,
      }));

      const res = await fetch('/api/conta-vinculada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contratoId: contrato.id,
          tipoOperacao: 'LIBERACAO_OFICIO_LOTE',
          numeroOficio,
          motivoLiberacao: `Ofício enviado ao banco para liberação de ${rubrica.replace(/_/g, ' ')} (${processoSei})`,
          competenciaMesAno: `${new Date().getMonth() + 1 < 10 ? '0' : ''}${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
          liberacoes: liberacoesPayload,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMensagemSucesso(`✅ Ofício enviado ao banco! ${data.message || 'Débitos por funcionário efetivados com sucesso.'}`);
        setTimeout(() => {
          onSucesso();
          onClose();
        }, 2500);
      } else {
        alert(data.error || 'Erro ao efetivar débitos no sistema');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de conexão');
    } finally {
      setProcessandoDebito(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-white/10 text-white backdrop-blur-md">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base md:text-lg">Emissão de Ofício Bancário & Liberação por Funcionário</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-extrabold uppercase">
                  Controle Individual
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Calcula os valores por empregado e baixa automaticamente o saldo de cada trabalhador ao confirmar o envio ao banco.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {mensagemSucesso && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl font-bold text-sm flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{mensagemSucesso}</span>
            </div>
          )}

          {/* Dados do Ofício e Contas Bancárias */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Nº do Ofício Bancário:</label>
              <input
                type="text"
                value={numeroOficio}
                onChange={(e) => setNumeroOficio(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Processo SEI de Referência:</label>
              <input
                type="text"
                value={processoSei}
                onChange={(e) => setProcessoSei(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Rubrica a Liberar:</label>
              <select
                value={rubrica}
                onChange={(e) => setRubrica(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-blue-900 outline-none focus:border-blue-600"
              >
                <option value="DECIMO_TERCEIRO_8_33">13º Salário (Provisão 8,33%)</option>
                <option value="FERIAS_8_33">Férias (Provisão 8,33%)</option>
                <option value="TERCO_FERIAS_2_78">1/3 Constitucional de Férias (2,78%)</option>
                <option value="MULTA_RESCISORIA_FGTS">Multa Rescisória de FGTS (4,00%)</option>
                <option value="FGTS_SOBRE_PROVISOES">FGTS sobre Provisões (8,00%)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Banco / Agência da Conta Vinculada:</label>
              <input
                type="text"
                value={`${bancoVinculado} - ${agenciaVinculada}`}
                onChange={(e) => setAgenciaVinculada(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Nº da Conta Vinculada (Débito):</label>
              <input
                type="text"
                value={contaVinculada}
                onChange={(e) => setContaVinculada(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-800 outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Conta de Crédito da Contratada:</label>
              <input
                type="text"
                value={`${bancoCredito} Ag: ${agenciaCredito} C/C: ${contaCredito}`}
                onChange={(e) => setContaCredito(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-700 outline-none"
              />
            </div>
          </div>

          {/* Barra de Ajuste de Alíquota e Meses em Lote */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50/60 p-3 rounded-2xl border border-blue-200 text-xs">
            <div className="flex items-center space-x-3">
              <span className="font-bold text-blue-900">Encargos Sociais (GPS / FGTS):</span>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  step="0.01"
                  value={aliquotaEncargos}
                  onChange={(e) => setAliquotaEncargos(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 bg-white border border-blue-300 rounded-lg font-bold text-blue-900 text-center"
                />
                <span className="font-bold text-blue-900">%</span>
              </div>
              <span className="text-[11px] text-blue-700">(Padrão 35,30% - Caderno de Logística UERN)</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-700 font-semibold">Meses Retidos Padrão:</span>
              <input
                type="number"
                min="1"
                max="12"
                value={mesesPadrao}
                onChange={(e) => setMesesPadrao(parseInt(e.target.value, 10) || 1)}
                className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-bold"
              />
              <button
                type="button"
                onClick={handleAplicarMesesEmLote}
                className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold text-[11px] transition-colors cursor-pointer"
              >
                Aplicar a Todos
              </button>
            </div>
          </div>

          {/* Filtros e Ações na Tabela de Funcionários */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-slate-600" />
              <span className="font-bold text-slate-800 text-xs">Funcionários do Contrato:</span>
              <span className="text-xs text-slate-500 font-medium">
                ({selecionados.length} de {calculados.length} selecionados para o ofício)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectAll(true)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Marcar Todos
              </button>
              <button
                type="button"
                onClick={() => handleSelectAll(false)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Desmarcar Todos
              </button>

              <select
                value={filtroCampus}
                onChange={(e) => setFiltroCampus(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="TODOS">Todos os Campi</option>
                <option value="Mossoró">Mossoró</option>
                <option value="Assú">Assú</option>
                <option value="Caicó">Caicó</option>
                <option value="Natal">Natal</option>
                <option value="Patu">Patu</option>
                <option value="Pau dos Ferros">Pau dos Ferros</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar funcionário..."
                  className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* Tabela de Trabalhadores & Valores Calculados */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">Sel.</th>
                  <th className="py-2.5 px-3">Funcionário / CPF</th>
                  <th className="py-2.5 px-3">Função</th>
                  <th className="py-2.5 px-3 text-center">Campus</th>
                  <th className="py-2.5 px-3 text-center w-24">Meses Retidos</th>
                  <th className="py-2.5 px-3 text-right">Salário Base</th>
                  <th className="py-2.5 px-3 text-right">Provisão</th>
                  <th className="py-2.5 px-3 text-right">GPS/FGTS (35,3%)</th>
                  <th className="py-2.5 px-3 text-right font-bold text-slate-900">Total a Liberar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {listaFiltrada.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400">
                      Nenhum funcionário encontrado.
                    </td>
                  </tr>
                ) : (
                  listaFiltrada.map((item) => (
                    <tr
                      key={item.trabalhadorId}
                      className={`hover:bg-slate-50 transition-colors ${item.selected ? 'bg-blue-50/20' : 'opacity-60'}`}
                    >
                      <td className="py-2 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => handleToggleSelect(item.trabalhadorId)}
                          className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-slate-900 block">{item.nome}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.cpf}</span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{item.cargo}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {item.campus}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={item.mesesRetidos}
                          onChange={(e) => handleChangeMeses(item.trabalhadorId, parseInt(e.target.value, 10) || 1)}
                          className="w-14 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-center text-xs font-bold"
                        />
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600">
                        {item.salario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700">
                        {item.valorBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600">
                        {item.valorEncargos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-2 px-3 text-right font-extrabold text-blue-950">
                        {item.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Resumo Financeiro & Valor por Extenso */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider block">
                Valor Total Autorizado no Ofício ({selecionados.length} empregados)
              </span>
              <span className="text-2xl font-black text-emerald-300">
                {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <p className="text-xs text-slate-300 mt-1 italic">
                "{totalPorExtenso}"
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={gerarOficioPdf}
                disabled={selecionados.length === 0}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-md transition-all cursor-pointer disabled:opacity-40"
                title="Visualizar e baixar documento oficial do Ofício em PDF"
              >
                <Printer className="w-4 h-4 text-blue-300" />
                <span>Baixar Ofício (.PDF)</span>
              </button>

              <button
                type="button"
                onClick={exportarMemoriaCalculoExcel}
                disabled={selecionados.length === 0}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow transition-all cursor-pointer disabled:opacity-40"
                title="Baixar planilha Excel com a memória de cálculo por campus"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>Memória de Cálculo (.XLSX)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer com Botão de Confirmação e Baixa por Funcionário */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-500 font-medium text-center sm:text-left">
            Ao marcar como enviado, o sistema registra imediatamente o débito individual de cada um dos {selecionados.length} trabalhadores.
          </span>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 bg-white text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmarEnvioBanco}
              disabled={selecionados.length === 0 || processandoDebito}
              className="inline-flex items-center space-x-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
            >
              {processandoDebito ? (
                <span>Lançando Débitos...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Marcar como Enviado ao Banco (Efetivar Débito)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
