'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  FileText,
  Download,
  MapPin,
  Send,
  Search,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ImrResultadoCalculado,
  ImrItemOcorrencia,
  calcularGlosaImr,
  gerarWorkbookImrZelo,
} from '@/lib/imr-parser';

interface ImrLeituraModalProps {
  contratos: any[];
   avaliacaoInicial?: ImrResultadoCalculado | null;
  contratoInicialId?: string;
  onClose: () => void;
  onSalvo: () => void;
  onAbrirNotificacao?: (dadosSugeridos: any) => void;
}

export function exportarImrPdfOficial(dados: ImrResultadoCalculado) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - UERN', 148.5, 12, { align: 'center' });
  doc.setFontSize(9);
  doc.text('PRÓ-REITORIA DE ADMINISTRAÇÃO - PROAD • DIRETORIA DE ADMINISTRAÇÃO E SERVIÇOS - DAS', 148.5, 16.5, {
    align: 'center',
  });
  doc.setFontSize(10.5);
  doc.setTextColor(0, 51, 102);
  doc.text('ANEXO I — INSTRUMENTO DE MEDIÇÃO DE RESULTADO (IMR)', 148.5, 22.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Contrato nº: ${dados.contratoNumero || '24/2026'}   |   Contratada: ${dados.contratada || 'ZELO RECURSOS HUMANOS LTDA'}`, 14, 29);
  doc.text(
    `Mês de Competência: ${dados.mesCompetencia || '-'}   |   Local/Campus: ${dados.localCampus || 'Todos os Campi'}   |   Total de Pontos: ${dados.totalPontos.toFixed(1)} pts   |   Glosa: ${dados.percentualGlosa}% (${dados.grauAceitacao})`,
    14,
    34
  );

  const tableRows = (dados.itens || []).map((it, idx) => [
    String(idx + 1),
    it.indicador.replace('Indicador nº ', 'Ind. '),
    it.servico,
    it.descricao,
    `${it.pontuacaoPrevista} pt(s)`,
    it.ocorreu ? 'SIM' : 'NÃO',
    it.ocorreu ? String(it.pontuacaoAplicada) : '0',
    it.documentoSei || '-',
  ]);

  autoTable(doc, {
    startY: 38,
    head: [
      [
        '#',
        'Indicador',
        'Serviço',
        'Descrição da Ocorrência',
        'Previsto',
        'SIM/NÃO',
        'Aplicado',
        'Doc. Comprobatório / ID SEI',
      ],
    ],
    body: tableRows,
    styles: { fontSize: 7, cellPadding: 1.6 },
    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 34 },
      2: { cellWidth: 28 },
      3: { cellWidth: 105 },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 15, halign: 'center' },
      7: { cellWidth: 46 },
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body') {
        const rowRaw = hookData.row.raw as string[];
        if (rowRaw && rowRaw[5] === 'SIM') {
          hookData.cell.styles.fillColor = [254, 242, 242];
          if (hookData.column.index === 5 || hookData.column.index === 6) {
            hookData.cell.styles.textColor = [185, 28, 28];
            hookData.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 180;
  const yFooter = Math.min(198, finalY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(
    `Total de Pontos Aplicados: ${dados.totalPontos.toFixed(1)} pts  •  Percentual de Glosa: ${dados.percentualGlosa}%  •  Avaliação: ${dados.grauAceitacao}`,
    14,
    yFooter
  );
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Fiscal Responsável: ${dados.fiscalNome || 'Fiscalização do Contrato'}   |   Observações: ${dados.observacoes || 'Sem observações adicionais'}   |   Data: ${dados.dataAvaliacao || new Date().toLocaleDateString('pt-BR')}`,
    14,
    yFooter + 5
  );

  const compSlug = (dados.mesCompetencia || 'competencia').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`IMR_ZELO_${compSlug}.pdf`);
}

export default function ImrLeituraModal({
  contratos,
  avaliacaoInicial = null,
  contratoInicialId = '',
  onClose,
  onSalvo,
  onAbrirNotificacao,
}: ImrLeituraModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dadosImr, setDadosImr] = useState<ImrResultadoCalculado | null>(avaliacaoInicial);
  const [contratoSelecionadoId, setContratoSelecionadoId] = useState(contratoInicialId);
  const [salvando, setSalvando] = useState(false);
  const [filtroServico, setFiltroServico] = useState<string>('TODOS');
  const [apenasOcorrencias, setApenasOcorrencias] = useState<boolean>(false);
  const [buscaTexto, setBuscaTexto] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recalcularTotais = (itensAtualizados: ImrItemOcorrencia[], base: ImrResultadoCalculado): ImrResultadoCalculado => {
    const totalPontos = Number(
      itensAtualizados
        .reduce((acc, it) => acc + (it.ocorreu ? Number(it.pontuacaoAplicada || 0) : 0), 0)
        .toFixed(2)
    );
    const glosaInfo = calcularGlosaImr(totalPontos);
    return {
      ...base,
      itens: itensAtualizados,
      totalPontos,
      percentualGlosa: glosaInfo.percentual,
      grauAceitacao: glosaInfo.grau,
      requerProcessoSancionatorio: glosaInfo.sancionatorio,
    };
  };

  const handleToggleOcorrencia = (indexReal: number, novoOcorreu: boolean) => {
    if (!dadosImr) return;
    const copia = [...dadosImr.itens];
    const item = { ...copia[indexReal] };
    item.ocorreu = novoOcorreu;
    item.pontuacaoAplicada = novoOcorreu ? Number(item.pontuacaoPrevista || 0) : 0;
    copia[indexReal] = item;
    setDadosImr(recalcularTotais(copia, dadosImr));
  };

  const handleChangePontuacaoAplicada = (indexReal: number, novoValor: number) => {
    if (!dadosImr) return;
    const copia = [...dadosImr.itens];
    const item = { ...copia[indexReal] };
    item.pontuacaoAplicada = Math.max(0, novoValor);
    item.ocorreu = item.pontuacaoAplicada > 0;
    copia[indexReal] = item;
    setDadosImr(recalcularTotais(copia, dadosImr));
  };

  const handleChangeDocumentoSei = (indexReal: number, texto: string) => {
    if (!dadosImr) return;
    const copia = [...dadosImr.itens];
    copia[indexReal] = { ...copia[indexReal], documentoSei: texto };
    setDadosImr({ ...dadosImr, itens: copia });
  };

  const carregarMatrizComFatos = async (cId?: string, mesComp?: string, campusFiltro?: string) => {
    setLoading(true);
    try {
      const targetContratoId = cId ?? contratoSelecionadoId;
      const targetMes = mesComp ?? dadosImr?.mesCompetencia ?? new Date().toISOString().slice(0, 7);
      const targetCampus = campusFiltro ?? dadosImr?.localCampus ?? 'Todos os Campi';

      const params = new URLSearchParams({ action: 'TEMPLATE_COM_FATOS' });
      if (targetContratoId) params.set('contratoId', targetContratoId);
      if (targetMes) params.set('mesCompetencia', targetMes);
      if (targetCampus && targetCampus !== 'Todos os Campi') params.set('campus', targetCampus);

      const res = await fetch(`/api/imr?${params.toString()}`);
      const data = await res.json();
      if (data.template) {
        const zeloContrato =
          contratos.find((c) => c.id === targetContratoId) ||
          contratos.find((c) => (c.numeroContrato || '').includes('24/2026')) ||
          contratos[0];

        if (zeloContrato && !targetContratoId) {
          setContratoSelecionadoId(zeloContrato.id);
        }

        const baseInicial: ImrResultadoCalculado = {
          contratoNumero: zeloContrato?.numeroContrato || '24/2026',
          objetoContratual:
            zeloContrato?.objeto ||
            'Limpeza, conservação, copeiragem, jardinagem, recepção e apoio ao almoxarifado',
          contratada: zeloContrato?.fornecedor?.razaoSocial || 'ZELO RECURSOS HUMANOS LTDA',
          mesCompetencia: targetMes,
          localCampus: targetCampus,
          totalPontos: 0,
          percentualGlosa: 0,
          grauAceitacao: 'Totalmente Aceitável (Sem glosa)',
          requerProcessoSancionatorio: false,
          fiscalNome: dadosImr?.fiscalNome || '',
          observacoes: dadosImr?.observacoes || '',
          dataAvaliacao: new Date().toLocaleDateString('pt-BR'),
          itens: data.template,
        };

        setDadosImr(recalcularTotais(data.template, baseInicial));
      }
    } catch {
      alert('Erro ao carregar matriz oficial de IMR.');
    } finally {
      setLoading(false);
    }
  };

  const processarArquivo = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|ods)$/i)) {
      alert('Por favor, selecione uma planilha no formato .xlsx ou .ods');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (contratoSelecionadoId) {
        formData.append('contratoId', contratoSelecionadoId);
      }

      const res = await fetch('/api/imr', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.dadosExtraidos) {
        setDadosImr(data.dadosExtraidos);
        if (data.contratoSugerido) {
          setContratoSelecionadoId(data.contratoSugerido.id);
        }
      } else {
        alert(data.error || 'Erro ao processar planilha de IMR.');
      }
    } catch (e: any) {
      alert(e.message || 'Erro de conexão ao ler planilha');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processarArquivo(e.dataTransfer.files[0]);
    }
  };

  const handleExportarXlsx = () => {
    if (!dadosImr) return;
    const wb = gerarWorkbookImrZelo(dadosImr);
    const compSlug = (dadosImr.mesCompetencia || '2026').replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(wb, `IMR_ZELO_${compSlug}.xlsx`);
  };

  const handleSalvarNoSistema = async () => {
    if (!contratoSelecionadoId) {
      alert('Selecione o contrato administrativo vinculado a esta medição de IMR.');
      return;
    }
    if (!dadosImr) return;

    setSalvando(true);
    try {
      const contrato = contratos.find((c) => c.id === contratoSelecionadoId);
      const valorFaturaEstimada = (contrato?.valorGlobal || 0) / (contrato?.vigenciaMeses || 12);
      const valorGlosa = (valorFaturaEstimada * dadosImr.percentualGlosa) / 100;

      const res = await fetch('/api/imr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contratoId: contratoSelecionadoId,
          mesCompetencia: dadosImr.mesCompetencia || new Date().toISOString().slice(0, 7),
          localCampus: dadosImr.localCampus || 'Campus Central Mossoró',
          totalPontos: dadosImr.totalPontos,
          percentualGlosa: dadosImr.percentualGlosa,
          valorGlosa,
          observacoes: dadosImr.observacoes || dadosImr.grauAceitacao,
          fiscalNome: dadosImr.fiscalNome,
          status: dadosImr.requerProcessoSancionatorio ? 'REQUER_NOTIFICACAO' : 'CONCLUIDO',
          itens: dadosImr.itens,
        }),
      });

      if (res.ok) {
        alert('Avaliação de IMR cadastrada com sucesso!');
        onSalvo();
      } else {
        const d = await res.json();
        alert(d.error || 'Falha ao salvar IMR');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de conexão');
    } finally {
      setSalvando(false);
    }
  };

  const handleGerarNotificacaoDireta = () => {
    if (!dadosImr) return;
    const contrato = contratos.find((c) => c.id === contratoSelecionadoId);
    const ocorrenciasGraves = dadosImr.itens.filter((i) => i.ocorreu);

    const descricaoFatos = ocorrenciasGraves
      .map(
        (i) =>
          `• ${i.indicador} (${i.servico}): ${i.descricao} (Pontuação aplicada: ${i.pontuacaoAplicada} pts${
            i.documentoSei ? ` - Doc SEI: ${i.documentoSei}` : ''
          })`
      )
      .join('\n');

    const dadosSugeridos = {
      contratoId: contratoSelecionadoId,
      contratoNumero: contrato?.numeroContrato || dadosImr.contratoNumero,
      razaoSocial: contrato?.fornecedor?.razaoSocial || dadosImr.contratada,
      cnpj: contrato?.fornecedor?.cnpj || '',
      processoSei: contrato?.processoSeiMae || '',
      objeto: contrato?.objeto || dadosImr.objetoContratual,
      assunto: `Aplicação de Sanção / Glosa do IMR - Competência ${dadosImr.mesCompetencia}`,
      clausulaDescumprida: `Anexo I (IMR) do Contrato Administrativo e Art. 44 da IN 01/2026 UERN`,
      descricaoFatos: `Conforme apuração no Instrumento de Medição de Resultado (IMR) referente ao mês ${dadosImr.mesCompetencia}, a Contratada atingiu a pontuação total de ${dadosImr.totalPontos} pontos (${dadosImr.grauAceitacao}), ensejando glosa de ${dadosImr.percentualGlosa}% da fatura mensal pelas seguintes ocorrências:\n${descricaoFatos}`,
      penalidadeProposta:
        dadosImr.percentualGlosa > 0
          ? `Glosa contratual de ${dadosImr.percentualGlosa}% na fatura de referência e Advertência/Multa compensatória`
          : 'Advertência por descumprimento de indicadores do IMR',
      fiscalNome: dadosImr.fiscalNome || 'Fiscal Administrativo',
    };

    if (onAbrirNotificacao) {
      onAbrirNotificacao(dadosSugeridos);
    }
  };

  const servicosDisponiveis = [
    'TODOS',
    'LIMPEZA E CONSERVAÇÃO',
    'COPEIRAGEM',
    'JARDINAGEM',
    'RECEPÇÃO',
    'APOIO AO ALMOXARIFADO',
    'SUPERVISÃO',
    'GERAL',
  ];

  const itensFiltradosComIndice = (dadosImr?.itens || [])
    .map((item, idxReal) => ({ item, idxReal }))
    .filter(({ item }) => {
      if (filtroServico !== 'TODOS' && item.servico !== filtroServico) return false;
      if (apenasOcorrencias && !item.ocorreu) return false;
      if (buscaTexto.trim()) {
        const q = buscaTexto.toLowerCase();
        return (
          item.descricao.toLowerCase().includes(q) ||
          item.indicador.toLowerCase().includes(q) ||
          item.servico.toLowerCase().includes(q) ||
          (item.documentoSei || '').toLowerCase().includes(q)
        );
      }
      return true;
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-6xl w-full max-h-[94vh] flex flex-col overflow-hidden my-auto">
        {/* Cabeçalho */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Avaliação e Leitura Inteligente de IMR — Modelo Oficial UERN / Zelo (58 Critérios)
              </h3>
              <p className="text-xs text-slate-500">
                Preencha interativamente na tela ou importe a planilha .xlsx / .ods • Exportação fiel ao Anexo I (IMR - ZELO.xlsx)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-700 text-xs">
          {/* Zona de Upload ou Abertura Interativa */}
          {!dadosImr && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-blue-600 bg-blue-50/50 scale-[0.99]'
                  : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.ods"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    processarArquivo(e.target.files[0]);
                  }
                }}
              />
              <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm mb-1">
                {loading ? 'Carregando matriz oficial de IMR...' : 'Clique ou arraste sua planilha IMR (.xlsx / .ods) aqui'}
              </h4>
              <p className="text-slate-500 text-xs max-w-md mx-auto">
                Suporta a planilha oficial <strong>IMR - ZELO.xlsx</strong> (Anexo I - PROAD/DAS). O sistema lê todas as marcações SIM/NÃO, pontuações e IDs SEI automaticamente.
              </p>

              <div className="mt-6 pt-5 border-t border-slate-200/80 flex flex-col items-center">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2.5">
                  Ou avalie diretamente na tela (sem precisar abrir o Excel antes):
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    carregarMatrizComFatos();
                  }}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#003366] hover:bg-[#002244] text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                  <span>Abrir Matriz Interativa do IMR Zelo na Tela (58 Critérios + Apuração de Faltas)</span>
                </button>
              </div>
            </div>
          )}

          {/* Matriz Interativa Carregada */}
          {dadosImr && (
            <div className="space-y-4">
              {/* Painel Editável de Metadados do IMR */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <div className="lg:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                    Contrato Vinculado *
                  </label>
                  <select
                    value={contratoSelecionadoId}
                    onChange={(e) => {
                      const novoId = e.target.value;
                      setContratoSelecionadoId(novoId);
                      const c = contratos.find((ct) => ct.id === novoId);
                      if (c) {
                        setDadosImr({
                          ...dadosImr,
                          contratoNumero: c.numeroContrato || c.numeroEmpenho || '24/2026',
                          contratada: c.fornecedor?.razaoSocial || dadosImr.contratada,
                          objetoContratual: c.objeto || dadosImr.objetoContratual,
                        });
                      }
                    }}
                    className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
                  >
                    <option value="">Selecione um contrato...</option>
                    {contratos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.numeroContrato ? `Contrato nº ${c.numeroContrato}` : `Empenho ${c.numeroEmpenho}`} -{' '}
                        {c.fornecedor?.razaoSocial}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                    Mês de Competência *
                  </label>
                  <input
                    type="month"
                    value={dadosImr.mesCompetencia || ''}
                    onChange={(e) => setDadosImr({ ...dadosImr, mesCompetencia: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                    Local / Campus *
                  </label>
                  <select
                    value={dadosImr.localCampus || 'Todos os Campi'}
                    onChange={(e) => setDadosImr({ ...dadosImr, localCampus: e.target.value })}
                    className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
                  >
                    <option value="Todos os Campi">Todos os Campi UERN</option>
                    <option value="Campus Central Mossoró">Campus Central - Mossoró</option>
                    <option value="Campus Assú">Campus Assú</option>
                    <option value="Campus Caicó">Campus Caicó</option>
                    <option value="Campus Natal">Campus Natal</option>
                    <option value="Campus Patu">Campus Patu</option>
                    <option value="Campus Pau dos Ferros">Campus Pau dos Ferros</option>
                  </select>
                </div>

                <div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      carregarMatrizComFatos(
                        contratoSelecionadoId,
                        dadosImr.mesCompetencia,
                        dadosImr.localCampus
                      )
                    }
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-lg text-xs font-bold transition cursor-pointer"
                    title="Cruzar com faltas sem substituição lançadas na frequência de terceirizados desta competência"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>Sincronizar Faltas</span>
                  </button>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                    Fiscal Responsável (Nome e Matrícula)
                  </label>
                  <input
                    type="text"
                    value={dadosImr.fiscalNome || ''}
                    onChange={(e) => setDadosImr({ ...dadosImr, fiscalNome: e.target.value })}
                    placeholder="Ex.: Eginaldo Alves / Rodrigo Guerra - Mat. ..."
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-600"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                    Observações Gerais da Avaliação Mensal
                  </label>
                  <input
                    type="text"
                    value={dadosImr.observacoes || ''}
                    onChange={(e) => setDadosImr({ ...dadosImr, observacoes: e.target.value })}
                    placeholder="Observações complementares da fiscalização para constar no rodapé do IMR..."
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Cards de Resumo de Pontos, Glosa e Botões de Exportação */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Pontuação Total Aplicada
                  </span>
                  <span className="text-2xl font-extrabold text-rose-600 mt-1 block">
                    {dadosImr.totalPontos.toFixed(1)}{' '}
                    <span className="text-xs font-normal text-slate-500">pontos</span>
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    {dadosImr.itens.filter((i) => i.ocorreu).length} de {dadosImr.itens.length} critérios com ocorrência
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Glosa em Fatura (Anexo I)
                  </span>
                  <span className="text-2xl font-extrabold text-blue-700 mt-1 block">
                    {dadosImr.percentualGlosa > 0 ? `${dadosImr.percentualGlosa}%` : '0% (Sem Glosa)'}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Aplicada automaticamente na medição do mês
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Grau de Aceitação
                  </span>
                  <span
                    className={`text-xs font-bold mt-1 inline-block px-2.5 py-1 rounded-lg ${
                      dadosImr.totalPontos <= 5
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : dadosImr.totalPontos <= 20
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {dadosImr.grauAceitacao}
                  </span>
                  {dadosImr.requerProcessoSancionatorio && (
                    <span className="text-[10px] font-bold text-rose-600 block mt-1">
                      ⚠️ Requer Processo Sancionatório
                    </span>
                  )}
                </div>

                <div className="bg-slate-900 text-white p-3.5 rounded-xl flex flex-col justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                    Exportar IMR Preenchido (SEI)
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={handleExportarXlsx}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar Planilha (.XLSX Zelo)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => exportarImrPdfOficial(dadosImr)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] transition cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Baixar Relatório (.PDF SEI)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Barra de Filtros por Serviço e Busca dos 58 Critérios */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {servicosDisponiveis.map((srv) => (
                      <button
                        key={srv}
                        type="button"
                        onClick={() => setFiltroServico(srv)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          filtroServico === srv
                            ? 'bg-[#003366] text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {srv}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={apenasOcorrencias}
                        onChange={(e) => setApenasOcorrencias(e.target.checked)}
                        className="rounded border-slate-300 text-rose-600"
                      />
                      <span>Apenas Ocorrências Marcadas (SIM)</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setDadosImr(null)}
                      className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer"
                    >
                      Importar outra planilha
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={buscaTexto}
                    onChange={(e) => setBuscaTexto(e.target.value)}
                    placeholder="Buscar entre os 58 critérios por palavra-chave (ex.: banheiro, café, poda, recepção, almoxarifado, falta, EPI, FGTS, salário)..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Tabela Interativa dos 58 Critérios */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="max-h-[42vh] overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-2.5 w-10 text-center">#</th>
                        <th className="py-2.5 px-3 w-48">Indicador / Serviço</th>
                        <th className="py-2.5 px-3">Descrição da Ocorrência (Anexo I - IMR Zelo)</th>
                        <th className="py-2.5 px-2 text-center w-20">Previsto</th>
                        <th className="py-2.5 px-2 text-center w-28">Ocorreu?</th>
                        <th className="py-2.5 px-2 text-center w-24">Pts Aplicados</th>
                        <th className="py-2.5 px-3 w-56">Doc. Comprobatório / ID SEI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itensFiltradosComIndice.map(({ item: it, idxReal }) => (
                        <tr
                          key={idxReal}
                          className={
                            it.ocorreu
                              ? 'bg-rose-50/60 hover:bg-rose-50/90 transition-colors'
                              : 'hover:bg-slate-50/80 transition-colors'
                          }
                        >
                          <td className="py-2 px-2.5 text-center font-mono text-[11px] text-slate-400">
                            {idxReal + 1}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            <span className="block text-[10px] text-slate-500 leading-tight">
                              {it.indicador}
                            </span>
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-slate-200/70 text-[10px] font-bold text-slate-700">
                              {it.servico}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-800 leading-snug">{it.descricao}</td>
                          <td className="py-2 px-2 text-center font-mono font-semibold text-slate-700">
                            {it.pontuacaoPrevista} pt{it.pontuacaoPrevista > 1 ? 's' : ''}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => handleToggleOcorrencia(idxReal, true)}
                                className={`px-2.5 py-1 text-[10px] font-extrabold transition cursor-pointer ${
                                  it.ocorreu
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-white text-slate-500 hover:bg-rose-50'
                                }`}
                              >
                                SIM
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleOcorrencia(idxReal, false)}
                                className={`px-2.5 py-1 text-[10px] font-extrabold transition cursor-pointer ${
                                  !it.ocorreu
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white text-slate-500 hover:bg-emerald-50'
                                }`}
                              >
                                NÃO
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            {it.ocorreu ? (
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={it.pontuacaoAplicada}
                                onChange={(e) =>
                                  handleChangePontuacaoAplicada(idxReal, parseFloat(e.target.value) || 0)
                                }
                                className="w-16 px-1.5 py-1 text-center font-mono font-bold text-rose-700 bg-white border border-rose-300 rounded-lg text-xs outline-none focus:border-rose-600"
                              />
                            ) : (
                              <span className="font-mono text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={it.documentoSei || ''}
                              onChange={(e) => handleChangeDocumentoSei(idxReal, e.target.value)}
                              placeholder={it.ocorreu ? 'Informe ID SEI / Ocorrência *' : 'Opcional (ID SEI)'}
                              className={`w-full px-2 py-1 rounded-lg border text-[11px] font-mono outline-none ${
                                it.ocorreu
                                  ? 'bg-white border-rose-300 text-slate-900 focus:border-rose-600'
                                  : 'bg-slate-50/70 border-slate-200 text-slate-600 focus:bg-white focus:border-blue-500'
                              }`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        {dadosImr && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              {dadosImr.requerProcessoSancionatorio && (
                <button
                  type="button"
                  onClick={handleGerarNotificacaoDireta}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Instaurar Notificação da Contratada (15 dias)</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvando || !contratoSelecionadoId}
                onClick={handleSalvarNoSistema}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-all disabled:opacity-50"
              >
                {salvando ? 'Salvando Avaliação...' : 'Salvar Avaliação de IMR no Sistema'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
