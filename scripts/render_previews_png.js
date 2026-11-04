const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function renderDoc(pdfPath, prefix) {
  const p = new PDFParse({ data: fs.readFileSync(pdfPath) });
  const s = await p.getScreenshot({ imageBuffer: true });
  console.log(`${prefix} total pages:`, s.pages.length);
  s.pages.forEach((pg, i) => {
    const filename = `scripts/${prefix}_page_${i + 1}.png`;
    fs.writeFileSync(filename, Buffer.from(pg.data));
    console.log(`Saved ${filename}`);
  });
}

async function main() {
  await renderDoc('C:/Users/pedro/OneDrive/Documentos/TRANSIÇÃO PORTAL PROAD/MODELOS PARA SISTEMA PCA/PREVIA_DFD_SIMULADO.pdf', 'previa_dfd');
  await renderDoc('C:/Users/pedro/OneDrive/Documentos/TRANSIÇÃO PORTAL PROAD/MODELOS PARA SISTEMA PCA/PREVIA_ETP_SIMULADO.pdf', 'previa_etp');
}

main().catch(console.error);
