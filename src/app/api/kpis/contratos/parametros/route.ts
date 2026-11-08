import { NextRequest, NextResponse } from "next/server";
import {
  obterParametrosKpiContrato,
  salvarParametrosKpiContrato,
  restaurarParametrosKpiContratoPadrao,
} from "@/lib/services/kpi-contratos";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const params = await obterParametrosKpiContrato();
    return NextResponse.json(params);
  } catch (error: any) {
    return NextResponse.json(
      { erro: "Falha ao obter parâmetros de KPIs do SGC", detalhes: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.restaurarPadroes) {
      await restaurarParametrosKpiContratoPadrao();
      return NextResponse.json({ sucesso: true, mensagem: "Padrões restaurados com sucesso." });
    }

    const { config, atualizadoPor } = body;
    const resultado = await salvarParametrosKpiContrato(config || body, atualizadoPor);

    return NextResponse.json({ sucesso: true, resultado });
  } catch (error: any) {
    return NextResponse.json(
      { erro: "Falha ao salvar parâmetros de KPIs do SGC", detalhes: error.message },
      { status: 500 }
    );
  }
}
