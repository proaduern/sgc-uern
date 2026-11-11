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
  Search,
  FileText,
  Lock,
  Edit3,
  Eye,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { valorPorExtenso } from '@/lib/numero-extenso';
import { DADOS_DIRETORIA_DAS_PADRAO } from '@/lib/config/diretoria';
import { BRASAO_UERN_BASE64, formatarNumeroOficioDas } from '@/lib/config/brasao-uern';

interface OficioLiberacaoModalProps {
  contrato: any;
  trabalhadores: any[];
  saldosPorTrabalhador: Record<string, any>;
  onClose: () => void;
  onSucesso: () => void;
}

type RubricaLiberacao =
  | 'DECIMO_TERCEIRO_8_33'
  | 'FERIAS_8_33'
  | 'TERCO_FERIAS_2_78'
  | 'FERIAS_MAIS_TERCO'
  | 'MULTA_RESCISORIA_FGTS'
  | 'FGTS_SOBRE_PROVISOES';

export default function OficioLiberacaoModal({
  contrato,
  trabalhadores,
  saldosPorTrabalhador,
  onClose,
  onSucesso,
}: OficioLiberacaoModalProps) {
  const [abaAtiva, setAbaAtiva] = useState<'MEMORIA' | 'PREVIA'>('MEMORIA');

  // Dados do Ofício (Usuário digita apenas nº/ano, ex: 147/2026)
  const [numeroAnoOficio, setNumeroAnoOficio] = useState('');
  const [processoSei, setProcessoSei] = useState(
    contrato?.contaVinculadaProcessoSei || contrato?.processoSeiMae || ''
  );
  const [contaVinculada, setContaVinculada] = useState(
    contrato?.contaVinculadaNumeroConta || ''
  );

  // Signatário Institucional (Diretor da DAS/PROAD)
  const [diretorNome, setDiretorNome] = useState(DADOS_DIRETORIA_DAS_PADRAO.nome);
  const [diretorMatricula, setDiretorMatricula] = useState(DADOS_DIRETORIA_DAS_PADRAO.matricula);
  const [diretorCargo, setDiretorCargo] = useState(DADOS_DIRETORIA_DAS_PADRAO.cargo);
  const [diretorPortaria, setDiretorPortaria] = useState(DADOS_DIRETORIA_DAS_PADRAO.portariaNomeacao);

  // Conta de Crédito da Contratada (Destino)
  const [bancoCredito, setBancoCredito] = useState(contrato?.empresaContaBanco || 'Banco do Brasil');
  const [agenciaCredito, setAgenciaCredito] = useState(contrato?.empresaContaAgencia || '');
  const [contaCredito, setContaCredito] = useState(contrato?.empresaContaNumero || '');
  const [cnpjCredito, setCnpjCredito] = useState(contrato?.fornecedor?.cnpj || '');
  const [salvarDadosEmpresa, setSalvarDadosEmpresa] = useState(false);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  // Textos Editáveis da Prévia do Ofício (Campos críticos permanecem travados)
  const [assuntoOficio, setAssuntoOficio] = useState(
    'Movimentação de Conta de Depósitos Vinculados em garantia'
  );
  const [vocativoOficio, setVocativoOficio] = useState('Senhor(a) Gerente,');
  const [textoAberturaOficio, setTextoAberturaOficio] = useState(
    'Solicitamos providenciar, conforme indicado a seguir, a movimentação de'
  );
  const [paragrafoComplementar, setParagrafoComplementar] = useState('');
  const [fechoOficio, setFechoOficio] = useState('Atenciosamente,');
  const [localDataOficio, setLocalDataOficio] = useState('Mossoró, data da assinatura eletrônica.');

  // Rubrica & Modo de Cálculo
  const [rubrica, setRubrica] = useState<RubricaLiberacao>('DECIMO_TERCEIRO_8_33');
  const [modoCalculo, setModoCalculo] = useState<'ALIQUOTA_RUBRICA' | 'SALDO_RETIDO'>('ALIQUOTA_RUBRICA');
  const [incluirEncargosSubmodulo, setIncluirEncargosSubmodulo] = useState(false);
  const [aliquotaEncargos, setAliquotaEncargos] = useState(35.30);
  const [mesesPadrao, setMesesPadrao] = useState(12);
  const [filtroCampus, setFiltroCampus] = useState('TODOS');
  const [busca, setBusca] = useState('');

  // Alíquotas contratuais de cada rubrica (IN nº 02/2024 SEAD/RN ou parâmetros do contrato)
  const aliquotaDaRubrica = useMemo(() => {
    const pFerias = Number(contrato?.percentualFerias ?? 8.33);
    const pTerco = Number(contrato?.percentualTercoConstitucional ?? 2.78);
    const pDecimo = Number(contrato?.percentualDecimoTerceiro ?? 8.33);
    const pMulta = Number(contrato?.percentualMultaFgts ?? 4.0);
    const pEncargos = Number(contrato?.percentualEncargosSubmodulo ?? 8.1);

    switch (rubrica) {
      case 'DECIMO_TERCEIRO_8_33':
        return pDecimo;
      case 'FERIAS_8_33':
        return pFerias;
      case 'TERCO_FERIAS_2_78':
        return pTerco;
      case 'FERIAS_MAIS_TERCO':
        return Number((pFerias + pTerco).toFixed(2));
      case 'MULTA_RESCISORIA_FGTS':
        return pMulta;
      case 'FGTS_SOBRE_PROVISOES':
        return pEncargos;
      default:
        return 8.33;
    }
  }, [rubrica, contrato]);

  const rotuloRubrica = useMemo(() => {
    switch (rubrica) {
      case 'DECIMO_TERCEIRO_8_33':
        return `13º Salário (${aliquotaDaRubrica.toFixed(2)}%)`;
      case 'FERIAS_8_33':
        return `Férias (${aliquotaDaRubrica.toFixed(2)}%)`;
      case 'TERCO_FERIAS_2_78':
        return `1/3 Constitucional de Férias (${aliquotaDaRubrica.toFixed(2)}%)`;
      case 'FERIAS_MAIS_TERCO':
        return `Férias + 1/3 Constitucional (${aliquotaDaRubrica.toFixed(2)}%)`;
      case 'MULTA_RESCISORIA_FGTS':
        return `Multa Rescisória do FGTS (${aliquotaDaRubrica.toFixed(2)}%)`;
      case 'FGTS_SOBRE_PROVISOES':
        return `Encargos Submódulo 4.1 (${aliquotaDaRubrica.toFixed(2)}%)`;
      default:
        return rubrica;
    }
  }, [rubrica, aliquotaDaRubrica]);

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
        mesesRetidos: 12,
        selected: true,
      };
    });
  });

  const [processandoDebito, setProcessandoDebito] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const numeroOficioFormatado = useMemo(() => {
    return formatarNumeroOficioDas(numeroAnoOficio);
  }, [numeroAnoOficio]);

  const obterSaldoRetidoDaRubrica = (trabalhadorId: string, rub: RubricaLiberacao): number => {
    const porRubrica = saldosPorTrabalhador?.[trabalhadorId]?.porRubrica || {};
    if (rub === 'FERIAS_MAIS_TERCO') {
      return Number(((porRubrica['FERIAS_8_33'] || 0) + (porRubrica['TERCO_FERIAS_2_78'] || 0)).toFixed(2));
    }
    return Number((porRubrica[rub] || 0).toFixed(2));
  };

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

  // Cálculos dinâmicos estritamente vinculados à rubrica escolhida
  const calculados = useMemo(() => {
    const permiteEncargos =
      incluirEncargosSubmodulo &&
      rubrica !== 'MULTA_RESCISORIA_FGTS' &&
      rubrica !== 'FGTS_SOBRE_PROVISOES';

    return itensTrabalhador.map((it) => {
      const saldoRetidoRubrica = obterSaldoRetidoDaRubrica(it.trabalhadorId, rubrica);
      const provisaoMensalRubrica = it.salario * (aliquotaDaRubrica / 100);
      const basePorAliquota = Number((provisaoMensalRubrica * it.mesesRetidos).toFixed(2));

      const base =
        modoCalculo === 'SALDO_RETIDO' && saldoRetidoRubrica > 0
          ? saldoRetidoRubrica
          : basePorAliquota;

      const encargos = permiteEncargos ? Number((base * (aliquotaEncargos / 100)).toFixed(2)) : 0;
      const total = Number((base + encargos).toFixed(2));

      return {
        ...it,
        saldoRetidoRubrica,
        valorBase: base,
        valorEncargos: encargos,
        valorTotal: total,
      };
    });
  }, [itensTrabalhador, rubrica, aliquotaDaRubrica, modoCalculo, incluirEncargosSubmodulo, aliquotaEncargos, saldosPorTrabalhador]);

  const selecionados = useMemo(() => {
    return calculados.filter((c) => c.selected);
  }, [calculados]);

  const totalGeral = useMemo(() => {
    return Number(selecionados.reduce((acc, it) => acc + it.valorTotal, 0).toFixed(2));
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

  const salvarDadosBancariosEmpresaNoContrato = async () => {
    if (!contrato?.id) return;
    try {
      await fetch('/api/conta-vinculada', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_DADOS_BANCARIOS',
          contratoId: contrato.id,
          contaVinculadaNumeroConta: contaVinculada.trim() || null,
          empresaContaBanco: bancoCredito.trim() || null,
          empresaContaAgencia: agenciaCredito.trim() || null,
          empresaContaNumero: contaCredito.trim() || null,
        }),
      });
    } catch (e) {
      console.warn('Erro ao salvar conta da empresa:', e);
    }
  };

  const validarCamposObrigatorios = (): boolean => {
    if (!numeroAnoOficio.trim()) {
      setErroValidacao('Informe o número/ano do Ofício (Ex: 147/2026) antes de gerar o documento.');
      return false;
    }
    if (!contaVinculada.trim()) {
      setErroValidacao('Informe o número da Conta Vinculada de débito da FUERN.');
      return false;
    }
    if (!bancoCredito.trim() || !contaCredito.trim()) {
      setErroValidacao('Informe o Banco e a Conta Corrente de destino da empresa para crédito.');
      return false;
    }
    setErroValidacao(null);
    return true;
  };

  // 1. Gerar Ofício em PDF no layout oficial aprovado (com Brasão UERN colorido, fonte Times e sem rodapé SEI)
  const gerarOficioPdf = async (abrirNovaAba = false) => {
    if (!validarCamposObrigatorios()) return;

    if (salvarDadosEmpresa) {
      await salvarDadosBancariosEmpresaNoContrato();
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // 1. Brasão Oficial UERN colorido centralizado no topo
    try {
      doc.addImage(BRASAO_UERN_BASE64, 'PNG', 95.5, 12, 19, 29);
    } catch (e) {
      console.warn('Falha ao desenhar brasão:', e);
    }

    // 2. Endereço Institucional
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Rua Almino Afonso, 478 - Bairro Centro, Mossoró/RN, CEP 59610-210', 105, 45.5, {
      align: 'center',
    });
    doc.text('Telefone: - http://portal.uern.br/', 105, 50, { align: 'center' });

    // 3. Número do Ofício no padrão "Ofício nº xx/ano - UERN - DAS/PROAD/UERN"
    doc.setFont('times', 'normal');
    doc.setFontSize(10.5);
    doc.text(numeroOficioFormatado, 15, 61);

    // 4. Destinatário Padrão Fixo (sem nome do gerente)
    doc.text('Senhor(a) Gerente', 15, 69);
    doc.text('Banco do Brasil S.A.', 15, 73.5);
    doc.text('Agência 3795-8 - Escritório Setor Público RN', 15, 78);

    // 5. Assunto
    doc.setFont('times', 'bold');
    doc.text('Assunto:', 15, 88);
    doc.setFont('times', 'normal');
    doc.text(assuntoOficio.trim() || 'Movimentação de Conta de Depósitos Vinculados em garantia', 30.5, 88);

    // 6. Vocativo com recuo
    doc.text(vocativoOficio.trim() || 'Senhor(a) Gerente,', 35, 100);

    // 7. Corpo do Ofício (unindo abertura editável + cláusula crítica protegida)
    const valorFormatado = totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const razaoEmpresa = contrato?.fornecedor?.razaoSocial || 'EMPRESA CONTRATADA';
    const cnpjEmpresa = cnpjCredito || contrato?.fornecedor?.cnpj || '-';
    const numContrato = contrato?.numeroContrato || contrato?.numeroEmpenho || '035/2025';

    const aberturaLimpa = (textoAberturaOficio || 'Solicitamos providenciar, conforme indicado a seguir, a movimentação de').trim();
    const textoParagrafoPrincipal = `${aberturaLimpa} ${valorFormatado} (${totalPorExtenso}) da conta nº ${contaVinculada.trim()} vinculada à empresa ${razaoEmpresa}, CNPJ nº ${cnpjEmpresa}, aberta para abrigar os recursos referentes ao contrato administrativo nº ${numContrato} - FUERN.`;

    const yCorpo = 112;
    // Se a abertura for a padrão, renderiza com os negritos idênticos ao modelo na 1ª e 2ª linhas
    if (aberturaLimpa === 'Solicitamos providenciar, conforme indicado a seguir, a movimentação de') {
      const l1 = 'Solicitamos providenciar, conforme indicado a seguir, a movimentação de ';
      doc.setFont('times', 'normal');
      doc.text(l1, 35, yCorpo);
      const w1 = doc.getTextWidth(l1);

      doc.setFont('times', 'bold');
      doc.text(valorFormatado, 35 + w1, yCorpo);
      const w2 = doc.getTextWidth(valorFormatado);

      const restoCompleto = ` (${totalPorExtenso}) da conta nº ${contaVinculada.trim()} vinculada à empresa ${razaoEmpresa}, CNPJ nº ${cnpjEmpresa}, aberta para abrigar os recursos referentes ao contrato administrativo nº ${numContrato} - FUERN.`;
      doc.setFont('times', 'normal');
      const larguraRestanteL1 = Math.max(20, 195 - (35 + w1 + w2));
      const palavras = restoCompleto.trim().split(/\s+/);
      let trechoL1 = ' ';
      let idxPalavra = 0;
      while (idxPalavra < palavras.length) {
        const teste = trechoL1 + (trechoL1 === ' ' ? '' : ' ') + palavras[idxPalavra];
        if (doc.getTextWidth(teste) <= larguraRestanteL1) {
          trechoL1 = teste;
          idxPalavra++;
        } else {
          break;
        }
      }
      doc.text(trechoL1, 35 + w1 + w2, yCorpo);

      const textoRestante = palavras.slice(idxPalavra).join(' ');
      const linhasResto = doc.splitTextToSize(textoRestante, 180);
      doc.text(linhasResto, 15, yCorpo + 5, { lineHeightFactor: 1.35 });
      var yAposCorpo = yCorpo + 5 + linhasResto.length * 5.2;
    } else {
      const linhasCorpo = doc.splitTextToSize(`          ${textoParagrafoPrincipal}`, 180);
      doc.setFont('times', 'normal');
      doc.text(linhasCorpo, 15, yCorpo, { lineHeightFactor: 1.35 });
      var yAposCorpo = yCorpo + linhasCorpo.length * 5.2;
    }

    if (paragrafoComplementar.trim()) {
      const linhasComp = doc.splitTextToSize(`          ${paragrafoComplementar.trim()}`, 180);
      doc.setFont('times', 'normal');
      doc.text(linhasComp, 15, yAposCorpo + 2, { lineHeightFactor: 1.35 });
      yAposCorpo += linhasComp.length * 5.2 + 4;
    }

    // 8. Tabela Centralizada CREDITAR
    autoTable(doc, {
      startY: yAposCorpo + 4,
      margin: { left: 55, right: 55 },
      tableWidth: 100,
      theme: 'grid',
      styles: {
        font: 'times',
        fontSize: 10,
        textColor: [0, 0, 0],
        lineColor: [60, 60, 60],
        lineWidth: 0.25,
        cellPadding: 1.5,
        halign: 'center',
      },
      head: [
        [
          {
            content: 'CREDITAR',
            colSpan: 4,
            styles: {
              fillColor: [230, 230, 230],
              textColor: [0, 0, 0],
              fontStyle: 'bold',
              halign: 'center',
            },
          },
        ],
        [
          { content: 'Banco', styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' } },
          { content: 'Agência', styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' } },
          { content: 'Conta', styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' } },
          { content: 'CPF /CNPJ', styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' } },
        ],
      ],
      body: [[bancoCredito, agenciaCredito || '-', contaCredito, cnpjEmpresa]],
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    // 9. Fecho
    doc.setFont('times', 'normal');
    doc.setFontSize(10.5);
    doc.text(fechoOficio.trim() || 'Atenciosamente,', 35, currentY);

    // 10. Local e Data (alinhado à direita)
    currentY += 16;
    doc.text(localDataOficio.trim() || 'Mossoró, data da assinatura eletrônica.', 195, currentY, {
      align: 'right',
    });

    // 11. Assinatura do Diretor (alinhada à direita)
    currentY += 14;
    doc.setFont('times', 'bold');
    doc.text((diretorNome || '').toUpperCase(), 195, currentY, { align: 'right' });
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(`Matrícula nº ${diretorMatricula}`, 195, currentY + 4.5, { align: 'right' });
    doc.text(diretorPortaria, 195, currentY + 9, { align: 'right' });
    doc.text('Diretoria de Administração e Serviços – DAS/PROAD', 195, currentY + 13.5, {
      align: 'right',
    });

    // 12. Rodapé Limpo de Autenticação SGC-UERN (sem menção ao SEI)
    const yFooter = 266;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(15, yFooter, 195, yFooter);
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.text(
      'Documento emitido eletronicamente pelo Sistema de Gestão de Contratos (SGC-UERN / PROAD), com fundamento no Decreto Estadual nº 27.685/2018.',
      15,
      yFooter + 5,
      { maxWidth: 180 }
    );
    const codVerificador = `SGC-CV-${new Date().getFullYear()}-${numeroAnoOficio.replace(/\D/g, '') || '001'}`;
    doc.text(
      `Código Verificador de Autenticidade PROAD: ${codVerificador} • Conferência em: https://portal-proad.vercel.app/verificar`,
      15,
      yFooter + 13
    );

    // Página 2: Anexo I - Memória de Cálculo
    doc.addPage();
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 51, 102);
    doc.text('ANEXO I – MEMÓRIA DE CÁLCULO DE LIBERAÇÃO DE CONTA VINCULADA', 105, 18, { align: 'center' });
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);
    doc.text(
      `Contrato nº ${numContrato} • Rubrica: ${rotuloRubrica} • Total: ${selecionados.length} empregados`,
      105,
      24,
      { align: 'center' }
    );

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

    rowsTabela.push([
      '',
      `TOTAL A LIBERAR (${rotuloRubrica.toUpperCase()})`,
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
      head: [
        [
          'Nº',
          'EMPREGADO',
          'CARGO',
          'CAMPUS',
          'MESES',
          'REMUNERAÇÃO',
          `RUBRICA (${aliquotaDaRubrica.toFixed(2)}%)`,
          incluirEncargosSubmodulo ? `ENCARGOS (${aliquotaEncargos}%)` : 'ENCARGOS ADIC.',
          'TOTAL',
        ],
      ],
      body: rowsTabela,
    });

    const contratoNum = numContrato.replace(/[\/\\?%*:|"<>]/g, '_');
    const nomeArquivo = `Oficio_Liberacao_Conta_Vinculada_${contratoNum}.pdf`;

    if (abrirNovaAba) {
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
    } else {
      doc.save(nomeArquivo);
    }
  };

  // 2. Baixar Memória de Cálculo em Excel (.xlsx)
  const exportarMemoriaCalculoExcel = () => {
    if (selecionados.length === 0) return;

    const campi = Array.from(new Set(selecionados.map((s) => s.campus)));
    const dadosExcel: any[] = [];

    dadosExcel.push({
      N: '',
      EMPREGADO: 'UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - UERN',
      CARGO: '',
      CAMPUS: '',
      MESES_RETIDOS: '',
      REMUNERACAO_MEDIA: '',
      VALOR_PROVISAO_RUBRICA: '',
      ENCARGOS_ADICIONAIS: '',
      TOTAL: '',
    });
    dadosExcel.push({
      N: '',
      EMPREGADO: `MEMÓRIA DE CÁLCULO (${rotuloRubrica.toUpperCase()}) - CONTRATO Nº ${contrato?.numeroContrato || contrato?.numeroEmpenho}`,
      CARGO: '',
      CAMPUS: '',
      MESES_RETIDOS: '',
      REMUNERACAO_MEDIA: '',
      VALOR_PROVISAO_RUBRICA: '',
      ENCARGOS_ADICIONAIS: '',
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
        VALOR_PROVISAO_RUBRICA: '',
        ENCARGOS_ADICIONAIS: '',
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
          VALOR_PROVISAO_RUBRICA: item.valorBase,
          ENCARGOS_ADICIONAIS: item.valorEncargos,
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
        VALOR_PROVISAO_RUBRICA: '',
        ENCARGOS_ADICIONAIS: '',
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
      VALOR_PROVISAO_RUBRICA: '',
      ENCARGOS_ADICIONAIS: '',
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
      { wch: 20 },
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
    if (!validarCamposObrigatorios()) return;

    const confirmou = window.confirm(
      `Confirma que o Ofício Bancário (${numeroOficioFormatado}) foi protocolado e enviado ao banco?\n\n` +
        `Rubrica: ${rotuloRubrica}\n` +
        `Será efetivado o débito automático de ${totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ` +
        `distribuído nos saldos individuais de ${selecionados.length} funcionários.`
    );

    if (!confirmou) return;

    setProcessandoDebito(true);
    try {
      const liberacoesPayload: Array<{ trabalhadorId: string; rubrica: string; valor: number }> = [];
      const pFerias = Number(contrato?.percentualFerias ?? 8.33);
      const pTerco = Number(contrato?.percentualTercoConstitucional ?? 2.78);
      const somaFeriasTerco = pFerias + pTerco;

      for (const s of selecionados) {
        if (rubrica === 'FERIAS_MAIS_TERCO') {
          const valFerias = Number(((s.valorTotal * pFerias) / somaFeriasTerco).toFixed(2));
          const valTerco = Number((s.valorTotal - valFerias).toFixed(2));
          liberacoesPayload.push({
            trabalhadorId: s.trabalhadorId,
            rubrica: 'FERIAS_8_33',
            valor: valFerias,
          });
          liberacoesPayload.push({
            trabalhadorId: s.trabalhadorId,
            rubrica: 'TERCO_FERIAS_2_78',
            valor: valTerco,
          });
        } else {
          liberacoesPayload.push({
            trabalhadorId: s.trabalhadorId,
            rubrica: rubrica,
            valor: s.valorTotal,
          });
        }
      }

      const res = await fetch('/api/conta-vinculada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contratoId: contrato.id,
          tipoOperacao: 'LIBERACAO_OFICIO_LOTE',
          numeroOficio: numeroOficioFormatado,
          motivoLiberacao: `Ofício enviado ao banco para liberação de ${rotuloRubrica}`,
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
        }, 2000);
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
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-white/10 text-white backdrop-blur-md">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base md:text-lg">
                  Ofício de Liberação de Conta Vinculada — DAS/PROAD/UERN
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-extrabold uppercase">
                  {rotuloRubrica}
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Calcula estritamente o valor correspondente à rubrica selecionada e gera prévia oficial editável com campos críticos protegidos.
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

        {/* Barra de Abas: 1. Memória e Rubrica vs 2. Prévia Editável do Ofício */}
        <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setAbaAtiva('MEMORIA')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                abaAtiva === 'MEMORIA'
                  ? 'bg-blue-900 text-white shadow'
                  : 'bg-white text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>1. Rubrica, Contas e Memória de Cálculo</span>
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('PREVIA')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                abaAtiva === 'PREVIA'
                  ? 'bg-blue-900 text-white shadow'
                  : 'bg-white text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>2. Prévia Editável do Ofício (Modelo Oficial UERN)</span>
            </button>
          </div>

          <span className="text-xs font-extrabold text-blue-950">
            Total da Rubrica: {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {mensagemSucesso && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl font-bold text-sm flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{mensagemSucesso}</span>
            </div>
          )}

          {erroValidacao && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl font-bold text-xs flex items-center space-x-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{erroValidacao}</span>
            </div>
          )}

          {abaAtiva === 'MEMORIA' ? (
            <>
              {/* Dados do Ofício e Rubrica */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">
                      Nº e Ano do Ofício * <span className="text-[10px] font-normal text-slate-500">(apenas xx/ano)</span>:
                    </label>
                    <input
                      type="text"
                      value={numeroAnoOficio}
                      onChange={(e) => {
                        setNumeroAnoOficio(e.target.value);
                        if (erroValidacao) setErroValidacao(null);
                      }}
                      placeholder="Ex: 147/2026"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-600"
                    />
                    {numeroOficioFormatado && (
                      <span className="block text-[10px] font-bold text-blue-800">
                        Gerado: {numeroOficioFormatado}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Rubrica a Liberar *:</label>
                    <select
                      value={rubrica}
                      onChange={(e) => setRubrica(e.target.value as RubricaLiberacao)}
                      className="w-full px-3 py-1.5 bg-white border-2 border-blue-600 rounded-xl font-extrabold text-blue-950 outline-none cursor-pointer"
                    >
                      <option value="DECIMO_TERCEIRO_8_33">
                        13º Salário ({Number(contrato?.percentualDecimoTerceiro ?? 8.33).toFixed(2)}% a.m.)
                      </option>
                      <option value="FERIAS_8_33">
                        Férias ({Number(contrato?.percentualFerias ?? 8.33).toFixed(2)}% a.m.)
                      </option>
                      <option value="TERCO_FERIAS_2_78">
                        1/3 Constitucional de Férias ({Number(contrato?.percentualTercoConstitucional ?? 2.78).toFixed(2)}% a.m.)
                      </option>
                      <option value="FERIAS_MAIS_TERCO">
                        Férias + 1/3 Constitucional ({(Number(contrato?.percentualFerias ?? 8.33) + Number(contrato?.percentualTercoConstitucional ?? 2.78)).toFixed(2)}% a.m.)
                      </option>
                      <option value="MULTA_RESCISORIA_FGTS">
                        Multa Rescisória de FGTS ({Number(contrato?.percentualMultaFgts ?? 4.0).toFixed(2)}% a.m.)
                      </option>
                      <option value="FGTS_SOBRE_PROVISOES">
                        Encargos Submódulo 4.1 ({Number(contrato?.percentualEncargosSubmodulo ?? 8.1).toFixed(2)}% a.m.)
                      </option>
                    </select>
                    <span className="block text-[10px] text-emerald-700 font-semibold">
                      Alíquota ativa desta rubrica: {aliquotaDaRubrica.toFixed(2)}% ao mês
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Base de Cálculo da Rubrica:</label>
                    <select
                      value={modoCalculo}
                      onChange={(e) => setModoCalculo(e.target.value as 'ALIQUOTA_RUBRICA' | 'SALDO_RETIDO')}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-600 cursor-pointer"
                    >
                      <option value="ALIQUOTA_RUBRICA">
                        Cálculo pela Alíquota da Rubrica ({aliquotaDaRubrica.toFixed(2)}% × Meses)
                      </option>
                      <option value="SALDO_RETIDO">
                        Usar Saldo Real Retido na Rubrica no Sistema
                      </option>
                    </select>
                  </div>
                </div>

                {/* Origem (sem agência) e Destino Bancário */}
                <div className="pt-2 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Origem: Conta Vinculada (Apenas Número da Conta, sem agência) */}
                  <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 space-y-2">
                    <span className="font-bold text-[11px] text-blue-950 flex items-center space-x-1.5">
                      <Building className="w-3.5 h-3.5 text-blue-700" />
                      <span>ORIGEM (Conta Vinculada FUERN — Sem Agência)</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-600 font-bold block">
                          Destinatário Fixo do Ofício:
                        </label>
                        <div className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-700">
                          Banco do Brasil S.A. • Ag. 3795-8 (Setor Público RN)
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600 font-bold block">
                          Nº da Conta Vinculada (Débito) *:
                        </label>
                        <input
                          type="text"
                          value={contaVinculada}
                          onChange={(e) => {
                            setContaVinculada(e.target.value);
                            if (erroValidacao) setErroValidacao(null);
                          }}
                          placeholder="Ex: 1300103317226"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-blue-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Destino: Conta da Empresa */}
                  <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-emerald-950 flex items-center space-x-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                        <span>QUADRO CREDITAR (Conta Corrente da Empresa Contratada)</span>
                      </span>
                      <label className="flex items-center space-x-1 cursor-pointer text-[10px] font-semibold text-emerald-900 bg-white/70 px-1.5 py-0.5 rounded border border-emerald-200 hover:bg-white transition-colors">
                        <input
                          type="checkbox"
                          checked={salvarDadosEmpresa}
                          onChange={(e) => setSalvarDadosEmpresa(e.target.checked)}
                          className="rounded text-emerald-600"
                        />
                        <span>Salvar no contrato</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-600 font-bold block">Banco *:</label>
                        <input
                          type="text"
                          value={bancoCredito}
                          onChange={(e) => {
                            setBancoCredito(e.target.value);
                            if (erroValidacao) setErroValidacao(null);
                          }}
                          placeholder="Ex: Banco do Brasil"
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600 font-bold block">Agência:</label>
                        <input
                          type="text"
                          value={agenciaCredito}
                          onChange={(e) => setAgenciaCredito(e.target.value)}
                          placeholder="Ex: 4687-6"
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600 font-bold block">Conta *:</label>
                        <input
                          type="text"
                          value={contaCredito}
                          onChange={(e) => {
                            setContaCredito(e.target.value);
                            if (erroValidacao) setErroValidacao(null);
                          }}
                          placeholder="Ex: 8980-X"
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-emerald-950"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barra de Ajuste de Meses e Encargos Opcionais */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50/60 p-3 rounded-2xl border border-blue-200 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center space-x-2 cursor-pointer font-bold text-blue-950">
                    <input
                      type="checkbox"
                      checked={incluirEncargosSubmodulo}
                      disabled={rubrica === 'MULTA_RESCISORIA_FGTS' || rubrica === 'FGTS_SOBRE_PROVISOES'}
                      onChange={(e) => setIncluirEncargosSubmodulo(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span>Somar Encargos Submódulo 4.1 sobre esta rubrica</span>
                  </label>
                  {incluirEncargosSubmodulo && (
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        step="0.01"
                        value={aliquotaEncargos}
                        onChange={(e) => setAliquotaEncargos(parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-1 bg-white border border-blue-300 rounded-lg font-bold text-blue-900 text-center"
                      />
                      <span className="font-bold text-blue-900">%</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-slate-700 font-semibold">Meses Retidos:</span>
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
                    ({selecionados.length} de {calculados.length} selecionados)
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

              {/* Tabela de Trabalhadores & Valores Calculados por Rubrica */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">Sel.</th>
                      <th className="py-2.5 px-3">Funcionário / CPF</th>
                      <th className="py-2.5 px-3 text-center">Campus</th>
                      <th className="py-2.5 px-3 text-center w-20">Meses</th>
                      <th className="py-2.5 px-3 text-right">Salário Base</th>
                      <th className="py-2.5 px-3 text-right">Saldo Retido na Rubrica</th>
                      <th className="py-2.5 px-3 text-right">
                        Valor Rubrica ({aliquotaDaRubrica.toFixed(2)}%)
                      </th>
                      {incluirEncargosSubmodulo && (
                        <th className="py-2.5 px-3 text-right">Encargos ({aliquotaEncargos}%)</th>
                      )}
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
                            <span className="text-[10px] text-slate-400 font-mono">
                              {item.cpf} • {item.cargo}
                            </span>
                          </td>
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
                              onChange={(e) =>
                                handleChangeMeses(item.trabalhadorId, parseInt(e.target.value, 10) || 1)
                              }
                              className="w-14 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-center text-xs font-bold"
                            />
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {item.salario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-700">
                            {item.saldoRetidoRubrica.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-800 font-semibold">
                            {item.valorBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          {incluirEncargosSubmodulo && (
                            <td className="py-2 px-3 text-right text-slate-600">
                              {item.valorEncargos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                          )}
                          <td className="py-2 px-3 text-right font-extrabold text-blue-950">
                            {item.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* ABA 2: PRÉVIA EDITÁVEL DO OFÍCIO (Campos Críticos Travados 🔒) */
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    <strong>Prévia Editável com Proteção de Dados Críticos:</strong> Você pode ajustar os trechos textuais (Assunto, Vocativo, Texto Inicial, Observação Complementar e Fecho). Os dados críticos (<strong>Valor</strong>, <strong>Conta Vinculada</strong>, <strong>Empresa</strong>, <strong>CNPJ</strong>, <strong>Contrato</strong> e <strong>Quadro CREDITAR</strong>) estão protegidos contra alteração manual.
                  </span>
                </div>
              </div>

              {/* Folha A4 Simulada */}
              <div
                className="bg-white border-2 border-slate-300 rounded-2xl shadow-inner p-8 max-w-3xl mx-auto text-slate-900 space-y-4"
                style={{ fontFamily: 'Times New Roman, Times, serif' }}
              >
                {/* Brasão UERN + Endereço */}
                <div className="text-center space-y-1">
                  <img
                    src={BRASAO_UERN_BASE64}
                    alt="Brasão UERN"
                    className="h-20 mx-auto object-contain"
                  />
                  <p className="text-xs text-slate-800">
                    Rua Almino Afonso, 478 - Bairro Centro, Mossoró/RN, CEP 59610-210
                  </p>
                  <p className="text-xs text-slate-800">Telefone: - http://portal.uern.br/</p>
                </div>

                {/* Número do Ofício (Travado / Derivado do Nº/Ano) */}
                <div className="pt-2 text-sm font-normal">
                  <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-300 px-2.5 py-1 rounded font-semibold">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    {numeroOficioFormatado || 'Ofício nº xx/2026 - UERN - DAS/PROAD/UERN'}
                  </span>
                </div>

                {/* Destinatário Padrão Fixo */}
                <div className="text-sm leading-snug">
                  <p>Senhor(a) Gerente</p>
                  <p>Banco do Brasil S.A.</p>
                  <p>Agência 3795-8 - Escritório Setor Público RN</p>
                </div>

                {/* Assunto (Editável) */}
                <div className="flex items-center gap-2 pt-1 text-sm">
                  <strong>Assunto:</strong>
                  <input
                    type="text"
                    value={assuntoOficio}
                    onChange={(e) => setAssuntoOficio(e.target.value)}
                    className="flex-1 px-2 py-1 border border-blue-300 bg-blue-50/40 rounded text-sm focus:bg-white focus:outline-none"
                  />
                </div>

                {/* Vocativo (Editável) */}
                <div className="pl-12 pt-1">
                  <input
                    type="text"
                    value={vocativoOficio}
                    onChange={(e) => setVocativoOficio(e.target.value)}
                    className="px-2 py-1 border border-blue-300 bg-blue-50/40 rounded text-sm focus:bg-white focus:outline-none"
                  />
                </div>

                {/* Corpo do Ofício: Texto Inicial Editável + Bloco Crítico Travado */}
                <div className="text-sm leading-relaxed space-y-2">
                  <div>
                    <label className="text-[11px] font-sans font-bold text-blue-800 flex items-center gap-1 mb-1">
                      <Edit3 className="w-3 h-3" /> Trecho introdutório (editável):
                    </label>
                    <input
                      type="text"
                      value={textoAberturaOficio}
                      onChange={(e) => setTextoAberturaOficio(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-blue-300 bg-blue-50/40 rounded text-sm focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg text-sm leading-relaxed">
                    <div className="flex items-center gap-1 text-[10px] font-sans font-bold uppercase text-slate-500 mb-1">
                      <Lock className="w-3 h-3" /> Dados críticos protegidos (calculados pelo sistema):
                    </div>
                    <p className="text-justify">
                      {textoAberturaOficio}{' '}
                      <strong>
                        {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </strong>{' '}
                      ({totalPorExtenso}) da <strong>conta nº {contaVinculada || '---'}</strong>{' '}
                      vinculada à empresa{' '}
                      <strong>{contrato?.fornecedor?.razaoSocial || 'EMPRESA CONTRATADA'}</strong>,
                      CNPJ nº <strong>{cnpjCredito || contrato?.fornecedor?.cnpj || '---'}</strong>,
                      aberta para abrigar os recursos referentes ao contrato administrativo nº{' '}
                      <strong>{contrato?.numeroContrato || contrato?.numeroEmpenho || '---'} - FUERN</strong>.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-sans font-bold text-blue-800 flex items-center gap-1 mb-1">
                      <Edit3 className="w-3 h-3" /> Parágrafo complementar / observações no ofício (opcional):
                    </label>
                    <textarea
                      rows={2}
                      value={paragrafoComplementar}
                      onChange={(e) => setParagrafoComplementar(e.target.value)}
                      placeholder="Caso deseje acrescentar alguma observação textual no corpo do ofício antes da tabela CREDITAR, digite aqui..."
                      className="w-full px-2.5 py-1.5 border border-blue-300 bg-blue-50/40 rounded text-sm focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Tabela CREDITAR Centralizada (Protegida) */}
                <div className="py-2">
                  <table className="w-3/4 mx-auto border-collapse border border-slate-700 text-xs text-center">
                    <thead>
                      <tr className="bg-slate-200 font-bold">
                        <th colSpan={4} className="border border-slate-700 py-1">
                          CREDITAR
                        </th>
                      </tr>
                      <tr className="font-bold">
                        <th className="border border-slate-700 py-1 px-2">Banco</th>
                        <th className="border border-slate-700 py-1 px-2">Agência</th>
                        <th className="border border-slate-700 py-1 px-2">Conta</th>
                        <th className="border border-slate-700 py-1 px-2">CPF /CNPJ</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-700 py-1 px-2">{bancoCredito || '-'}</td>
                        <td className="border border-slate-700 py-1 px-2">{agenciaCredito || '-'}</td>
                        <td className="border border-slate-700 py-1 px-2">{contaCredito || '-'}</td>
                        <td className="border border-slate-700 py-1 px-2">
                          {cnpjCredito || contrato?.fornecedor?.cnpj || '-'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Fecho e Assinatura */}
                <div className="pl-12">
                  <input
                    type="text"
                    value={fechoOficio}
                    onChange={(e) => setFechoOficio(e.target.value)}
                    className="px-2 py-1 border border-blue-300 bg-blue-50/40 rounded text-sm focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="text-right space-y-2 pt-2">
                  <div>
                    <input
                      type="text"
                      value={localDataOficio}
                      onChange={(e) => setLocalDataOficio(e.target.value)}
                      className="px-2 py-1 border border-blue-300 bg-blue-50/40 rounded text-sm text-right focus:bg-white focus:outline-none w-72"
                    />
                  </div>
                  <div className="pt-3 text-xs leading-snug">
                    <p className="font-bold uppercase">{diretorNome}</p>
                    <p>Matrícula nº {diretorMatricula}</p>
                    <p>{diretorPortaria}</p>
                    <p>Diretoria de Administração e Serviços – DAS/PROAD</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Resumo Financeiro & Botões de Ação */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider block">
                Valor Autorizado para {rotuloRubrica} ({selecionados.length} empregados)
              </span>
              <span className="text-2xl font-black text-emerald-300">
                {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <p className="text-xs text-slate-300 mt-1 italic">"{totalPorExtenso}"</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setAbaAtiva(abaAtiva === 'MEMORIA' ? 'PREVIA' : 'MEMORIA')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold shadow transition-all cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>{abaAtiva === 'MEMORIA' ? 'Prévia Editável do Ofício' : 'Voltar à Tabela'}</span>
              </button>

              <button
                type="button"
                onClick={() => gerarOficioPdf(true)}
                disabled={selecionados.length === 0}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow transition-all cursor-pointer disabled:opacity-40"
              >
                <FileText className="w-4 h-4 text-blue-100" />
                <span>Abrir PDF (Nova Aba)</span>
              </button>

              <button
                type="button"
                onClick={() => gerarOficioPdf(false)}
                disabled={selecionados.length === 0}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-md transition-all cursor-pointer disabled:opacity-40"
              >
                <Download className="w-4 h-4 text-blue-300" />
                <span>Baixar Ofício (.PDF)</span>
              </button>

              <button
                type="button"
                onClick={exportarMemoriaCalculoExcel}
                disabled={selecionados.length === 0}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow transition-all cursor-pointer disabled:opacity-40"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>Memória (.XLSX)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-500 font-medium text-center sm:text-left">
            Ao confirmar envio ao banco, o sistema debita a rubrica <strong>{rotuloRubrica}</strong> individualmente dos {selecionados.length} trabalhadores.
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
