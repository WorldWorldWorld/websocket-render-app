/**
 * 本番環境　サーバー
 */
import { express } from 'express';
import { http } from 'http';
import { WebSocketServer } from 'ws';

const port = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// メッセージリスト
const wsList = [];

wss.on('connection', (socket) => {
  console.log('クライアント接続');

  socket.on('message', (message) => {
    console.log('受信したメッセージ:', String(message));
    socket.send(`サーバーから返信: ${message}`);

    // ▽サンプル ------------------------------------------------
    // メッセージリストに追加
    wsList.push(message);
    // 送られていないメッセージを送る
    for (const wsMessage of wsList) {
      if (message != wsMessage) {
        socket.send('未送信メッセージ：'+ wsMessage);
      }
    }
    //------------------------------------------------------------

  });

  socket.on('close', () => {
    console.log('クライアントが切断されました');
  });
});

app.get('/', (req, res) => {
  res.send('WebSocket サーバーが動作中です。');
});

server.listen(port, () => {
  console.log(`サーバーがポート ${PORT} で起動中`);
});