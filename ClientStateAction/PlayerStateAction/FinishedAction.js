import { PlayerStateAction } from "./PlayerStateAction.js";
import { ClientStateAction } from "../ClientStateAction.js";

/**
 * プレイヤーの状況
 * ゲーム画面を閉じる
 */
export class FinishedAction extends PlayerStateAction
{
    /**
     * ゲーム画面を閉じる
     * @param {Object} objMessage クライアントから受信したメッセージ
     * @param {Int} participantIndex 参加情報の要素番号
     * @returns {List} ソケットに送信するメッセージリスト 
     */
    Action(objMessage,participantIndex)
    {
        // サーバーで一時保存されている参加者情報
        let serverParticipantInfo = this.roomList[objMessage.game_kind][objMessage.room_json[0].id].participant_json;
        // 受信メッセージで設定されている参加者情報
        let messageParticipantInfo = objMessage.room_json[0].participant_json;

        // 受信メッセージにてルーム情報を更新する場合
        if(objMessage.room_json[0].is_update == true)
        {
            // プレイヤー番号
            let playerNumber = 0;
            // 途中入退室を考慮して、参加者情報を個々に確認する
            for (let i = 0; i < serverParticipantInfo.length; i++)
            {
                // 対象者がCPUではない場合
                if(serverParticipantInfo[i].cpu_json.is_your_cpu == false)
                {
                    // 対象のプレイヤー番号を更新する
                    playerNumber++;
                    serverParticipantInfo[i].number = playerNumber;

                    for (let j = 0; j < messageParticipantInfo.length; j++)
                    {
                        // お互いの参加者情報の入室順が一致する(同じ参加者である)場合
                        if(serverParticipantInfo[i].enter_order == messageParticipantInfo[j].enter_order)
                        {
                            // サーバーで一時保存されている参加者情報の｢その他の情報｣を更新する
                            serverParticipantInfo[i].others = messageParticipantInfo[j].others;
                            break;
                        }
                    }
                }
            }

            // 対戦・協力のルールを更新する
            this.roomList[objMessage.game_kind][objMessage.room_json[0].id].rule_json = objMessage.room_json[0].rule_json;
        }
        else
        {
            // 受信メッセージで自身のプレイヤー番号を更新する
            objMessage.player_json.number = this.roomList[objMessage.game_kind][objMessage.room_json[0].id].participant_json[participantIndex].number;

            // サーバーで一時保存する自身の参加情報を更新する
            this.roomList[objMessage.game_kind][objMessage.room_json[0].id].participant_json.splice(participantIndex, 1, objMessage.player_json);
        }

        // -----------------------------------------------------------------------------------------------------------------------

        // サーバーで一時保存されている自身のプレイヤー状態が、既に｢ルーム待機中｣へ戻された場合
        if(this.roomList[objMessage.game_kind][objMessage.room_json[0].id].participant_json[participantIndex].state < PlayerStateAction.playerStateKind.loading)
        {
            // 依頼IDを｢ルーム待機中｣に設定
            objMessage.socket_state = ClientStateAction.clientStateKind.roomWait;
            // プレイヤーの状態を最新の状態に更新
            objMessage.player_json.state = this.roomList[objMessage.game_kind][objMessage.room_json[0].id].participant_json[participantIndex].state;
        }
        else
        {
            // サーバーで一時保存されている他の参加者状態を確認する
            let isCanWait = true;
            for ( let i = 0; i < serverParticipantInfo.length; i++)
            {
                // 自身の参加者情報はサーバーでまだ更新されていないため、確認しない
                if(i == participantIndex)
                {
                    continue;
                }
                
                // 他の参加者(CPUではない)の状態が｢ゲーム画面を閉じる｣ではない場合
                if((serverParticipantInfo[i].cpu_json.is_your_cpu == false)&&
                   ((serverParticipantInfo[i].state == PlayerStateAction.playerStateKind.loading)||(serverParticipantInfo[i].state == PlayerStateAction.playerStateKind.play)))
                {
                    // 参加者全員がゲーム画面を閉じていない
                    isCanWait = false;
                    break;
                }
            
                // 参加者全員がゲーム画面を閉じた場合
                if(isCanWait)
                {
                    // サーバーで一時保存されている対戦・協力中のメッセージをリセットする
                    this.roomList[objMessage.game_kind][objMessage.room_json[0].id].play_message_json = [];

                    // 自身のプレイヤー情報の状態を｢待機中｣に変更する
                    objMessage.player_json.state = PlayerStateAction.playerStateKind.roomWait;

                    // ルームの参加者情報を確認する
                    for (let i = 0; i < serverParticipantInfo.length; i++)
                    {
                        // 自身の参加者情報はサーバーでまだ更新されていないため、確認しない
                        if(i == participantIndex)
                        {
                            continue;
                        }

                        // 対象者がCPUである場合
                        if(serverParticipantInfo[i].cpu_json.is_your_cpu == true)
                        {
                            // 参加者からCPUの情報を削除する
                            serverParticipantInfo.splice(i, 1);
                            i--;
                        }
                        else
                        {
                            // 参加者の状態を｢待機中｣に変更する
                            serverParticipantInfo[i].state = PlayerStateAction.playerStateKind.roomWait;
                        }
                    }
                }    
            }
        }

        // サーバーで一時保存する自身の参加情報を更新する
        serverParticipantInfo.splice(participantIndex, 1, objMessage.player_json);
        
        // 受信メッセージで全体のルーム情報を更新する
        objMessage.room_json[0] = this.roomList[objMessage.game_kind][objMessage.room_json[0].id];
            
        // 更新したメッセージをソケットに送信する
        return [JSON.stringify(objMessage)];
    }
}