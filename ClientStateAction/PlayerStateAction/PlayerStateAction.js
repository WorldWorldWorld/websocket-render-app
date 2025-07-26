import { ClientStateAction } from "../ClientStateAction.js";

/**
 * プレイヤーの状況に沿って動作する
 * 基盤の継承元
 */
export class PlayerStateAction
{
    // プレイヤーの状況
    static playerStateKind  = Object.freeze({
        roomNoEnter:0,  // ルームに入室していない(退出した)
        roomWait:1,     // ルームで待機
        readyToPlay:2,  // 対戦・協力の準備を整えた
        loading:3,      // 読み込み中
        play:4,         // 対戦・協力プレイ
        finished:5,     // 対戦・協力プレイを終了する
    });

    /**
     * コンストラクタ
     * @param {List} roomList ルームリスト
     */
    constructor(roomList)
    {
        this.roomList = roomList;
    }

    /**
     * 動作する
     * @param {Object} objMessage クライアントから受信したメッセージ
     * @param {Int} participantIndex 参加情報の要素番号
     * @returns {List} ソケットに送信するメッセージリスト 
     */
    Action(objMessage,participantIndex)
    {
        return null;
    }


    /**
     * ルーム待機中の残り時間を測る
     * @param {Object} objMessage クライアントから受信したメッセージ
     * @param {Int} participantIndex 参加情報の要素番号
     */
    MeasureRemainingTime(objMessage,participantIndex)
    {
        // ルーム待機中の残り時間情報
        let  remainingTimeJson =  null;
        
        // 一部保存したルームリストからルーム待機中の残り時間情報を取得する
        if(this.roomList[objMessage.game_kind][objMessage.room_json[0].id].remaining_time_json?.is_measure == true)
        {
            remainingTimeJson = this.roomList[objMessage.game_kind][objMessage.room_json[0].id].remaining_time_json;
        }
        // 受信メッセージからルーム待機中の残り時間情報を取得する
        else if(objMessage.room_json[0].remaining_time_json?.is_measure == true)
        {
            remainingTimeJson = objMessage.room_json[0].remaining_time_json;
            
            // 最大残り時間を一部保存したルームリストから取得する
            remainingTimeJson.max_time = this.roomList[objMessage.game_kind][objMessage.room_json[0].id].remaining_time_json?.max_time;
        }

        // ルーム待機中の残り時間情報を取得しない場合、下記の処理を飛ばす
        if(!remainingTimeJson) return;

        // 最大残り時間を数値へ変換
        remainingTimeJson.max_time = Number(remainingTimeJson.max_time);
        // 最大残り時間を数値へ変換できない場合
        if(isNaN(remainingTimeJson.max_time ))
        {
            console.log("｢最大残り時間｣を数値へ変換できません");
            return;
        }

        // 現在の日時
        let now = new Date();

        // 計測開始サーバー時刻を設定していない場合
        if((typeof remainingTimeJson.start_datetime  === 'undefined')|| !(remainingTimeJson.start_datetime))
        {
            // 計測開始サーバー時刻をサーバーの時刻に設定する
            remainingTimeJson.start_datetime = now.getFullYear().toString() + '/' +     // 年
                                               (now.getMonth() + 1).toString() + '/' +  // 月 メモ:最小値0から始まるため、｢now.getMonth() + 1｣
                                               now.getDate().toString() + ' '+          // 日
                                               now.getHours().toString() + ':' +        // 時
                                               now.getMinutes().toString() + ':' +      // 分
                                               now.getSeconds().toString() + '.'+       // 秒
                                               now.getMilliseconds().toString();        // ミニ秒
        }

        // 残り時間を求める
        remainingTimeJson.remaining_time = remainingTimeJson.max_time - (now - new Date(remainingTimeJson.start_datetime));
        
        // ルーム待機中の残り時間が0ミリ秒以下になった場合
        if(remainingTimeJson.remaining_time <= 0)
        {
            // 時間計測をリセットする
            remainingTimeJson.is_measure = false;
            remainingTimeJson.start_datetime = null;
            remainingTimeJson.remaining_time = 0;
                        
            // 自身も含めて参加者全員の状況を｢対戦・協力プレイ｣に設定する
            this.SetStatePlayingByAllParticipants(objMessage,participantIndex);
        }

        // 一時保存するルームリストの｢ルーム待機中の残り時間情報｣を更新する
        this.roomList[objMessage.game_kind][objMessage.room_json[0].id].remaining_time_json = remainingTimeJson;        
    }

    /**
     * 自身も含めて参加者全員の状況を｢ゲーム画面に読み込み中｣に設定する
     * @param {Object} objMessage クライアントから受信したメッセージ
     * @param {Int} participantIndex 参加情報の要素番号
     */
    SetStatePlayingByAllParticipants(objMessage,participantIndex)
    {
        // 受信メッセージの依頼IDを｢ルームで対戦・協力プレイ｣に設定
        objMessage.socket_state = ClientStateAction.clientStateKind.roomplay;
        // 受信メッセージのプレイヤーの状態を｢ゲーム画面に読み込み中｣に設定
        objMessage.player_json.state = PlayerStateAction.playerStateKind.loading;
        
        // 参加者情報を取得
        let participantInfo = this.roomList[objMessage.game_kind][objMessage.room_json[0].id].participant_json;
        // サーバーで一時保存するその他の参加者の状態を｢ゲーム画面に読み込み中｣に設定
        for ( let i = 0; i < participantInfo.length; i++)
        {
            // 自身のプレイヤー情報ではない場合
            if((i != participantIndex) && (participantInfo[i].state < PlayerStateAction.playerStateKind.loading))
            {
                // 他の参加情報の状態を更新する
                participantInfo[i].state = PlayerStateAction.playerStateKind.loading;
            }
        }

        // サーバーで一時保存する自身の参加情報を更新する
        participantInfo.splice(participantIndex, 1, objMessage.player_json);
    }
}