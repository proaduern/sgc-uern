const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const filePath = 'C:/Users/pedro/.gemini/antigravity-ide/scratch/temp_dain/DAIN - APOIO PCD/CTR 035.2025 - CV - CONTROLE POR FUNCIONÁRIO_ DAIN.xlsx';
const wb = xlsx.readFile(filePath);

function normalize(s) {
  if (!s) return '';
  return s.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '');
}

async function testMatch() {
  const contrato = await prisma.contrato.findFirst({
    where: { numeroContrato: { contains: '035/2025' } },
    include: { trabalhadores: true }
  });

  const workerMap = new Map();
  for (const t of contrato.trabalhadores) {
    workerMap.set(normalize(t.cpf), t);
    workerMap.set(normalize(t.nomeCompleto), t);
  }

  // Also map RH sheet
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

  let matched = 0;
  let unmatched = 0;

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
      // try looking up via rhByName
      const rh = rhByName.get(normalize(nome));
      if (rh && rh.cpf && workerMap.has(normalize(rh.cpf))) {
        worker = workerMap.get(normalize(rh.cpf));
      } else {
        // try prefix match e.g. CLARA IASMIM
        for (const [key, w] of workerMap.entries()) {
          if (key.includes(normalize(nome)) || normalize(w.nomeCompleto).includes(normalize(nome))) {
            worker = w;
            break;
          }
        }
      }
    }

    if (worker) {
      matched++;
    } else {
      unmatched++;
      console.log(`Row ${i} UNMATCHED: Nome="${nome}", CPF="${cpf}"`);
    }
  }

  console.log(`Matched: ${matched} | Unmatched: ${unmatched}`);
}

testMatch().catch(console.error).finally(() => prisma.$disconnect());
