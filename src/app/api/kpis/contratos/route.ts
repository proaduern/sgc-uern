import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminRole } from "@/lib/rbac";
import { obterKpisContratos } from "@/lib/services/kpi-contratos";

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
