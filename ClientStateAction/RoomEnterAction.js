import { ClientStateAction } from "./ClientStateAction.js";
import { PlayerStateAction } from "./PlayerStateAction/PlayerStateAction.js";

/**
 * クライアント送信の依頼
 * ルームID(パスワード含む)を指定して入室
 */
export class RoomEnterAction extends ClientStateAction
{
    /**
     * ルームID(パスワード含む)を指定して、ルームに入る
     * @param {Object} objMessage クライアントから受信したメッセージ
     * @returns {List} ソケットに送信するメッセージリスト 
     */
    Action(objMessage)
    {
        // 受信したメッセージで指定したルーム情報やプレイヤー情報が存在しない場合
        if((typeof objMessage.room_json === 'undefined')||
           (typeof objMessage.room_json[0] === 'undefined')||
           (typeof objMessage.room_json[0].id === 'undefined'))
        {
            console.log('受信したメッセージに｢ルーム情報｣や｢プレイヤー情報｣が含まれていません');
            return null;
        }
        
        // ルームIDを数値へ変換
        objMessage.room_json[0].id = Number(objMessage.room_json[0].id);

        // 指定したルームIDを数字に変換できない場合
        if(isNaN(objMessage.room_json[0].id))
        {
          console.log('指定した｢ルームID｣が数値ではありません');
          return null;
        }

        // 指定したルームIDが存在しない(指定したルームが削除された)場合
        if((typeof this.roomList[objMessage.game_kind][objMessage.room_json[0].id] === "undefined")||
           (this.roomList[objMessage.game_kind][objMessage.room_json[0].id].id != objMessage.room_json[0].id))
        {
            console.log('指定したルームが存在しません');
            // 依頼IDをリセット
            objMessage.socket_state = ClientStateAction.clientStateKind.nothing;
            // 受信メッセージからルーム情報を削除する
            delete objMessage.room_json;
            // そのメッセージをソケットに送信する
            return [JSON.stringify(objMessage)];
        }

        // パスワードが存在するルームにて、そのパスワード情報を指定していない場合
        if((this.roomList[objMessage.game_kind][objMessage.room_json[0].id]?.password_json?.is_used) &&
           ( (typeof objMessage.room_json[0].password_json === "undefined") || !(objMessage.room_json[0].password_json) )
           )
        {
            console.log('受信したメッセージに｢パスワード情報｣が含まれていません');
            // 依頼IDをリセット
            objMessage.socket_state = ClientStateAction.clientStateKind.nothing;
            // 受信メッセージからルーム情報を更新する
            objMessage.room_json = this.roomList[objMessage.game_kind][objMessage.room_json[0].id];
            // そのメッセージをソケットに送信する
            return [JSON.stringify(objMessage)];
        }

        // パスワードが存在して、指定したパスワードに一致しない場合
        if((this.roomList[objMessage.game_kind][objMessage.room_json[0].id].password_json.is_used) &&
           (this.roomList[objMessage.game_kind][objMessage.room_json[0].id].password_json.password != objMessage.room_json[0].password_json.password))
        {
            console.log('パスワードが間違っています');
            // 依頼IDをリセット
            objMessage.socket_state = ClientStateAction.clientStateKind.nothing;
            // 受信メッセージからルーム情報を更新する
            objMessage.room_json = this.roomList[objMessage.game_kind][objMessage.room_json[0].id];
            // そのメッセージをソケットに送信する
            return [JSON.stringify(objMessage)];
        }

        // 相手が対戦･協力中に入室できないルームにて、相手が対戦･協力中の場合
        // 開発メモ：***.is_enter_midway_throughが未定義の場合 下記の条件を無効にするため、｢***.is_enter_midway_through == false｣を設定
        if((this.roomList[objMessage.game_kind][objMessage.room_json[0].id].is_enter_midway_through == false)&&
           (this.roomList[objMessage.game_kind][objMessage.room_json[0].id].participant_json[0].state >= PlayerStateAction.playerStateKind.loading))
        {
            console.log('対戦･協力中に入室できないルームであり、相手が対戦･協力中です');
            // 依頼IDをリセット
            objMessage.socket_state = ClientStateAction.clientStateKind.nothing;
            // 受信メッセージからルーム情報を更新する
            objMessage.room_json = this.roomList[objMessage.game_kind][objMessage.room_json[0].id];
            // そのメッセージをソケットに送信する
            return [JSON.stringify(objMessage)];           
        }

        // 指定したルームが満員の場合
        if(this.roomList[objMessage.game_kind][objMessage.room_json[0].id].total == this.roomList[objMessage.game_kind][objMessage.room_json[0].id].max_total)
        {
            console.log('指定したルームが満員です');
            // 依頼IDをリセット
            objMessage.socket_state = ClientStateAction.clientStateKind.nothing;
            // 受信メッセージからルーム情報を更新する
            objMessage.room_json = this.roomList[objMessage.game_kind][objMessage.room_json[0].id];
            // そのメッセージをソケットに送信する
            return [JSON.stringify(objMessage)];
        }

        // 上記の条件にどれも該当しない場合、ルーム入室のメッセージを送信する
        return super.EnterRoom(objMessage);
    }
}