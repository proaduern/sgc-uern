const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const filePath = 'C:/Users/pedro/.gemini/antigravity-ide/scratch/temp_dain/DAIN - APOIO PCD/CTR 035.2025 - CV - CONTROLE POR FUNCIONÁRIO_ DAIN.xlsx';
const wb = xlsx.readFile(filePath);

function normalize(s) {
  if (!s) return '';
  return s.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '');
}

async function dryRun() {
  const contrato = await prisma.contrato.findFirst({
    where: { numeroContrato: { contains: '035/2025' } },
    include: { trabalhadores: true, movimentacoesContaVinculada: true }
  });

  if (!contrato) {
    console.error('Contrato 035/2025 não encontrado!');
    return;
  }

  const workerMap = new Map();
  for (const t of contrato.trabalhadores) {
    workerMap.set(normalize(t.cpf), t);
    workerMap.set(normalize(t.nomeCompleto), t);
  }

  const wsRh = wb.Sheets['RH'];
  const dataRh = xlsx.utils.sheet_to_json(wsRh, { header: 1 });
  const rhByName = new Map();
  for (let i = 2; i < dataRh.length; i++) {
    const r = dataRh[i];
    if (r && r[1]) {
      rhByName.set(normalize(String(r[1])), {
        nome: String(r[1]).trim(),
        cpf: r[2] ? String(r[2]).trim() : null
      });
    }
  }

  const wsReg = wb.Sheets['Registro'];
  const dataReg = xlsx.utils.sheet_to_json(wsReg, { header: 1 });

  // Competência mapping helper
  const mesCompetenciaMap = {
    'fatura de FEVEREIRO/2026': '02/2026',
    'fatura de MARÇO/2026': '03/2026',
    'fatura de ABRIL/2026': '04/2026',
    'fatura de MAIO/2026': '05/2026',
    'fatura de JUNHO/2026': '06/2026',
    'fatura de JULHO/2026': '07/2026',
    'fatura de AGOSTO/2026': '08/2026',
  };

  const recordsToInsert = [];

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
      console.error(`Falha no mapeamento: ${nome}`);
      continue;
    }

    const desc = r[6] ? String(r[6]).trim() : '';
    const comp = mesCompetenciaMap[desc] || '03/2026';
    const procSei = r[2] ? String(r[2]).trim() : '04410035.000435/2026-88';
    const comentario = r[12] ? String(r[12]).trim() : '';

    const feriasTotal = Number(r[7] || 0); // Férias + 1/3
    const decimo = Number(r[8] || 0);
    const fgts = Number(r[9] || 0);
    const encargos = Number(r[10] || 0);
    const total = Number(r[11] || 0);

    // Separar Férias e Terço Constitucional proporcionalmente (3/4 férias e 1/4 terço, ou seja, 8.33 / 11.11 = 0.74977)
    // 8.33% / 11.11% = 0.75; 2.78% / 11.11% = 0.25
    const feriasBase = Math.round((feriasTotal * (8.33 / 11.11)) * 100) / 100;
    const tercoBase = Math.round((feriasTotal - feriasBase) * 100) / 100;

    recordsToInsert.push({
      workerId: worker.id,
      workerNome: worker.nomeCompleto,
      competencia: comp,
      procSei,
      comentario,
      rubricas: [
        { rubrica: 'FERIAS_8_33', valor: feriasBase },
        { rubrica: 'TERCO_FERIAS_2_78', valor: tercoBase },
        { rubrica: 'DECIMO_TERCEIRO_8_33', valor: decimo },
        { rubrica: 'FGTS_SOBRE_PROVISOES', valor: encargos },
        { rubrica: 'MULTA_RESCISORIA_FGTS', valor: fgts },
      ],
      totalLinha: total
    });
  }

  console.log(`Dry-run concluído: ${recordsToInsert.length} linhas de trabalhadores processadas.`);
  let somaTotal = 0;
  for (const item of recordsToInsert) {
    somaTotal += item.totalLinha;
  }
  console.log(`Soma calculada: R$ ${somaTotal.toFixed(2)} (Esperado: R$ 93.483,14)`);
}

dryRun().catch(console.error).finally(() => prisma.$disconnect());
