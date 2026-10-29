const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const filePath = 'C:/Users/pedro/.gemini/antigravity-ide/scratch/temp_dain/DAIN - APOIO PCD/CTR 035.2025 - CV - CONTROLE POR FUNCIONÁRIO_ DAIN.xlsx';
const wb = xlsx.readFile(filePath);

function normalize(s) {
  if (!s) return '';
  return s.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '');
}

// Convert Excel serial date to JS Date
function excelDateToJS(serial) {
  if (!serial) return null;
  if (typeof serial === 'string') {
    const d = new Date(serial);
    if (!isNaN(d.getTime())) return d;
    return null;
  }
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  return new Date(utc_value * 1000);
}

async function run() {
  console.log('=== INICIANDO IMPORTAÇÃO AUDITADA DE CONTA VINCULADA - CTR 035/2025 ===');

  const contrato = await prisma.contrato.findFirst({
    where: { numeroContrato: { contains: '035/2025' } },
    include: { trabalhadores: true }
  });

  if (!contrato) {
    throw new Error('Contrato 035/2025 não encontrado!');
  }

  console.log(`Contrato localizado: ID=${contrato.id} | Número=${contrato.numeroContrato}`);

  // 1. Atualizar dados cadastrais dos trabalhadores com base na folha RH da planilha
  const wsRh = wb.Sheets['RH'];
  const dataRh = xlsx.utils.sheet_to_json(wsRh, { header: 1 });
  const workerMap = new Map();
  for (const t of contrato.trabalhadores) {
    workerMap.set(normalize(t.cpf), t);
    workerMap.set(normalize(t.nomeCompleto), t);
  }

  const rhByName = new Map();
  for (let i = 2; i < dataRh.length; i++) {
    const r = dataRh[i];
    if (r && r[1]) {
      const nome = String(r[1]).trim();
      const cpf = r[2] ? String(r[2]).trim() : null;
      const campus = r[3] ? String(r[3]).trim() : null;
      const funcao = r[4] ? String(r[4]).trim() : 'Técnico em Assuntos Educacionais';
      const admissao = excelDateToJS(r[5]);
      const demissao = excelDateToJS(r[6]);
      const banco = r[7] ? String(r[7]).trim() : null;
      const agencia = r[8] ? String(r[8]).trim() : null;
      const conta = r[9] ? String(r[9]).trim().replace(/\s+/g, '') : null;
      const tipoConta = r[10] ? String(r[10]).trim() : null;

      rhByName.set(normalize(nome), {
        nome, cpf, campus, funcao, admissao, demissao, banco, agencia, conta, tipoConta
      });

      // Find worker in DB and update
      let dbWorker = (cpf && workerMap.get(normalize(cpf))) || workerMap.get(normalize(nome));
      if (!dbWorker) {
        for (const [key, w] of workerMap.entries()) {
          if (key.includes(normalize(nome)) || normalize(w.nomeCompleto).includes(normalize(nome))) {
            dbWorker = w;
            break;
          }
        }
      }

      if (dbWorker) {
        await prisma.trabalhadorTerceirizado.update({
          where: { id: dbWorker.id },
          data: {
            banco: banco || dbWorker.banco,
            agencia: agencia || dbWorker.agencia,
            contaCorrente: conta || dbWorker.contaCorrente,
            dataAdmissao: admissao || dbWorker.dataAdmissao,
            dataDemissao: demissao || dbWorker.dataDemissao,
            status: demissao ? 'DEMITIDO' : 'ATIVO',
          }
        });
        console.log(`[RH Atualizado] ${dbWorker.nomeCompleto} - Status: ${demissao ? 'DEMITIDO' : 'ATIVO'} | Banco: ${banco} Ag: ${agencia} CC: ${conta}`);
      }
    }
  }

  // 2. Limpar as 6 movimentações provisórias globais antigas deste contrato
  const deleted = await prisma.contaVinculadaMovimentacao.deleteMany({
    where: { contratoId: contrato.id }
  });
  console.log(`\nLimpas ${deleted.count} movimentações provisórias anteriores.`);

  // 3. Processar linhas de Registro (108 linhas de Fevereiro a Agosto/2026)
  const wsReg = wb.Sheets['Registro'];
  const dataReg = xlsx.utils.sheet_to_json(wsReg, { header: 1 });

  const mesCompetenciaMap = {
    'fatura de FEVEREIRO/2026': '02/2026',
    'fatura de MARÇO/2026': '03/2026',
    'fatura de ABRIL/2026': '04/2026',
    'fatura de MAIO/2026': '05/2026',
    'fatura de JUNHO/2026': '06/2026',
    'fatura de JULHO/2026': '07/2026',
    'fatura de AGOSTO/2026': '08/2026',
  };

  let totalMovimentacoesCriadas = 0;
  let somaValorTotal = 0;

  for (let i = 19; i <= 126; i++) {
    const r = dataReg[i];
    if (!r || !r[0]) continue;
    const nome = String(r[0]).trim();
    const cpf = r[1] ? String(r[1]).trim() : null;

    let worker = null;
    if (cpf && workerMap.has(normalize(cpf))) {
      worker = workerMap.get(normalize(cpf));
    } else if (workerMap.has(normalize(nome))) {
      worker = workerMap.get(normalize(nome));
    } else {
      const rh = rhByName.get(normalize(nome));
      if (rh && rh.cpf && workerMap.has(normalize(rh.cpf))) {
        worker = workerMap.get(normalize(rh.cpf));
      } else {
        for (const [key, w] of workerMap.entries()) {
          if (key.includes(normalize(nome)) || normalize(w.nomeCompleto).includes(normalize(nome))) {
            worker = w;
            break;
          }
        }
      }
    }

    if (!worker) {
      console.error(`ERRO: Trabalhador não localizado: ${nome}`);
      continue;
    }

    const desc = r[6] ? String(r[6]).trim() : '';
    const comp = mesCompetenciaMap[desc] || '03/2026';
    const procSei = r[2] ? String(r[2]).trim() : '04410035.000435/2026-88';
    const comentario = r[12] ? ` (${String(r[12]).trim()})` : '';
    const descCompleta = `Retenção cautelar mensal - ${desc}${comentario}`;

    const feriasTotal = Number(r[7] || 0); // Férias + 1/3
    const decimo = Number(r[8] || 0);
    const fgts = Number(r[9] || 0);
    const encargos = Number(r[10] || 0);
    const totalLinha = Number(r[11] || 0);

    // Separar Férias e Terço Constitucional proporcionalmente
    // 8.33% / 11.11% e 2.78% / 11.11%
    const feriasBase = Math.round((feriasTotal * (8.33 / 11.11)) * 100) / 100;
    const tercoBase = Math.round((feriasTotal - feriasBase) * 100) / 100;

    const rubricas = [
      { rubrica: 'FERIAS_8_33', valor: feriasBase },
      { rubrica: 'TERCO_FERIAS_2_78', valor: tercoBase },
      { rubrica: 'DECIMO_TERCEIRO_8_33', valor: decimo },
      { rubrica: 'FGTS_SOBRE_PROVISOES', valor: encargos },
      { rubrica: 'MULTA_RESCISORIA_FGTS', valor: fgts },
    ];

    for (const rub of rubricas) {
      if (rub.valor > 0) {
        await prisma.contaVinculadaMovimentacao.create({
          data: {
            contratoId: contrato.id,
            trabalhadorId: worker.id,
            competenciaMesAno: comp,
            rubrica: rub.rubrica,
            tipoOperacao: 'RETENCAO_ENTRADA',
            valor: rub.valor,
            saldoAnterior: 0,
            saldoAtual: 0,
            numeroOficio: procSei,
            motivoLiberacao: descCompleta,
          }
        });
        totalMovimentacoesCriadas++;
      }
    }
    somaValorTotal += totalLinha;
  }

  console.log(`\n=== IMPORTAÇÃO CONCLUÍDA COM SUCESSO ===`);
  console.log(`Total de registros de rubrica criados: ${totalMovimentacoesCriadas}`);
  console.log(`Valor total acumulado retido no banco: R$ ${somaValorTotal.toFixed(2)}`);
}

run()
  .catch((e) => {
    console.error('Falha na execução:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
