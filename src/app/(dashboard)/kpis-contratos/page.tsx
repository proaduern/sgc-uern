import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isAdminRole } from "@/lib/rbac";
import { obterKpisContratos, type FaixaRatingContrato, type TipoAlertaContinuidade } from "@/lib/services/kpi-contratos";
import {
  Award,
  AlertTriangle,
  Clock,
  TrendingUp,
  ShieldCheck,
  Building2,
  DollarSign,
  Users,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Flame,
  FilePlus,
  RefreshCw,
  Sparkles,
  Sliders,
} from "lucide-react";

export const dynamic = "force-dynamic";

function formatarFaixaBadge(faixa: FaixaRatingContrato) {
  switch (faixa) {
    case "DIAMANTE":
      return {
        label: "Diamante (Excelente)",
        classes: "bg-cyan-100 text-cyan-800 border-cyan-300",
        dot: "bg-cyan-500",
      };
    case "OURO":
      return {
        label: "Ouro (Bom)",
        classes: "bg-emerald-100 text-emerald-800 border-emerald-300",
        dot: "bg-emerald-500",
      };
    case "PRATA":
      return {
        label: "Prata (Regular)",
        classes: "bg-amber-100 text-amber-800 border-amber-300",
        dot: "bg-amber-500",
      };
    case "BRONZE_CRITICO":
      return {
        label: "Bronze (Crítico)",
        classes: "bg-rose-100 text-rose-800 border-rose-300 animate-pulse",
        dot: "bg-rose-500",
      };
  }
}

export default async function KpisContratosPage() {
  const session = await getSession();
  if (!session || !isAdminRole(session.role)) {
    redirect("/");
  }

  const kpis = await obterKpisContratos();
  const badgeCarteira = formatarFaixaBadge(kpis.faixaIqCarteira);

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-[#003366]">
              Governança PROAD
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              SGC • Lei 14.133/2021
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Controle de Eficiência e Nível de Qualidade dos Contratos (IQContrato)
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Radar de continuidade de serviços, queima de saldo (burn rate), satisfação do usuário e conformidade legal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/kpis-contratos/parametros"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:text-[#003366] hover:bg-slate-50 transition shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5 text-[#003366]" />
            Configurar Parâmetros &amp; Pesos
          </Link>
          <Link
            href="/planejamento-pca"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-xs font-bold text-[#003366] hover:bg-blue-100 transition shadow-sm"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            Integrar ao PCA
          </Link>
        </div>
      </div>

      {/* Alertas de Continuidade Crítica (Radar de Deflagração / Saldo) */}
      {kpis.radarContinuidade.totalComAlertas > 0 ? (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-md">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-800">
                  Radar de Continuidade Contratual Ativo
                </span>
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                  {kpis.radarContinuidade.totalComAlertas} Alertas
                </span>
              </div>
              <h3 className="text-base font-bold text-amber-950 mt-0.5">
                Atenção à Vigência e Saldo dos Contratos de Serviços Continuados
              </h3>
              <p className="mt-1 text-xs text-amber-900 leading-relaxed">
                Foram identificados <strong>{kpis.radarContinuidade.necessitamNovaLicitacao} contrato(s)</strong> que necessitam de nova licitação no PCA (limite temporal não renovável), <strong>{kpis.radarContinuidade.necessitamProrrogacao} contrato(s)</strong> elegíveis para prorrogação tempestiva (&lt; 120 dias) e <strong>{kpis.radarContinuidade.riscoEsgotamentoSaldo} contrato(s)</strong> com queima acelerada de saldo exigindo termo aditivo de acréscimo antes de esgotar o empenho.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
          <p className="text-xs font-semibold text-emerald-900">
            Excelente! Todos os contratos com saldos saudáveis e vigências confortáveis. Nenhum risco iminente de descontinuidade.
          </p>
        </div>
      )}

      {/* Top Cards Executivos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: IQContrato Médio */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              IQContrato Médio
            </span>
            <Award className="h-5 w-5 text-[#003366]" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{kpis.iqMedioCarteira}</span>
            <span className="text-xs font-bold text-slate-400">/ 100</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeCarteira.classes}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${badgeCarteira.dot}`} />
              {badgeCarteira.label}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between">
            <span>Contratos Ativos:</span>
            <strong className="text-slate-800">{kpis.totalContratosAtivos}</strong>
          </div>
        </div>

        {/* Card 2: Radar de Continuidade */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Radar de Continuidade
            </span>
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-950">
              {kpis.radarContinuidade.totalComAlertas}
            </span>
            <span className="text-xs font-bold text-amber-700">demandam ação</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-amber-200 bg-amber-50 text-amber-800">
              Nova Licitação ({kpis.radarContinuidade.necessitamNovaLicitacao}) • Prorrogação ({kpis.radarContinuidade.necessitamProrrogacao})
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between">
            <span>Queima de Saldo (Risco):</span>
            <strong className="text-rose-700">{kpis.radarContinuidade.riscoEsgotamentoSaldo}</strong>
          </div>
        </div>

        {/* Card 3: Satisfação do Usuário */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Satisfação dos Usuários
            </span>
            <Users className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {kpis.satisfacaoUsuarioGeral.mediaNota}
            </span>
            <span className="text-xs font-bold text-emerald-600">/ 5.0 estrelas</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-800">
              {kpis.satisfacaoUsuarioGeral.mediaPercentual}% de Aprovação
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between">
            <span>Avaliações Computadas:</span>
            <strong className="text-slate-800">{kpis.satisfacaoUsuarioGeral.totalAvaliacoesRegistradas} nos campi</strong>
          </div>
        </div>

        {/* Card 4: Saldo Global da Carteira */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Saldo Restante
            </span>
            <DollarSign className="h-5 w-5 text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">
              R$ {(kpis.saldoTotalDisponivel / 1_000_000).toFixed(2)}M
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-blue-200 bg-blue-50 text-blue-800">
              Total: R$ {(kpis.valorTotalCarteira / 1_000_000).toFixed(2)}M
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between">
            <span>Disponibilidade:</span>
            <strong className="text-blue-800">
              {kpis.valorTotalCarteira > 0
                ? ((kpis.saldoTotalDisponivel / kpis.valorTotalCarteira) * 100).toFixed(1)
                : 0}
              %
            </strong>
          </div>
        </div>
      </div>

      {/* Seção 1: Radar de Continuidade e Queima de Saldo (Burn Rate) */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-600" />
              Radar de Continuidade & Previsão de Saldo (Burn Rate)
            </h3>
            <p className="text-xs text-slate-500">
              Projeção preditiva de consumo até o fim da vigência e prazos legais de renovação / nova licitação.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Contrato / Objeto</th>
                <th className="py-3 px-4">Fornecedor</th>
                <th className="py-3 px-4 text-center">Fim Vigência</th>
                <th className="py-3 px-4 text-center">Dias Restantes</th>
                <th className="py-3 px-4 text-center">Saldo Disponível</th>
                <th className="py-3 px-4 text-center">Gasto Médio/Mês</th>
                <th className="py-3 px-4 text-center">Projeção até o Fim</th>
                <th className="py-3 px-4">Alerta / Ação Recomendada</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {kpis.contratos.map((c) => {
                const isRiscoSaldo = c.alertaContinuidade === "RISCO_ESGOTAMENTO_SALDO";
                const isNovaLic = c.alertaContinuidade === "DEFLAGRAR_NOVA_LICITACAO_PCA";
                const isProrrog = c.alertaContinuidade === "PRORROGAR_CONTRATO_TEMPESTIVO";

                return (
                  <tr
                    key={c.id}
                    className={`hover:bg-slate-50 transition ${
                      isRiscoSaldo ? "bg-rose-50/40" : isNovaLic ? "bg-amber-50/40" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <strong className="block text-slate-900 font-mono text-[11px]">
                        {c.numeroContrato || c.numeroEmpenho || "Sem termo"}
                      </strong>
                      <span className="text-slate-500 text-[11px] line-clamp-1 max-w-xs">{c.objeto}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 line-clamp-1 max-w-[160px]">
                        {c.fornecedorNome}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{c.fornecedorCnpj}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-600">
                      {new Date(c.vigenciaFim).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-black ${
                          c.diasParaVencer <= 60
                            ? "text-rose-600"
                            : c.diasParaVencer <= 120
                            ? "text-amber-600"
                            : "text-slate-800"
                        }`}
                      >
                        {c.diasParaVencer}d
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                      R$ {c.saldoDisponivel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">
                      R$ {c.gastoMedioMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-bold ${
                          !c.saldoSuficiente ? "text-rose-600" : "text-emerald-700"
                        }`}
                      >
                        R$ {c.projecaoGastoRestante.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                      {!c.saldoSuficiente && (
                        <span className="block text-[9px] font-bold text-rose-600 uppercase">
                          Déficit R$ {c.deficitProjetado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {c.mensagemAlertaContinuidade ? (
                        <div className="space-y-0.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isRiscoSaldo
                                ? "bg-rose-100 text-rose-800 border-rose-300"
                                : isNovaLic
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-blue-100 text-blue-800 border-blue-300"
                            }`}
                          >
                            {isRiscoSaldo
                              ? "Queima Acelerada de Saldo"
                              : isNovaLic
                              ? "Nova Licitação Necessária"
                              : "Prorrogação Tempestiva"}
                          </span>
                          <p className="text-[10px] text-slate-600 line-clamp-1">{c.sugestaoAcao}</p>
                        </div>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-[11px]">Vigência Regular</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/contratos/${c.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#003366] hover:underline"
                      >
                        Gerenciar <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Seção 2: Índice de Qualidade do Contrato (IQContrato) com Avaliação do Usuário */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              IQContrato: Nível de Qualidade e Confiabilidade dos Fornecedores
            </h3>
            <p className="text-xs text-slate-500">
              Ponderação multidimensional: IMR (30%), Satisfação do Usuário (20%), Trabalhista/Conta Vinculada (20%), Penalidades (15%) e SICAF (15%).
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Fornecedor / Contrato</th>
                <th className="py-3 px-4 text-center">IMR (30%)</th>
                <th className="py-3 px-4 text-center">Usuário / NPS (20%)</th>
                <th className="py-3 px-4 text-center">Trabalhista & Conta Vinc. (20%)</th>
                <th className="py-3 px-4 text-center">Penalidades (15%)</th>
                <th className="py-3 px-4 text-center">SICAF (15%)</th>
                <th className="py-3 px-4 text-center">IQContrato Final</th>
                <th className="py-3 px-4 text-center">Rating</th>
                <th className="py-3 px-4 text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {kpis.contratos.map((c) => {
                const b = formatarFaixaBadge(c.faixaIq);
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <strong className="block text-slate-900 font-bold text-[11px]">{c.fornecedorNome}</strong>
                      <span className="text-slate-500 text-[10px]">
                        Contrato: {c.numeroContrato || c.numeroEmpenho || "Sem termo"} • {c.objeto.slice(0, 40)}...
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">{c.scoreImr}</td>
                    <td className="py-3 px-4 text-center">
                      {c.temAvaliacaoUsuario && c.scoreUsuario !== null ? (
                        <div>
                          <span className="font-bold text-emerald-700">{c.scoreUsuario}</span>
                          <span className="block text-[9px] text-slate-400">
                            {c.quantidadeAvaliacoesUsuario > 0 ? `${c.quantidadeAvaliacoesUsuario} notas` : "Referencial"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Sem usuário direto</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">{c.scoreTrabalhista}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">{c.scorePenalidades}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-bold ${
                          c.scoreFiscal === 100
                            ? "text-emerald-700"
                            : c.scoreFiscal === 70
                            ? "text-amber-600"
                            : "text-rose-600"
                        }`}
                      >
                        {c.scoreFiscal}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm font-black text-slate-900">{c.iqContrato}</span>
                      <span className="text-[10px] text-slate-400">/100</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${b.classes}`}>
                        {b.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/contratos/${c.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#003366] hover:underline"
                      >
                        Ver <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
