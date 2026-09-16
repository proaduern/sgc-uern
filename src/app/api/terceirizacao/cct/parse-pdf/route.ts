import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isAdminRole, canManageTerceirizacao } from '@/lib/rbac';
import { parseCctPdf } from '@/lib/pdf-cct-parser';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!isAdminRole(session.role) && !canManageTerceirizacao(session.role)) {
      return NextResponse.json(
        { error: 'Seu perfil não possui permissão para processar Convenção Coletiva.' },
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

    const parsed = await parseCctPdf(buffer);

    return NextResponse.json({
      success: true,
      arquivoNome: file.name,
      dados: parsed,
    });
  } catch (error: any) {
    console.error('Erro ao processar PDF da CCT:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao processar arquivo PDF da CCT' },
      { status: 500 }
    );
  }
}
