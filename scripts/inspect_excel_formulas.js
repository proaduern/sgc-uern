const xlsx = require('xlsx');

const filePath = 'C:/Users/pedro/.gemini/antigravity-ide/scratch/temp_dain/DAIN - APOIO PCD/CTR 035.2025 - CV - CONTROLE POR FUNCIONÁRIO_ DAIN.xlsx';
const wb = xlsx.readFile(filePath, { cellFormula: true });

const wsReg = wb.Sheets['Registro'];

for (let r = 19; r <= 36; r++) {
  const rowVals = [];
  for (let c = 0; c <= 12; c++) {
    const addr = xlsx.utils.encode_cell({ r, c });
    const cell = wsReg[addr];
    rowVals.push(cell ? (cell.f ? `=${cell.f} (${cell.v})` : cell.v) : null);
  }
  console.log(`Row ${r}:`, JSON.stringify(rowVals));
}
