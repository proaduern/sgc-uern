const XLSX = require('xlsx');
const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function inspectDetails() {
  const wb = XLSX.readFile('tests/fixtures/MODELO_CADASTRO_DE_CONTRATOS.xlsx');
  console.log('=== COLUNAS DO MODELO CADASTRO DE CONTRATOS.xlsx ===');
  wb.SheetNames.forEach(name => {
    const sheet = wb.Sheets[name];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`\nAba [${name}]:`);
    console.log('Linha 0 (Cabeçalho):', data[0]);
    if (data[1]) console.log('Linha 1 (Exemplo 1):', data[1]);
    if (data[2]) console.log('Linha 2 (Exemplo 2):', data[2]);
  });

  console.log('\n=== DETALHES DO Contrato_EXEMPLO.pdf ===');
  const cBuf = fs.readFileSync('tests/fixtures/Contrato_EXEMPLO.pdf');
  const parser = new PDFParse(new Uint8Array(cBuf));
  await parser.load();
  const res = await parser.getText();
  console.log('Total páginas:', res.total);
  // Dividir por página e mostrar as primeiras páginas
  const pages = res.text.split(/-- \d+ of \d+ --/);
  console.log('Página 1 preview:\n', pages[0]?.slice(0, 1500));
  console.log('Página 2 preview:\n', pages[1]?.slice(0, 1500));
  if (pages[2]) console.log('Página 3 preview:\n', pages[2]?.slice(0, 1500));
  // Procurar onde estão os itens no contrato
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].toUpperCase().includes('CLÁUSULA') && (pages[i].toUpperCase().includes('PREÇO') || pages[i].toUpperCase().includes('VALOR') || pages[i].toUpperCase().includes('ITEM') || pages[i].toUpperCase().includes('QUANTIDADE'))) {
      console.log(`\n>>> Página ${i + 1} contém termos de valores/itens:\n`, pages[i].slice(0, 1000));
    }
  }
}

inspectDetails().catch(console.error);
