import { PlayerStateAction } from "./PlayerStateAction.js";
import { ClientStateAction } from "../ClientStateAction.js";

/**
 * プレイヤーの状況
 * ルームに入室しない(退出する)
 */
export class RoomNoEnterAction extends PlayerStateAction
{
    /**
     * ルームに入室しない (退出する)
     * @param {Object} objMessage クライアントから受信したメッセージ
     * @param {Int} participantIndex 参加情報の要素番号
     * @returns {List} ソケットに送信するメッセージリスト 
     */
    Action(objMessage,participantIndex)
    {
        // 部屋から自身を退出させる
        super.KickTheParticipantOutOfTheRoom(objMessage,participantIndex);
        
        // 受信メッセージの依頼IDをリセット
        objMessage.socket_state = ClientStateAction.clientStateKind.nothing;
        // 受信メッセージから不要な情報を削除
        delete objMessage.room_json;
        delete objMessage.player_json.is_reader;
        delete objMessage.player_json.number;
        delete objMessage.player_json.enter_order;
        
        // その削除したメッセージをソケットに送信する
        return [JSON.stringify(objMessage)];
    }
}