import { NextResponse } from "next/server";
import { obterKpisContratos } from "@/lib/services/kpi-contratos";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const kpis = await obterKpisContratos();
    return NextResponse.json(kpis);
  } catch (error: any) {
    console.error("Erro ao obter KPIs de Contratos:", error);
    return NextResponse.json(
      { erro: "Falha ao calcular KPIs de contratos", detalhes: error.message },
      { status: 500 }
    );
  }
}
