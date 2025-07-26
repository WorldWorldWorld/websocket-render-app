import { ClientStateAction } from "./ClientStateAction.js";

/**
 * クライアント送信の依頼
 * ・ルームで待機する
 * ・ルームで対戦・協力プレイ
 */
export class RoomWaitOrPlayByClientAction extends ClientStateAction
{
    /**
     * ルームで待つ
     * ルームで対戦や協力する
     * @param {Object} objMessage クライアントから受信したメッセージ
     * @returns {List} ソケットに送信するメッセージリスト 
     */
    Action(objMessage)
    {
        // 受信したメッセージで指定したルーム情報やプレイヤー情報が存在しない場合
        if((typeof objMessage.room_json === 'undefined')||
           (typeof objMessage.room_json[0] === 'undefined'))
        {
            console.log('受信したメッセージに｢ルーム情報｣や｢プレイヤー情報｣が含まれていません');
            return null;
        }

        // ルームIDやプレイヤー情報の一部を数値へ変換
        objMessage.room_json[0].id = Number(objMessage.room_json[0].id);
        objMessage.player_json.state = Number(objMessage.player_json.state);
        objMessage.player_json.enter_order = Number(objMessage.player_json.enter_order);

        // 指定したルームIDを数字に変換できない場合
        if(isNaN(objMessage.room_json[0].id) ||
           isNaN(objMessage.player_json.state)||
           isNaN(objMessage.player_json.enter_order))
        {
          console.log('指定した｢ルームID｣｢プレイヤー状態｣｢自身の入室順｣が数値ではありません');
          return null;
        }

        // 指定したプレイヤー状態の範囲が超えている場合
        if((objMessage.player_json.state < 0)||(objMessage.player_json.state > this.playerStateActionList.length - 1))
        {
          console.log('指定した｢プレイヤー状態｣が数値範囲を超えています');
          return;
        }
        
        // ルーム待機のメッセージを送信する
        return super.WaitRoom(objMessage);
    }
}