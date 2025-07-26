import { PlayerStateAction } from "./PlayerStateAction.js";
import { ClientStateAction } from "../ClientStateAction.js";

/**
 * プレイヤーの状況
 * ゲーム画面を読み込み中
 */
export class LoadingAction extends PlayerStateAction
{
    /**
     * ゲーム画面を読み込む
     * @param {Object} objMessage クライアントから受信したメッセージ
     * @param {Int} participantIndex 参加情報の要素番号
     * @returns {List} ソケットに送信するメッセージリスト 
     */
    Action(objMessage,participantIndex)
    {
        // サーバーで一時保存されている自身のプレイヤー状態が、既に｢ルーム待機中｣へ戻された場合
        if(this.roomList[objMessage.game_kind][objMessage.room_json[0].id].participant_json[participantIndex].state < PlayerStateAction.playerStateKind.loading)
        {
            // 依頼IDを｢ルーム待機中｣に設定
            objMessage.socket_state = ClientStateAction.clientStateKind.roomWait;
            // プレイヤーの状態を最新の状態に更新
            objMessage.player_json.state = this.roomList[objMessage.game_kind][objMessage.room_json[0].id].participant_json[participantIndex].state;
        }
        // 受信メッセージにてルーム情報を更新する場合
        else if(objMessage.room_json[0].is_update == true)
        {
            // サーバーで一時保存されている参加者情報
            let serverParticipantInfo = this.roomList[objMessage.game_kind][objMessage.room_json[0].id].participant_json;
            // 受信メッセージで設定されている参加者情報
            let messageParticipantInfo = objMessage.room_json[0].participant_json;

            // サーバーで一時保存されている参加者情報からCPU情報を削除する
            if(this.roomList[objMessage.game_kind][objMessage.room_json[0].id].is_used_cpu == true)
            {
                for (let i = 0; i < serverParticipantInfo.length; i++)
                {
                    if (serverParticipantInfo[i].cpu_json.is_your_cpu == true)
                    {
                        serverParticipantInfo.splice(i, 1); 
                        i--;
                    }
                }
            }

            // プレイヤー番号
            let playerNumber = 0;
            // プレイヤー状態｢ゲーム画面に読み込み中｣である参加者人数
            let playerTotalByStateLoading = 0;
            // 途中入退室を考慮して、参加者情報を個々に確認する
            for (let i = 0; i < serverParticipantInfo.length; i++)
            {
                // プレイヤー番号を更新する
                playerNumber++;
                serverParticipantInfo[i].number = playerNumber;

                // 対象の参加者の状態が｢ゲーム画面に読み込み中｣である 場合
                if(serverParticipantInfo[i].state >= PlayerStateAction.playerStateKind.loading)
                {
                    // プレイヤー状態｢ゲーム画面に読み込み中｣である参加者人数を増やす
                    playerTotalByStateLoading++;
                }

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

            // CPUの合計
            let cpuTotal = 0;
            // CPUのプレイヤー番号に初期化する
            playerNumber = playerTotalByStateLoading;
            // 受信メッセージで設定されているCPU情報を、サーバーで一時保存されている参加者情報に追加する
            if(this.roomList[objMessage.game_kind][objMessage.room_json[0].id].is_used_cpu == true)
            {
                for (let i = 0; i < messageParticipantInfo.length; i++)
                {
                    if (messageParticipantInfo[i].cpu_json.is_your_cpu == true)
                    {
                        // CPUのプレイヤー名を設定する
                        cpuTotal++;
                        messageParticipantInfo[i].name = "CPU" + String(cpuTotal);

                        // CPUのプレイヤー番号を設定する
                        playerNumber++;
                        messageParticipantInfo[i].number = playerNumber;

                        // CPUの入室順を設定する
                        messageParticipantInfo[i].enter_order = -1;

                        // CPUのプレイヤー状況を設定する
                        messageParticipantInfo[i].state = PlayerStateAction.playerStateKind.play;

                        // CPUを参加情報に追加する
                        serverParticipantInfo.push(messageParticipantInfo[i]); 
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

        // 受信メッセージで更新したルーム情報を設定する
        objMessage.room_json[0] = this.roomList[objMessage.game_kind][objMessage.room_json[0].id];
        // そのメッセージをソケットに送信する
        return [JSON.stringify(objMessage)];
    }
}