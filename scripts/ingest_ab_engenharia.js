const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const CONTRATO_ID = '6943a96e-047d-4d06-8f3f-12a3c3af1b6d';
const FORNECEDOR_ID = 'c4369dcd-bc14-4861-b03f-03dc77248414';

function cleanCpf(cpf) {
  return String(cpf || '').replace(/\D/g, '').padStart(11, '0');
}

function formatCpf(cpf) {
  const d = cleanCpf(cpf);
  if (d.length !== 11) return String(cpf || '').trim();
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

const WORKERS_DATA = [
  {
    nomeCompleto: 'Ícaro Patrick de Oliveira',
    cpf: '124.400.384-07',
    funcao: 'SUPERVISOR PARA ACOMPANHAMENTO DE SERVIÇOS DE CAMPO',
    campus: 'Campus Central (Mossoró)',
    setorLotacao: 'DIINFRA / Manutenção Predial - Mossoró',
    salarioBaseCct: 2389.81,
    banco: 'Nubank (0260)',
    agencia: '0001',
    contaCorrente: '14346265-5',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    dataDemissao: new Date('2026-08-31T23:59:59.000Z'),
    status: 'SUBSTITUIDO',
    beneficiosInfo: 'Auxílio Alimentação: R$ 214,00 | Auxílio Saúde: R$ 147,63 | Seguro de Vida: R$ 2,00 | BSF: R$ 16,80 [Substituído a partir de 01/09/2026 por Ryan Miqueias Oliveira Mesquita conforme Processo SEI 04410035.002260/2026-43 e Relatório de Faturamento Setembro/2026]'
  },
  {
    nomeCompleto: 'Ryan Miqueias Oliveira Mesquita',
    cpf: '701.180.294-14',
    funcao: 'SUPERVISOR PARA ACOMPANHAMENTO DE SERVIÇOS DE CAMPO',
    campus: 'Campus Central (Mossoró)',
    setorLotacao: 'DIINFRA / Manutenção Predial - Mossoró',
    salarioBaseCct: 2389.81,
    banco: 'Nubank (0260)',
    agencia: '0001',
    contaCorrente: '14346265-5',
    dataAdmissao: new Date('2026-09-01T00:00:00.000Z'),
    dataDemissao: null,
    status: 'ATIVO',
    beneficiosInfo: 'Auxílio Alimentação: R$ 214,00 | Auxílio Saúde: R$ 147,63 | Seguro de Vida: R$ 2,00 | BSF: R$ 16,80 [Substituiu Ícaro Patrick de Oliveira no posto de Supervisor a partir de 01/09/2026 conforme Processo SEI 04410035.002260/2026-43]'
  },
  {
    nomeCompleto: 'Kerginaldo Benjamin Mesquita Trajano',
    cpf: '852.182.864-00',
    funcao: 'SUPERVISOR PARA ACOMPANHAMENTO DE SERVIÇOS DE CAMPO',
    campus: 'Campus Central (Mossoró)',
    setorLotacao: 'DIINFRA / Manutenção Predial - Mossoró',
    salarioBaseCct: 2389.81,
    banco: 'Banco do Brasil',
    agencia: '3526-2',
    contaCorrente: '146.114-1',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Auxílio Alimentação: R$ 214,00 | Auxílio Saúde: R$ 147,63 | Seguro de Vida: R$ 2,00 | BSF: R$ 16,80'
  },
  {
    nomeCompleto: 'Ivanaldo Elizeu Lopes Gomes',
    cpf: '027.113.254-07',
    funcao: 'ELETRICISTA',
    campus: 'Campus Central (Mossoró)',
    setorLotacao: 'DIINFRA / Instalações Elétricas - Mossoró',
    salarioBaseCct: 2389.81,
    banco: 'Banco do Brasil',
    agencia: '0036-1',
    contaCorrente: '118560-8',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Periculosidade 30% + Sobreaviso | Auxílio Saúde: R$ 147,63 | Seguro de Vida: R$ 2,00 | BSF: R$ 16,80'
  },
  {
    nomeCompleto: 'Tiago Gomes Custódio',
    cpf: '017.358.984-73',
    funcao: 'ELETRICISTA',
    campus: 'Campus Central (Mossoró)',
    setorLotacao: 'DIINFRA / Instalações Elétricas - Mossoró',
    salarioBaseCct: 2389.81,
    banco: 'Banco do Brasil',
    agencia: '3526-2',
    contaCorrente: '130905-6',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Periculosidade 30% + Sobreaviso | Auxílio Saúde: R$ 147,63 | Seguro de Vida: R$ 2,00 | BSF: R$ 16,80'
  },
  {
    nomeCompleto: 'Clevanir Pereira Paiva',
    cpf: '035.535.454-37',
    funcao: 'AJUDANTE DE MANUTENÇÃO (Instalações elétricas prediais)',
    campus: 'Campus Central (Mossoró)',
    setorLotacao: 'DIINFRA / Instalações Elétricas - Mossoró',
    salarioBaseCct: 1720.36,
    banco: 'Caixa Econômica Federal',
    agencia: '3064',
    contaCorrente: '8052 101169-5',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Periculosidade 30% + Sobreaviso | Auxílio Saúde: R$ 147,63 | Seguro de Vida: R$ 2,00 | BSF: R$ 16,80'
  },
  {
    nomeCompleto: 'Francisco Antônio de Souza',
    cpf: '496.999.114-68',
    funcao: 'AJUDANTE DE MANUTENÇÃO (Instalações elétricas prediais)',
    campus: 'Campus Central (Mossoró)',
    setorLotacao: 'DIINFRA / Instalações Elétricas - Mossoró',
    salarioBaseCct: 1720.36,
    banco: 'Bradesco',
    agencia: '1102',
    contaCorrente: '55576-9',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Periculosidade 30% + Sobreaviso | Auxílio Saúde: R$ 147,63 | Seguro de Vida: R$ 2,00 | BSF: R$ 16,80'
  },
  {
    nomeCompleto: 'Antônio Dário da Silva Filgueira',
    cpf: '124.133.064-63',
    funcao: 'BOMBEIRO HIDRÁULICO/ENCANADOR',
    campus: 'Campus Central (Mossoró)',
    setorLotacao: 'DIINFRA / Instalações Hidrossanitárias - Mossoró',
    salarioBaseCct: 2389.81,
    banco: 'Caixa Econômica Federal',
    agencia: '0560',
    contaCorrente: '8706 52995-8',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Insalubridade 20% + Sobreaviso | Auxílio Saúde: R$ 147,63 | Seguro de Vida: R$ 2,00 | BSF: R$ 16,80'
  },
  {
    nomeCompleto: 'João Batista Felipe Tomaz',
    cpf: '035.044.164-24',
    funcao: 'BOMBEIRO HIDRÁULICO/ENCANADOR',
    campus: 'Campus Central (Mossoró)',
    setorLotacao: 'DIINFRA / Instalações Hidrossanitárias - Mossoró',
    salarioBaseCct: 2389.81,
    banco: 'Caixa Econômica Federal',
    agencia: '0560',
    contaCorrente: '8058 87038-0',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Insalubridade 20% + Sobreaviso | Auxílio Saúde: R$ 147,63 | Seguro de Vida: R$ 2,00 | BSF: R$ 16,80'
  },
  {
    nomeCompleto: 'Carlos Rodrigo de Souza Pereira',
    cpf: '700.282.384-19',
    funcao: 'PEDREIRO / PINTOR',
    campus: 'Campus Central (Mossoró)',
    setorLotacao: 'DIINFRA / Alvenaria e Pintura - Mossoró',
    salarioBaseCct: 2389.81,
    banco: 'Itaú',
    agencia: '1251',
    contaCorrente: '10564-7',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Insalubridade 20% | Auxílio Saúde: R$ 147,63 | Seguro de Vida: R$ 2,00 | BSF: R$ 16,80'
  },
  {
    nomeCompleto: 'Francisco Alexandre de Oliveira',
    cpf: '112.204.194-27',
    funcao: 'PEDREIRO / PINTOR',
    campus: 'Campus Central (Mossoró)',
    setorLotacao: 'DIINFRA / Alvenaria e Pintura - Mossoró',
    salarioBaseCct: 2389.81,
    banco: 'Caixa Econômica Federal',
    agencia: '0560',
    contaCorrente: '1288 812167885-6',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Insalubridade 20% | Auxílio Saúde: R$ 147,63 | Seguro de Vida: R$ 2,00 | BSF: R$ 16,80'
  },
  {
    nomeCompleto: 'José Belmiro da Silva',
    cpf: '050.082.134-82',
    funcao: 'PEDREIRO / PINTOR',
    campus: 'Campus Central (Mossoró)',
    setorLotacao: 'DIINFRA / Alvenaria e Pintura - Mossoró',
    salarioBaseCct: 2389.81,
    banco: 'Bradesco',
    agencia: '1102',
    contaCorrente: '52985-9',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Insalubridade 20% | Auxílio Saúde: R$ 147,63 | Seguro de Vida: R$ 2,00 | BSF: R$ 16,80'
  },
  {
    nomeCompleto: 'Caio Jefferson de Oliveira Costa',
    cpf: '114.538.254-10',
    funcao: 'AJUDANTE DE MANUTENÇÃO GERAL / SERVENTE',
    campus: 'Campus Central (Mossoró)',
    setorLotacao: 'DIINFRA / Apoio Operacional - Mossoró',
    salarioBaseCct: 1691.05,
    banco: 'Banco do Brasil',
    agencia: '2084-2',
    contaCorrente: '16.074-1',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Insalubridade 20% | Auxílio Alimentação: R$ 214,00 | Vale Transporte | Auxílio Saúde: R$ 147,63'
  },
  {
    nomeCompleto: 'Fabrício de Santana Saraiva',
    cpf: '123.801.534-42',
    funcao: 'AJUDANTE DE MANUTENÇÃO GERAL / SERVENTE',
    campus: 'Campus Central (Mossoró)',
    setorLotacao: 'DIINFRA / Apoio Operacional - Mossoró',
    salarioBaseCct: 1691.05,
    banco: 'Banco do Brasil',
    agencia: '4711-2',
    contaCorrente: '10.518-0',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Insalubridade 20% | Auxílio Alimentação: R$ 214,00 | Vale Transporte | Auxílio Saúde: R$ 147,63'
  },
  {
    nomeCompleto: 'Francinaldo Francisco José da Silva',
    cpf: '010.688.734-27',
    funcao: 'AJUDANTE DE MANUTENÇÃO GERAL / SERVENTE',
    campus: 'Campus Central (Mossoró)',
    setorLotacao: 'DIINFRA / Apoio Operacional - Mossoró',
    salarioBaseCct: 1691.05,
    banco: 'Caixa Econômica Federal',
    agencia: '0560',
    contaCorrente: '1288 802276682-6',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Insalubridade 20% | Auxílio Alimentação: R$ 214,00 | Vale Transporte | Auxílio Saúde: R$ 147,63'
  },
  {
    nomeCompleto: 'Elpídio Evaristo de Oliveira',
    cpf: '028.359.454-31',
    funcao: 'MARCENEIRO',
    campus: 'Campus Central (Mossoró)',
    setorLotacao: 'DIINFRA / Marcenaria - Mossoró',
    salarioBaseCct: 2389.81,
    banco: 'Banco do Brasil',
    agencia: '3526-2',
    contaCorrente: '146112-5',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Insalubridade 20% | Auxílio Saúde: R$ 147,63 | Seguro de Vida: R$ 2,00 | BSF: R$ 16,80'
  },
  {
    nomeCompleto: 'Paulo José Pereira de Souza',
    cpf: '009.827.904-14',
    funcao: 'MARCENEIRO',
    campus: 'Campus Central (Mossoró)',
    setorLotacao: 'DIINFRA / Marcenaria - Mossoró',
    salarioBaseCct: 2389.81,
    banco: 'Caixa Econômica Federal',
    agencia: '2010',
    contaCorrente: '14859-6',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Insalubridade 20% | Auxílio Saúde: R$ 147,63 | Seguro de Vida: R$ 2,00 | BSF: R$ 16,80'
  },
  {
    nomeCompleto: 'Josivan Alves de Souza',
    cpf: '113.211.244-30',
    funcao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES',
    campus: 'Campus Central (Mossoró)',
    setorLotacao: 'DIINFRA / Manutenção Predial - Mossoró',
    salarioBaseCct: 1691.05,
    banco: 'Caixa Econômica Federal',
    agencia: '0560',
    contaCorrente: '849568619-6',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Auxílio Alimentação: R$ 214,00 | Vale Transporte | Auxílio Saúde: R$ 147,63'
  },
  {
    nomeCompleto: 'Domício de Paula Rodrigues Neto',
    cpf: '094.853.144-42',
    funcao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES',
    campus: 'Campus Central (Mossoró)',
    setorLotacao: 'DIINFRA / Manutenção Predial - Mossoró',
    salarioBaseCct: 1691.05,
    banco: 'Bradesco',
    agencia: '1102',
    contaCorrente: '56563-6',
    dataAdmissao: new Date('2026-08-01T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Auxílio Alimentação: R$ 214,00 | Vale Transporte | Auxílio Saúde: R$ 147,63 (Substituiu Lucas Matheus em 08/2026)'
  },
  {
    nomeCompleto: 'Antônio Hildomar Dias',
    cpf: '078.369.144-02',
    funcao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES',
    campus: 'Campus Pau dos Ferros',
    setorLotacao: 'CAPF / Manutenção Predial - Pau dos Ferros',
    salarioBaseCct: 1691.05,
    banco: 'Caixa Econômica Federal',
    agencia: '0560',
    contaCorrente: '1288 8123644-6',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Auxílio Alimentação: R$ 214,00 | Auxílio Saúde: R$ 147,63'
  },
  {
    nomeCompleto: 'Erivan Carlos da Silva',
    cpf: '092.473.904-51',
    funcao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES',
    campus: 'Campus Pau dos Ferros',
    setorLotacao: 'CAPF / Manutenção Predial - Pau dos Ferros',
    salarioBaseCct: 1691.05,
    banco: 'Caixa Econômica Federal',
    agencia: '0560',
    contaCorrente: '8058 84039-0',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Auxílio Alimentação: R$ 214,00 | Vale Transporte | Auxílio Saúde: R$ 147,63'
  },
  {
    nomeCompleto: 'Francisco de Assis da Silva',
    cpf: '942.715.264-87',
    funcao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES',
    campus: 'Campus Assú',
    setorLotacao: 'CAA / Manutenção Predial - Assú',
    salarioBaseCct: 1691.05,
    banco: 'Banco do Brasil',
    agencia: '0024-1',
    contaCorrente: '40.531-0',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Auxílio Alimentação: R$ 214,00 | Auxílio Saúde: R$ 147,63'
  },
  {
    nomeCompleto: 'Anderson de Moura Melo',
    cpf: '117.020.574-70',
    funcao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES',
    campus: 'Campus Patu',
    setorLotacao: 'CAP / Manutenção Predial - Patu',
    salarioBaseCct: 1691.05,
    banco: 'Banco do Brasil',
    agencia: '1365-X',
    contaCorrente: '26.821-6',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Auxílio Alimentação: R$ 214,00 | Auxílio Saúde: R$ 147,63'
  },
  {
    nomeCompleto: 'Jackson Pereira Alves',
    cpf: '071.545.564-80',
    funcao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES',
    campus: 'Campus Caicó',
    setorLotacao: 'CAC / Manutenção Predial - Caicó',
    salarioBaseCct: 1691.05,
    banco: 'Bradesco',
    agencia: '1102',
    contaCorrente: '58978-9',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Auxílio Alimentação: R$ 214,00 | Vale Transporte | Auxílio Saúde: R$ 147,63'
  },
  {
    nomeCompleto: 'Marcos Zidane Diniz Faustino',
    cpf: '708.875.994-27',
    funcao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES',
    campus: 'Campus Caicó',
    setorLotacao: 'CAC / Manutenção Predial - Caicó',
    salarioBaseCct: 1691.05,
    banco: 'Caixa Econômica Federal',
    agencia: '2010',
    contaCorrente: '13859-9',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Auxílio Alimentação: R$ 214,00 | Auxílio Saúde: R$ 147,63'
  },
  {
    nomeCompleto: 'João Teixeira de Morais',
    cpf: '011.971.954-16',
    funcao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES',
    campus: 'Campus Natal',
    setorLotacao: 'CAN / Manutenção Predial - Natal',
    salarioBaseCct: 1691.05,
    banco: 'Caixa Econômica Federal',
    agencia: '0035',
    contaCorrente: '8514 46205-7',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Auxílio Alimentação: R$ 214,00 | Vale Transporte | Auxílio Saúde: R$ 147,63'
  },
  {
    nomeCompleto: 'Paulo Manoel Ferreira',
    cpf: '069.984.224-74',
    funcao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES',
    campus: 'Campus Natal',
    setorLotacao: 'CAN / Manutenção Predial - Natal',
    salarioBaseCct: 1691.05,
    banco: 'Caixa Econômica Federal',
    agencia: '2010',
    contaCorrente: '34481-6',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    status: 'ATIVO',
    beneficiosInfo: 'Auxílio Alimentação: R$ 214,00 | Vale Transporte | Auxílio Saúde: R$ 147,63'
  },
  {
    nomeCompleto: 'Lucas Matheus Lucena Fernandes',
    cpf: '124.466.594-03',
    funcao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES',
    campus: 'Campus Central (Mossoró)',
    setorLotacao: 'DIINFRA / Manutenção Predial - Mossoró',
    salarioBaseCct: 1691.05,
    banco: 'Bradesco',
    agencia: '1102',
    contaCorrente: '56563-6',
    dataAdmissao: new Date('2026-03-08T00:00:00.000Z'),
    dataDemissao: new Date('2026-07-31T23:59:59.000Z'),
    status: 'SUBSTITUIDO',
    beneficiosInfo: 'Atuou de 03/2026 a 07/2026; substituído a partir de 08/2026 por Domício de Paula Rodrigues Neto'
  }
];

const MEDICOES_DATA = [
  // 1. MÃO DE OBRA FIXA (03/2026 a 08/2026 = R$ 715.158,58)
  {
    referenciaMesAno: '03/2026 - Mão de Obra Fixa',
    processoSeiDespesa: '04410035.000657/2026-09',
    numeroNotaFiscal: 'NFs 57, 74, 59, 60, 61, 62',
    dataEmissaoNf: new Date('2026-04-10T12:00:00.000Z'),
    valorNotaFiscal: 96651.16,
    valorGlosa: 0.00,
    motivoGlosa: 'Faturamento proporcional a 17 dias trabalhados em março/2026 (início em 08/03/2026). Sem glosa de IMR.',
    valorAtestadoFinal: 96651.16,
    dataRecebimentoProvisorio: new Date('2026-05-18T12:00:00.000Z'),
    dataRecebimentoDefinitivo: new Date('2026-06-16T12:00:00.000Z'),
    status: 'LIQUIDADO_PAGO',
    despesasPorCidade: [
      { cidade: 'Mossoró', nf: '57', valorBruto: 75566.25, valorAtestado: 75566.25 },
      { cidade: 'Natal', nf: '74', valorBruto: 5512.13, valorAtestado: 5512.13 },
      { cidade: 'Caicó', nf: '59', valorBruto: 5505.68, valorAtestado: 5505.68 },
      { cidade: 'Patu', nf: '60', valorBruto: 2291.19, valorAtestado: 2291.19 },
      { cidade: 'Assú', nf: '61', valorBruto: 2591.87, valorAtestado: 2591.87 },
      { cidade: 'Pau dos Ferros', nf: '62', valorBruto: 5184.04, valorAtestado: 5184.04 }
    ]
  },
  {
    referenciaMesAno: '04/2026 - Mão de Obra Fixa',
    processoSeiDespesa: '04410035.000904/2026-69',
    numeroNotaFiscal: 'NFs 85, 86, 87, 88, 89, 90',
    dataEmissaoNf: new Date('2026-05-12T12:00:00.000Z'),
    valorNotaFiscal: 125473.31,
    valorGlosa: 3473.67,
    motivoGlosa: 'Glosa administrativa de benefícios não comprovados/pagos a menor (VT R$ 548,31; VA R$ 1.565,74; BSS R$ 436,80; Aux. Saúde R$ 257,76; Seguro R$ 52,00) + Glosa IMR 0,5% (40 pts).',
    valorAtestadoFinal: 121999.64,
    dataRecebimentoProvisorio: new Date('2026-05-26T12:00:00.000Z'),
    dataRecebimentoDefinitivo: new Date('2026-06-18T12:00:00.000Z'),
    status: 'LIQUIDADO_PAGO',
    despesasPorCidade: [
      { cidade: 'Mossoró', nf: '85', valorBruto: 96312.81, valorAtestado: 95831.25 },
      { cidade: 'Natal', nf: '86', valorBruto: 6807.36, valorAtestado: 6773.32 },
      { cidade: 'Caicó', nf: '87', valorBruto: 6530.92, valorAtestado: 6498.27 },
      { cidade: 'Patu', nf: '88', valorBruto: 3305.51, valorAtestado: 3288.98 },
      { cidade: 'Assú', nf: '89', valorBruto: 3057.14, valorAtestado: 3041.85 },
      { cidade: 'Pau dos Ferros', nf: '90', valorBruto: 6598.96, valorAtestado: 6565.97 }
    ]
  },
  {
    referenciaMesAno: '05/2026 - Mão de Obra Fixa',
    processoSeiDespesa: '04410035.001128/2026-14',
    numeroNotaFiscal: 'NFs 103, 104, 105, 106, 107, 108',
    dataEmissaoNf: new Date('2026-06-10T12:00:00.000Z'),
    valorNotaFiscal: 125473.31,
    valorGlosa: 2488.78,
    motivoGlosa: 'Glosa administrativa de benefícios (VT R$ 534,78; VA R$ 1.284,00; Seguro R$ 52,00) + Glosa IMR 0,5% (35 pts).',
    valorAtestadoFinal: 122984.53,
    dataRecebimentoProvisorio: new Date('2026-06-22T12:00:00.000Z'),
    dataRecebimentoDefinitivo: new Date('2026-07-08T12:00:00.000Z'),
    status: 'LIQUIDADO_PAGO',
    despesasPorCidade: [
      { cidade: 'Mossoró', nf: '103', valorBruto: 97034.38, valorAtestado: 96549.21 },
      { cidade: 'Natal', nf: '104', valorBruto: 6673.80, valorAtestado: 6640.43 },
      { cidade: 'Caicó', nf: '105', valorBruto: 6693.00, valorAtestado: 6659.54 },
      { cidade: 'Patu', nf: '106', valorBruto: 3358.41, valorAtestado: 3341.62 },
      { cidade: 'Assú', nf: '107', valorBruto: 3138.18, valorAtestado: 3122.49 },
      { cidade: 'Pau dos Ferros', nf: '108', valorBruto: 6704.76, valorAtestado: 6671.24 }
    ]
  },
  {
    referenciaMesAno: '06/2026 - Mão de Obra Fixa',
    processoSeiDespesa: '04410035.001421/2026-81',
    numeroNotaFiscal: 'NFs 129, 130, 131, 132, 133, 134',
    dataEmissaoNf: new Date('2026-07-15T12:00:00.000Z'),
    valorNotaFiscal: 125473.31,
    valorGlosa: 1287.94,
    motivoGlosa: 'Glosa proporcional de dias não trabalhados em Assú + VT R$ 242,87 + Glosa IMR 0,3% (30 pts).',
    valorAtestadoFinal: 124185.37,
    dataRecebimentoProvisorio: new Date('2026-07-31T12:00:00.000Z'),
    dataRecebimentoDefinitivo: new Date('2026-08-25T12:00:00.000Z'),
    status: 'LIQUIDADO_PAGO',
    despesasPorCidade: [
      { cidade: 'Mossoró', nf: '129', valorBruto: 97548.75, valorAtestado: 97042.74 },
      { cidade: 'Natal', nf: '130', valorBruto: 7133.34, valorAtestado: 7111.94 },
      { cidade: 'Caicó', nf: '131', valorBruto: 7125.00, valorAtestado: 7103.63 },
      { cidade: 'Patu', nf: '132', valorBruto: 3360.41, valorAtestado: 3350.33 },
      { cidade: 'Assú', nf: '133', valorBruto: 2896.79, valorAtestado: 2888.10 },
      { cidade: 'Pau dos Ferros', nf: '134', valorBruto: 6708.76, valorAtestado: 6688.63 }
    ]
  },
  {
    referenciaMesAno: '07/2026 - Mão de Obra Fixa',
    processoSeiDespesa: '04410035.001676/2026-44',
    numeroNotaFiscal: 'NFs 158, 159, 160, 161, 162, 164',
    dataEmissaoNf: new Date('2026-08-18T12:00:00.000Z'),
    valorNotaFiscal: 125473.31,
    valorGlosa: 804.37,
    motivoGlosa: 'Glosa administrativa VT (R$ 192,50) + falta 1 dia Marceneiro + Glosa IMR 0,3% (30 pts).',
    valorAtestadoFinal: 124668.94,
    dataRecebimentoProvisorio: new Date('2026-08-30T12:00:00.000Z'),
    dataRecebimentoDefinitivo: new Date('2026-09-24T12:00:00.000Z'),
    status: 'LIQUIDADO_PAGO',
    despesasPorCidade: [
      { cidade: 'Mossoró', nf: '158', valorBruto: 97362.38, valorAtestado: 97070.29 },
      { cidade: 'Natal', nf: '159', valorBruto: 7133.34, valorAtestado: 7111.94 },
      { cidade: 'Caicó', nf: '160', valorBruto: 7125.00, valorAtestado: 7103.63 },
      { cidade: 'Patu', nf: '161', valorBruto: 3360.41, valorAtestado: 3350.33 },
      { cidade: 'Assú', nf: '162', valorBruto: 3354.18, valorAtestado: 3344.12 },
      { cidade: 'Pau dos Ferros', nf: '164', valorBruto: 6708.76, valorAtestado: 6688.63 }
    ]
  },
  {
    referenciaMesAno: '08/2026 - Mão de Obra Fixa',
    processoSeiDespesa: '04410035.001969/2026-21',
    numeroNotaFiscal: 'NFs 167, 168, 169, 170, 171, 172',
    dataEmissaoNf: new Date('2026-09-15T12:00:00.000Z'),
    valorNotaFiscal: 125473.31,
    valorGlosa: 804.37,
    motivoGlosa: 'Glosa administrativa VT (R$ 192,50) + falta 1 dia Marceneiro + Glosa IMR 0,3% (25 pts).',
    valorAtestadoFinal: 124668.94,
    dataRecebimentoProvisorio: new Date('2026-09-29T12:00:00.000Z'),
    dataRecebimentoDefinitivo: new Date('2026-10-07T12:00:00.000Z'),
    status: 'LIQUIDADO_PAGO',
    despesasPorCidade: [
      { cidade: 'Mossoró', nf: '167', valorBruto: 97362.38, valorAtestado: 97070.29 },
      { cidade: 'Natal', nf: '168', valorBruto: 7133.34, valorAtestado: 7111.94 },
      { cidade: 'Caicó', nf: '169', valorBruto: 7125.00, valorAtestado: 7103.63 },
      { cidade: 'Patu', nf: '170', valorBruto: 3360.41, valorAtestado: 3350.33 },
      { cidade: 'Assú', nf: '171', valorBruto: 3354.18, valorAtestado: 3344.12 },
      { cidade: 'Pau dos Ferros', nf: '172', valorBruto: 6708.76, valorAtestado: 6688.63 }
    ]
  },

  // 2. SERVIÇOS EVENTUAIS (03/2026 a 08/2026 = R$ 807.061,49)
  {
    referenciaMesAno: '03/2026 - Serviços Eventuais',
    processoSeiDespesa: '04410035.000659/2026-90',
    numeroNotaFiscal: 'NFs 64, 66, 72, 73',
    dataEmissaoNf: new Date('2026-04-14T12:00:00.000Z'),
    valorNotaFiscal: 76085.14,
    valorGlosa: 0.00,
    motivoGlosa: 'Medição de Serviços Eventuais sob demanda (SINAPI c/ BDI e deságio contratual) - Março/2026.',
    valorAtestadoFinal: 76085.14,
    dataRecebimentoProvisorio: new Date('2026-05-20T12:00:00.000Z'),
    dataRecebimentoDefinitivo: new Date('2026-06-16T12:00:00.000Z'),
    status: 'LIQUIDADO_PAGO',
    despesasPorCidade: [
      { cidade: 'Mossoró', nf: '72', valorBruto: 53629.59, valorAtestado: 53629.59 },
      { cidade: 'Natal', nf: '73', valorBruto: 11157.84, valorAtestado: 11157.84 },
      { cidade: 'Caicó', nf: '64', valorBruto: 9158.65, valorAtestado: 9158.65 },
      { cidade: 'Pau dos Ferros', nf: '66', valorBruto: 2139.06, valorAtestado: 2139.06 }
    ]
  },
  {
    referenciaMesAno: '04/2026 - Serviços Eventuais',
    processoSeiDespesa: '04410035.000905/2026-11',
    numeroNotaFiscal: 'NFs 91, 93, 94, 95, 96',
    dataEmissaoNf: new Date('2026-05-15T12:00:00.000Z'),
    valorNotaFiscal: 67547.56,
    valorGlosa: 337.74,
    motivoGlosa: 'Glosa IMR 0,5% sobre medição de Serviços Eventuais - Abril/2026.',
    valorAtestadoFinal: 67209.82,
    dataRecebimentoProvisorio: new Date('2026-06-15T12:00:00.000Z'),
    dataRecebimentoDefinitivo: new Date('2026-07-08T12:00:00.000Z'),
    status: 'LIQUIDADO_PAGO',
    despesasPorCidade: [
      { cidade: 'Mossoró', nf: '91', valorBruto: 34691.38, valorAtestado: 34517.92 },
      { cidade: 'Natal', nf: '93', valorBruto: 6286.16, valorAtestado: 6254.73 },
      { cidade: 'Caicó', nf: '94', valorBruto: 14894.70, valorAtestado: 14820.23 },
      { cidade: 'Assú', nf: '95', valorBruto: 9126.47, valorAtestado: 9080.84 },
      { cidade: 'Pau dos Ferros', nf: '96', valorBruto: 2548.85, valorAtestado: 2536.10 }
    ]
  },
  {
    referenciaMesAno: '05/2026 - Serviços Eventuais',
    processoSeiDespesa: '04410035.001129/2026-69',
    numeroNotaFiscal: 'NFs 111, 112, 114, 115, 116',
    dataEmissaoNf: new Date('2026-06-15T12:00:00.000Z'),
    valorNotaFiscal: 105403.56,
    valorGlosa: 527.02,
    motivoGlosa: 'Glosa IMR 0,5% sobre medição de Serviços Eventuais - Maio/2026.',
    valorAtestadoFinal: 104876.54,
    dataRecebimentoProvisorio: new Date('2026-07-10T12:00:00.000Z'),
    dataRecebimentoDefinitivo: new Date('2026-07-27T12:00:00.000Z'),
    status: 'LIQUIDADO_PAGO',
    despesasPorCidade: [
      { cidade: 'Mossoró', nf: '116', valorBruto: 75860.19, valorAtestado: 75480.89 },
      { cidade: 'Natal', nf: '111', valorBruto: 6201.36, valorAtestado: 6170.35 },
      { cidade: 'Caicó', nf: '112', valorBruto: 8312.78, valorAtestado: 8271.22 },
      { cidade: 'Assú', nf: '114', valorBruto: 5561.66, valorAtestado: 5533.85 },
      { cidade: 'Pau dos Ferros', nf: '115', valorBruto: 9467.57, valorAtestado: 9420.23 }
    ]
  },
  {
    referenciaMesAno: '06/2026 - Serviços Eventuais',
    processoSeiDespesa: '04410035.001422/2026-26',
    numeroNotaFiscal: 'NFs 137, 138, 139, 140',
    dataEmissaoNf: new Date('2026-07-16T12:00:00.000Z'),
    valorNotaFiscal: 106266.40,
    valorGlosa: 318.80,
    motivoGlosa: 'Glosa IMR 0,3% sobre medição de Serviços Eventuais - Junho/2026.',
    valorAtestadoFinal: 105947.60,
    dataRecebimentoProvisorio: new Date('2026-08-05T12:00:00.000Z'),
    dataRecebimentoDefinitivo: new Date('2026-08-25T12:00:00.000Z'),
    status: 'LIQUIDADO_PAGO',
    despesasPorCidade: [
      { cidade: 'Mossoró', nf: '137', valorBruto: 70508.33, valorAtestado: 70296.81 },
      { cidade: 'Natal', nf: '138', valorBruto: 10697.26, valorAtestado: 10665.17 },
      { cidade: 'Assú', nf: '139', valorBruto: 12323.57, valorAtestado: 12286.60 },
      { cidade: 'Pau dos Ferros', nf: '140', valorBruto: 12737.23, valorAtestado: 12699.02 }
    ]
  },
  {
    referenciaMesAno: '07/2026 - Serviços Eventuais',
    processoSeiDespesa: '04410035.001677/2026-99',
    numeroNotaFiscal: 'NFs 154, 155, 156, 157',
    dataEmissaoNf: new Date('2026-08-18T12:00:00.000Z'),
    valorNotaFiscal: 207196.23,
    valorGlosa: 621.59,
    motivoGlosa: 'Glosa IMR 0,3% sobre medição de Serviços Eventuais - Julho/2026.',
    valorAtestadoFinal: 206574.64,
    dataRecebimentoProvisorio: new Date('2026-08-28T12:00:00.000Z'),
    dataRecebimentoDefinitivo: new Date('2026-09-08T12:00:00.000Z'),
    status: 'LIQUIDADO_PAGO',
    despesasPorCidade: [
      { cidade: 'Mossoró', nf: '154', valorBruto: 156907.40, valorAtestado: 156436.68 },
      { cidade: 'Natal', nf: '155', valorBruto: 17361.85, valorAtestado: 17309.76 },
      { cidade: 'Caicó', nf: '156', valorBruto: 24569.29, valorAtestado: 24495.58 },
      { cidade: 'Pau dos Ferros', nf: '157', valorBruto: 8357.69, valorAtestado: 8332.62 }
    ]
  },
  {
    referenciaMesAno: '08/2026 - Serviços Eventuais',
    processoSeiDespesa: '04410035.001970/2026-56',
    numeroNotaFiscal: 'NFs 181, 182, 183, 184, 185',
    dataEmissaoNf: new Date('2026-09-22T12:00:00.000Z'),
    valorNotaFiscal: 247109.08,
    valorGlosa: 741.33,
    motivoGlosa: 'Glosa IMR 0,3% sobre medição de Serviços Eventuais - Agosto/2026.',
    valorAtestadoFinal: 246367.75,
    dataRecebimentoProvisorio: new Date('2026-10-08T12:00:00.000Z'),
    dataRecebimentoDefinitivo: new Date('2026-10-16T12:00:00.000Z'),
    status: 'RECEBIMENTO_DEFINITIVO_GESTOR',
    despesasPorCidade: [
      { cidade: 'Mossoró', nf: '181', valorBruto: 196413.18, valorAtestado: 195823.94 },
      { cidade: 'Natal', nf: '182', valorBruto: 6509.77, valorAtestado: 6490.24 },
      { cidade: 'Caicó', nf: '183', valorBruto: 17955.38, valorAtestado: 17901.51 },
      { cidade: 'Assú', nf: '184', valorBruto: 14668.16, valorAtestado: 14624.16 },
      { cidade: 'Pau dos Ferros', nf: '185', valorBruto: 11562.59, valorAtestado: 11527.90 }
    ]
  },

  // 3. INSUMOS (03/2026 a 08/2026 = R$ 309.463,47)
  {
    referenciaMesAno: '03/2026 - Insumos',
    processoSeiDespesa: '04410035.000660/2026-14',
    numeroNotaFiscal: 'NFs 208, 209, 210, 211 (Fat. 01)',
    dataEmissaoNf: new Date('2026-04-15T12:00:00.000Z'),
    valorNotaFiscal: 33017.39,
    valorGlosa: 0.00,
    motivoGlosa: 'Fornecimento de Insumos e Materiais de Reposição sob demanda (SINAPI) - Março/2026.',
    valorAtestadoFinal: 33017.39,
    dataRecebimentoProvisorio: new Date('2026-05-22T12:00:00.000Z'),
    dataRecebimentoDefinitivo: new Date('2026-06-16T12:00:00.000Z'),
    status: 'LIQUIDADO_PAGO',
    despesasPorCidade: [
      { cidade: 'Mossoró', nf: '208', valorBruto: 22284.72, valorAtestado: 22284.72 },
      { cidade: 'Natal', nf: '209', valorBruto: 2279.68, valorAtestado: 2279.68 },
      { cidade: 'Caicó', nf: '210', valorBruto: 4224.20, valorAtestado: 4224.20 },
      { cidade: 'Pau dos Ferros', nf: '211', valorBruto: 4228.79, valorAtestado: 4228.79 }
    ]
  },
  {
    referenciaMesAno: '04/2026 - Insumos',
    processoSeiDespesa: '04410035.000902/2026-70',
    numeroNotaFiscal: 'NFs 228, 229, 230, 231, 232 (Fat. 02)',
    dataEmissaoNf: new Date('2026-05-16T12:00:00.000Z'),
    valorNotaFiscal: 23342.16,
    valorGlosa: 0.00,
    motivoGlosa: 'Fornecimento de Insumos e Materiais de Reposição sob demanda (SINAPI) - Abril/2026.',
    valorAtestadoFinal: 23342.16,
    dataRecebimentoProvisorio: new Date('2026-06-05T12:00:00.000Z'),
    dataRecebimentoDefinitivo: new Date('2026-06-18T12:00:00.000Z'),
    status: 'LIQUIDADO_PAGO',
    despesasPorCidade: [
      { cidade: 'Mossoró', nf: '228', valorBruto: 16220.41, valorAtestado: 16220.41 },
      { cidade: 'Natal', nf: '229', valorBruto: 3020.43, valorAtestado: 3020.43 },
      { cidade: 'Caicó', nf: '230', valorBruto: 1481.20, valorAtestado: 1481.20 },
      { cidade: 'Assú', nf: '231', valorBruto: 2280.12, valorAtestado: 2280.12 },
      { cidade: 'Pau dos Ferros', nf: '232', valorBruto: 340.00, valorAtestado: 340.00 }
    ]
  },
  {
    referenciaMesAno: '05/2026 - Insumos',
    processoSeiDespesa: '04410035.001130/2026-93',
    numeroNotaFiscal: 'NFs 242, 243, 244, 245, 246 (Fat. 04)',
    dataEmissaoNf: new Date('2026-06-16T12:00:00.000Z'),
    valorNotaFiscal: 47764.84,
    valorGlosa: 0.00,
    motivoGlosa: 'Fornecimento de Insumos e Materiais de Reposição sob demanda (SINAPI) - Maio/2026.',
    valorAtestadoFinal: 47764.84,
    dataRecebimentoProvisorio: new Date('2026-06-25T12:00:00.000Z'),
    dataRecebimentoDefinitivo: new Date('2026-07-08T12:00:00.000Z'),
    status: 'LIQUIDADO_PAGO',
    despesasPorCidade: [
      { cidade: 'Mossoró', nf: '246', valorBruto: 39340.29, valorAtestado: 39340.29 },
      { cidade: 'Natal', nf: '242', valorBruto: 1693.92, valorAtestado: 1693.92 },
      { cidade: 'Caicó', nf: '243', valorBruto: 2449.98, valorAtestado: 2449.98 },
      { cidade: 'Assú', nf: '244', valorBruto: 3799.29, valorAtestado: 3799.29 },
      { cidade: 'Pau dos Ferros', nf: '245', valorBruto: 481.36, valorAtestado: 481.36 }
    ]
  },
  {
    referenciaMesAno: '06/2026 - Insumos',
    processoSeiDespesa: '04410035.001426/2026-12',
    numeroNotaFiscal: 'NFs 257, 258, 259, 260, 261 (Fat. 05)',
    dataEmissaoNf: new Date('2026-07-18T12:00:00.000Z'),
    valorNotaFiscal: 78688.60,
    valorGlosa: 0.00,
    motivoGlosa: 'Fornecimento de Insumos e Materiais de Reposição sob demanda (SINAPI) - Junho/2026.',
    valorAtestadoFinal: 78688.60,
    dataRecebimentoProvisorio: new Date('2026-08-06T12:00:00.000Z'),
    dataRecebimentoDefinitivo: new Date('2026-08-25T12:00:00.000Z'),
    status: 'LIQUIDADO_PAGO',
    despesasPorCidade: [
      { cidade: 'Mossoró', nf: '257', valorBruto: 53282.34, valorAtestado: 53282.34 },
      { cidade: 'Natal', nf: '258', valorBruto: 5780.78, valorAtestado: 5780.78 },
      { cidade: 'Caicó', nf: '259', valorBruto: 2443.13, valorAtestado: 2443.13 },
      { cidade: 'Assú', nf: '260', valorBruto: 4842.02, valorAtestado: 4842.02 },
      { cidade: 'Pau dos Ferros', nf: '261', valorBruto: 12340.33, valorAtestado: 12340.33 }
    ]
  },
  {
    referenciaMesAno: '07/2026 - Insumos',
    processoSeiDespesa: '04410035.001678/2026-33',
    numeroNotaFiscal: 'NFs 269, 270, 271, 272 (Fat. 06)',
    dataEmissaoNf: new Date('2026-08-20T12:00:00.000Z'),
    valorNotaFiscal: 79474.19,
    valorGlosa: 0.00,
    motivoGlosa: 'Fornecimento de Insumos e Materiais de Reposição sob demanda (SINAPI) - Julho/2026.',
    valorAtestadoFinal: 79474.19,
    dataRecebimentoProvisorio: new Date('2026-09-05T12:00:00.000Z'),
    dataRecebimentoDefinitivo: new Date('2026-09-24T12:00:00.000Z'),
    status: 'LIQUIDADO_PAGO',
    despesasPorCidade: [
      { cidade: 'Mossoró', nf: '269', valorBruto: 54298.81, valorAtestado: 54298.81 },
      { cidade: 'Natal', nf: '270', valorBruto: 7097.25, valorAtestado: 7097.25 },
      { cidade: 'Caicó', nf: '271', valorBruto: 15064.53, valorAtestado: 15064.53 },
      { cidade: 'Pau dos Ferros', nf: '272', valorBruto: 3013.60, valorAtestado: 3013.60 }
    ]
  },
  {
    referenciaMesAno: '08/2026 - Insumos',
    processoSeiDespesa: '04410035.001971/2026-09',
    numeroNotaFiscal: 'NFs 286, 287, 288, 289, 290 (Fat. 07)',
    dataEmissaoNf: new Date('2026-09-24T12:00:00.000Z'),
    valorNotaFiscal: 47176.29,
    valorGlosa: 0.00,
    motivoGlosa: 'Fornecimento de Insumos e Materiais de Reposição sob demanda (SINAPI) - Agosto/2026.',
    valorAtestadoFinal: 47176.29,
    dataRecebimentoProvisorio: new Date('2026-10-08T12:00:00.000Z'),
    dataRecebimentoDefinitivo: new Date('2026-10-16T12:00:00.000Z'),
    status: 'RECEBIMENTO_DEFINITIVO_GESTOR',
    despesasPorCidade: [
      { cidade: 'Mossoró', nf: '286', valorBruto: 29818.92, valorAtestado: 29818.92 },
      { cidade: 'Natal', nf: '287', valorBruto: 3851.83, valorAtestado: 3851.83 },
      { cidade: 'Caicó', nf: '288', valorBruto: 3957.09, valorAtestado: 3957.09 },
      { cidade: 'Assú', nf: '289', valorBruto: 7526.78, valorAtestado: 7526.78 },
      { cidade: 'Pau dos Ferros', nf: '290', valorBruto: 2021.67, valorAtestado: 2021.67 }
    ]
  },

  // 4. DIÁRIAS (03/2026, 05/2026, 08/2026 = R$ 1.865,76)
  {
    referenciaMesAno: '03/2026 - Diárias',
    processoSeiDespesa: '04410035.000661/2026-69',
    numeroNotaFiscal: 'NF 76 (Solicitação 01/2026)',
    dataEmissaoNf: new Date('2026-04-16T12:00:00.000Z'),
    valorNotaFiscal: 1133.76,
    valorGlosa: 0.00,
    motivoGlosa: '8 meias-diárias de deslocamento à serviço em Pau dos Ferros (09 a 19/03/2026).',
    valorAtestadoFinal: 1133.76,
    dataRecebimentoProvisorio: new Date('2026-05-22T12:00:00.000Z'),
    dataRecebimentoDefinitivo: new Date('2026-06-16T12:00:00.000Z'),
    status: 'LIQUIDADO_PAGO',
    despesasPorCidade: [
      { cidade: 'Pau dos Ferros', nf: '76', valorBruto: 1133.76, valorAtestado: 1133.76 }
    ]
  },
  {
    referenciaMesAno: '05/2026 - Diárias',
    processoSeiDespesa: '04410035.001131/2026-38',
    numeroNotaFiscal: 'NF 110 (Solicitação 02/2026)',
    dataEmissaoNf: new Date('2026-06-16T12:00:00.000Z'),
    valorNotaFiscal: 283.44,
    valorGlosa: 0.00,
    motivoGlosa: '2 meias-diárias de deslocamento à serviço no Campus de Assú (25/05/2026).',
    valorAtestadoFinal: 283.44,
    dataRecebimentoProvisorio: new Date('2026-06-25T12:00:00.000Z'),
    dataRecebimentoDefinitivo: new Date('2026-07-08T12:00:00.000Z'),
    status: 'LIQUIDADO_PAGO',
    despesasPorCidade: [
      { cidade: 'Assú', nf: '110', valorBruto: 283.44, valorAtestado: 283.44 }
    ]
  },
  {
    referenciaMesAno: '08/2026 - Diárias',
    processoSeiDespesa: '04410035.001972/2026-45',
    numeroNotaFiscal: 'NF 173 (Solicitação 03/2026)',
    dataEmissaoNf: new Date('2026-09-22T12:00:00.000Z'),
    valorNotaFiscal: 448.56,
    valorGlosa: 0.00,
    motivoGlosa: '3 meias-diárias de deslocamento à serviço no Campus de Pau dos Ferros (07/08/2026).',
    valorAtestadoFinal: 448.56,
    dataRecebimentoProvisorio: new Date('2026-10-08T12:00:00.000Z'),
    dataRecebimentoDefinitivo: new Date('2026-10-16T12:00:00.000Z'),
    status: 'RECEBIMENTO_DEFINITIVO_GESTOR',
    despesasPorCidade: [
      { cidade: 'Pau dos Ferros', nf: '173', valorBruto: 448.56, valorAtestado: 448.56 }
    ]
  }
];

const IMR_DATA = [
  {
    mesCompetencia: '03/2026',
    localCampus: 'Mossoró / Geral',
    totalPontos: 0,
    percentualGlosa: 0.0,
    valorGlosa: 0.0,
    observacoes: 'Sem ocorrências pontuadas em março/2026 (100% da fatura).',
    itens: []
  },
  {
    mesCompetencia: '04/2026',
    localCampus: 'Mossoró / Geral',
    totalPontos: 40,
    percentualGlosa: 0.5,
    valorGlosa: 950.80,
    observacoes: '40 pontos acumulados no IMR (fator de 99,5% sobre Mão de Obra R$ 613,06 e Serviços Eventuais R$ 337,74).',
    itens: [
      { item: 'Descumprimento de prazo para conclusão de serviços', pontos: 10 },
      { item: 'Falta de ferramentas/EPIs e insumos básicos', pontos: 15 },
      { item: 'Atraso na entrega de relatórios periódicos de prestação de contas', pontos: 15 }
    ]
  },
  {
    mesCompetencia: '05/2026',
    localCampus: 'Mossoró / Geral',
    totalPontos: 35,
    percentualGlosa: 0.5,
    valorGlosa: 1145.03,
    observacoes: '35 pontos acumulados no IMR (fator de 99,5% sobre Mão de Obra R$ 618,01 e Serviços Eventuais R$ 527,02).',
    itens: [
      { item: 'Descumprimento de prazo estabelecido para conclusão de serviços', pontos: 10 },
      { item: 'Falta de ferramentas e insumos para realização de serviços', pontos: 15 },
      { item: 'Falha no envio de relatórios periódicos de prestação de contas', pontos: 10 }
    ]
  },
  {
    mesCompetencia: '06/2026',
    localCampus: 'Mossoró / Geral',
    totalPontos: 30,
    percentualGlosa: 0.3,
    valorGlosa: 693.12,
    observacoes: '30 pontos acumulados no IMR (fator de 99,7% sobre Mão de Obra R$ 374,32 e Serviços Eventuais R$ 318,80).',
    itens: [
      { item: 'Descumprimento de tempo médio de atendimento (5 pts)', pontos: 5 },
      { item: 'Descumprimento de prazo estabelecido para conclusão de serviços (10 pts)', pontos: 10 },
      { item: 'Falta de ferramentas (5 pts) e insumos (5 pts)', pontos: 10 },
      { item: 'Falha no envio de Relatórios Periódicos de Prestação de Contas (5 pts)', pontos: 5 }
    ]
  },
  {
    mesCompetencia: '07/2026',
    localCampus: 'Mossoró / Geral',
    totalPontos: 30,
    percentualGlosa: 0.3,
    valorGlosa: 996.72,
    observacoes: '30 pontos acumulados no IMR (fator de 99,7% sobre Mão de Obra R$ 375,13 e Serviços Eventuais R$ 621,59).',
    itens: [
      { item: 'Ocorrências técnicas Mossoró (15 pts), Natal (5 pts), Caicó (5 pts) e Assú (5 pts)', pontos: 30 }
    ]
  },
  {
    mesCompetencia: '08/2026',
    localCampus: 'Mossoró / Geral',
    totalPontos: 25,
    percentualGlosa: 0.3,
    valorGlosa: 1116.46,
    observacoes: '25 pontos acumulados no IMR (fator de 99,7% sobre Mão de Obra R$ 375,13 e Serviços Eventuais R$ 741,33).',
    itens: [
      { item: 'Descumprimento de tempo médio de atendimento (5 pts)', pontos: 5 },
      { item: 'Descumprimento de prazo estabelecido para conclusão de serviços (10 pts)', pontos: 10 },
      { item: 'Falta de ferramentas (5 pts) e insumos (5 pts)', pontos: 10 }
    ]
  }
];

async function main() {
  console.log('=== INICIANDO TRANSPOSIÇÃO DO CONTRATO 01/2026 (AB ENGENHARIA) NO SGC ===');

  // 1. Update Fornecedor
  await prisma.fornecedor.update({
    where: { id: FORNECEDOR_ID },
    data: {
      razaoSocial: 'A B ENGENHARIA, CONSULTORIA E SERVIÇOS LTDA - EPP',
      nomeFantasia: 'AB ENGENHARIA',
      email: 'administrativo@engenhariaab.com.br',
      telefone: '(84) 99832-8614 / (84) 99877-0193',
      endereco: 'Rua Naziozena Pires de Souza, nº 04, Centro, Tenente Laurentino Cruz/RN - CEP 59.538-000',
      nomeRepresentanteLegal: 'Athus Bernardo Silva Costa',
      telefoneRepresentanteLegal: '(84) 99832-8614',
      emailRepresentanteLegal: 'eng.athus@gmail.com',
      nomePreposto: 'Athus Bernardo Silva Costa / Arthur',
      telefonePreposto: '(84) 99832-8614 / (84) 99877-0193',
      emailPreposto: 'administrativo@engenhariaab.com.br'
    }
  });
  console.log('✔ Fornecedor atualizado.');

  // 2. Update Contrato (01/2016 -> 01/2026 + Conta Vinculada 33,25%)
  await prisma.contrato.update({
    where: { id: CONTRATO_ID },
    data: {
      numeroContrato: '01/2026',
      processoSeiMae: '04410038.000993/2025-32',
      licitacaoProcedimento: 'Pregão Eletrônico nº 033/2025 - FUERN',
      objeto: 'Contratação de serviços de manutenção das estruturas prediais em geral, pequenas reformas e adequações, com mão de obra em regime de dedicação exclusiva (26 postos ativos de 33 previstos), serviços eventuais sob demanda, insumos sob demanda e diárias para deslocamento de sede, incluindo ferramentas, máquinas, utensílios, EPIs e relatórios gerenciais periódicos, em atendimento às necessidades da UERN.',
      vigenciaInicio: new Date('2026-02-12T00:00:00.000Z'),
      vigenciaFim: new Date('2028-02-11T23:59:59.000Z'),
      anosVigencia: 2,
      valorGlobal: 8948360.00,
      valorAtualizado: 8948360.00,
      valorBaseCalculoAditivos: 8948360.00,
      tipoVigencia: 'CONTINUADO',
      tipoContrato: 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO',
      regimeExecucao: 'MISTO',
      tipoEmpreitada: 'PRECO_UNITARIO',
      tipoMedicao: 'MENSAL',
      retencaoContaVinculadaAtiva: true,
      nivelContaVinculada: 'PERSONALIZADO',
      percentualFerias: 9.075,
      percentualTercoConstitucional: 3.025,
      percentualDecimoTerceiro: 8.33,
      percentualMultaFgts: 5.00,
      percentualEncargosSubmodulo: 7.82,
      percentualTotalRetencao: 33.25,
      normativoContaVinculadaRef: 'IN nº 05/2017 SEGES/MPDG e IN nº 01/2026 PROAD/UERN (Alíquota Contratual 33,25%)',
      contaVinculadaBanco: 'Banco do Brasil S.A.',
      contaVinculadaProcessoSei: '04410038.000993/2025-32',
      contaVinculadaStatusConta: 'ATIVA',
      contaVinculadaObservacoes: 'Retenção mensal de 33,25% sobre a Base INSS (Férias + 1/3: 12,10% | 13º Salário: 8,33% | Multa FGTS: 5,00% | Incidência Submódulo 2.1: 7,82%). Total retido de 03/2026 a 08/2026: R$ 124.136,31.'
    }
  });
  console.log('✔ Contrato atualizado para nº 01/2026 e configurado com Conta Vinculada (33,25%).');

  // 3. Ensure Erione de Souza Costa is registered as FISCAL_ADMINISTRATIVO on this contract
  let erione = await prisma.user.findFirst({
    where: { OR: [{ matricula: '012866-0' }, { nome: { contains: 'Erione de Souza Costa', mode: 'insensitive' } }] }
  });
  if (!erione) {
    erione = await prisma.user.create({
      data: {
        nome: 'Erione de Souza Costa',
        email: 'erionecosta@uern.br',
        matricula: '012866-0',
        senhaHash: '$2a$10$X7vG6k8Z9W0Y1Z2A3B4C5u6v7w8x9y0z1A2B3C4D5E6F7G8H9I0J',
        role: 'FISCAL_ADMINISTRATIVO',
        unidadeSigla: 'DAS/PROAD',
        unidadeNome: 'Diretoria de Administração e Serviços',
        campus: 'Campus Central (Mossoró)'
      }
    });
  } else {
    await prisma.user.update({
      where: { id: erione.id },
      data: { role: 'FISCAL_ADMINISTRATIVO' }
    });
  }
  await prisma.contratoResponsavel.upsert({
    where: {
      contratoId_userId_tipoAtuacao: {
        contratoId: CONTRATO_ID,
        userId: erione.id,
        tipoAtuacao: 'FISCAL_ADMINISTRATIVO'
      }
    },
    update: { ativo: true, campusSetor: 'DAS / PROAD' },
    create: {
      contratoId: CONTRATO_ID,
      userId: erione.id,
      tipoAtuacao: 'FISCAL_ADMINISTRATIVO',
      numeroAtoDesignacao: 'Portaria PROAD/UERN - Contrato 01/2026',
      idSeiAtoDesignacao: '04410038.000993/2025-32',
      campusSetor: 'DAS / PROAD',
      ativo: true
    }
  });

  // 4. Clean previous child records for idempotent re-run
  await prisma.contaVinculadaMovimentacao.deleteMany({ where: { contratoId: CONTRATO_ID } });
  await prisma.frequenciaTrabalhador.deleteMany({ where: { contratoId: CONTRATO_ID } });
  await prisma.trabalhadorTerceirizado.deleteMany({ where: { contratoId: CONTRATO_ID } });
  await prisma.medicaoDespesa.deleteMany({ where: { contratoId: CONTRATO_ID } });
  await prisma.despesaExecucao.deleteMany({ where: { contratoId: CONTRATO_ID } });
  await prisma.imrAvaliacao.deleteMany({ where: { contratoId: CONTRATO_ID } });
  await prisma.convenioColetivo.deleteMany({ where: { contratoId: CONTRATO_ID } });
  await prisma.contratoPlanilhaCusto.deleteMany({ where: { contratoId: CONTRATO_ID } });

  // 5. Create ConvenioColetivo & Funções
  await prisma.convenioColetivo.create({
    data: {
      contratoId: CONTRATO_ID,
      nomeConvencao: 'CCT RN000009/2025 - SINDLIMP/RN & SEAC/RN (Manutenção Predial)',
      numeroRegistroMte: 'RN000009/2025',
      sindicatoLaboral: 'SINDLIMP/RN - Sindicato dos Trabalhadores em Asseio, Conservação e Limpeza Urbana do RN',
      sindicatoPatronal: 'SEAC/RN - Sindicato das Empresas de Asseio e Conservação do Estado do RN',
      dataBase: 'Janeiro (01/01)',
      vigenciaInicio: new Date('2025-01-01T00:00:00.000Z'),
      vigenciaFim: new Date('2026-12-31T23:59:59.000Z'),
      categoriasProfissionais: 'Supervisores, Eletricistas, Ajudantes de Manutenção Elétrica, Bombeiros Hidráulicos, Pedreiros/Pintores, Marceneiros, Serventes e Trabalhadores de Manutenção de Edificações',
      funcoes: {
        create: [
          { nomeFuncao: 'SUPERVISOR PARA ACOMPANHAMENTO DE SERVIÇOS DE CAMPO', salarioPiso: 2389.81, beneficioAlimentacao: 214.00, beneficioTransporte: 171.60, outrosBeneficios: 'Auxílio Saúde R$ 147,63 | BSF R$ 16,80 | Seguro R$ 2,00' },
          { nomeFuncao: 'ELETRICISTA', salarioPiso: 2389.81, beneficioAlimentacao: 214.00, beneficioTransporte: 171.60, outrosBeneficios: 'Periculosidade 30% + Sobreaviso | Auxílio Saúde R$ 147,63' },
          { nomeFuncao: 'AJUDANTE DE MANUTENÇÃO (Instalações elétricas prediais)', salarioPiso: 1720.36, beneficioAlimentacao: 214.00, beneficioTransporte: 171.60, outrosBeneficios: 'Periculosidade 30% + Sobreaviso | Auxílio Saúde R$ 147,63' },
          { nomeFuncao: 'BOMBEIRO HIDRÁULICO/ENCANADOR', salarioPiso: 2389.81, beneficioAlimentacao: 214.00, beneficioTransporte: 171.60, outrosBeneficios: 'Insalubridade 20% + Sobreaviso | Auxílio Saúde R$ 147,63' },
          { nomeFuncao: 'PEDREIRO / PINTOR', salarioPiso: 2389.81, beneficioAlimentacao: 214.00, beneficioTransporte: 171.60, outrosBeneficios: 'Insalubridade 20% (R$ 324,20) | Auxílio Saúde R$ 147,63' },
          { nomeFuncao: 'MARCENEIRO', salarioPiso: 2389.81, beneficioAlimentacao: 214.00, beneficioTransporte: 171.60, outrosBeneficios: 'Insalubridade 20% (R$ 324,20) | Auxílio Saúde R$ 147,63' },
          { nomeFuncao: 'AJUDANTE DE MANUTENÇÃO GERAL / SERVENTE', salarioPiso: 1691.05, beneficioAlimentacao: 214.00, beneficioTransporte: 171.60, outrosBeneficios: 'Insalubridade 20% (R$ 324,20) | Auxílio Saúde R$ 147,63' },
          { nomeFuncao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES', salarioPiso: 1691.05, beneficioAlimentacao: 214.00, beneficioTransporte: 171.60, outrosBeneficios: 'Auxílio Saúde R$ 147,63 | BSF R$ 16,80 | Seguro R$ 2,00' }
        ]
      }
    }
  });
  console.log('✔ Convenção Coletiva (CCT RN000009/2025) cadastrada.');

  // 6. Create Planilhas de Custos for the 14 DEMO items
  const itensContrato = await prisma.contratoItem.findMany({
    where: { contratoId: CONTRATO_ID },
    orderBy: { numeroItem: 'asc' }
  });
  for (const item of itensContrato) {
    if (item.categoriaItem === 'DEMO') {
      const isSuperior = item.valorUnitarioAtual >= 5200;
      const salBase = item.numeroItem === 3 ? 1720.36 : isSuperior ? 2389.81 : 1691.05;
      const unit = item.valorUnitarioAtual;
      await prisma.contratoPlanilhaCusto.create({
        data: {
          contratoId: CONTRATO_ID,
          itemId: item.id,
          numeroItem: item.numeroItem,
          funcao: item.descricao,
          cbo: item.numeroItem === 1 ? '7102-05' : item.numeroItem <= 4 ? '7156-10' : '7152-10',
          municipio: item.cidade || 'Mossoró',
          jornada: item.numeroItem === 4 ? '12x36 Noturno' : '44h semanais',
          cctReferencia: 'RN000009/2025 - SINDLIMP/SEAC',
          mesesExecucao: 24,
          quantidadeEmpregados: item.numeroItem === 4 ? 2 : 1,
          quantidadePostos: Math.round(item.quantidadeAtual),
          salarioBase: salBase,
          totalModulo1: round2(salBase * 1.18),
          totalModulo2: round2(unit * 0.42),
          totalModulo3: round2(unit * 0.06),
          totalModulo4: round2(unit * 0.03),
          totalModulo5: round2(unit * 0.07),
          totalModulo6: round2(unit * 0.14),
          custosIndiretosPercent: 3.0,
          lucroPercent: 3.0,
          tributosPercent: 8.65,
          precoTotalEmpregado: unit,
          valorMensalTotal: round2(unit * item.quantidadeAtual),
          valorGlobalTotal: round2(item.valorTotalAtual),
          fatorK: round2(unit / salBase),
          arquivoOriginalNome: 'Planilha de composição de custos - Convenção 2025.xlsx'
        }
      });
    }
  }
  console.log('✔ Planilhas de Custos dos 14 itens DEMO geradas.');

  // 7. Create Workers + Documentos + Frequências (03/2026 to 08/2026)
  const workerMapByCpf = new Map();
  const frequenciasBatch = [];

  for (const w of WORKERS_DATA) {
    const createdWorker = await prisma.trabalhadorTerceirizado.create({
      data: {
        contratoId: CONTRATO_ID,
        nomeCompleto: w.nomeCompleto,
        cpf: w.cpf,
        funcao: w.funcao,
        campus: w.campus,
        setorLotacao: w.setorLotacao,
        jornada: '44h semanais',
        dataAdmissao: w.dataAdmissao,
        dataDemissao: w.dataDemissao || null,
        banco: w.banco,
        agencia: w.agencia,
        contaCorrente: w.contaCorrente,
        cctVinculada: 'CCT RN000009/2025 - SINDLIMP/SEAC',
        salarioBaseCct: w.salarioBaseCct,
        beneficiosInfo: w.beneficiosInfo,
        status: w.status,
        documentos: {
          create: [
            {
              tipoDocumento: 'CTPS_DIGITAL',
              nomeArquivo: `CTPS_Digital_${w.nomeCompleto.replace(/\s+/g, '_')}.pdf`,
              arquivoUrl: `/documentos/ab-engenharia/ctps/${cleanCpf(w.cpf)}.pdf`,
              statusConferencia: 'CONFERIDO',
              observacoes: 'Conferido na pasta 01. DOCUMENTOS DOS FUNCIONÁRIOS (Fiscalização Administrativa)'
            },
            {
              tipoDocumento: 'ASO_ADMISSIONAL',
              nomeArquivo: `ASO_Admissional_${w.nomeCompleto.replace(/\s+/g, '_')}.pdf`,
              arquivoUrl: `/documentos/ab-engenharia/aso/${cleanCpf(w.cpf)}.pdf`,
              statusConferencia: 'CONFERIDO',
              observacoes: 'ASO Admissional apto conferido pela Fiscalização Administrativa'
            },
            {
              tipoDocumento: 'FICHA_REGISTRO',
              nomeArquivo: `Contrato_Trabalho_eSocial_${w.nomeCompleto.replace(/\s+/g, '_')}.pdf`,
              arquivoUrl: `/documentos/ab-engenharia/ficha/${cleanCpf(w.cpf)}.pdf`,
              statusConferencia: 'CONFERIDO',
              observacoes: 'Ficha de registro e contrato de trabalho conferidos'
            }
          ]
        }
      }
    });
    workerMapByCpf.set(cleanCpf(w.cpf), createdWorker);

    // Prepare Frequências 03/2026 to 08/2026
    const competencias = ['03/2026', '04/2026', '05/2026', '06/2026', '07/2026', '08/2026'];
    for (const comp of competencias) {
      if (w.cpf === '124.466.594-03' && comp === '08/2026') continue; // Lucas left end of July
      if (w.cpf === '094.853.144-42' && comp !== '08/2026') continue; // Domício started in August

      let diasPrevistos = comp === '03/2026' ? 17 : 22;
      let diasTrabalhados = diasPrevistos;
      let faltasInjustificadas = 0;
      let diasSubstituidos = 0;
      let valorGlosaSugerida = 0;
      let obs = 'Frequência integral apurada conforme folha de ponto e relatório de fiscalização.';

      if (comp === '03/2026' && w.cpf === '117.020.574-70') {
        diasTrabalhados = 15;
        faltasInjustificadas = 2;
        obs = '15 dias úteis trabalhados em Patu na competência inicial 03/2026.';
      } else if (comp === '06/2026' && w.cpf === '942.715.264-87') {
        diasTrabalhados = 19;
        faltasInjustificadas = 3;
        valorGlosaSugerida = 457.39;
        obs = '19 dias trabalhados em Assú (desconto proporcional de 3 dias na fatura).';
      } else if (comp === '06/2026' && w.cpf === '071.545.564-80') {
        diasTrabalhados = 17;
        diasSubstituidos = 5;
        obs = '17 dias trabalhados pelo titular + 5 dias cobertos pelo folguista Cícero Francinaldo Furtuoso.';
      } else if ((comp === '07/2026' || comp === '08/2026') && w.cpf === '009.827.904-14') {
        diasTrabalhados = 21;
        faltasInjustificadas = 1;
        valorGlosaSugerida = 236.74;
        obs = '21 dias trabalhados (1 falta glosada no faturamento).';
      }

      frequenciasBatch.push({
        trabalhadorId: createdWorker.id,
        contratoId: CONTRATO_ID,
        competenciaMesAno: comp,
        diasPrevistos,
        diasTrabalhados,
        faltasInjustificadas,
        faltasJustificadas: 0,
        diasSubstituidos,
        valorGlosaSugerida,
        statusApuracao: 'APLICADO_MEDICAO',
        observacoes: obs
      });
    }
  }
  await prisma.frequenciaTrabalhador.createMany({ data: frequenciasBatch });
  console.log(`✔ ${WORKERS_DATA.length} Trabalhadores Terceirizados, Documentos e ${frequenciasBatch.length} Frequências (03/2026 a 08/2026) inseridos.`);

  // 8. Parse Official UERN Fiscalização Spreadsheets (03/2026 to 08/2026) for Conta Vinculada
  const baseScratchDir = 'C:\\Users\\pedro\\.gemini\\antigravity\\brain\\ae4fb885-028f-4fb4-b338-dc5c4fc4fc74\\scratch\\ab_engenharia';
  const subDirs = fs.readdirSync(baseScratchDir);
  let maoDeObraDir = path.join(baseScratchDir, '03. MÃO DE OBRA');
  if (!fs.existsSync(maoDeObraDir)) {
    const crtFolder = subDirs.find(d => d.includes('04.') || d.includes('AB ENGENHARIA'));
    maoDeObraDir = crtFolder ? path.join(baseScratchDir, crtFolder, '03. MÃO DE OBRA') : path.join(baseScratchDir, subDirs.find(d => d.includes('MÃO DE OBRA') || d.includes('MAO DE OBRA')));
  }

  const monthsConfig = [
    { comp: '03/2026', folder: '03 - MARÇO 2026', sei: '04410035.000657/2026-09' },
    { comp: '04/2026', folder: '04 - ABRIL 2026', sei: '04410035.000904/2026-69' },
    { comp: '05/2026', folder: '05 - MAIO 2026', sei: '04410035.001128/2026-14' },
    { comp: '06/2026', folder: '06 - JUNHO 2026', sei: '04410035.001421/2026-81' },
    { comp: '07/2026', folder: '07 - JULHO 2026', sei: '04410035.001676/2026-44' },
    { comp: '08/2026', folder: '08 - AGOSTO 2026', sei: '04410035.001969/2026-21' }
  ];

  let runningBalance = 0;
  let totalCvInserted = 0;
  const cvMovimentacoesBatch = [];

  for (const m of monthsConfig) {
    const filePath = path.join(maoDeObraDir, m.folder, 'RELATÓRIO DE FATURAMENTO.xlsx');
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets['RET. CONTA VINCULADA'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    let monthTotal = 0;
    for (const row of rows) {
      const num = Number(row[0]);
      const nomePlanilha = String(row[1] || '').trim();
      const cpfPlanilha = cleanCpf(row[2]);
      const baseCalc = Number(row[3]);
      if (!Number.isInteger(num) || num < 1 || num > 26 || !nomePlanilha || !baseCalc) continue;

      const feriasTotal = Number(row[4]) || 0; // 12.10% (9.075% Férias + 3.025% 1/3)
      const decimoTerceiro = Number(row[5]) || 0; // 8.33%
      const multaFgts = Number(row[6]) || 0; // 5.00%
      const incidenciaSubmodulo = Number(row[7]) || 0; // 7.82%
      const totalWorker = Number(row[8]) || (feriasTotal + decimoTerceiro + multaFgts + incidenciaSubmodulo);

      const worker = workerMapByCpf.get(cpfPlanilha);
      if (!worker) {
        throw new Error(`Trabalhador não encontrado para CPF ${cpfPlanilha} (${nomePlanilha}) em ${m.comp}`);
      }

      const feriasPrincipal = feriasTotal * 0.75; // 9.075%
      const tercoFerias = feriasTotal * 0.25;     // 3.025%

      const rubricas = [
        { rubrica: 'FERIAS_8_33', valor: feriasPrincipal },
        { rubrica: 'TERCO_FERIAS_2_78', valor: tercoFerias },
        { rubrica: 'DECIMO_TERCEIRO_8_33', valor: decimoTerceiro },
        { rubrica: 'MULTA_RESCISORIA_FGTS', valor: multaFgts },
        { rubrica: 'FGTS_SOBRE_PROVISOES', valor: incidenciaSubmodulo }
      ];

      for (const r of rubricas) {
        const sAnt = runningBalance;
        const sAtu = runningBalance + r.valor;
        runningBalance = sAtu;
        cvMovimentacoesBatch.push({
          contratoId: CONTRATO_ID,
          trabalhadorId: worker.id,
          competenciaMesAno: m.comp,
          rubrica: r.rubrica,
          tipoOperacao: 'RETENCAO_ENTRADA',
          valor: r.valor,
          saldoAnterior: sAnt,
          saldoAtual: sAtu,
          numeroOficio: m.sei,
          motivoLiberacao: `Base INSS: R$ ${baseCalc.toFixed(2)} | Retenção Oficial Fiscalização UERN (${m.comp})`
        });
      }
      monthTotal += totalWorker;
    }
    totalCvInserted += monthTotal;
    console.log(`  -> Conta Vinculada ${m.comp} (${m.sei}): R$ ${monthTotal.toFixed(2)}`);
  }
  await prisma.contaVinculadaMovimentacao.createMany({ data: cvMovimentacoesBatch });
  console.log(`✔ ${cvMovimentacoesBatch.length} lançamentos analíticos de Conta Vinculada inseridos. Total acumulado: R$ ${totalCvInserted.toFixed(2)}`);

  // 9. Insert MedicoesDespesa and DespesasExecucao (03/2026 to 08/2026)
  let totalMedido = 0;
  let totalDespesasExec = 0;
  const medicoesBatch = [];
  const despesasBatch = [];

  for (const med of MEDICOES_DATA) {
    medicoesBatch.push({
      contratoId: CONTRATO_ID,
      referenciaMesAno: med.referenciaMesAno,
      processoSeiDespesa: med.processoSeiDespesa,
      numeroNotaFiscal: med.numeroNotaFiscal,
      dataEmissaoNf: med.dataEmissaoNf,
      valorNotaFiscal: med.valorNotaFiscal,
      valorGlosa: med.valorGlosa,
      motivoGlosa: med.motivoGlosa,
      valorAtestadoFinal: med.valorAtestadoFinal,
      dataRecebimentoProvisorio: med.dataRecebimentoProvisorio,
      dataRecebimentoDefinitivo: med.dataRecebimentoDefinitivo,
      status: med.status
    });
    totalMedido += med.valorAtestadoFinal;

    for (const d of med.despesasPorCidade) {
      despesasBatch.push({
        contratoId: CONTRATO_ID,
        numeroContratoRef: '01/2026',
        processoSeiMaeRef: '04410038.000993/2025-32',
        processoSeiDespesa: med.processoSeiDespesa,
        numeroNotaFiscal: d.nf,
        dataAtesto: med.dataRecebimentoDefinitivo,
        referencia: med.referenciaMesAno,
        cidade: d.cidade,
        valorEstimado: d.valorBruto,
        valorAtestado: d.valorAtestado,
        saldo: 0.0,
        status: 'ATESTADA',
        observacoes: med.motivoGlosa,
        decisaoContabil: 'MANTER',
        anoExercicio: 2026
      });
      totalDespesasExec += d.valorAtestado;
    }
  }
  await prisma.medicaoDespesa.createMany({ data: medicoesBatch });
  await prisma.despesaExecucao.createMany({ data: despesasBatch });
  console.log(`✔ ${medicoesBatch.length} Processos de Medição e ${despesasBatch.length} Despesas de Execução por Campus inseridos. Total Executado/Atestado: R$ ${totalMedido.toFixed(2)} (Despesas: R$ ${totalDespesasExec.toFixed(2)})`);

  // 10. Insert IMR Avaliações (03/2026 to 08/2026)
  for (const imr of IMR_DATA) {
    await prisma.imrAvaliacao.create({
      data: {
        contratoId: CONTRATO_ID,
        mesCompetencia: imr.mesCompetencia,
        localCampus: imr.localCampus,
        totalPontos: imr.totalPontos,
        percentualGlosa: imr.percentualGlosa,
        valorGlosa: imr.valorGlosa,
        observacoes: imr.observacoes,
        fiscalNome: 'Antonio Thyago Teixeira Jales / Erione de Souza Costa',
        fiscalMatricula: '12866-0',
        status: 'CONCLUIDO',
        itens: imr.itens
      }
    });
  }
  console.log(`✔ ${IMR_DATA.length} Avaliações de IMR (03/2026 a 08/2026) inseridas.`);
  console.log('=== TRANSPOSIÇÃO SGC CONCLUÍDA COM SUCESSO! ===');
}

main()
  .catch((err) => {
    console.error('Erro na transposição:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
