import { NextResponse } from 'next/server';
import { encerrarAtuarComo } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await encerrarAtuarComo();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao encerrar simulação.' }, { status: 500 });
  }
}
