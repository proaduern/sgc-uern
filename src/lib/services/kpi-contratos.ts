import { prisma } from "@/lib/prisma";

export type FaixaRatingContrato = "DIAMANTE" | "OURO" | "PRATA" | "BRONZE_CRITICO";

export type TipoAlertaContinuidade =
  | "DEFLAGRAR_NOVA_LICITACAO_PCA"
  | "PRORROGAR_CONTRATO_TEMPESTIVO"
  | "RISCO_ESGOTAMENTO_SALDO"
  | "REGULAR";

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
    mediaNota: number; // 1 a 5
    mediaPercentual: number; // 0 a 100%
    totalAvaliacoesRegistradas: number;
  };

  contratos: KpiContratoIndividual[];
}

function diffEmDias(data1: Date, data2: Date): number {
  const diffMs = data2.getTime() - data1.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function diffEmMeses(data1: Date, data2: Date): number {
  const meses = (data2.getFullYear() - data1.getFullYear()) * 12 + (data2.getMonth() - data1.getMonth());
  return Math.max(0, meses);
}

function classificarFaixa(score: number): FaixaRatingContrato {
  if (score >= 90) return "DIAMANTE";
  if (score >= 75) return "OURO";
  if (score >= 50) return "PRATA";
  return "BRONZE_CRITICO";
}

export async function obterKpisContratos(): Promise<KpisContratosConsolidado> {
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

    // Limite legal de prorrogação (Lei 14.133/2021)
    const isContinuado = c.tipoVigencia === "CONTINUADO";
    const limiteLegalAnos = isContinuado ? 10 : 1;
    const podeProrrogar = isContinuado && anosVigencia < limiteLegalAnos;

    // Saldo e Medições
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

    // Radar de Continuidade
    let alertaContinuidade: TipoAlertaContinuidade = "REGULAR";
    let mensagemAlertaContinuidade: string | null = null;
    let sugestaoAcao: string | null = null;

    if (!saldoSuficiente && mesesRestantes > 0) {
      alertaContinuidade = "RISCO_ESGOTAMENTO_SALDO";
      countRiscoSaldo++;
      if (percentualAditivoNecessario <= 25) {
        mensagemAlertaContinuidade = `Projeção de queima de saldo indica déficit de R$ ${deficitProjetado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${percentualAditivoNecessario}%) antes do fim da vigência.`;
        sugestaoAcao = `Elaborar Termo Aditivo de Acréscimo de ${percentualAditivoNecessario}% (dentro do limite legal de 25% do art. 125 da Lei 14.133/2021).`;
      } else {
        mensagemAlertaContinuidade = `Déficit estimado de R$ ${deficitProjetado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${percentualAditivoNecessario}%) excede o limite legal de acréscimo de 25%.`;
        sugestaoAcao = "Deflagrar processo de licitação suplementar ou novo certame imediatamente no PCA para evitar descontinuidade.";
      }
    } else if (!podeProrrogar && diasParaVencer <= 240 && diasParaVencer > 0) {
      alertaContinuidade = "DEFLAGRAR_NOVA_LICITACAO_PCA";
      countNovaLicitacao++;
      mensagemAlertaContinuidade = `Vencimento em ${diasParaVencer} dias. Contrato em fase final não renovável (limite legal ou não continuado).`;
      sugestaoAcao = "Deflagrar imediatamente planejamento de nova licitação no PCA para transição tempestiva.";
    } else if (podeProrrogar && diasParaVencer <= 120 && diasParaVencer > 0) {
      alertaContinuidade = "PRORROGAR_CONTRATO_TEMPESTIVO";
      countProrrogacao++;
      mensagemAlertaContinuidade = `Vencimento em ${diasParaVencer} dias. Prazo hábil para prorrogação de vigência.`;
      sugestaoAcao = "Iniciar pesquisa de vantajosidade de mercado e minuta de Termo Aditivo de Renovação.";
    }

    // ----------------------------------------------------
    // IQContrato: Cálculo Multidimensional
    // ----------------------------------------------------
    // 1. IMR
    let scoreImr = 100;
    if (c.imrAvaliacoes.length > 0) {
      const mediaGlosas = c.imrAvaliacoes.reduce((acc, i) => acc + (i.percentualGlosa ?? 0), 0) / c.imrAvaliacoes.length;
      scoreImr = Math.max(0, Math.round(100 - mediaGlosas));
    }

    // 2. Satisfação do Usuário / NPS
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
      // Contratos com usuários intensos sem avaliação direta ainda: nota referencial base
      temAvaliacaoUsuario = true;
      scoreUsuario = 90;
    }

    // 3. Conformidade Trabalhista & Conta Vinculada
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

    // 4. Histórico Sancionatório
    let scorePenalidades = 100;
    if (c.penalidades.length > 0) {
      const somaImpacto = c.penalidades.reduce((acc, p) => acc + (p.impactoScore ?? 5), 0);
      scorePenalidades = Math.max(0, Math.round(100 - somaImpacto));
    }

    // 5. Regularidade Fiscal
    let scoreFiscal = 100;
    if (c.fornecedor.statusSicaf === "IRREGULAR" || c.fornecedor.statusSicaf === "SUSPENSO") {
      scoreFiscal = 0;
    } else if (c.fornecedor.statusSicaf === "PENDENCIA_ADVERTENCIA") {
      scoreFiscal = 70;
    }

    // Ponderação do IQContrato conforme público usuário
    let iqCalculado = 100;
    if (temAvaliacaoUsuario && scoreUsuario !== null) {
      iqCalculado = Math.round(
        scoreImr * 0.30 +
        scoreUsuario * 0.20 +
        scoreTrabalhista * 0.20 +
        scorePenalidades * 0.15 +
        scoreFiscal * 0.15
      );
    } else {
      iqCalculado = Math.round(
        scoreImr * 0.40 +
        scoreTrabalhista * 0.25 +
        scorePenalidades * 0.20 +
        scoreFiscal * 0.15
      );
    }

    const faixaIq = classificarFaixa(iqCalculado);
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
  const faixaIqCarteira = classificarFaixa(iqMedioCarteira);

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
  };
}
