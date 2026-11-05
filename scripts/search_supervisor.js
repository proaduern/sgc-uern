const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const baseDir = 'C:\\Users\\pedro\\.gemini\\antigravity\\brain\\ae4fb885-028f-4fb4-b338-dc5c4fc4fc74\\scratch\\ab_engenharia';

function searchFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      searchFiles(fullPath);
    } else if (entry.name.endsWith('.xlsx') || entry.name.endsWith('.xls')) {
      try {
        const wb = XLSX.readFile(fullPath);
        for (const sheetName of wb.SheetNames) {
          const sheet = wb.Sheets[sheetName];
          const text = JSON.stringify(XLSX.utils.sheet_to_json(sheet, { header: 1 }));
          if (text.includes('Ryan') || text.includes('RYAN') || text.includes('substitu') || text.includes('SUBSTITU')) {
            console.log(`Found match in: ${fullPath} [${sheetName}]`);
            // print lines matching
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            rows.forEach((r, idx) => {
              const rStr = JSON.stringify(r);
              if (rStr.includes('Ryan') || rStr.includes('RYAN') || rStr.includes('Patrick') || rStr.includes('Ícaro') || rStr.includes('ICARO')) {
                console.log(`  Row ${idx}:`, rStr);
              }
            });
          }
        }
      } catch (e) {}
    }
  }
}

searchFiles(baseDir);
