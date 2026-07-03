const http = require('http');

function post(path, data){
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  try {
    const phone = '0640547073';
    const r1 = await post('/auth/request-otp', JSON.stringify({ phone }));
    console.log('request-otp:', r1.statusCode, r1.body);

    const r2 = await post('/auth/verify-otp', JSON.stringify({ phone, code: '123456' }));
    console.log('verify-otp :', r2.statusCode, r2.body);
  } catch (err) {
    console.error('error:', err);
    process.exit(1);
  }
})();
