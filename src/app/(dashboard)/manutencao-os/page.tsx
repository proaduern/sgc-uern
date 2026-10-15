'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ManutencaoOsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redireciona para o módulo universal de Execução & Faturas
    router.replace('/execucao');
  }, [router]);

  return (
    <div className="p-8 text-center text-slate-500 text-sm">
      Redirecionando para Execução & Faturas...
    </div>
  );
}
