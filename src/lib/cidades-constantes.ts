export interface UnidadeUern {
  id: string;
  sigla: string;
  nome: string;
  campus: string; // Cidade: Mossoró, Assú, Caicó, Patu, Pau dos Ferros, Natal
}

export const CIDADES_UERN = [
  'Mossoró',
  'Pau dos Ferros',
  'Assú',
  'Caicó',
  'Patu',
  'Natal',
] as const;

export type CidadeUern = (typeof CIDADES_UERN)[number];

/**
 * Normaliza qualquer variação de texto para a cidade canônica oficial da UERN.
 * Ex: "Campus Pau dos Ferros", "Palos Verros", "CAPF" -> "Pau dos Ferros"
 */
export function normalizarCidadeCampus(texto?: string | null): string {
  if (!texto) return '';
  const t = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (t.includes('ferro') || t.includes('capf')) return 'Pau dos Ferros';
  if (t.includes('natal') || t.includes('can')) return 'Natal';
  if (t.includes('caico') || t.includes('serido') || t.includes('cac')) return 'Caicó';
  if (t.includes('assu') || t.includes('caa')) return 'Assú';
  if (t.includes('patu') || t.includes('cap')) return 'Patu';
  if (t.includes('mossoro') || t.includes('reitoria') || t.includes('central')) return 'Mossoró';

  return texto.trim();
}

/**
 * Lista estática das unidades oficiais da UERN como fallback de segurança
 */
export const UNIDADES_UERN_PADRAO: UnidadeUern[] = [
  // Campi Avançados e Fora da Sede
  { id: 'u-assu', sigla: 'CAMPUS-ASSU', nome: 'Campus Avançado de Assú (CAA)', campus: 'Assú' },
  { id: 'u-caico', sigla: 'CAMPUS-CAICO', nome: 'Campus Avançado de Caicó (CAC)', campus: 'Caicó' },
  { id: 'u-pau-ferros', sigla: 'CAMPUS-PAU-FERROS', nome: 'Campus Avançado de Pau dos Ferros (CAPF)', campus: 'Pau dos Ferros' },
  { id: 'u-natal', sigla: 'CAMPUS-NATAL', nome: 'Campus Avançado de Natal (CAN)', campus: 'Natal' },
  { id: 'u-patu', sigla: 'CAMPUS-PATU', nome: 'Campus Avançado de Patu (CAP)', campus: 'Patu' },

  // Unidades da Sede (Mossoró)
  { id: 'u-proad', sigla: 'PROAD', nome: 'Pró-Reitoria de Administração (PROAD)', campus: 'Mossoró' },
  { id: 'u-dlc', sigla: 'DLC', nome: 'Diretoria de Licitações e Contratos (DLC)', campus: 'Mossoró' },
  { id: 'u-proplan', sigla: 'PROPLAN', nome: 'Pró-Reitoria de Planejamento, Orçamento e Finanças (PROPLAN)', campus: 'Mossoró' },
  { id: 'u-sobe', sigla: 'SOBE', nome: 'Superintendência de Obras e Engenharia (SOBE)', campus: 'Mossoró' },
  { id: 'u-fad', sigla: 'FAD', nome: 'Faculdade de Direito (FAD)', campus: 'Mossoró' },
  { id: 'u-facs', sigla: 'FACS', nome: 'Faculdade de Ciências da Saúde (FACS)', campus: 'Mossoró' },
  { id: 'u-faen', sigla: 'FAEN', nome: 'Faculdade de Enfermagem (FAEN)', campus: 'Mossoró' },
  { id: 'u-proeg', sigla: 'PROEG', nome: 'Pró-Reitoria de Ensino de Graduação (PROEG)', campus: 'Mossoró' },
  { id: 'u-fasso', sigla: 'FASSO', nome: 'Faculdade de Serviço Social (FASSO)', campus: 'Mossoró' },
  { id: 'u-fafic', sigla: 'FAFIC', nome: 'Faculdade de Filosofia e Ciências Sociais (FAFIC)', campus: 'Mossoró' },
  { id: 'u-fe', sigla: 'FE', nome: 'Faculdade de Educação (FE)', campus: 'Mossoró' },
  { id: 'u-fanat', sigla: 'FANAT', nome: 'Faculdade de Ciências Exatas e Naturais (FANAT)', campus: 'Mossoró' },
  { id: 'u-propeg', sigla: 'PROPEG', nome: 'Pró-Reitoria de Pesquisa e Pós-Graduação (PROPEG)', campus: 'Mossoró' },
  { id: 'u-proex', sigla: 'PROEX', nome: 'Pró-Reitoria de Extensão (PROEX)', campus: 'Mossoró' },
  { id: 'u-prae', sigla: 'PRAE', nome: 'Pró-Reitoria de Assuntos Estudantis (PRAE)', campus: 'Mossoró' },
  { id: 'u-progep', sigla: 'PROGEP', nome: 'Pró-Reitoria de Gestão de Pessoas (PROGEP)', campus: 'Mossoró' },
  { id: 'u-dti', sigla: 'DTI', nome: 'Diretoria de Tecnologia da Informação (DTI)', campus: 'Mossoró' },
  { id: 'u-reitoria', sigla: 'REITORIA', nome: 'Gabinete da Reitoria (GR)', campus: 'Mossoró' },
];
