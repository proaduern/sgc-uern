const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const dfdPath = 'C:\\Users\\pedro\\OneDrive\\Documentos\\TRANSIÇÃO PORTAL PROAD\\MODELOS PARA SISTEMA PCA\\DFD - modelo para PCA.pdf';
const etpPath = 'C:\\Users\\pedro\\OneDrive\\Documentos\\TRANSIÇÃO PORTAL PROAD\\MODELOS PARA SISTEMA PCA\\ETP - modelo para PCA.pdf';

async function inspect(path, name) {
  const dataBuffer = fs.readFileSync(path);
  const parser = new PDFParse();
  await parser.load(dataBuffer);
  const info = await parser.getInfo();
  const text = await parser.getText();
  console.log(`=== ${name} ===`);
  console.log('Pages:', info.numPages || info.pages);
  console.log('Info:', info);
  console.log('--- Text Preview (first 1000 chars) ---');
  console.log(text.text ? text.text.slice(0, 1000) : String(text).slice(0, 1000));
  fs.writeFileSync(`scripts/${name}_text.txt`, typeof text === 'string' ? text : JSON.stringify(text, null, 2));
  console.log(`Saved full text to scripts/${name}_text.txt\n`);
}

async function run() {
  await inspect(dfdPath, 'DFD');
  await inspect(etpPath, 'ETP');
}

run().catch(console.error);
