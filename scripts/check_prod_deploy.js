const https = require('https');

https.get('https://sgc-uern.vercel.app/login', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const scripts = data.match(/static\/chunks\/[a-zA-Z0-9_\-\.]+\.js/g) || [];
    console.log('Login scripts:', scripts);
  });
}).on('error', console.error);
