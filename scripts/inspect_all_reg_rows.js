const xlsx = require('xlsx');

const filePath = 'C:/Users/pedro/.gemini/antigravity-ide/scratch/temp_dain/DAIN - APOIO PCD/CTR 035.2025 - CV - CONTROLE POR FUNCIONÁRIO_ DAIN.xlsx';
const wb = xlsx.readFile(filePath);

const wsReg = wb.Sheets['Registro'];
const dataReg = xlsx.utils.sheet_to_json(wsReg, { header: 1 });

for (let i = 18; i < dataReg.length; i++) {
  const row = dataReg[i];
  if (row && row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
    console.log(`Row ${i} (Col A: ${row[0]} | Col B: ${row[1]} | Col D: ${row[3]} | Col F: ${row[5]} | Col G: ${row[6]} | Total: ${row[11]})`);
  }
}
