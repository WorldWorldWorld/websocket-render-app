import { PlayerStateAction } from "./PlayerStateAction.js";
import { ClientStateAction } from "../ClientStateAction.js";

/**
 * プレイヤーの状況
 * ルームで待機する
 */
export class RoomWaitByPlayerAction extends PlayerStateAction
{
    /**
     * ルームで待機する
     * @param {Object} objMessage クライアントから受信したメッセージ
     * @param {Int} participantIndex 参加情報の要素番号
     * @returns {List} ソケットに送信するメッセージリスト 
     */
    Action(objMessage,participantIndex)
    {
        // 受信メッセージで自身のプレイヤー番号を更新する
        objMessage.player_json.number = this.roomList[objMessage.game_kind][objMessage.room_json[0].id].participant_json[participantIndex].number;

        // サーバーで一時保存されている自身のプレイヤー状態が、既に｢ゲーム画面に読み込み中｣の場合
        if(this.roomList[objMessage.game_kind][objMessage.room_json[0].id].participant_json[participantIndex].state >= PlayerStateAction.playerStateKind.loading)
        {
            // 受信メッセージで依頼IDを｢対戦・協力プレイ｣に設定
            objMessage.socket_state = ClientStateAction.clientStateKind.roomplay;
            // 受信メッセージでプレイヤーの状態を最新の状態に更新
            objMessage.player_json.state = this.roomList[objMessage.game_kind][objMessage.room_json[0].id].participant_json[participantIndex].state;
        }
        else
        {
            // ルーム待機中の残り時間を測る
            super.MeasureRemainingTime(objMessage,participantIndex);
        }

        // サーバーで一時保存する自身の参加情報を更新する
        this.roomList[objMessage.game_kind][objMessage.room_json[0].id].participant_json.splice(participantIndex, 1, objMessage.player_json);
        // 受信メッセージで全体の参加情報を更新する
        objMessage.room_json[0] = this.roomList[objMessage.game_kind][objMessage.room_json[0].id];

        // 更新したメッセージをソケットに送信する
        return [JSON.stringify(objMessage)];
    }
}