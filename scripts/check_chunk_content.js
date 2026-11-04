const https = require('https');

https.get('https://sgc-uern.vercel.app/_next/static/chunks/fd9d1056-5c1ff2becc375281.js', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('Chunk length:', data.length);
    console.log('Contains /conta-vinculada:', data.includes('/conta-vinculada'));
    console.log('Contains tab=CONTA_VINCULADA:', data.includes('tab=CONTA_VINCULADA'));
  });
}).on('error', console.error);
