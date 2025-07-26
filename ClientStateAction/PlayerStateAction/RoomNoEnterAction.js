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
        // 参加者情報を取得する
        let participantInfo = this.roomList[objMessage.game_kind][objMessage.room_json[0].id].participant_json;

        // 自身がルームのリーダーである 又は 参加者が1人のみ 場合
        if((participantInfo[participantIndex].is_reader == true)||
           (this.roomList[objMessage.game_kind][objMessage.room_json[0].id].total == 1))
        {
            // サーバーで一時保存する指定したルームを削除して、削除したルームを｢undefine｣で残す
            delete this.roomList[objMessage.game_kind][objMessage.room_json[0].id];
        }
        else
        {
            // 前回まで自身の状態が｢ゲーム画面に読み込み中｣｢対戦・協力｣であり、試合を強制終了する場合
            if((participantInfo[participantIndex].state >= PlayerStateAction.playerStateKind.loading)&&
                   (this.roomList[objMessage.game_kind][objMessage.room_json[0].id].is_stop_playing == true))
            {
                // サーバーで一時保存する自身の参加情報のみ削除して、削除した参加情報を｢undefine｣で残さない
                participantInfo.splice(participantIndex, 1);

                // サーバーで一時保存されている対戦・協力中のメッセージをリセットする
                this.roomList[objMessage.game_kind][objMessage.room_json[0].id].play_message_json = [];

                // プレイヤー番号に初期値を設定する
                let playerNumber = 1;
                // ルームの参加者情報を確認する
                for (let i = 0; i < participantInfo.length; i++)
                {
                    // 対象者がCPUである場合
                    if(participantInfo[i].cpu_json.is_your_cpu == true)
                    {
                        // 参加者からCPUの情報を削除する
                        participantInfo.splice(i, 1);
                        i--;
                    }
                    else
                    {
                        // 参加者の状態を｢待機中｣に変更する
                        participantInfo[i].state = PlayerStateAction.playerStateKind.roomWait;
                        
                        // プレイヤー番号を更新する
                        participantInfo[i].number = playerNumber;
                        
                        // 次のプレイヤー番号に注目する
                        playerNumber++;
                    }
                }
            }
            // 前回まで自身の状態が｢ゲーム画面に読み込み中｣｢対戦・協力｣であり、CPUに設定可能の場合
            else if((participantInfo[participantIndex].state >= PlayerStateAction.playerStateKind.loading)&&
                (this.roomList[objMessage.game_kind][objMessage.room_json[0].id].is_used_cpu == true))
            {
                // 自身の参加者情報をCPUに差し替える
                objMessage.player_json.cpu_json.is_your_cpu = true;
                // そのCPUを操作するプレイヤー番号を先頭に設定する 
                objMessage.player_json.cpu_json.control_number = 1;
                // サーバーで一時保存する参加情報を、CPUに設定した自身のプレイヤー情報に差し替える
                participantInfo.splice(participantIndex, 1, objMessage.player_json);
            }
            else
            {
                // 参加情報から削除する前に、プレイヤー番号を取得する
                let playerNumber = participantInfo[participantIndex]?.number;

                // サーバーで一時保存する自身の参加情報のみ削除して、削除した参加情報を｢undefine｣で残さない
                participantInfo.splice(participantIndex, 1);

                // サーバーで一時保存する他の参加者のプレイヤー番号を更新する
                if(participantIndex < participantInfo.length)
                {
                    for (let i = participantIndex; i < participantInfo.length; i++)
                    {
                        // CPUではない場合、プレイヤー番号を更新する
                        if(participantInfo[i].cpu_json.is_your_cpu == false)
                        {
                            participantInfo[i].number = playerNumber;
                            // 次のプレイヤー番号に注目する
                            playerNumber++;
                        }
                    }
                }
            }
            
            // サーバーで一時保存する参加者の人数を減らす
            this.roomList[objMessage.game_kind][objMessage.room_json[0].id].total--;
        }
        
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