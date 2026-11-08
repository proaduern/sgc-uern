import { prisma } from "@/lib/prisma";

export type FaixaRatingContrato = "DIAMANTE" | "OURO" | "PRATA" | "BRONZE_CRITICO";

export type TipoAlertaContinuidade =
  | "DEFLAGRAR_NOVA_LICITACAO_PCA"
  | "PRORROGAR_CONTRATO_TEMPESTIVO"
  | "RISCO_ESGOTAMENTO_SALDO"
  | "REGULAR";

export interface ParametrosContratoPadrao {
  diasAlertaNovaLicitacaoMin: number; // 180 dias
  diasAlertaNovaLicitacaoMax: number; // 240 dias
  diasAlertaProrrogacao: number; // 120 dias
  limiteMaximoAcrescimoLegal: number; // 25.0%
  pesoComUsuarioImr: number; // 30.0%
  pesoComUsuarioNps: number; // 20.0%
  pesoComUsuarioTrabalhista: number; // 20.0%
  pesoComUsuarioPenalidades: number; // 15.0%
  pesoComUsuarioFiscal: number; // 15.0%
  pesoSemUsuarioImr: number; // 40.0%
  pesoSemUsuarioTrabalhista: number; // 25.0%
  pesoSemUsuarioPenalidades: number; // 20.0%
  pesoSemUsuarioFiscal: number; // 15.0%
  limiarDiamante: number; // 90
  limiarOuro: number; // 75
  limiarPrata: number; // 50
}

export const PARAMETROS_CONTRATO_PADRAO: ParametrosContratoPadrao = {
  diasAlertaNovaLicitacaoMin: 180,
  diasAlertaNovaLicitacaoMax: 240,
  diasAlertaProrrogacao: 120,
  limiteMaximoAcrescimoLegal: 25.0,
  pesoComUsuarioImr: 30.0,
  pesoComUsuarioNps: 20.0,
  pesoComUsuarioTrabalhista: 20.0,
  pesoComUsuarioPenalidades: 15.0,
  pesoComUsuarioFiscal: 15.0,
  pesoSemUsuarioImr: 40.0,
  pesoSemUsuarioTrabalhista: 25.0,
  pesoSemUsuarioPenalidades: 20.0,
  pesoSemUsuarioFiscal: 15.0,
  limiarDiamante: 90,
  limiarOuro: 75,
  limiarPrata: 50,
};

export interface ParametrosCompletosContrato {
  config: ParametrosContratoPadrao;
  isCustomizado: boolean;
  atualizadoPor?: string | null;
  updatedAt?: string | null;
}

export async function obterParametrosKpiContrato(): Promise<ParametrosCompletosContrato> {
  try {
    const p = await prisma.parametrosKpiContrato.findUnique({
      where: { id: "CONFIG_PADRAO" },
    });

    if (!p) {
      return {
        config: { ...PARAMETROS_CONTRATO_PADRAO },
        isCustomizado: false,
      };
    }

    return {
      config: {
        diasAlertaNovaLicitacaoMin: p.diasAlertaNovaLicitacaoMin,
        diasAlertaNovaLicitacaoMax: p.diasAlertaNovaLicitacaoMax,
        diasAlertaProrrogacao: p.diasAlertaProrrogacao,
        limiteMaximoAcrescimoLegal: p.limiteMaximoAcrescimoLegal,
        pesoComUsuarioImr: p.pesoComUsuarioImr,
        pesoComUsuarioNps: p.pesoComUsuarioNps,
        pesoComUsuarioTrabalhista: p.pesoComUsuarioTrabalhista,
        pesoComUsuarioPenalidades: p.pesoComUsuarioPenalidades,
        pesoComUsuarioFiscal: p.pesoComUsuarioFiscal,
        pesoSemUsuarioImr: p.pesoSemUsuarioImr,
        pesoSemUsuarioTrabalhista: p.pesoSemUsuarioTrabalhista,
        pesoSemUsuarioPenalidades: p.pesoSemUsuarioPenalidades,
        pesoSemUsuarioFiscal: p.pesoSemUsuarioFiscal,
        limiarDiamante: p.limiarDiamante,
        limiarOuro: p.limiarOuro,
        limiarPrata: p.limiarPrata,
      },
      isCustomizado: true,
      atualizadoPor: p.atualizadoPor,
      updatedAt: p.updatedAt?.toISOString(),
    };
  } catch (err) {
    console.warn("Aviso ao carregar parametros do contrato, usando padroes:", err);
    return {
      config: { ...PARAMETROS_CONTRATO_PADRAO },
      isCustomizado: false,
    };
  }
}

export async function salvarParametrosKpiContrato(
  dados: Partial<ParametrosContratoPadrao>,
  atualizadoPor?: string
) {
  const merged = { ...PARAMETROS_CONTRATO_PADRAO, ...dados };

  return await prisma.parametrosKpiContrato.upsert({
    where: { id: "CONFIG_PADRAO" },
    create: {
      id: "CONFIG_PADRAO",
      diasAlertaNovaLicitacaoMin: Math.max(1, Math.round(merged.diasAlertaNovaLicitacaoMin)),
      diasAlertaNovaLicitacaoMax: Math.max(1, Math.round(merged.diasAlertaNovaLicitacaoMax)),
      diasAlertaProrrogacao: Math.max(1, Math.round(merged.diasAlertaProrrogacao)),
      limiteMaximoAcrescimoLegal: Math.max(0, Number(merged.limiteMaximoAcrescimoLegal.toFixed(1))),
      pesoComUsuarioImr: Number(merged.pesoComUsuarioImr.toFixed(1)),
      pesoComUsuarioNps: Number(merged.pesoComUsuarioNps.toFixed(1)),
      pesoComUsuarioTrabalhista: Number(merged.pesoComUsuarioTrabalhista.toFixed(1)),
      pesoComUsuarioPenalidades: Number(merged.pesoComUsuarioPenalidades.toFixed(1)),
      pesoComUsuarioFiscal: Number(merged.pesoComUsuarioFiscal.toFixed(1)),
      pesoSemUsuarioImr: Number(merged.pesoSemUsuarioImr.toFixed(1)),
      pesoSemUsuarioTrabalhista: Number(merged.pesoSemUsuarioTrabalhista.toFixed(1)),
      pesoSemUsuarioPenalidades: Number(merged.pesoSemUsuarioPenalidades.toFixed(1)),
      pesoSemUsuarioFiscal: Number(merged.pesoSemUsuarioFiscal.toFixed(1)),
      limiarDiamante: Math.max(1, Math.min(100, Math.round(merged.limiarDiamante))),
      limiarOuro: Math.max(1, Math.min(100, Math.round(merged.limiarOuro))),
      limiarPrata: Math.max(1, Math.min(100, Math.round(merged.limiarPrata))),
      atualizadoPor: atualizadoPor || "Administrador PROAD",
    },
    update: {
      diasAlertaNovaLicitacaoMin: Math.max(1, Math.round(merged.diasAlertaNovaLicitacaoMin)),
      diasAlertaNovaLicitacaoMax: Math.max(1, Math.round(merged.diasAlertaNovaLicitacaoMax)),
      diasAlertaProrrogacao: Math.max(1, Math.round(merged.diasAlertaProrrogacao)),
      limiteMaximoAcrescimoLegal: Math.max(0, Number(merged.limiteMaximoAcrescimoLegal.toFixed(1))),
      pesoComUsuarioImr: Number(merged.pesoComUsuarioImr.toFixed(1)),
      pesoComUsuarioNps: Number(merged.pesoComUsuarioNps.toFixed(1)),
      pesoComUsuarioTrabalhista: Number(merged.pesoComUsuarioTrabalhista.toFixed(1)),
      pesoComUsuarioPenalidades: Number(merged.pesoComUsuarioPenalidades.toFixed(1)),
      pesoComUsuarioFiscal: Number(merged.pesoComUsuarioFiscal.toFixed(1)),
      pesoSemUsuarioImr: Number(merged.pesoSemUsuarioImr.toFixed(1)),
      pesoSemUsuarioTrabalhista: Number(merged.pesoSemUsuarioTrabalhista.toFixed(1)),
      pesoSemUsuarioPenalidades: Number(merged.pesoSemUsuarioPenalidades.toFixed(1)),
      pesoSemUsuarioFiscal: Number(merged.pesoSemUsuarioFiscal.toFixed(1)),
      limiarDiamante: Math.max(1, Math.min(100, Math.round(merged.limiarDiamante))),
      limiarOuro: Math.max(1, Math.min(100, Math.round(merged.limiarOuro))),
      limiarPrata: Math.max(1, Math.min(100, Math.round(merged.limiarPrata))),
      atualizadoPor: atualizadoPor || "Administrador PROAD",
    },
  });
}

export async function restaurarParametrosKpiContratoPadrao() {
  try {
    await prisma.parametrosKpiContrato.delete({
      where: { id: "CONFIG_PADRAO" },
    });
  } catch {
    // Se não existia, sem erro
  }
  return { sucesso: true };
}

export interface KpiContratoIndividual {
  id: string;
  numeroContrato: string | null;
  numeroEmpenho: string | null;
  processoSeiMae: string;
  objeto: string;
  tipoContrato: string;
  tipoVigencia: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  diasParaVencer: number;
  anosVigenciaAcumulados: number;
  podeProrrogar: boolean;
  fornecedorNome: string;
  fornecedorCnpj: string;
  fornecedorSicaf: string;
  
  // Saldo e Projeção (Burn Rate)
  valorAtualizado: number;
  totalMedido: number;
  saldoDisponivel: number;
  consumoPercentual: number;
  gastoMedioMensal: number;
  mesesRestantesVigencia: number;
  projecaoGastoRestante: number;
  deficitProjetado: number;
  saldoSuficiente: boolean;
  percentualAditivoNecessario: number;
  
  // Alertas de Continuidade Contratual
  alertaContinuidade: TipoAlertaContinuidade;
  mensagemAlertaContinuidade: string | null;
  sugestaoAcao: string | null;

  // IQContrato e Componentes (0 a 100)
  scoreImr: number;
  scoreUsuario: number | null;
  temAvaliacaoUsuario: boolean;
  quantidadeAvaliacoesUsuario: number;
  scoreTrabalhista: number;
  scorePenalidades: number;
  scoreFiscal: number;
  iqContrato: number;
  faixaIq: FaixaRatingContrato;
}

export interface KpisContratosConsolidado {
  totalContratosAtivos: number;
  valorTotalCarteira: number;
  saldoTotalDisponivel: number;
  iqMedioCarteira: number;
  faixaIqCarteira: FaixaRatingContrato;
  
  radarContinuidade: {
    necessitamNovaLicitacao: number;
    necessitamProrrogacao: number;
    riscoEsgotamentoSaldo: number;
    totalComAlertas: number;
  };

  distribuicaoQualidade: {
    diamante: number;
    ouro: number;
    prata: number;
    bronzeCritico: number;
  };

  satisfacaoUsuarioGeral: {
    mediaNota: number;
    mediaPercentual: number;
    totalAvaliacoesRegistradas: number;
  };

  contratos: KpiContratoIndividual[];
  parametrosVigentes: ParametrosCompletosContrato;
}

function diffEmDias(data1: Date, data2: Date): number {
  const diffMs = data2.getTime() - data1.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function diffEmMeses(data1: Date, data2: Date): number {
  const meses = (data2.getFullYear() - data1.getFullYear()) * 12 + (data2.getMonth() - data1.getMonth());
  return Math.max(0, meses);
}

function classificarFaixa(score: number, limiares: { diamante: number; ouro: number; prata: number }): FaixaRatingContrato {
  if (score >= limiares.diamante) return "DIAMANTE";
  if (score >= limiares.ouro) return "OURO";
  if (score >= limiares.prata) return "PRATA";
  return "BRONZE_CRITICO";
}

export async function obterKpisContratos(): Promise<KpisContratosConsolidado> {
  const paramsWrapper = await obterParametrosKpiContrato();
  const CFG = paramsWrapper.config;

  const hoje = new Date();

  const contratos = await prisma.contrato.findMany({
    where: {
      status: "ATIVO",
    },
    include: {
      fornecedor: true,
      medicoes: {
        select: {
          valorAtestadoFinal: true,
          valorNotaFiscal: true,
          valorGlosa: true,
          status: true,
        },
      },
      imrAvaliacoes: {
        select: {
          totalPontos: true,
          percentualGlosa: true,
          valorGlosa: true,
        },
      },
      penalidades: {
        select: {
          impactoScore: true,
          tipoPenalidade: true,
          status: true,
        },
      },
      avaliacoesUsuario: {
        select: {
          nota: true,
          quantidadeRespostas: true,
          campus: true,
        },
      },
      movimentacoesContaVinculada: {
        select: {
          tipoOperacao: true,
          valor: true,
        },
      },
    },
    orderBy: { vigenciaFim: "asc" },
  });

  const listaContratosKpi: KpiContratoIndividual[] = [];

  let somaIqCarteira = 0;
  let contagemContratos = 0;
  let valorTotalCarteira = 0;
  let saldoTotalDisponivel = 0;

  let countNovaLicitacao = 0;
  let countProrrogacao = 0;
  let countRiscoSaldo = 0;

  let countDiamante = 0;
  let countOuro = 0;
  let countPrata = 0;
  let countBronze = 0;

  let somaNotasUsuario = 0;
  let countRespostasUsuario = 0;

  for (const c of contratos) {
    const vigInicio = new Date(c.vigenciaInicio);
    const vigFim = new Date(c.vigenciaFim);
    const diasParaVencer = diffEmDias(hoje, vigFim);
    const anosVigencia = c.anosVigencia ?? 1;

    const isContinuado = c.tipoVigencia === "CONTINUADO";
    const limiteLegalAnos = isContinuado ? 10 : 1;
    const podeProrrogar = isContinuado && anosVigencia < limiteLegalAnos;

    const totalMedido = c.medicoes.reduce((acc, m) => {
      return acc + (m.valorAtestadoFinal ?? m.valorNotaFiscal ?? 0);
    }, 0);

    const valorAtualizado = c.valorAtualizado ?? c.valorGlobal;
    const saldoDisponivel = Math.max(0, valorAtualizado - totalMedido);
    const consumoPercentual = valorAtualizado > 0 ? Number(((totalMedido / valorAtualizado) * 100).toFixed(1)) : 0;

    valorTotalCarteira += valorAtualizado;
    saldoTotalDisponivel += saldoDisponivel;

    // Projeção Burn Rate
    const mesesDecorridos = Math.max(1, diffEmMeses(vigInicio, hoje));
    const mesesRestantes = Math.max(0, Number((diasParaVencer / 30).toFixed(1)));
    const gastoMedioMensal = Number((totalMedido / mesesDecorridos).toFixed(2));
    const projecaoGastoRestante = Number((gastoMedioMensal * mesesRestantes).toFixed(2));
    const deficitProjetado = Math.max(0, Number((projecaoGastoRestante - saldoDisponivel).toFixed(2)));
    const saldoSuficiente = deficitProjetado <= 0;
    const percentualAditivoNecessario = valorAtualizado > 0 ? Number(((deficitProjetado / valorAtualizado) * 100).toFixed(1)) : 0;

    // Radar de Continuidade com parâmetros dinâmicos
    let alertaContinuidade: TipoAlertaContinuidade = "REGULAR";
    let mensagemAlertaContinuidade: string | null = null;
    let sugestaoAcao: string | null = null;

    if (!saldoSuficiente && mesesRestantes > 0) {
      alertaContinuidade = "RISCO_ESGOTAMENTO_SALDO";
      countRiscoSaldo++;
      if (percentualAditivoNecessario <= CFG.limiteMaximoAcrescimoLegal) {
        mensagemAlertaContinuidade = `Projeção de queima de saldo indica déficit de R$ ${deficitProjetado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${percentualAditivoNecessario}%) antes do fim da vigência.`;
        sugestaoAcao = `Elaborar Termo Aditivo de Acréscimo de ${percentualAditivoNecessario}% (dentro do limite legal de ${CFG.limiteMaximoAcrescimoLegal}% do art. 125 da Lei 14.133/2021).`;
      } else {
        mensagemAlertaContinuidade = `Déficit estimado de R$ ${deficitProjetado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${percentualAditivoNecessario}%) excede o limite legal de acréscimo de ${CFG.limiteMaximoAcrescimoLegal}%.`;
        sugestaoAcao = "Deflagrar processo de licitação suplementar ou novo certame imediatamente no PCA para evitar descontinuidade.";
      }
    } else if (!podeProrrogar && diasParaVencer <= CFG.diasAlertaNovaLicitacaoMax && diasParaVencer > 0) {
      alertaContinuidade = "DEFLAGRAR_NOVA_LICITACAO_PCA";
      countNovaLicitacao++;
      mensagemAlertaContinuidade = `Vencimento em ${diasParaVencer} dias. Contrato em fase final não renovável (limite legal ou não continuado).`;
      sugestaoAcao = "Deflagrar imediatamente planejamento de nova licitação no PCA para transição tempestiva.";
    } else if (podeProrrogar && diasParaVencer <= CFG.diasAlertaProrrogacao && diasParaVencer > 0) {
      alertaContinuidade = "PRORROGAR_CONTRATO_TEMPESTIVO";
      countProrrogacao++;
      mensagemAlertaContinuidade = `Vencimento em ${diasParaVencer} dias. Prazo hábil para prorrogação de vigência.`;
      sugestaoAcao = "Iniciar pesquisa de vantajosidade de mercado e minuta de Termo Aditivo de Renovação.";
    }

    // IQContrato
    let scoreImr = 100;
    if (c.imrAvaliacoes.length > 0) {
      const mediaGlosas = c.imrAvaliacoes.reduce((acc, i) => acc + (i.percentualGlosa ?? 0), 0) / c.imrAvaliacoes.length;
      scoreImr = Math.max(0, Math.round(100 - mediaGlosas));
    }

    let scoreUsuario: number | null = null;
    let temAvaliacaoUsuario = false;
    let totalRespostas = 0;

    if (c.avaliacoesUsuario.length > 0) {
      temAvaliacaoUsuario = true;
      let somaPonderada = 0;
      for (const av of c.avaliacoesUsuario) {
        somaPonderada += av.nota * av.quantidadeRespostas;
        totalRespostas += av.quantidadeRespostas;
      }
      const notaMedia = totalRespostas > 0 ? somaPonderada / totalRespostas : 5;
      scoreUsuario = Math.round((notaMedia / 5) * 100);

      somaNotasUsuario += notaMedia * totalRespostas;
      countRespostasUsuario += totalRespostas;
    } else if (c.regimeExecucao === "DEDICACAO_EXCLUSIVA" || c.objeto.toLowerCase().includes("limpeza") || c.objeto.toLowerCase().includes("vigil")) {
      temAvaliacaoUsuario = true;
      scoreUsuario = 90;
    }

    let scoreTrabalhista = 100;
    if (c.retencaoContaVinculadaAtiva) {
      if (c.contaVinculadaStatusConta === "BLOQUEADA") {
        scoreTrabalhista = 40;
      } else if (c.contaVinculadaStatusConta === "AGUARDANDO_ABERTURA") {
        scoreTrabalhista = 75;
      } else {
        scoreTrabalhista = 100;
      }
    }

    let scorePenalidades = 100;
    if (c.penalidades.length > 0) {
      const somaImpacto = c.penalidades.reduce((acc, p) => acc + (p.impactoScore ?? 5), 0);
      scorePenalidades = Math.max(0, Math.round(100 - somaImpacto));
    }

    let scoreFiscal = 100;
    if (c.fornecedor.statusSicaf === "IRREGULAR" || c.fornecedor.statusSicaf === "SUSPENSO") {
      scoreFiscal = 0;
    } else if (c.fornecedor.statusSicaf === "PENDENCIA_ADVERTENCIA") {
      scoreFiscal = 70;
    }

    // Ponderação dinâmica conforme pesos configurados
    let iqCalculado = 100;
    if (temAvaliacaoUsuario && scoreUsuario !== null) {
      iqCalculado = Math.round(
        (scoreImr * CFG.pesoComUsuarioImr +
          scoreUsuario * CFG.pesoComUsuarioNps +
          scoreTrabalhista * CFG.pesoComUsuarioTrabalhista +
          scorePenalidades * CFG.pesoComUsuarioPenalidades +
          scoreFiscal * CFG.pesoComUsuarioFiscal) /
          100
      );
    } else {
      iqCalculado = Math.round(
        (scoreImr * CFG.pesoSemUsuarioImr +
          scoreTrabalhista * CFG.pesoSemUsuarioTrabalhista +
          scorePenalidades * CFG.pesoSemUsuarioPenalidades +
          scoreFiscal * CFG.pesoSemUsuarioFiscal) /
          100
      );
    }

    const faixaIq = classificarFaixa(iqCalculado, {
      diamante: CFG.limiarDiamante,
      ouro: CFG.limiarOuro,
      prata: CFG.limiarPrata,
    });

    if (faixaIq === "DIAMANTE") countDiamante++;
    else if (faixaIq === "OURO") countOuro++;
    else if (faixaIq === "PRATA") countPrata++;
    else countBronze++;

    somaIqCarteira += iqCalculado;
    contagemContratos++;

    listaContratosKpi.push({
      id: c.id,
      numeroContrato: c.numeroContrato,
      numeroEmpenho: c.numeroEmpenho,
      processoSeiMae: c.processoSeiMae,
      objeto: c.objeto,
      tipoContrato: c.tipoContrato,
      tipoVigencia: c.tipoVigencia,
      vigenciaInicio: vigInicio.toISOString(),
      vigenciaFim: vigFim.toISOString(),
      diasParaVencer,
      anosVigenciaAcumulados: anosVigencia,
      podeProrrogar,
      fornecedorNome: c.fornecedor.razaoSocial,
      fornecedorCnpj: c.fornecedor.cnpj,
      fornecedorSicaf: c.fornecedor.statusSicaf,
      valorAtualizado,
      totalMedido,
      saldoDisponivel,
      consumoPercentual,
      gastoMedioMensal,
      mesesRestantesVigencia: mesesRestantes,
      projecaoGastoRestante,
      deficitProjetado,
      saldoSuficiente,
      percentualAditivoNecessario,
      alertaContinuidade,
      mensagemAlertaContinuidade,
      sugestaoAcao,
      scoreImr,
      scoreUsuario,
      temAvaliacaoUsuario,
      quantidadeAvaliacoesUsuario: totalRespostas,
      scoreTrabalhista,
      scorePenalidades,
      scoreFiscal,
      iqContrato: iqCalculado,
      faixaIq,
    });
  }

  const iqMedioCarteira = contagemContratos > 0 ? Math.round(somaIqCarteira / contagemContratos) : 100;
  const faixaIqCarteira = classificarFaixa(iqMedioCarteira, {
    diamante: CFG.limiarDiamante,
    ouro: CFG.limiarOuro,
    prata: CFG.limiarPrata,
  });

  const mediaNotaUsuario = countRespostasUsuario > 0 ? Number((somaNotasUsuario / countRespostasUsuario).toFixed(2)) : 4.8;
  const mediaPercentualUsuario = Number(((mediaNotaUsuario / 5) * 100).toFixed(1));

  return {
    totalContratosAtivos: contagemContratos,
    valorTotalCarteira,
    saldoTotalDisponivel,
    iqMedioCarteira,
    faixaIqCarteira,
    radarContinuidade: {
      necessitamNovaLicitacao: countNovaLicitacao,
      necessitamProrrogacao: countProrrogacao,
      riscoEsgotamentoSaldo: countRiscoSaldo,
      totalComAlertas: countNovaLicitacao + countProrrogacao + countRiscoSaldo,
    },
    distribuicaoQualidade: {
      diamante: countDiamante,
      ouro: countOuro,
      prata: countPrata,
      bronzeCritico: countBronze,
    },
    satisfacaoUsuarioGeral: {
      mediaNota: mediaNotaUsuario,
      mediaPercentual: mediaPercentualUsuario,
      totalAvaliacoesRegistradas: countRespostasUsuario,
    },
    contratos: listaContratosKpi,
    parametrosVigentes: paramsWrapper,
  };
}
