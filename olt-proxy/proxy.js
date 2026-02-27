const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const ADA_BASE = 'http://192.168.111.245/ISP/AdaProvider/';

// Servir painel-olt.html na raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'painel-olt.html'));
});

// CORS — uso interno, aceita qualquer origem
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Proxy: buscar clientes (gateway)
app.get('/clientes', (req, res) => {
    const params = new URLSearchParams({
        sSearch: req.query.sSearch || '',
        iDisplayStart: '0',
        iDisplayLength: '100',
        sEcho: '1',
        iColumns: '6'
    });

    const url = `${ADA_BASE}gateway/Clientes.dataprovider.php?${params}`;

    httpGet(url, (err, data) => {
        if (err) return res.status(502).json({ error: 'Falha ao conectar com Ada', detail: err.message });
        try {
            res.json(JSON.parse(data));
        } catch (e) {
            res.status(502).json({ error: 'Resposta inválida do Ada', raw: data.substring(0, 500) });
        }
    });
});

// Proxy: dados do cliente (cadastro)
app.post('/cadastro', (req, res) => {
    const body = `call=${encodeURIComponent(req.body.call || 'carregarClienteAction')}&IdCliente=${encodeURIComponent(req.body.IdCliente || '')}`;

    const urlObj = new URL(`${ADA_BASE}controller/ClienteController.php`);

    const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 80,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body)
        }
    };

    const proxyReq = http.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', chunk => data += chunk);
        proxyRes.on('end', () => {
            try {
                res.json(JSON.parse(data));
            } catch (e) {
                res.status(502).json({ error: 'Resposta inválida do Ada', raw: data.substring(0, 500) });
            }
        });
    });

    proxyReq.on('error', (err) => {
        res.status(502).json({ error: 'Falha ao conectar com Ada', detail: err.message });
    });

    proxyReq.write(body);
    proxyReq.end();
});

function httpGet(url, callback) {
    http.get(url, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => callback(null, data));
    }).on('error', err => callback(err));
}

app.listen(PORT, () => {
    console.log(`[olt-proxy] Rodando na porta ${PORT}`);
    console.log(`[olt-proxy] Ada: ${ADA_BASE}`);
    console.log(`[olt-proxy] PM2: pm2 start proxy.js --name olt-proxy`);
});
