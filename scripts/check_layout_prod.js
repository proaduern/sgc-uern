const https = require('https');

https.get('https://sgc-uern.vercel.app/_next/static/chunks/app/(dashboard)/layout-227c2d63ebf6143e.js', (res) => {
  console.log('Layout status on Vercel:', res.statusCode);
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('Contains /conta-vinculada:', data.includes('/conta-vinculada'));
  });
}).on('error', console.error);
