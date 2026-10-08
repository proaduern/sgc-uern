'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Printer,
  Download,
  AlertTriangle,
  Scale,
  Building,
  CheckCircle2,
  Calendar,
  Send,
  FileText
} from 'lucide-react';
import {
  DadosNotificacaoUern,
  exportarNotificacaoXlsx,
  exportarNotificacaoPdf
} from '@/lib/notificacao-export';

interface NotificacaoModalProps {
  contratos: any[];
  dadosIniciais?: Partial<DadosNotificacaoUern & { contratoId?: string }>;
  onClose: () => void;
  onSalvo: () => void;
}

export default function NotificacaoModal({
  contratos,
  dadosIniciais,
  onClose,
  onSalvo,
}: NotificacaoModalProps) {
  const [contratoId, setContratoId] = useState(dadosIniciais?.contratoId || (contratos[0]?.id || ''));
  const [numeroNotificacao, setNumeroNotificacao] = useState(dadosIniciais?.numeroNotificacao || '15/2026');
  const [processoSei, setProcessoSei] = useState(dadosIniciais?.processoSei || '04410035.000402/2026-38');
  const [tipoFase, setTipoFase] = useState<'DEFESA_PREVIA_15D' | 'DECISAO_RECURSO_15D' | 'DECISAO_FINAL'>(
    dadosIniciais?.tipoFase || 'DEFESA_PREVIA_15D'
  );
  const [assunto, setAssunto] = useState(
    dadosIniciais?.assunto || 'DESCUMPRIMENTO DE CLÁUSULA CONTRATUAL / CONVENÇÃO COLETIVA'
  );
  const [clausulaDescumprida, setClausulaDescumprida] = useState(
    dadosIniciais?.clausulaDescumprida ||
      'Cláusula do Termo de Referência, Convenção Coletiva de Trabalho da Categoria e Art. 44 da IN 01/2026 - PROAD/UERN'
  );
  const [descricaoFatos, setDescricaoFatos] = useState(
    dadosIniciais?.descricaoFatos ||
      'Conforme apurado pela fiscalização técnica/administrativa do contrato, a empresa incorreu em atrasos reiterados no cumprimento de suas obrigações, ensejando a apuração de responsabilidade.'
  );
  const [penalidadeProposta, setPenalidadeProposta] = useState(
    dadosIniciais?.penalidadeProposta ||
      'Advertência ou Multa Compensatória de 1% a 5% do valor da contratação (Art. 156 da Lei 14.133/2021 e Art. 46 da IN 01/2026 UERN).'
  );
  const [fiscalNome, setFiscalNome] = useState(dadosIniciais?.fiscalNome || 'Fiscal Administrativo do Contrato');
  const [fiscalMatricula, setFiscalMatricula] = useState(dadosIniciais?.fiscalCargoMatricula || 'TNS/Mat. nº 13.773-1');
  const [atoDesignacao, setAtoDesignacao] = useState(dadosIniciais?.atoDesignacaoNumero || '547/2024');

  const [salvando, setSalvando] = useState(false);

  // Atualiza dados conforme contrato selecionado
  const contratoAtual = contratos.find((c) => c.id === contratoId);

  useEffect(() => {
    if (contratoAtual) {
      if (contratoAtual.processoSeiMae && !dadosIniciais?.processoSei) {
        setProcessoSei(contratoAtual.processoSeiMae);
      }
      if (contratoAtual.fiscais && contratoAtual.fiscais.length > 0 && !dadosIniciais?.fiscalNome) {
        const f = contratoAtual.fiscais[0];
        setFiscalNome(f.nomeCompleto);
        setFiscalMatricula(`Mat. nº ${f.matricula}`);
        if (f.atoDesignacaoPortaria) {
          setAtoDesignacao(f.atoDesignacaoPortaria);
        }
      }
    }
  }, [contratoId]);

  // Alterna textos automaticamente conforme a fase processual selecionada
  useEffect(() => {
    if (tipoFase === 'DEFESA_PREVIA_15D') {
      setAssunto('NOTIFICAÇÃO DE INSTAURAÇÃO DE PROCESSO SANCIONATÓRIO - DEFESA PRÉVIA (15 DIAS)');
      setPenalidadeProposta('Advertência ou Multa Compensatória de 1% a 5% do valor da contratação (Art. 156 da Lei 14.133/2021 e Art. 46 da IN 01/2026 UERN).');
    } else if (tipoFase === 'DECISAO_RECURSO_15D') {
      setAssunto('DECISÃO PRELIMINAR SANCIONATÓRIA - ABERTURA DE PRAZO RECURSAL (15 DIAS ÚTEIS)');
      setPenalidadeProposta('Aplicação de Penalidade de Multa / Glosa do IMR, com abertura de prazo improrrogável de 15 (quinze) dias úteis para interposição de RECURSO com efeito suspensivo.');
    } else if (tipoFase === 'DECISAO_FINAL') {
      setAssunto('DECISÃO DEFINITIVA EM NÍVEL ADMINISTRATIVO - MANUTENÇÃO DA PENALIDADE E DESCONTO EM FATURA');
      setPenalidadeProposta('Decisão definitiva mantendo a penalidade de multa / glosa, determinando o desconto direto na próxima fatura a ser liquidada e comunicação ao SICAF.');
    }
  }, [tipoFase]);

  const obterObjetoDadosNotificacao = (): DadosNotificacaoUern => {
    return {
      numeroNotificacao,
      processoSei,
      tipoFase,
      assunto,
      contratoNumero: contratoAtual?.numeroContrato || contratoAtual?.numeroEmpenho || 'S/N',
      processoOrigem: contratoAtual?.processoSeiMae || '04410035.000304/2025-10',
      pregaoNumero: contratoAtual?.licitacaoProcedimento || 'Pregão Eletrônico nº 038/2025',
      vigenciaInicio: contratoAtual?.vigenciaInicio ? new Date(contratoAtual.vigenciaInicio).toLocaleDateString('pt-BR') : undefined,
      vigenciaFim: contratoAtual?.vigenciaFim ? new Date(contratoAtual.vigenciaFim).toLocaleDateString('pt-BR') : undefined,
      objeto: contratoAtual?.objeto || 'Prestação contínua de serviços terceirizados nos Campi da UERN (Mossoró, Natal, Patu, Assu, Caicó, Pau dos Ferros)',
      razaoSocial: contratoAtual?.fornecedor?.razaoSocial || 'EMPRESA CONTRATADA LTDA',
      cnpj: contratoAtual?.fornecedor?.cnpj || '00.000.000/0001-00',
      enderecoContratada: contratoAtual?.fornecedor?.endereco || 'Conforme cadastro SICAF/UERN',
      clausulaDescumprida,
      descricaoFatos,
      penalidadeProposta,
      prazoDiasUteis: 15,
      fiscalNome,
      fiscalCargoMatricula: fiscalMatricula,
      atoDesignacaoNumero: atoDesignacao,
      dataEmissao: new Date().toLocaleDateString('pt-BR'),
    };
  };

  const handleDownloadXlsx = () => {
    const dados = obterObjetoDadosNotificacao();
    const buffer = exportarNotificacaoXlsx(dados);
    const blob = new Blob([buffer as any], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Termo_Notificacao_${numeroNotificacao.replace(/\//g, '_')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    const dados = obterObjetoDadosNotificacao();
    const doc = exportarNotificacaoPdf(dados);
    doc.save(`Termo_Notificacao_${numeroNotificacao.replace(/\//g, '_')}.pdf`);
  };

  const handleSalvarProcesso = async () => {
    if (!contratoId) {
      alert('Selecione o contrato administrativo.');
      return;
    }

    setSalvando(true);
    try {
      let tipoPenalidade = 'ADVERTENCIA';
      if (penalidadeProposta.toLowerCase().includes('multa')) {
        tipoPenalidade = 'MULTA';
      } else if (penalidadeProposta.toLowerCase().includes('impedimento')) {
        tipoPenalidade = 'IMPEDIMENTO_LICITAR';
      }

      const res = await fetch('/api/penalidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contratoId,
          tipoPenalidade,
          fatosDescricao: descricaoFatos,
          baseLegal: `${clausulaDescumprida} - Termo de Notificação ${numeroNotificacao}`,
          protocoloNotificacaoSei: processoSei,
        }),
      });

      if (res.ok) {
        alert('Termo de Notificação registrado com sucesso no sistema sancionatório!');
        onSalvo();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao registrar notificação.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de conexão');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-sm">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Emissão de Notificação Contratual (Rito Oficial UERN)
              </h3>
              <p className="text-xs text-slate-500">
                Geração de Termo de Notificação pronto para download em <strong>.xlsx</strong> e <strong>.pdf</strong> (Art. 45 IN 01/2026 e Art. 156 Lei 14.133/21)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-700 text-xs">
          {/* Contrato e Fase */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Contrato Administrativo *
              </label>
              <select
                value={contratoId}
                onChange={(e) => setContratoId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
              >
                {contratos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.numeroContrato ? `Contrato nº ${c.numeroContrato}` : `Empenho ${c.numeroEmpenho}`} - {c.fornecedor.razaoSocial}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Fase Processual da Notificação *
              </label>
              <select
                value={tipoFase}
                onChange={(e) => setTipoFase(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
              >
                <option value="DEFESA_PREVIA_15D">1. Defesa Prévia (15 dias úteis)</option>
                <option value="DECISAO_RECURSO_15D">2. Decisão Preliminar / Recurso (15 dias úteis)</option>
                <option value="DECISAO_FINAL">3. Decisão Definitiva de Penalidade</option>
              </select>
            </div>
          </div>

          {/* Dados do Documento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Número do Termo de Notificação *
              </label>
              <input
                type="text"
                value={numeroNotificacao}
                onChange={(e) => setNumeroNotificacao(e.target.value)}
                placeholder="Ex: 15/2026"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Processo Administrativo SEI *
              </label>
              <input
                type="text"
                value={processoSei}
                onChange={(e) => setProcessoSei(e.target.value)}
                placeholder="Ex: 04410035.000402/2026-38"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Assunto da Notificação *
            </label>
            <input
              type="text"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="Ex: DESCUMPRIMENTO DE CONVENÇÃO COLETIVA DE TRABALHO / CLÁUSULA DO TR"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-semibold"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Cláusula Contratual ou Dispositivo Legal Descumprido *
            </label>
            <textarea
              rows={2}
              value={clausulaDescumprida}
              onChange={(e) => setClausulaDescumprida(e.target.value)}
              placeholder="Ex: Cláusula 6.32.2.1 do Termo de Referência e Art. 44 da Instrução Normativa nº 01/2026 - PROAD/UERN..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Descrição Minudente dos Fatos e Faltas Verificadas *
            </label>
            <textarea
              rows={3}
              value={descricaoFatos}
              onChange={(e) => setDescricaoFatos(e.target.value)}
              placeholder="Ex: Conforme apurado pela fiscalização administrativa, a empresa descumpriu os prazos de entrega dos comprovantes..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Penalidade Aplicável Prevista *
            </label>
            <textarea
              rows={2}
              value={penalidadeProposta}
              onChange={(e) => setPenalidadeProposta(e.target.value)}
              placeholder="Ex: Advertência ou Multa Compensatória de 1% a 5% sobre o valor da contratação..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
            />
          </div>

          {/* Dados do Fiscal / Assinatura */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Nome do Fiscal / Gestor
              </label>
              <input
                type="text"
                value={fiscalNome}
                onChange={(e) => setFiscalNome(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Cargo / Matrícula
              </label>
              <input
                type="text"
                value={fiscalMatricula}
                onChange={(e) => setFiscalMatricula(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Ato de Designação nº
              </label>
              <input
                type="text"
                value={atoDesignacao}
                onChange={(e) => setAtoDesignacao(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
              />
            </div>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleDownloadXlsx}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Baixar em .XLSX</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Baixar em .PDF (Oficial)</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              disabled={salvando}
              onClick={handleSalvarProcesso}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-all disabled:opacity-50"
            >
              {salvando ? 'Registrando...' : 'Salvar no SGC e Abrir Prazo (15d)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
