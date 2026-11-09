import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminRole } from "@/lib/rbac";
import {
  obterParametrosKpiContrato,
  salvarParametrosKpiContrato,
  restaurarParametrosKpiContratoPadrao,
} from "@/lib/services/kpi-contratos";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json(
        { erro: "Acesso restrito ao administrador geral do sistema." },
        { status: 403 }
      );
    }

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
    const session = await getSession();
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json(
        { erro: "Acesso restrito ao administrador geral do sistema." },
        { status: 403 }
      );
    }

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
