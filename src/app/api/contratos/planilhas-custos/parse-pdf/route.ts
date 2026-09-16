import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isAdminRole, canManageTerceirizacao } from '@/lib/rbac';
import { parsePlanilhaCustosPdf } from '@/lib/pdf-planilha-custos-parser';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!isAdminRole(session.role) && !canManageTerceirizacao(session.role)) {
      return NextResponse.json(
        { error: 'Seu perfil não possui permissão para processar Planilha de Custos.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = (formData.get('arquivo') || formData.get('file')) as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo PDF não fornecido' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const parsed = await parsePlanilhaCustosPdf(buffer);

    return NextResponse.json({
      success: true,
      arquivoNome: file.name,
      dados: parsed,
    });
  } catch (error: any) {
    console.error('Erro ao processar PDF da Planilha de Custos:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao processar arquivo PDF da Planilha de Custos' },
      { status: 500 }
    );
  }
}
