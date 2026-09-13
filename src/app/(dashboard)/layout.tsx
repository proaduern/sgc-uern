import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.deveTrocarSenha) {
    redirect('/trocar-senha');
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={session} />
      <div className="flex flex-1">
        <Sidebar role={session.role} />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
