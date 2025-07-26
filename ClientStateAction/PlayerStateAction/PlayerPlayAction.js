import { PlayerStateAction } from "./PlayerStateAction.js";
import { ClientStateAction } from "../ClientStateAction.js";

/**
 * プレイヤーの状況
 * 対戦・協力プレイする
 */
export class PlayerPlayAction extends PlayerStateAction
{
    /**
     * 対戦・協力プレイする
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
            // サーバーで一時保存する自身の参加情報を更新する
            serverRoomInfo.participant_json.splice(participantIndex, 1, objMessage.player_json);
            // 受信メッセージの参加情報を更新する
            objMessage.room_json[0].participant_json = serverRoomInfo.participant_json;
        
            // 読み込み中や対戦・協力中の参加者を入室順でまとめる
            let playingParticipantEnterOrderList = []
            for(let i = 0; i < objMessage.room_json[0].participant_json.length; i++)
            {
                if(objMessage.room_json[0].participant_json[i].state >= PlayerStateAction.playerStateKind.loading)
                {
                    playingParticipantEnterOrderList.push(objMessage.room_json[0].participant_json[i].enter_order);
                }
            }
        
            // 受信から対戦・協力中の新規メッセージを確認する
            let newMessageList = [];
            if((objMessage.room_json[0].play_message_json) &&
               (objMessage.room_json[0].play_message_json.length > 0))
            {
                for(let i = 0; i < objMessage.room_json[0].play_message_json.length; i++)
                {
                    // 新規メッセージが存在する場合
                    if((objMessage.room_json[0].play_message_json[i].number)||
                       (objMessage.room_json[0].play_message_json[i].message)||
                       (objMessage.room_json[0].play_message_json[i].others))
                    {
                        // 送信済みの入室順リストにて、自身の入室順を追加する
                        objMessage.room_json[0].play_message_json[i].send_enter_order_list=[];
                        objMessage.room_json[0].play_message_json[i].send_enter_order_list.push(objMessage.room_json[0].participant_json[participantIndex].enter_order); 
                    
                        // 受信の対戦・協力中メッセージに新規メッセージを追加する
                        newMessageList.push(objMessage.room_json[0].play_message_json[i]);
                    }
                }
            }
        
            // 受信で設定されている対戦・協力中メッセージをリセットする
            objMessage.room_json[0].play_message_json = [];
        
            // サーバーで一時保存されている対戦・協力中のメッセージを確認する
            for(let i = 0; i < serverRoomInfo.play_message_json.length; i++)
            {
               // 自身のプレイヤーへ対戦・協力中のメッセージ未受取有無
               let isNoSend = true;
               for (const sendEnterOrder of serverRoomInfo.play_message_json[i].send_enter_order_list)
               {    
                    // 送信済みの入室順リストに自身の入室順が含まれている場合、既にプレイヤーへ送信済みと判定
                    if(sendEnterOrder == objMessage.player_json.enter_order)
                    {
                        isNoSend = false;
                        break;
                    }
               }
           
               // 対象となる対戦・協力中のメッセージを受け取っていない場合
               if(isNoSend == true)
               {    
                    // サーバーで一時保存する｢送信済みの入室順リスト｣にて、自身の入室順を追加する
                    serverRoomInfo.play_message_json[i].send_enter_order_list.push(objMessage.player_json.enter_order);
                    // 受信の対戦・協力中メッセージに追加する
                    objMessage.room_json[0].play_message_json.push(serverRoomInfo.play_message_json[i]);
               }
           
               // -----------------------------------------------------------------------------------------------------------
           
               // 全員送信済み有無
               let isSendAll = false;
               for(const playingParticipantEnterOrder of playingParticipantEnterOrderList)
               {
                    // フラグをリセット
                    isSendAll = false;
                
                    for (const sendEnterOrder of serverRoomInfo.play_message_json[i].send_enter_order_list)
                    {    
                        // 送信済みの入室順リストに対象の入室順が含まれている場合、既に対象者へ送信済みと判定
                        if(sendEnterOrder == playingParticipantEnterOrder)
                        {
                            isSendAll = true;
                            break;
                        }
                    }
                
                    // 対象者へ送信していない場合、探索を中止する
                    if(isSendAll == false) break;
               }
           
               // 対象となる対戦・協力中のメッセージが全員に受け取った場合
               if(isSendAll == true)
               {
                    // サーバーで一時保存されている対戦・協力中のメッセージから対象のメッセージを削除する
                    serverRoomInfo.play_message_json.splice(i, 1); 
                    i--;
               }
            }
        
            // サーバーで一時保存されている対戦・協力中のメッセージに新規のメッセージを追加する
            if(newMessageList.length > 0)
            {   
                for(let i = 0; i < newMessageList.length; i++)
                {
                    serverRoomInfo.play_message_json.push(newMessageList[i]);
                }
            }   
        }

        // サーバーで一時保存する自身の参加情報を更新する
        serverRoomInfo.participant_json.splice(participantIndex, 1, objMessage.player_json);

        // 更新した受信メッセージをソケットに送信する
        return [JSON.stringify(objMessage)];
    }
}