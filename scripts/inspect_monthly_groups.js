const xlsx = require('xlsx');

const filePath = 'C:/Users/pedro/.gemini/antigravity-ide/scratch/temp_dain/DAIN - APOIO PCD/CTR 035.2025 - CV - CONTROLE POR FUNCIONÁRIO_ DAIN.xlsx';
const wb = xlsx.readFile(filePath);
const wsReg = wb.Sheets['Registro'];
const dataReg = xlsx.utils.sheet_to_json(wsReg, { header: 1 });

const groups = {};
for (let i = 19; i <= 126; i++) {
  const row = dataReg[i];
  if (!row || !row[0]) continue;
  const mes = row[6] || 'Sem Descrição';
  if (!groups[mes]) {
    groups[mes] = {
      processoSei: row[2],
      excelDate: row[3],
      baseExemplo: row[4],
      qtdTrabalhadores: 0,
      totalMes: 0
    };
  }
  groups[mes].qtdTrabalhadores++;
  groups[mes].totalMes += Number(row[11] || 0);
}

console.log('Meses e Totais:');
for (const [k, v] of Object.entries(groups)) {
  console.log(`- ${k}: ${v.qtdTrabalhadores} trabalhadores | Total: R$ ${v.totalMes.toFixed(2)} | Proc SEI: ${v.processoSei} | Data: ${v.excelDate}`);
}
