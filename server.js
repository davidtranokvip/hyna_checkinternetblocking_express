const express = require('express');
const cors = require('cors');
const https = require('https');
const url = require('url');
const tunnel = require('tunnel');

const app = express();
app.use(cors());
const port = process.env.PORT || 8000;
const proxies = [
  {
    name: 'VINA 4G HÀ NỘI',
    host: '171.242.234.93',
    port: 54809,
    auth: {
      username: 'fhfp6nsw',
      password: 'tekkdx9l'
    }
  },
  {
    name: 'MOBIFONE 4G HÀ NỘI',
    host: '116.96.93.236',
    port: 45658,
    auth: {
      username: 'eskxd_cyred',
      password: 'YIWcnJVV'
    }
  },
  {
    name: 'VNPT INTERNET',
    host: '14.188.192.39',
    port: 20046,
    auth: {
      username: 'BKIrOX',
      password: 'DKBKyd'
    }
  },
  {
    name: 'VIETTEL INTERNET HÀ NỘI',
    host: '117.5.208.61',
    port: 45577,
    auth: {
      username: 'coerz_cyred',
      password: '8fXOXC71'
    }
  },
  {
    name: 'FPT INTERNET HÀ NỘI',
    host: '1.54.45.28',
    port: 40229,
    auth: {
      username: 'tcqbx_cyred',
      password: 'KJyplyb6'
    }
  }
];
/**
 * Hàm checkWebsite sử dụng proxyConfig để kiểm tra domain
 * @param {Object} proxyConfig - Cấu hình proxy (bao gồm host, port, auth và name)
 * @param {String} targetUrl - Domain cần kiểm tra (vd: 'example.com')
 * @returns {Promise<Object>} - Kết quả kiểm tra của proxy đó
 */
function checkWebsite(proxyConfig, targetUrl) {
  try {
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }

    return new Promise((resolve, reject) => {
      const targetUrlObj = new url.URL(targetUrl);

      // Tạo agent tunnel cho HTTPS qua proxy HTTP
      const agent = tunnel.httpsOverHttp({
        proxy: {
          host: proxyConfig.host,
          port: proxyConfig.port,
          proxyAuth: `${proxyConfig.auth.username}:${proxyConfig.auth.password}`,
          headers: {
            'User-Agent': 'Node'
          }
        }
      });

      // Cấu hình options cho HTTPS request
      const options = {
        host: targetUrlObj.hostname,
        port: targetUrlObj.port || 443,
        secureProtocol: 'TLSv1_2_method',
        path: targetUrlObj.pathname + targetUrlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': '*/*',
          'Connection': 'close'
        },
        agent: agent,
        timeout: 10000,
        rejectUnauthorized: false  // Lưu ý: chỉ dùng cho testing, không nên dùng ở production
      };

      console.log(`Đang kiểm tra ${targetUrl} qua proxy ${proxyConfig.host}:${proxyConfig.port} (${proxyConfig.name})`);

      let timedOut = false;

      const req = https.get(options, (res) => {
        let data = '';
        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          let status = (res.statusCode === 200) ? 'OK' : 'BLOCKED';
          resolve({
            name: proxyConfig.name,
            statusCode: res.statusCode,
            result: status,
          });
        });
      });

      req.on('timeout', () => {
        timedOut = true;
        req.destroy();
        resolve({
          name: proxyConfig.name,
          proxy: `${proxyConfig.host}:${proxyConfig.port}`,
          error: 'Timeout',
          result: 'BLOCKED',
          details: 'Connection timeout'
        });
      });

      req.on('error', (error) => {
        if (timedOut) return;
        resolve({
          name: proxyConfig.name,
          proxy: `${proxyConfig.host}:${proxyConfig.port}`,
          error: error.message,
          result: 'BLOCKED',
          details: `Connection error: ${error.message}`
        });
      });
    });
  } catch (err) {
    return {
      name: proxyConfig.name,
      error: 'Unexpected error',
      result: 'BLOCKED',
      details: err.message
    };
  }
}

app.get('/site', async (req, res) => {
  const domain = req.query.domain;
  if (!domain) {
    return res.status(400).json({ error: 'Missing domain parameter' });
  }

  try {
    const results = await Promise.all(
      proxies.map(proxy => checkWebsite(proxy, domain))
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
