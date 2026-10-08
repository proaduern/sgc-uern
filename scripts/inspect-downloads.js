const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const dlDir = 'C:\\Users\\pedro\\Downloads';
const files = fs.readdirSync(dlDir);
const relevant = files.filter(f => /imr|notifica|oficio|vinculada/i.test(f));
console.log('Relevant files in Downloads:', relevant);

for (const f of relevant) {
  const fullPath = path.join(dlDir, f);
  const stat = fs.statSync(fullPath);
  console.log(`\n--- File: ${f} (${stat.size} bytes, modified ${stat.mtime.toISOString()}) ---`);
  
  if (f.endsWith('.xlsx') || f.endsWith('.ods') || f.endsWith('.xls')) {
    try {
      const wb = XLSX.readFile(fullPath);
      console.log('Sheet names:', wb.SheetNames);
      for (const sheetName of wb.SheetNames.slice(0, 2)) {
        const sheet = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`Sheet "${sheetName}" preview (first 10 rows):`);
        console.log(data.slice(0, 10));
      }
    } catch (e) {
      console.error('Error reading spreadsheet:', e.message);
    }
  }
}
