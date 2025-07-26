/**
 * 本番環境　サーバー
 */
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { RandomMatchAction } from "./ClientStateAction/RandomMatchAction.js";
import { RoomCreateAction } from "./ClientStateAction/RoomCreateAction.js";
import { RoomSearchAction } from "./ClientStateAction/RoomSearchAction.js";
import { RoomEnterAction } from "./ClientStateAction/RoomEnterAction.js";
import { RoomWaitOrPlayByClientAction } from "./ClientStateAction/RoomWaitOrPlayByClientAction.js";

const port = process.env.PORT || 10000;
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ルームリスト roomList[ゲームの種類ID][ルームID]
let roomList = [];

// クライアント送信の依頼に沿って動作するリスト
let ClientStateActionList = [
  undefined,                       // 何もしない
  new RandomMatchAction(roomList), // ランダムマッチ (対戦･協力の主な種類に沿って、自由に入室)
  new RoomCreateAction(roomList),  // ルーム作成
  new RoomSearchAction(roomList),  // ルーム探索
  new RoomEnterAction(roomList),   // ルームID(パスワード含む)を指定して入室
  new RoomWaitOrPlayByClientAction(roomList), // ルーム待機 (｢ルームで対戦・協力｣のクラスと同じ)
  new RoomWaitOrPlayByClientAction(roomList)  // ルームで対戦・協力 (｢ルーム待機｣のクラスと同じ)
];

wss.on('connection', (socket) => {
  console.log('クライアントが接続しました'); 

  socket.on('message', (message) => {

    console.log('受信したメッセージ:', String(message));

    //---------------------------------------------------
    // メッセージを文字列に設定
    let strMessage = String(message); 
    
    // メッセージがJSON形式に変換できない場合
    if(!CheckMessageJson(strMessage))
    {
      console.log('受信したメッセージがJSON形式に変換できません');
      return;
    }

    // json形式のメッセージからオブジェクトへ変換
    const objMessage = JSON.parse(strMessage);

    // -----------------------------------------------------------------

    // 指定したゲームの種類や依頼IDが存在しない場合
    if((typeof objMessage.game_kind === 'undefined')||(typeof objMessage.socket_state === 'undefined'))
    {
      console.log('受信したメッセージに｢ゲーム種類｣や｢依頼ID｣が含まれていません');
      return;
    }
    
    // ゲームの種類や依頼IDを文字列から数字に変換
    objMessage.game_kind = Number(objMessage.game_kind);
    objMessage.socket_state = Number(objMessage.socket_state);
    
    // 指定したゲームの種類や依頼IDを数字に変換できない場合
    if(isNaN(objMessage.game_kind)||isNaN(objMessage.socket_state))
    {
      console.log('指定した｢ゲーム種類｣や｢依頼ID｣が数値ではありません');
      return;
    }
    
    // 指定した依頼IDの範囲が超えている場合
    if((objMessage.socket_state < 0)||(objMessage.socket_state > ClientStateActionList.length - 1))
    {
      console.log('指定した｢依頼ID｣が数値範囲を超えています');
      return;
    }

    // -----------------------------------------------------------------

    // 指定したゲーム種類のルームが存在しない場合
    if(!roomList[objMessage.game_kind])
    {
        // そのルームを確保する
        roomList[objMessage.game_kind] = [];
    }

    // 依頼がある場合(依頼の状態が｢何もなし｣以外の状態)
    if(objMessage.socket_state > 0)
    {
      // クライアント送信の依頼に沿って、サーバーからのメッセージをまとめる
      const socketMessageList = ClientStateActionList[objMessage.socket_state]?.Action(objMessage);

      // サーバーからのメッセージを送信する
      if (socketMessageList)
      {
        for (const socketMessage of socketMessageList)
        {
          if (socketMessage)
          {
            // メッセージを文字型に変換して、ソケットに送信する
            socket.send(String(socketMessage));
          }
        }
      }
    }
  });

  socket.on('close', () => {
    console.log('クライアントが切断されました');
  });

  /**
   * メッセージがJSON形式に変更可能か判別する
   * @param {String} message クライアントから受信したメッセージ
   * @returns {Bool} メッセージがJSON形式に変更可能か 
   */
  function CheckMessageJson(message)
  {
    try
    {
      JSON.parse(message)
    }
    catch (error)
    {
      return false
    }
    return true
  }
});

app.get('/', (req, res) => {
  res.send('WebSocket サーバーが動作中です。');
});

server.listen(port, () => {
  console.log(`サーバーがポート ${port} で起動中`);
});