const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function inspectPlanilha() {
  const buf = fs.readFileSync('tests/fixtures/PLANILHA_COMP_CUSTOS.pdf');
  const parser = new PDFParse(new Uint8Array(buf));
  await parser.load();
  const res = await parser.getText();
  console.log('--- FULL TEXT OF PLANILHA_COMP_CUSTOS.pdf ---');
  console.log(res.text);
}

inspectPlanilha();
