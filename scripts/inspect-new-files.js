const fs = require('fs');
const XLSX = require('xlsx');
const { PDFParse } = require('pdf-parse');

async function inspectAll() {
  console.log('=== INSPECTING MODELO_CADASTRO_DE_CONTRATOS.xlsx ===');
  const wb = XLSX.readFile('tests/fixtures/MODELO_CADASTRO_DE_CONTRATOS.xlsx');
  console.log('Sheets:', wb.SheetNames);
  wb.SheetNames.forEach(sheet => {
    const ws = wb.Sheets[sheet];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    console.log(`\nSheet [${sheet}] total rows:`, rows.length);
    console.log('Header row (row 0):', rows[0]);
    if (rows.length > 1) console.log('Sample row 1:', rows[1]);
    if (rows.length > 2) console.log('Sample row 2:', rows[2]);
  });

  console.log('\n=== INSPECTING Contrato_EXEMPLO.pdf ===');
  const cBuf = fs.readFileSync('tests/fixtures/Contrato_EXEMPLO.pdf');
  const cParser = new PDFParse(new Uint8Array(cBuf));
  await cParser.load();
  const cRes = await cParser.getText();
  console.log('Pages:', cRes.total, 'Length:', cRes.text.length);
  console.log('Preview first 2000 chars:\n', cRes.text.slice(0, 2000));
  console.log('\nPreview last 2000 chars:\n', cRes.text.slice(-2000));

  console.log('\n=== INSPECTING ATO_DESIGNACAO_EXEMPLO.pdf ===');
  const aBuf = fs.readFileSync('tests/fixtures/ATO_DESIGNACAO_EXEMPLO.pdf');
  const aParser = new PDFParse(new Uint8Array(aBuf));
  await aParser.load();
  const aRes = await aParser.getText();
  console.log('Pages:', aRes.total, 'Length:', aRes.text.length);
  console.log('Full Text:\n', aRes.text);
}

inspectAll().catch(console.error);
