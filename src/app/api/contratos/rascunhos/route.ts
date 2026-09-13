import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const rascunhos = await prisma.contratoRascunho.findMany({
      where: { usuarioId: session.id },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(rascunhos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const { id, tituloIdentificador, numeroContrato, processoSei, objeto, dados } = body;

    let rascunho;
    if (id) {
      const existing = await prisma.contratoRascunho.findFirst({
        where: { id, usuarioId: session.id },
      });
      if (existing) {
        rascunho = await prisma.contratoRascunho.update({
          where: { id },
          data: {
            tituloIdentificador:
              tituloIdentificador ||
              (numeroContrato ? `Contrato nº ${numeroContrato}` : 'Rascunho em Andamento'),
            numeroContrato: numeroContrato || null,
            processoSei: processoSei || null,
            objeto: objeto || null,
            dados: dados || {},
            updatedAt: new Date(),
          },
        });
      }
    }

    if (!rascunho) {
      rascunho = await prisma.contratoRascunho.create({
        data: {
          usuarioId: session.id,
          tituloIdentificador:
            tituloIdentificador ||
            (numeroContrato ? `Contrato nº ${numeroContrato}` : 'Rascunho em Andamento'),
          numeroContrato: numeroContrato || null,
          processoSei: processoSei || null,
          objeto: objeto || null,
          dados: dados || {},
        },
      });
    }

    return NextResponse.json(rascunho);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
