const xlsx = require('xlsx');

const filePath = 'C:/Users/pedro/.gemini/antigravity-ide/scratch/temp_dain/DAIN - APOIO PCD/CTR 035.2025 - CV - CONTROLE POR FUNCIONÁRIO_ DAIN.xlsx';
const wb = xlsx.readFile(filePath);

// 1. Parse RH
const wsRh = wb.Sheets['RH'];
const dataRh = xlsx.utils.sheet_to_json(wsRh, { header: 1 });
const rhMap = new Map(); // name normalized -> { cpf, campus, cargo, admissao, demissao, banco, agencia, conta }

function normalizeName(n) {
  if (!n) return '';
  return n.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

for (let i = 2; i < dataRh.length; i++) {
  const r = dataRh[i];
  if (r && r[1]) {
    const rawName = String(r[1]).trim();
    const norm = normalizeName(rawName);
    rhMap.set(norm, {
      nome: rawName,
      cpf: r[2] ? String(r[2]).trim() : null,
      campus: r[3] ? String(r[3]).trim() : null,
      cargo: r[4] ? String(r[4]).trim() : null,
      admissao: r[5],
      demissao: r[6],
      banco: r[7] ? String(r[7]).trim() : null,
      agencia: r[8] ? String(r[8]).trim() : null,
      conta: r[9] ? String(r[9]).trim() : null,
      tipoConta: r[10] ? String(r[10]).trim() : null
    });
  }
}

console.log('RH Employees loaded:', rhMap.size);

// 2. Parse Registro
const wsReg = wb.Sheets['Registro'];
const dataReg = xlsx.utils.sheet_to_json(wsReg, { header: 1 });

const registros = [];
for (let i = 19; i <= 126; i++) {
  const row = dataReg[i];
  if (!row || !row[0]) continue;

  const rawNome = String(row[0]).trim();
  const normNome = normalizeName(rawNome);
  const rhInfo = rhMap.get(normNome) || {};

  const cpf = (row[1] ? String(row[1]).trim() : null) || rhInfo.cpf;

  registros.push({
    row: i,
    nome: rawNome,
    normNome,
    cpf,
    processoSei: row[2] ? String(row[2]).trim() : null,
    data: row[3],
    base: row[4],
    tipo: row[5] ? String(row[5]).trim() : 'DEPÓSITO',
    descricao: row[6] ? String(row[6]).trim() : null,
    ferias: Number(row[7] || 0),
    decimoTerceiro: Number(row[8] || 0),
    fgts: Number(row[9] || 0),
    incidencia: Number(row[10] || 0),
    total: Number(row[11] || 0),
    comentario: row[12] ? String(row[12]).trim() : null
  });
}

console.log('Total registros loaded:', registros.length);

// Summary by Month
const meses = {};
for (const r of registros) {
  if (!meses[r.descricao]) {
    meses[r.descricao] = { count: 0, total: 0, ferias: 0, decimo: 0, fgts: 0, encargos: 0 };
  }
  meses[r.descricao].count++;
  meses[r.descricao].total += r.total;
  meses[r.descricao].ferias += r.ferias;
  meses[r.descricao].decimo += r.decimoTerceiro;
  meses[r.descricao].fgts += r.fgts;
  meses[r.descricao].encargos += r.incidencia;
}

console.log('\n--- Resumo por Mês / Fatura:');
console.table(meses);

// Summary by Employee
const porFunc = {};
for (const r of registros) {
  if (!porFunc[r.nome]) {
    porFunc[r.nome] = { cpf: r.cpf, count: 0, total: 0, ferias: 0, decimo: 0, fgts: 0, encargos: 0 };
  }
  porFunc[r.nome].count++;
  porFunc[r.nome].total += r.total;
  porFunc[r.nome].ferias += r.ferias;
  porFunc[r.nome].decimo += r.decimoTerceiro;
  porFunc[r.nome].fgts += r.fgts;
  porFunc[r.nome].encargos += r.incidencia;
}

console.log('\n--- Resumo por Funcionário (' + Object.keys(porFunc).length + ' funcionários com registros):');
console.table(porFunc);

let grandTotal = 0;
let grandFerias = 0;
let grand13 = 0;
let grandFgts = 0;
let grandEnc = 0;
for (const r of registros) {
  grandTotal += r.total;
  grandFerias += r.ferias;
  grand13 += r.decimoTerceiro;
  grandFgts += r.fgts;
  grandEnc += r.incidencia;
}

console.log('\nGrand Totals:');
console.log({
  grandTotal: grandTotal.toFixed(2),
  grandFerias: grandFerias.toFixed(2),
  grand13: grand13.toFixed(2),
  grandFgts: grandFgts.toFixed(2),
  grandEnc: grandEnc.toFixed(2)
});
