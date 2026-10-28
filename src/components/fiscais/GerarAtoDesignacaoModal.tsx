'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileText,
  Download,
  Copy,
  Check,
  Building,
  Users,
  ShieldCheck,
  AlertCircle,
  Eye,
  Sliders,
  Printer,
  Loader2,
  CheckCircle2,
  Save,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  MembroEquipeAto,
  SubscritorProad,
  SUBCRITORES_PROAD_PADRAO,
  PORTARIA_COMPETENCIA_PADRAO,
  NORMATIVO_REFERENCIA_PADRAO,
  formatarPapelExtenso,
  montarAlineasAto,
} from '@/lib/ato-designacao-generator';

interface GerarAtoDesignacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  contratos: any[];
  initialContratoId?: string;
}

export default function GerarAtoDesignacaoModal({
  isOpen,
  onClose,
  contratos,
  initialContratoId,
}: GerarAtoDesignacaoModalProps) {
  const [selectedContratoId, setSelectedContratoId] = useState<string>(initialContratoId || '');
  const [activeTab, setActiveTab] = useState<'CONFIG' | 'PREVIEW'>('PREVIEW');
  const [loadingDados, setLoadingDados] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [copied, setCopied] = useState(false);
  const [salvandoMatriculas, setSalvandoMatriculas] = useState(false);

  // Campos do Formulário do Ato
  const [numeroAto, setNumeroAto] = useState('');
  const [dataExtenso, setDataExtenso] = useState('');
  const [cidadeData, setCidadeData] = useState('Mossoró-RN');
  const [notasEmpenhos, setNotasEmpenhos] = useState('');
  const [idsEmpenhos, setIdsEmpenhos] = useState('');
  const [portariaCompetencia, setPortariaCompetencia] = useState(PORTARIA_COMPETENCIA_PADRAO);
  const [normativoReferencia, setNormativoReferencia] = useState(NORMATIVO_REFERENCIA_PADRAO);
  const [subscritores, setSubscritores] = useState<SubscritorProad[]>(SUBCRITORES_PROAD_PADRAO);
  const [membros, setMembros] = useState<MembroEquipeAto[]>([]);
  const [contratoInfo, setContratoInfo] = useState<any>(null);
  const [htmlPreview, setHtmlPreview] = useState<string>('');

  // Sincroniza contrato selecionado quando initialContratoId mudar
  useEffect(() => {
    if (initialContratoId) {
      setSelectedContratoId(initialContratoId);
    } else if (contratos && contratos.length > 0 && !selectedContratoId) {
      setSelectedContratoId(contratos[0].id);
    }
  }, [initialContratoId, contratos]);

  // Carrega dados do contrato e monta minuta inicial
  useEffect(() => {
    if (!isOpen || !selectedContratoId) return;

    let isMounted = true;
    setLoadingDados(true);

    fetch('/api/fiscais/gerar-ato', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contratoId: selectedContratoId,
        formato: 'DADOS',
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.parametros) {
          const p = data.parametros;
          setNumeroAto(p.numeroAto || '');
          setDataExtenso(p.dataExtenso || '');
          setCidadeData(p.cidadeData || 'Mossoró-RN');
          setNotasEmpenhos(p.notasEmpenhos || '');
          setIdsEmpenhos(p.idsEmpenhos || '');
          setPortariaCompetencia(p.portariaCompetencia || PORTARIA_COMPETENCIA_PADRAO);
          setNormativoReferencia(p.normativoReferencia || NORMATIVO_REFERENCIA_PADRAO);
          setSubscritores(p.subscritores || SUBCRITORES_PROAD_PADRAO);
          setMembros(p.membros || []);
          setContratoInfo(data.contrato || null);
          setHtmlPreview(data.html || '');
        }
      })
      .catch((err) => console.error('Erro ao carregar minuta do ato:', err))
      .finally(() => {
        if (isMounted) setLoadingDados(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedContratoId]);

  // Atualiza prévia sempre que os campos editáveis mudarem
  useEffect(() => {
    if (!selectedContratoId || !contratoInfo) return;

    const debounceTimer = setTimeout(() => {
      fetch('/api/fiscais/gerar-ato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contratoId: selectedContratoId,
          formato: 'HTML',
          customizacoes: {
            numeroAto,
            dataExtenso,
            cidadeData,
            notasEmpenhos,
            idsEmpenhos,
            portariaCompetencia,
            normativoReferencia,
            subscritores,
            membros,
          },
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.html) {
            setHtmlPreview(data.html);
          }
        })
        .catch(console.error);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [
    selectedContratoId,
    contratoInfo,
    numeroAto,
    dataExtenso,
    cidadeData,
    notasEmpenhos,
    idsEmpenhos,
    portariaCompetencia,
    normativoReferencia,
    subscritores,
    membros,
  ]);

  // Alerta de matrículas pendentes
  const membrosSemMatricula = useMemo(() => {
    return membros.filter((m) => !m.matricula || m.matricula.trim() === '' || m.matricula.includes('____'));
  }, [membros]);

  const handleUpdateMembroMatricula = (index: number, novaMatricula: string) => {
    setMembros((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], matricula: novaMatricula };
      return copy;
    });
  };

  const handleUpdateMembroCampus = (index: number, novoCampus: string) => {
    setMembros((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], campusSetor: novoCampus };
      return copy;
    });
  };

  const handleToggleSubscritor = (index: number) => {
    setSubscritores((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ativo: !copy[index].ativo };
      return copy;
    });
  };

  // 1. Exportar DOCX
  const handleBaixarDocx = async () => {
    if (!selectedContratoId) return;
    setDownloadingDocx(true);
    try {
      const res = await fetch('/api/fiscais/gerar-ato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contratoId: selectedContratoId,
          formato: 'DOCX',
          customizacoes: {
            numeroAto,
            dataExtenso,
            cidadeData,
            notasEmpenhos,
            idsEmpenhos,
            portariaCompetencia,
            normativoReferencia,
            subscritores,
            membros,
          },
        }),
      });

      if (!res.ok) throw new Error('Falha ao gerar arquivo DOCX');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const numSanitized = numeroAto.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `Ato_Designacao_${numSanitized || 'SEI'}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Erro ao baixar arquivo Word (.docx)');
    } finally {
      setDownloadingDocx(false);
    }
  };

  // 2. Copiar Texto Formatado para o SEI
  const handleCopiarSei = async () => {
    try {
      if (!htmlPreview) return;

      const blobHtml = new Blob([htmlPreview], { type: 'text/html' });
      const plainText = htmlPreview.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
      const blobText = new Blob([plainText], { type: 'text/plain' });

      if (navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blobHtml,
            'text/plain': blobText,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 3500);
    } catch (e) {
      console.error(e);
      // Fallback
      navigator.clipboard.writeText(htmlPreview.replace(/<[^>]+>/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 3500);
    }
  };

  // 3. Exportar PDF
  const handleBaixarPdf = () => {
    if (!contratoInfo) return;
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = 210;
    const contentWidth = pageWidth - margin * 2;
    let y = 25;

    // Cabeçalho UERN
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 51, 102);
    doc.text('FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - FUERN', 105, y, { align: 'center' });
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text('PRÓ-REITORIA DE ADMINISTRAÇÃO - PROAD', 105, y, { align: 'center' });
    y += 7;
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Título do Ato
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const numLimpo = numeroAto ? numeroAto.replace(/^ato\s*(de\s*designação)?\s*(nº\s*)?/i, '') : `___/${new Date().getFullYear()}`;
    doc.text(`ATO DE DESIGNAÇÃO DE GESTORES E FISCAIS DE CONTRATOS Nº ${numLimpo}`, 105, y, { align: 'center' });
    y += 10;

    // Preâmbulo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const preambuloTxt = `A Pró-Reitoria de Administração da FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE, no uso de suas atribuições conferidas pela ${portariaCompetencia};`;
    const preLines = doc.splitTextToSize(preambuloTxt, contentWidth);
    doc.text(preLines, margin, y, { align: 'justify', maxWidth: contentWidth });
    y += preLines.length * 4.8 + 4;

    // 1º Considerando
    const c1Txt = 'CONSIDERANDO a exigência legal de designação de representante da Administração para acompanhamento e fiscalização da execução dos contratos administrativos, que representará a FUERN perante o(a) contratado(a) e zelará pela boa execução do objeto pactuado, exercendo as atividades de orientação, fiscalização e controle;';
    const c1Lines = doc.splitTextToSize(c1Txt, contentWidth);
    doc.text(c1Lines, margin, y, { align: 'justify', maxWidth: contentWidth });
    y += c1Lines.length * 4.8 + 4;

    // 2º Considerando
    let c2Txt = '';
    if (notasEmpenhos && notasEmpenhos.trim()) {
      const idsPart = idsEmpenhos && idsEmpenhos.trim() ? ` (${idsEmpenhos.trim()})` : '';
      c2Txt = `CONSIDERANDO as Notas de Empenhos nºs ${notasEmpenhos.trim()}${idsPart}, do Contrato celebrado entre a FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE e a empresa ${contratoInfo.fornecedor}, CNPJ nº ${contratoInfo.cnpj}, o qual tem como objeto ${contratoInfo.objeto}, nos termos do Processo SEI nº ${contratoInfo.processoSeiMae};`;
    } else {
      c2Txt = `CONSIDERANDO o Contrato celebrado entre a FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE e a empresa ${contratoInfo.fornecedor}, CNPJ nº ${contratoInfo.cnpj}, o qual tem como objeto ${contratoInfo.objeto}, nos termos do Processo SEI nº ${contratoInfo.processoSeiMae};`;
    }
    const c2Lines = doc.splitTextToSize(c2Txt, contentWidth);
    doc.text(c2Lines, margin, y, { align: 'justify', maxWidth: contentWidth });
    y += c2Lines.length * 4.8 + 6;

    // RESOLVE:
    doc.setFont('helvetica', 'bold');
    doc.text('RESOLVE:', margin, y);
    y += 6;

    // Alíneas
    doc.setFont('helvetica', 'normal');
    const alineas = montarAlineasAto(membros);
    alineas.forEach((al) => {
      const alTxt = `${al.letra}) ${al.texto}`;
      const alLines = doc.splitTextToSize(alTxt, contentWidth);

      // Quebra de página automática se necessário
      if (y + alLines.length * 4.8 > 275) {
        doc.addPage();
        y = 22;
      }

      doc.text(alLines, margin, y, { align: 'justify', maxWidth: contentWidth });
      y += alLines.length * 4.8 + 3.5;
    });

    // Fecho
    const fecho1 = `As competências e atribuições do(a) gestor(a) e fiscais acima designados(as), bem como os demais procedimentos relacionados à gestão e fiscalização de contratos no âmbito da UERN constam da ${normativoReferencia}`;
    const f1Lines = doc.splitTextToSize(fecho1, contentWidth);
    if (y + f1Lines.length * 4.8 > 275) {
      doc.addPage();
      y = 22;
    }
    doc.text(f1Lines, margin, y, { align: 'justify', maxWidth: contentWidth });
    y += f1Lines.length * 4.8 + 3.5;

    const fecho2 = 'Juntem-se cópias do presente Ato de Designação aos respectivos processos de pagamento.';
    doc.text(fecho2, margin, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('REGISTRE-SE. CUMPRA-SE.', margin, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.text(`${cidadeData}, ${dataExtenso}.`, margin, y);
    y += 14;

    // Subscritores
    const subsAtivos = subscritores.filter((s) => s.ativo);
    subsAtivos.forEach((s) => {
      if (y + 25 > 275) {
        doc.addPage();
        y = 22;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(s.nome, margin, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.text(s.cargo, margin, y);
      y += 4;
      doc.text(`Matrícula nº ${s.matricula}`, margin, y);
      y += 4;
      doc.text(s.portaria, margin, y);
      y += 8;
    });

    // Bloco de Ciência
    if (y + 35 > 275) {
      doc.addPage();
      y = 22;
    }
    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('CIÊNCIA DO(S) SERVIDOR(ES) DESIGNADO(S):', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text('Declaro-me ciente da designação ora atribuída, e das funções que são inerentes em razão da função.', margin, y);
    y += 8;

    membros.forEach((m) => {
      if (y + 18 > 275) {
        doc.addPage();
        y = 22;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(m.nome, margin, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.text(`Mat. nº ${m.matricula || '_______'}`, margin, y);
      y += 4;
      doc.text(formatarPapelExtenso(m.tipoAtuacao, m.campusSetor), margin, y);
      y += 6;
    });

    const numSanitized = numeroAto.replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`Ato_Designacao_${numSanitized || 'SEI'}.pdf`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Emitir Ato de Designação Oficial (Padrão SEI / PROAD)
              </h2>
              <p className="text-xs text-slate-500">
                Geração de minuta com subscrição pela PROAD e bloco de ciência para coleta de assinaturas no SEI
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Alternador de Abas */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('PREVIEW')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'PREVIEW'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Prévia do Documento</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('CONFIG')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'CONFIG'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Ajustar Campos</span>
                {membrosSemMatricula.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 ml-1" title="Há matrículas pendentes" />
                )}
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Seleção de Contrato e Alertas */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3 flex-1 min-w-[280px]">
            <span className="font-semibold text-slate-700 whitespace-nowrap">Contrato Selecionado:</span>
            <select
              value={selectedContratoId}
              onChange={(e) => setSelectedContratoId(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600"
            >
              {contratos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numeroContrato ? `Contrato nº ${c.numeroContrato}` : `Empenho ${c.numeroEmpenho}`} - {c.fornecedor?.razaoSocial || 'Fornecedor'} ({c.processoSeiMae})
                </option>
              ))}
            </select>
          </div>

          {membrosSemMatricula.length > 0 && (
            <div className="flex items-center space-x-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>{membrosSemMatricula.length} servidor(es)</strong> com matrícula pendente.
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('CONFIG')}
                className="underline font-bold text-amber-900 ml-1 hover:text-amber-700 cursor-pointer"
              >
                Preencher agora
              </button>
            </div>
          )}
        </div>

        {/* Corpo do Modal */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/50">
          {loadingDados ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
              <p className="text-sm font-semibold">Carregando dados da equipe e gerando minuta...</p>
            </div>
          ) : activeTab === 'PREVIEW' ? (
            /* ABA DE PRÉVIA */
            <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-xl shadow border border-slate-200">
              {/* Barra superior de status na folha */}
              <div className="mb-6 pb-3 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>SEI / PROAD / UERN - MINUTA DE ATO</span>
                <span>Processo nº {contratoInfo?.processoSeiMae}</span>
              </div>

              {/* Renderização HTML do Documento Oficial */}
              <div
                dangerouslySetInnerHTML={{ __html: htmlPreview }}
                className="prose prose-slate max-w-none text-slate-900"
              />
            </div>
          ) : (
            /* ABA DE AJUSTES E CONFIGURAÇÃO */
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Card 1: Identificação do Ato e Empenhos */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Identificação do Ato e Dados do Processo</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Número do Ato / Ano *
                    </label>
                    <input
                      type="text"
                      value={numeroAto}
                      onChange={(e) => setNumeroAto(e.target.value)}
                      placeholder="Ex: 448/2026"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Data por Extenso *
                    </label>
                    <input
                      type="text"
                      value={dataExtenso}
                      onChange={(e) => setDataExtenso(e.target.value)}
                      placeholder="Ex: 28 de outubro de 2026"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Cidade / UF da Emissão
                    </label>
                    <input
                      type="text"
                      value={cidadeData}
                      onChange={(e) => setCidadeData(e.target.value)}
                      placeholder="Mossoró-RN"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Notas de Empenho (NEs)
                    </label>
                    <input
                      type="text"
                      value={notasEmpenhos}
                      onChange={(e) => setNotasEmpenhos(e.target.value)}
                      placeholder="Ex: 2026NE001794, 2026NE001795 e 2026NE001796"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      IDs SEI dos Empenhos (Opcional)
                    </label>
                    <input
                      type="text"
                      value={idsEmpenhos}
                      onChange={(e) => setIdsEmpenhos(e.target.value)}
                      placeholder="Ex: Ids 44807811, 44807930 e 44808012"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 text-xs">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Portaria de Competência GP/FUERN (Delegação de Atribuições à PROAD)
                  </label>
                  <input
                    type="text"
                    value={portariaCompetencia}
                    onChange={(e) => setPortariaCompetencia(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              {/* Card 2: Subscritores PROAD (Quem assina o ato) */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Subscrição do Ato (Gabinete da PROAD / UERN)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Selecione as autoridades da Pró-Reitoria de Administração que assinarão o documento no SEI:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {subscritores.map((sub, idx) => (
                    <label
                      key={idx}
                      className={`flex items-start space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        sub.ativo
                          ? 'bg-blue-50/50 border-blue-300 text-slate-900'
                          : 'bg-slate-50 border-slate-200 text-slate-500 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={sub.ativo}
                        onChange={() => handleToggleSubscritor(idx)}
                        className="mt-1 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <div className="text-xs">
                        <div className="font-bold">{sub.nome}</div>
                        <div className="text-[11px] text-slate-600">{sub.cargo}</div>
                        <div className="text-[10px] text-slate-400">
                          Matrícula: {sub.matricula} • {sub.portaria}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Card 3: Equipe Designada e Matrículas */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Equipe de Gestão e Fiscalização ({membros.length} Servidores)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Você pode conferir e atualizar matrículas ou unidades diretamente abaixo
                  </span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {membros.map((m, idx) => {
                    const semMat = !m.matricula || m.matricula.trim() === '' || m.matricula.includes('____');
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs transition-colors ${
                          semMat ? 'bg-amber-50/60' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="min-w-[200px] flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-800">{m.nome}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {m.tipoAtuacao.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {formatarPapelExtenso(m.tipoAtuacao, m.campusSetor)}
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          {m.tipoAtuacao === 'FISCAL_SETORIAL' && (
                            <div className="w-44">
                              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                Campus / Unidade:
                              </label>
                              <input
                                type="text"
                                value={m.campusSetor || ''}
                                onChange={(e) => handleUpdateMembroCampus(idx, e.target.value)}
                                placeholder="Ex: Assu, Caicó, Natal"
                                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs outline-none focus:border-blue-600"
                              />
                            </div>
                          )}

                          <div className="w-36">
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5 flex items-center justify-between">
                              <span>Matrícula:</span>
                              {semMat && <span className="text-amber-600 font-bold">Obrigatória</span>}
                            </label>
                            <input
                              type="text"
                              value={m.matricula}
                              onChange={(e) => handleUpdateMembroMatricula(idx, e.target.value)}
                              placeholder="Ex: 12.757-4"
                              className={`w-full rounded px-2.5 py-1 text-xs font-mono font-bold outline-none border ${
                                semMat
                                  ? 'bg-amber-50 border-amber-300 text-amber-900 focus:bg-white focus:border-amber-600'
                                  : 'bg-white border-slate-300 text-slate-800 focus:border-blue-600'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé / Ações */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Formato Oficial SEI:</span>
            <span>Documento pronto para assinatura digital pelo Gabinete e Servidores.</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* 1. Botão Copiar para SEI */}
            <button
              type="button"
              onClick={handleCopiarSei}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-300 transition-colors cursor-pointer"
              title="Copiar texto formatado em HTML/Rich Text para colar direto no editor do SEI"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
              <span>{copied ? 'Copiado para o SEI!' : 'Copiar para o SEI'}</span>
            </button>

            {/* 2. Botão Baixar PDF */}
            <button
              type="button"
              onClick={handleBaixarPdf}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold rounded-xl border border-rose-200 transition-colors cursor-pointer"
              title="Baixar arquivo PDF formatado com o cabeçalho oficial da UERN"
            >
              <Download className="w-4 h-4 text-rose-600" />
              <span>Baixar em .PDF</span>
            </button>

            {/* 3. Botão Baixar DOCX (Word SEI) */}
            <button
              type="button"
              onClick={handleBaixarDocx}
              disabled={downloadingDocx}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              title="Baixar em formato Word (.docx) para importação no SEI"
            >
              {downloadingDocx ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Gerando Word...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-blue-200" />
                  <span>Baixar em .DOCX (Padrão SEI)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
