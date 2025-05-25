const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('クライアント接続');

  ws.on('message', (message) => {
    console.log('受信:', message);
    ws.send(`サーバーからの返信: ${message}`);
  });

  ws.on('close', () => {
    console.log('切断されました');
  });
});

app.get('/', (req, res) => {
  res.send('WebSocket サーバーが動作中です。');
});

server.listen(PORT, () => {
  console.log(`サーバーがポート ${PORT} で起動中`);
});