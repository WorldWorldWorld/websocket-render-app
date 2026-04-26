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
    SetStatePlayingByAllParticipant(objMessage,participantInsdex)
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

    /**
     * 部屋から参加者を追い出す
     * @param {Object} objMessage クライアントから受信したメッセージ
     * @param {Int} participantIndex 参加情報の要素番号
     */
    KickTheParticipantOutOfTheRoom(objMessage,participantIndex)
    {
        // 参加者情報を取得する
        let participantInfo = this.roomList[objMessage.game_kind][objMessage.room_json[0].id].participant_json;

        // 退出者がルームのリーダーである 又は 参加者が1人のみ 場合
        if((participantInfo[participantIndex].is_reader == true)||
           (this.roomList[objMessage.game_kind][objMessage.room_json[0].id].total == 1))
        {
            // サーバーで一時保存する指定したルームを削除して、削除したルームを｢undefine｣で残す
            delete this.roomList[objMessage.game_kind][objMessage.room_json[0].id];
        }
        // 前回まで退出者の状態が｢ゲーム画面に読み込み中｣｢対戦・協力｣である場合
        else if(participantInfo[participantIndex].state >= PlayerStateAction.playerStateKind.loading) 
        {
            // 試合を強制終了する場合
            if(this.roomList[objMessage.game_kind][objMessage.room_json[0].id].is_stop_playing == true)
            {
                // サーバーで一時保存する退出者の参加情報のみ削除して、削除した参加情報を｢undefine｣で残さない
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
            // 退出者をCPUに設定可能の場合
            else if(this.roomList[objMessage.game_kind][objMessage.room_json[0].id].is_used_cpu == true)
            {
                // 退出者の参加者情報をCPUに差し替える
                objMessage.player_json.cpu_json.is_your_cpu = true;
                // そのCPUを操作するプレイヤー番号を先頭に設定する 
                objMessage.player_json.cpu_json.control_number = 1;
                // サーバーで一時保存する参加情報を、CPUに設定した退出者のプレイヤー情報に差し替える
                participantInfo.splice(participantIndex, 1, objMessage.player_json);
            }
            else
            {
                // 参加情報から退出者を削除する前に、退出者のプレイヤー番号を取得する
                let playerNumber = participantInfo[participantIndex]?.number;

                // サーバーで一時保存する退出者の参加情報のみ削除して、削除した参加情報を｢undefine｣で残さない
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
    }
}