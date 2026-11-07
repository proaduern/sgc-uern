import { NextRequest, NextResponse } from 'next/server';
import { obterSessaoReal, iniciarAtuarComo, encerrarAtuarComo, UserSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const sessaoReal = await obterSessaoReal();
    const isAdmin =
      sessaoReal &&
      (sessaoReal.role === 'ADMIN_PROAD' ||
        sessaoReal.role === 'ADMIN_PARCIAL' ||
        sessaoReal.role === 'ADMIN');

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Apenas Administradores podem alternar perfis no SGC.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tipo, role, usuarioId, fornecedorCnpj, fornecedorNome } = body as {
      tipo?: 'ARQUETIPO' | 'USUARIO_REAL' | 'FORNECEDOR';
      role?: string;
      usuarioId?: string;
      fornecedorCnpj?: string;
      fornecedorNome?: string;
    };

    let payload: UserSession;

    if (tipo === 'USUARIO_REAL' && usuarioId) {
      const u = await prisma.user.findUnique({
        where: { id: usuarioId },
      });
      if (!u) {
        return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
      }
      payload = {
        id: u.id,
        nome: u.nome,
        email: u.email,
        matricula: u.matricula,
        role: u.role,
        deveTrocarSenha: false,
      };
    } else if (tipo === 'FORNECEDOR' || role === 'FORNECEDOR') {
      const cnpj = fornecedorCnpj || '12.345.678/0001-90';
      const razao = fornecedorNome || 'AB Engenharia e Construções Ltda';
      payload = {
        id: `sim_fornecedor_${cnpj.replace(/\D/g, '')}`,
        nome: `Preposto - ${razao}`,
        email: 'preposto.externo@empresa.com.br',
        matricula: 'EXT-FORNECEDOR',
        role: 'FORNECEDOR',
        deveTrocarSenha: false,
        empresaCnpj: cnpj,
        empresaNome: razao,
      };
    } else {
      // Arquetipos de servidor interno (Hermes)
      const roleAlvo = role || 'GESTOR';
      const mapNomes: Record<string, { nome: string; matricula: string }> = {
        GESTOR: { nome: 'Prof. Gestor de Contratos', matricula: '010101-1' },
        FISCAL_ADMINISTRATIVO: { nome: 'Fiscal Administrativo (Conta Vinculada)', matricula: '010202-2' },
        FISCAL_TECNICO: { nome: 'Fiscal Técnico Operacional', matricula: '010303-3' },
        FISCAL_SETORIAL: { nome: 'Fiscal Setorial (Campus Mossoró)', matricula: '010404-4' },
        GESTOR_ATA: { nome: 'Gestor de Atas de Registro de Preços', matricula: '010505-5' },
        USUARIO: { nome: 'Servidor Demandante UERN', matricula: '010606-6' },
      };

      const info = mapNomes[roleAlvo] || { nome: `Simulação - ${roleAlvo}`, matricula: '000000-0' };

      payload = {
        id: `sim_${roleAlvo.toLowerCase()}`,
        nome: info.nome,
        email: `sim.${roleAlvo.toLowerCase()}@uern.br`,
        matricula: info.matricula,
        role: roleAlvo,
        deveTrocarSenha: false,
      };
    }

    await iniciarAtuarComo(payload);

    return NextResponse.json({
      success: true,
      user: payload,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao iniciar simulação.' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await encerrarAtuarComo();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao encerrar simulação.' }, { status: 500 });
  }
}
