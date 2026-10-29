const fs = require('fs');
const page = fs.readFileSync('src/app/(dashboard)/contratos/[id]/page.tsx', 'utf8');
const lines = page.split('\n');
lines.forEach((l, i) => {
  if (/conta[_\- ]?vinculada/i.test(l)) {
    console.log(`L${i+1}: ${l.trim()}`);
  }
});
