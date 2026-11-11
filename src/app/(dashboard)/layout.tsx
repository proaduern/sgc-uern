import React from 'react';
import { redirect } from 'next/navigation';
import { getSession, obterSessaoReal } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import BarraImpersonacaoAdmin from '@/components/layout/BarraImpersonacaoAdmin';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const sessaoReal = await obterSessaoReal();

  if (session.deveTrocarSenha && sessaoReal?.id === session.id) {
    redirect('/trocar-senha');
  }

  // Obter designações ativas do usuário em contratos para calibrar o menu dinamicamente
  const designacoes = await prisma.contratoResponsavel.findMany({
    where: { userId: session.id, ativo: true },
    select: {
      tipoAtuacao: true,
      contrato: {
        select: {
          objeto: true,
          numeroContrato: true,
        },
      },
    },
  });
  const contractRoles = Array.from(new Set(designacoes.map((d) => d.tipoAtuacao.toString())));

  // Identifica se o usuário é fiscal/gestor de algum contrato de viagens, passagens, hospedagem ou transporte
  const temContratoViagens = designacoes.some((d) => {
    const obj = (d.contrato?.objeto || '').toLowerCase();
    const num = (d.contrato?.numeroContrato || '').toLowerCase();
    return (
      obj.includes('viagen') ||
      obj.includes('passagen') ||
      obj.includes('hospedagem') ||
      obj.includes('transporte') ||
      num.includes('06/2025')
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <BarraImpersonacaoAdmin sessaoReal={sessaoReal} sessaoAtual={session} />
      <Navbar user={session} />
      <div className="flex flex-1">
        <Sidebar role={session.role} contractRoles={contractRoles} temContratoViagens={temContratoViagens} />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
