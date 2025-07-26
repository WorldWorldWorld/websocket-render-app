import { PlayerStateAction } from "./PlayerStateAction.js";
import { ClientStateAction } from "../ClientStateAction.js";

/**
 * プレイヤーの状況
 * 対戦・協力の準備を整えた
 */
export class ReadyToPlayAction extends PlayerStateAction
{
    /**
     * 対戦・協力の準備を整えた
     * @param {Object} objMessage クライアントから受信したメッセージ
     * @param {Int} participantIndex 参加情報の要素番号
     * @returns {List} ソケットに送信するメッセージリスト 
     */
    Action(objMessage,participantIndex)
    {
        // サーバーで一時保存されているルーム情報
        let serverRoomInfo = this.roomList[objMessage.game_kind][objMessage.room_json[0].id];
        
        // 受信メッセージで自身のプレイヤー番号を更新する
        objMessage.player_json.number = serverRoomInfo.participant_json[participantIndex].number;
        
        // サーバーで一時保存されている自身のプレイヤー状態が、既に｢ゲーム画面に読み込み中｣の場合
        if(serverRoomInfo.participant_json[participantIndex].state >= PlayerStateAction.playerStateKind.loading)
        {
            // 依頼IDを｢対戦・協力プレイ｣に設定
            objMessage.socket_state = ClientStateAction.clientStateKind.roomplay;
            // プレイヤーの状態を最新の状態に更新
            objMessage.player_json.state = serverRoomInfo.participant_json[participantIndex].state;
        }
        else
        {
            // ルーム待機中の残り時間を測る
            super.MeasureRemainingTime(objMessage,participantIndex);
            
            // 上記の処理｢ルーム待機中の残り時間｣より、自身の状況が｢ゲーム画面に読み込み中｣にまだ成り立たない場合
            if(objMessage.player_json.state < PlayerStateAction.playerStateKind.loading)
            {
                // 参加者情報を取得
                let participantInfo = serverRoomInfo.participant_json;

                // サーバーで一時保存されている他の参加者状態を確認する
                let isCanPlay = true;
                for ( let i = 0; i < participantInfo.length; i++)
                {
                    // 自身の参加者情報はサーバーでまだ更新されていないため、確認しない
                    if(i == participantIndex)
                    {
                        continue;
                    }
           
                    // 他の参加者(CPUではない)の状態が｢ゲーム画面に読み込み中｣ではない場合
                    if((participantInfo[i].cpu_json.is_your_cpu == false)&&(participantInfo[i].state < PlayerStateAction.playerStateKind.readyToPlay))
                    {
                        // 参加者全員が準備を整えられていない
                        isCanPlay = false;
                        break;
                    }
                }

                // 参加者全員が準備を整えられた場合
                if(isCanPlay)
                {
                    // ルーム待機中の残り時間情報をリセットする
                    let  remainingTimeJson =  this.roomList[objMessage.game_kind][objMessage.room_json[0].id].remaining_time_json;
                    remainingTimeJson.is_measure = false;
                    remainingTimeJson.start_datetime = null;
                    remainingTimeJson.remaining_time = 0;

                    // 自身も含めて参加者全員の状況を｢ゲーム画面に読み込み中｣に設定する
                    super.SetStatePlayingByAllParticipants(objMessage,participantIndex);
                }
            }
        }

        // サーバーで一時保存する自身の参加情報を更新する
        serverRoomInfo.participant_json.splice(participantIndex, 1, objMessage.player_json);
        
        // 受信メッセージでルーム情報を更新する
        objMessage.room_json[0] = serverRoomInfo;
            
        // 更新したメッセージをソケットに送信する
        return [JSON.stringify(objMessage)];
    }
}