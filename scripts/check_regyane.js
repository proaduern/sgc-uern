const xlsx = require('xlsx');
const filePath = 'C:/Users/pedro/.gemini/antigravity-ide/scratch/temp_dain/DAIN - APOIO PCD/CTR 035.2025 - CV - CONTROLE POR FUNCIONÁRIO_ DAIN.xlsx';
const wb = xlsx.readFile(filePath);
const wsReg = wb.Sheets['Registro'];
const dataReg = xlsx.utils.sheet_to_json(wsReg, { header: 1 });
for (let i = 19; i <= 126; i++) {
  const r = dataReg[i];
  if (r && r[0] && String(r[0]).includes('REGYANE')) {
    console.log(`Row ${i}: ${r[6]} | Base: ${r[4]} | Ferias: ${r[7]} | 13: ${r[8]} | FGTS: ${r[9]} | Incid: ${r[10]} | Total: ${r[11]} | Coment: ${r[12]}`);
  }
}
