const fs = require('fs');
const pdf = require('pdf-parse');

async function testPdfParse() {
  const cctBuffer = fs.readFileSync('tests/fixtures/CCT_MOT.pdf');
  const cctData = await pdf(cctBuffer);
  console.log('=== CCT_MOT.pdf ===');
  console.log('Pages:', cctData.numpages);
  console.log('Text preview (first 1000 chars):');
  console.log(cctData.text.slice(0, 1000));

  const planilhaBuffer = fs.readFileSync('tests/fixtures/PLANILHA_COMP_CUSTOS.pdf');
  const planilhaData = await pdf(planilhaBuffer);
  console.log('\n=== PLANILHA_COMP_CUSTOS.pdf ===');
  console.log('Pages:', planilhaData.numpages);
  console.log('Text preview (first 1000 chars):');
  console.log(planilhaData.text.slice(0, 1000));
}

testPdfParse().catch(console.error);
