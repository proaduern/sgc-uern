import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';
import * as XLSX from 'xlsx';
import { Role } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const contentType = request.headers.get('content-type') || '';
    let designacoes: any[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });

      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (!rows || rows.length === 0) {
        return NextResponse.json({ error: 'A planilha está vazia.' }, { status: 400 });
      }

      designacoes = rows.map((row) => {
        const keys = Object.keys(row);
        const getVal = (patterns: string[]) => {
          for (const key of keys) {
            const norm = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            if (patterns.some((p) => norm.includes(p))) {
              return row[key];
            }
          }
          return '';
        };

        const contratoRef = String(getVal(['contrato', 'num contrato', 'numero']) || '').trim();
        const seiRef = String(getVal(['sei', 'processo']) || '').trim();
        const papelStr = String(getVal(['atuacao', 'papel', 'funcao', 'tipo']) || 'FISCAL_ADMINISTRATIVO').toUpperCase();
        const nome = String(getVal(['nome', 'servidor', 'fiscal', 'gestor']) || '').trim();
        const email = String(getVal(['email', 'e-mail']) || '').trim();
        const matricula = String(getVal(['matricula', 'siape']) || '').trim();
        const portaria = String(getVal(['portaria', 'ato', 'numero ato', 'portaria designacao']) || 'Portaria/Designação').trim();
        const idSei = String(getVal(['id sei', 'sei ato', 'documento sei']) || 'SEI-ATO').trim();
        const campus = String(getVal(['campus', 'setor', 'unidade', 'lotacao']) || 'Campus Central').trim();

        let papel: Role = Role.FISCAL_ADMINISTRATIVO;
        if (papelStr.includes('GESTOR') && !papelStr.includes('SUPLENTE')) papel = Role.GESTOR;
        else if (papelStr.includes('SUPLENTE')) papel = Role.SUPLENTE;
        else if (papelStr.includes('TECNIC') || papelStr.includes('TEC')) papel = Role.FISCAL_TECNICO;
        else if (papelStr.includes('SETOR')) papel = Role.FISCAL_SETORIAL;
        else if (papelStr.includes('ADM')) papel = Role.FISCAL_ADMINISTRATIVO;

        return {
          contratoRef,
          seiRef,
          papel,
          nome,
          email,
          matricula,
          portaria,
          idSei,
          campus,
        };
      });
    } else {
      const body = await request.json();
      designacoes = body.designacoes || [];
    }

    if (designacoes.length === 0) {
      return NextResponse.json({ error: 'Nenhuma designação identificada na planilha.' }, { status: 400 });
    }

    const defaultPassHash = await hashPassword('123');
    let sucessoCount = 0;
    const erros: string[] = [];

    for (const d of designacoes) {
      if (!d.email || (!d.contratoRef && !d.seiRef)) {
        continue;
      }

      // Localizar o contrato
      const contrato = await prisma.contrato.findFirst({
        where: {
          OR: [
            d.contratoRef ? { numeroContrato: { contains: d.contratoRef, mode: 'insensitive' } } : undefined,
            d.seiRef ? { processoSeiMae: { contains: d.seiRef, mode: 'insensitive' } } : undefined,
          ].filter(Boolean) as any,
        },
      });

      if (!contrato) {
        erros.push(`Contrato "${d.contratoRef || d.seiRef}" não encontrado no sistema.`);
        continue;
      }

      // Localizar ou criar o usuário/servidor
      let user = await prisma.user.findUnique({
        where: { email: d.email.toLowerCase() },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            nome: d.nome || d.email.split('@')[0],
            email: d.email.toLowerCase(),
            matricula: d.matricula || null,
            senhaHash: defaultPassHash,
            role: d.papel,
            deveTrocarSenha: true,
          },
        });
      }

      // Criar ou atualizar vínculo em ContratoResponsavel
      await prisma.contratoResponsavel.upsert({
        where: {
          contratoId_userId_tipoAtuacao: {
            contratoId: contrato.id,
            userId: user.id,
            tipoAtuacao: d.papel,
          },
        },
        update: {
          numeroAtoDesignacao: d.portaria,
          idSeiAtoDesignacao: d.idSei,
          campusSetor: d.campus,
          ativo: true,
        },
        create: {
          contratoId: contrato.id,
          userId: user.id,
          tipoAtuacao: d.papel,
          numeroAtoDesignacao: d.portaria,
          idSeiAtoDesignacao: d.idSei,
          campusSetor: d.campus,
          ativo: true,
        },
      });

      sucessoCount++;
    }

    return NextResponse.json({
      success: true,
      totalProcessados: sucessoCount,
      mensagem: `${sucessoCount} designações de gestores e fiscais processadas com sucesso!`,
      erros: erros.length > 0 ? erros : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao importar fiscais em lote' }, { status: 500 });
  }
}
