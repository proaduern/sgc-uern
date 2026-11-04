const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const dfdPath = 'C:/Users/pedro/OneDrive/Documentos/TRANSIÇÃO PORTAL PROAD/MODELOS PARA SISTEMA PCA/DFD - modelo para PCA.pdf';
const etpPath = 'C:/Users/pedro/OneDrive/Documentos/TRANSIÇÃO PORTAL PROAD/MODELOS PARA SISTEMA PCA/ETP - modelo para PCA.pdf';

async function extractDoc(filePath, name) {
  const buf = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buf });
  const textObj = await parser.getText();
  const infoObj = await parser.getInfo();
  
  console.log(`\n=================== ${name} ===================`);
  console.log('Total Pages:', textObj.pages ? textObj.pages.length : 'N/A');
  console.log('Info:', infoObj);
  
  if (textObj.pages) {
    textObj.pages.forEach((pg, i) => {
      console.log(`--- Page ${i + 1} (${pg.text ? pg.text.length : 0} chars) ---`);
      console.log(pg.text ? pg.text.slice(0, 500) : '');
      fs.writeFileSync(`scripts/${name}_page_${i + 1}.txt`, pg.text || '');
    });
  } else {
    fs.writeFileSync(`scripts/${name}_full.txt`, textObj.text || JSON.stringify(textObj));
  }
}

async function main() {
  await extractDoc(dfdPath, 'DFD');
  await extractDoc(etpPath, 'ETP');
}

main().catch(console.error);
