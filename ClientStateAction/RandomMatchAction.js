import { ClientStateAction } from "./ClientStateAction.js";
import { PlayerStateAction } from "./PlayerStateAction/PlayerStateAction.js";

/**
 * クライアント送信の依頼
 * ランダムマッチ (対戦･協力の主な種類に沿って、自由に入室)
 */
export class RandomMatchAction extends ClientStateAction
{
    /**
     * ランダムマッチする (対戦･協力の主な種類に沿って、自由に入室する)
     * @param {Object} objMessage クライアントから受信したメッセージ
     * @returns {List} ソケットに送信するメッセージリスト 
     */
    Action(objMessage)
    {
        // 指定したルーム情報やプレイヤー情報が存在しない場合
        if((typeof objMessage.room_json === 'undefined')||
           (typeof objMessage.room_json[0] === 'undefined'))
        {
            console.log('受信したメッセージに｢ルーム情報｣や｢プレイヤー情報｣が含まれていません');
            return null;
        }

        // ルームに入室していない(ルームIDが未定義)場合
        if((typeof objMessage.room_json[0].id === 'undefined') || !(objMessage.room_json[0].id))
        {
            // 対戦･協力の主な種類が存在しない場合
            if((typeof objMessage.room_json[0].main_kind === 'undefined')|| !(objMessage.room_json[0].main_kind))
            {
                // 初期値を設定する
                objMessage.room_json[0].main_kind = this.initMainKind;
            }
            else
            {
                // 対戦･協力の主な種類を数値へ変換
                objMessage.room_json[0].main_kind = Number(objMessage.room_json[0].main_kind);
                
                // 指定した対戦･協力の主な種類を数値へ変換できない場合
                if(isNaN(objMessage.room_json[0].main_kind))
                {
                    console.log('指定した｢対戦･協力の主な種類｣が数値ではありません');
                    return null;
                }
            }

            // 該当する対戦･協力の主な種類をソケットに送信する
            for (const roomInfo of this.roomList[objMessage.game_kind])
            {
                // 下記のすべての条件に一致する場合
                // ・ルーム情報が空ではない
                // ・ルーム番号が存在しない(ランダムマッチで作成されたルーム)
                // ・対戦･協力の主な種類が一致する
                // ・条件[相手が対戦･協力中に入室できないルームにて、相手が対戦･協力中]が偽である
                // ・満員ではない
                if ((roomInfo) &&
                    !(roomInfo.number) &&
                    (objMessage.room_json[0].main_kind == roomInfo.main_kind) &&
                    !((roomInfo.is_enter_midway_through == false) && (roomInfo.participant_json[0].state >= PlayerStateAction.playerStateKind.loading)) &&
                    (roomInfo.total < roomInfo.max_total))
                {
                    // 入室するルームIDを設定する
                    objMessage.room_json[0].id = roomInfo.id;

                    // 空いているルームに入室する
                    return super.EnterRoom(objMessage);
                }
            }

            // 上記の条件に該当せず、空いているルームが存在しない場合
            // ルーム番号を空文字に設定する
            objMessage.room_json[0].number = "";
            // ルーム作成のメッセージを送信する
            return super.CreateRoom(objMessage);
        }
        // ルームに入室している場合
        else
        {
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
              return null;
            }
        
            // ルーム待機のメッセージを送信する
            return super.WaitRoom(objMessage);
        }
    }
}