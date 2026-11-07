/**
 * Configuração Institucional Central - Diretoria de Administração e Serviços (DAS / PROAD / UERN)
 *
 * Utilizada como signatário padrão dos ofícios e atos institucionais direcionados
 * ao Banco do Brasil (Conta Vinculada de Provisões Trabalhistas).
 */

export interface DadosDiretoriaDAS {
  nome: string;
  matricula: string;
  cargo: string;
  orgao: string;
  portariaNomeacao: string;
  email: string;
  telefone: string;
}

export const DADOS_DIRETORIA_DAS_PADRAO: DadosDiretoriaDAS = {
  nome: 'Pedro Eloy de Paiva Farias',
  matricula: '012757-4',
  cargo: 'Diretor de Administração e Serviços',
  orgao: 'Diretoria de Administração e Serviços / PROAD / UERN',
  portariaNomeacao: 'Portaria Nº 3827/2025-GP/FUERN',
  email: 'diradm@uern.br',
  telefone: '(84) 3315-2122 / 98733-3375',
};
