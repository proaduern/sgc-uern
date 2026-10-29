const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = 'C:/Users/pedro/.gemini/antigravity-ide/scratch/temp_dain/DAIN - APOIO PCD/CTR 035.2025 - CV - CONTROLE POR FUNCIONÁRIO_ DAIN.xlsx';
const wb = xlsx.readFile(filePath);
console.log('Sheets:', wb.SheetNames);

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
  console.log('\n========================================');
  console.log('Sheet:', name, '| Rows:', data.length);
  console.log('========================================');
  for (let i = 0; i < Math.min(25, data.length); i++) {
    if (data[i] && data[i].length > 0) {
      console.log(`Row ${i}:`, JSON.stringify(data[i].slice(0, 15)));
    }
  }
}
