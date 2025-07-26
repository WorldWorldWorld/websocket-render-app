import { ClientStateAction } from "./ClientStateAction.js";

/**
 * クライアント送信の依頼
 * ルーム作成
 */
export class RoomCreateAction extends ClientStateAction
{
    /**
     * ルームを作る
     * @param {Object} objMessage クライアントから受信したメッセージ
     * @returns {List} ソケットに送信するメッセージリスト 
     */
    Action(objMessage)
    {
        // 受信したメッセージで指定したルーム情報やプレイヤー情報が存在しない場合
        if((typeof objMessage.room_json === 'undefined')||
           (typeof objMessage.room_json[0] === 'undefined')||
           (typeof objMessage.room_json[0].max_total === 'undefined'))
        {
            console.log('受信したメッセージに｢ルーム情報｣や｢プレイヤー情報｣が含まれていません');
            return null;
        }

        // ルームの最大参加可能人数を数値へ変換
        objMessage.room_json[0].max_total = Number(objMessage.room_json[0].max_total);
        // 指定したルームの最大参加可能人数を数字に変換できない場合
        if(isNaN(objMessage.room_json[0].max_total))
        {
          console.log('指定した｢最大参加可能人数｣が数値ではありません');
          return null;
        }        

        // 他のルーム番号に一致しないように、自身のルーム番号を乱数で作成する
        let isloop = true;
        while(isloop)
        {
            // ループフラグをリセット
            isloop = false;

            // 自身のルーム番号を乱数で作成 範囲:000001～999999
            objMessage.room_json[0].number = this.getRandom(this.roomMinNumber,this.roomMaxNumber)
                                          .toString().padStart(this.roomNumberOfDigits, '0');

            // 他のルーム番号を取得
            for (const roomInfo of this.roomList[objMessage.game_kind])
            {
                // 自身のルーム番号と他のルーム番号が一致した場合
                if((roomInfo) && (objMessage.room_json[0].number == roomInfo.number))
                {
                    // 再度、自身のルーム番号を乱数で設定する
                    isloop = true;
                    break;
                }
            }
        }

        // ルームIDを初期化する
        delete objMessage.room_json[0].id;
        // 空いているルームを探す
        for ( let i = 0; i < this.roomList[objMessage.game_kind].length; i++)
        {
            if(!this.roomList[objMessage.game_kind][i])
            {
                objMessage.room_json[0].id = i;
                break;
            }
        }

        // ルーム作成のメッセージを送信する
        return super.CreateRoom(objMessage);
    }

    /**
     * 乱数を取得する
     * @param {int} min 最小値
     * @param {int} max 最大値
     */
    getRandom(min, max)
    {
        return Math.floor( Math.random() * (max + 1 - min) ) + min;
    }
}