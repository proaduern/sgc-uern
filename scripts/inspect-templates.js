const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function inspectDoc(filePath, name) {
  const buf = fs.readFileSync(filePath);
  const parser = new PDFParse(new Uint8Array(buf));
  await parser.load();
  const res = await parser.getText();
  console.log(`\n=================== ${name} ===================`);
  console.log('Pages:', res.total);
  console.log(res.text.slice(0, 2000));
}

async function run() {
  await inspectDoc('tests/fixtures/Oficio_ao_Fornecedor_anuencia_PRORROGACAO.pdf', 'OFÍCIO AO FORNECEDOR - PRORROGAÇÃO');
  await inspectDoc('tests/fixtures/Solicitacao_de_Providencias_PRORROGACAO.pdf', 'SOLICITAÇÃO DE PROVIDÊNCIAS - PRORROGAÇÃO');
  await inspectDoc('tests/fixtures/Solicitacao_de_Providencias_REPACTUACAO.pdf', 'SOLICITAÇÃO DE PROVIDÊNCIAS - REPACTUAÇÃO');
}

run().catch(console.error);
