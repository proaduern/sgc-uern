const xlsx = require('xlsx');

const filePath = 'C:/Users/pedro/.gemini/antigravity-ide/scratch/temp_dain/DAIN - APOIO PCD/CTR 035.2025 - CV - CONTROLE POR FUNCIONÁRIO_ DAIN.xlsx';
const wb = xlsx.readFile(filePath);

const wsReg = wb.Sheets['Registro'];
const dataReg = xlsx.utils.sheet_to_json(wsReg, { header: 1 });

console.log('Total rows in Registro:', dataReg.length);

// Header is at row 18
const header = dataReg[18];
console.log('Header:', header);

const rows = [];
for (let i = 19; i < dataReg.length; i++) {
  const row = dataReg[i];
  if (row && row[0] && row[1]) {
    rows.push({
      rowIndex: i,
      nome: row[0],
      cpf: row[1],
      processoSei: row[2],
      data: row[3],
      base: row[4],
      tipo: row[5],
      descricao: row[6],
      ferias: row[7],
      decimoTerceiro: row[8],
      fgts: row[9],
      incidencia: row[10],
      total: row[11],
      comentario: row[12]
    });
  }
}

console.log('Total valid records found:', rows.length);

// Check distinct descriptions / months
const descricoes = {};
const funcionarios = {};
let totalGeral = 0;
let totalFerias = 0;
let total13 = 0;
let totalFgts = 0;
let totalIncidencia = 0;

for (const r of rows) {
  descricoes[r.descricao] = (descricoes[r.descricao] || 0) + 1;
  funcionarios[r.nome] = (funcionarios[r.nome] || 0) + Number(r.total || 0);
  totalGeral += Number(r.total || 0);
  totalFerias += Number(r.ferias || 0);
  total13 += Number(r.decimoTerceiro || 0);
  totalFgts += Number(r.fgts || 0);
  totalIncidencia += Number(r.incidencia || 0);
}

console.log('\n--- Meses / Faturas nas descrições:');
console.table(descricoes);

console.log('\n--- Totais consolidados dos registros:');
console.log({
  totalGeral: totalGeral.toFixed(2),
  totalFerias: totalFerias.toFixed(2),
  total13: total13.toFixed(2),
  totalFgts: totalFgts.toFixed(2),
  totalIncidencia: totalIncidencia.toFixed(2)
});

console.log('\n--- Totais por Funcionário (' + Object.keys(funcionarios).length + ' funcionários):');
console.table(funcionarios);

// Check RH sheet
const wsRh = wb.Sheets['RH'];
const dataRh = xlsx.utils.sheet_to_json(wsRh, { header: 1 });
console.log('\n--- RH Sheet Header:', dataRh[1]);
for (let i = 2; i < dataRh.length; i++) {
  if (dataRh[i] && dataRh[i][1]) {
    console.log(`RH ${i-1}:`, dataRh[i][1], '| CPF:', dataRh[i][2], '| Campus:', dataRh[i][3], '| Função:', dataRh[i][4], '| Admissão:', dataRh[i][5], '| Demissão:', dataRh[i][6], '| Banco:', dataRh[i][7], '| Ag:', dataRh[i][8], '| CC:', dataRh[i][9]);
  }
}
