import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SGC-UERN | Sistema de Gestão de Contratos e Atas',
  description: 'Sistema Integrado de Gestão e Fiscalização de Contratos e Atas da Universidade do Estado do Rio Grande do Norte (UERN / PROAD)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
