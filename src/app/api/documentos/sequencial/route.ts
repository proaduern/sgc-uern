import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  obterProximoSequencial,
  reservarProximoSequencial,
  formatarTextoDocumentoSgc,
  normalizarTipoDocumento,
} from '@/lib/sequencial-documento';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo') || 'ORDEM_SERVICO';
    const anoParam = searchParams.get('ano');
    const ano = anoParam ? parseInt(anoParam, 10) : new Date().getFullYear();

    const dados = await obterProximoSequencial(tipo, ano);
    return NextResponse.json(dados);
  } catch (error: any) {
    console.error('Erro ao obter sequencial:', error);
    return NextResponse.json({ error: error.message || 'Erro ao obter número sequencial.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const { tipo, ano, numeroEspecifico } = body;

    const anoNum = ano ? parseInt(String(ano), 10) : new Date().getFullYear();
    const dados = await reservarProximoSequencial(
      tipo || 'ORDEM_SERVICO',
      anoNum,
      numeroEspecifico ? parseInt(String(numeroEspecifico), 10) : undefined
    );

    return NextResponse.json(dados);
  } catch (error: any) {
    console.error('Erro ao reservar sequencial:', error);
    return NextResponse.json({ error: error.message || 'Erro ao reservar número sequencial.' }, { status: 500 });
  }
}
