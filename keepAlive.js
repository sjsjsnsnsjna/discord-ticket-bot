'use strict';
const express = require('express');

function keepAlive() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.get('/', (req, res) => {
    res.send('🤖 Discord Ticket Bot çalışıyor!');
  });

  app.get('/ping', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[keepAlive] Web sunucusu port ${PORT} üzerinde çalışıyor`);
  });
}

module.exports = { keepAlive };
