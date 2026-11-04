const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function main() {
  const buf = fs.readFileSync('../pca-uern/pca-uern/scripts/PREVIA_ETP_SIMULADO.pdf');
  const p = new PDFParse({ data: buf });
  const s = await p.getScreenshot({ imageBuffer: true });
  console.log('Pages:', s.pages.length);
  for (let i = 0; i < s.pages.length; i++) {
    const fn = `C:/Users/pedro/.gemini/antigravity/brain/ae4fb885-028f-4fb4-b338-dc5c4fc4fc74/previa_etp_ajustado_page_${i + 1}.png`;
    fs.writeFileSync(fn, Buffer.from(s.pages[i].data));
    console.log('Wrote', fn);
  }
}

main().catch(console.error);
