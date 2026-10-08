const XLSX = require('xlsx');
const wb = XLSX.readFile('tests/fixtures/MODELO_CADASTRO_DE_CONTRATOS.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

let headerRowIdx = matrix.findIndex(row => 
  row.some(cell => String(cell).toUpperCase().includes('OBJETO') || String(cell).toUpperCase().includes('Nº CTR'))
);
console.log('headerRowIdx:', headerRowIdx);
const headers = matrix[headerRowIdx];
console.log('Total headers:', headers.length);

const sampleRow = matrix[2];
headers.forEach((h, i) => {
  if (sampleRow[i] !== '') {
    console.log(`[${i}] ${h} => ${sampleRow[i]}`);
  }
});
