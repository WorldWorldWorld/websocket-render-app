import { FinishedAction } from "./PlayerStateAction/FinishedAction.js";
import { LoadingAction } from "./PlayerStateAction/LoadingAction.js";
import { PlayerPlayAction } from "./PlayerStateAction/PlayerPlayAction.js";
import { ReadyToPlayAction } from "./PlayerStateAction/ReadyToPlayAction.js";
import { RoomNoEnterAction } from "./PlayerStateAction/RoomNoEnterAction.js";
import { RoomWaitByPlayerAction } from "./PlayerStateAction/RoomWaitByPlayerAction.js";

import { PlayerStateAction } from "./PlayerStateAction/PlayerStateAction.js";

/**
 * クライアント送信の依頼に沿って動作する
 * 基盤の継承元
 */
export class ClientStateAction
{
    // ルーム番号 桁数
    roomNumberOfDigits = 6;
    // ルーム番号 最小値
    roomMinNumber = 1;
    // ルーム番号 最大値
    roomMaxNumber = 999999;
    // プレイヤー番号 初期値
    initPlayerNumber = 1;
    // 入室順 初期値
    initEnterOrder = 1;
    // ルーム参加人数 初期値
    initParticipantTotal = 1;
    // 対戦･協力の主な種類 初期値
    initMainKind = 0; 
    
    // クライアント送信の依頼
    static clientStateKind = Object.freeze({
        nothing:0,      // 何もしない
        randomMatch: 1, // ランダムマッチ
        roomCreate: 2,  // ルームを作成する
        roomSearch: 3,  // ルームを探索する
        roomEnter: 4,   // ルームに入室する
        roomWait: 5,    // ルームで待機する
        roomplay: 6,    // ルームで対戦・協力プレイ
    });

    /**
     * コンストラクタ
     * @param {List} roomList ルームリスト
     */
    constructor(roomList)
    {
        this.roomList = roomList;

        // プレイヤーの状況に沿って動作するリストを設定
        this.playerStateActionList = [
            new RoomNoEnterAction(roomList),        // ルームに入室しない(退出する)
            new RoomWaitByPlayerAction(roomList),   // ルームで待機する
            new ReadyToPlayAction(roomList),        // 対戦・協力の準備を整えた
            new LoadingAction(roomList),            // 読み込み中
            new PlayerPlayAction(roomList),         // プレイヤーが対戦・協力プレイする
            new FinishedAction(roomList)            // 対戦・協力プレイを終了する
        ];
    }

    /**
     * 動作する
     * @param {Object} objMessage クライアントから受信したメッセージ
     * @returns {List} ソケットに送信するメッセージリスト 
     */
    Action(objMessage)
    {
        return null;
    }

    /**
     * ルームを作成する
     * @param {Object} objMessage クライアントから受信したメッセージ
     * @returns {List} ソケットに送信するメッセージリスト 
     */
    CreateRoom(objMessage)
    {
        // 空いているルームが存在しない場合
        if((typeof objMessage.room_json[0].id === 'undefined') || !(objMessage.room_json[0].id))
        {
            // ルームIDをルームリストの語尾に指定する
            objMessage.room_json[0].id = this.roomList[objMessage.game_kind].length;
        }

        // 受信メッセージで依頼IDを｢ルーム待機｣に変更する
        objMessage.socket_state = ClientStateAction.clientStateKind.roomWait;
        // 受信メッセージで自身のプレイヤー状態を｢ルーム待機｣に変更する
        objMessage.player_json.state = PlayerStateAction.playerStateKind.roomWait;
        // 受信メッセージで自身のプレイヤー番号を先頭番号に設定する
        objMessage.player_json.number = this.initPlayerNumber
        // 受信メッセージで入室最終順番を先頭に設定する
        objMessage.room_json[0].enter_final_order = this.initEnterOrder;
        // 受信メッセージで自身の入室順を先頭に設定する
        objMessage.player_json.enter_order = objMessage.room_json[0].enter_final_order;
        // 受信メッセージでルームの参加人数を設定
        objMessage.room_json[0].total = this.initParticipantTotal;
        // 受信メッセージで自身の操作キャラがCPUではないことを設定する
        objMessage.player_json.cpu_json.is_your_cpu = false;

        // 現在の日時
        let now = new Date();
        // 受信メッセージで自身のルーム強制退出情報のメッセージ送信時刻を設定する
        objMessage.player_json.kicked_out_room_json.send_message_datetime = 
                                               now.getFullYear().toString() + '/' +     // 年
                                               (now.getMonth() + 1).toString() + '/' +  // 月 メモ:最小値0から始まるため、｢now.getMonth() + 1｣
                                               now.getDate().toString() + ' '+          // 日
                                               now.getHours().toString() + ':' +        // 時
                                               now.getMinutes().toString() + ':' +      // 分
                                               now.getSeconds().toString() + '.'+       // 秒
                                               now.getMilliseconds().toString();        // ミニ秒

        // 受信メッセージで対戦･協力の主な種類が設定されていない場合
        if((typeof objMessage.room_json[0].main_kind === 'undefined') || !(objMessage.room_json[0].main_kind))
        {
            // 初期値を設定する
            objMessage.room_json[0].main_kind = this.initMainKind;
        }

        // 作成したルームの番号が存在する(ランダムマッチではない) 場合
        if(objMessage.room_json[0].number)
        {
            // 自身がリーダーになる
            objMessage.player_json.is_reader = true;

            // パスワード情報が存在しない場合
            if(typeof objMessage.room_json[0].password_json === 'undefined')
            {
                // 受信メッセージでパスワードを無効に設定する
                objMessage.room_json[0].password_json = new Object();
                objMessage.room_json[0].password_json.is_used = false;
            }
            else
            {
                // パスワードが存在する場合はパスワードを有効に設定する
                objMessage.room_json[0].password_json.is_used = Boolean(objMessage.room_json[0].password_json.password);
            }
        }
        else
        {
            // 受信メッセージで自身がリーダーにならないように設定する
            objMessage.player_json.is_reader = false;

            // 受信メッセージでパスワードを無効に設定する
            objMessage.room_json[0].password_json = new Object();
            objMessage.room_json[0].password_json.is_used = false;
        }

        // 受信メッセージでルームの参加者に自身のプレイヤー情報を追加する
        objMessage.room_json[0].participant_json = [];
        objMessage.room_json[0].participant_json.push(objMessage.player_json);

        // 指定したルームIDに作成したルーム情報を新規設定する
        this.roomList[objMessage.game_kind][objMessage.room_json[0].id] = objMessage.room_json[0];

        // 更新したメッセージをソケットに送信する
        return [JSON.stringify(objMessage)];
    }

    /**
     * ルームに入室する
     * @param {Object} objMessage クライアントから受信したメッセージ
     * @returns {List} ソケットに送信するメッセージリスト 
     */
    EnterRoom(objMessage)
    {
        // 受信メッセージで依頼IDを｢ルーム待機｣に変更する
        objMessage.socket_state = ClientStateAction.clientStateKind.roomWait;
        // 受信メッセージで自身のプレイヤー状態を｢ルーム待機｣に変更する
        objMessage.player_json.state = PlayerStateAction.playerStateKind.roomWait;
        // サーバーで一時保存するルームの参加人数を増やす
        this.roomList[objMessage.game_kind][objMessage.room_json[0].id].total++;
        // 受信メッセージで自身のプレイヤー番号を設定する
        objMessage.player_json.number = this.roomList[objMessage.game_kind][objMessage.room_json[0].id].total;
        // サーバーで一時保存する入室最終順番を増やす
        this.roomList[objMessage.game_kind][objMessage.room_json[0].id].enter_final_order++;
        // 受信メッセージで自身の入室順を一番最後の順に設定する
        objMessage.player_json.enter_order = this.roomList[objMessage.game_kind][objMessage.room_json[0].id].enter_final_order;
        // 受信メッセージで自身がリーダーではないことを設定する
        objMessage.player_json.is_reader = false;
        // 受信メッセージで自身の操作キャラがCPUではないことを設定する
        objMessage.player_json.cpu_json.is_your_cpu = false;

        // 現在の日時
        let now = new Date();
        // 受信メッセージで自身のルーム強制退出情報のメッセージ送信時刻を設定する
        objMessage.player_json.kicked_out_room_json.send_message_datetime = 
                                               now.getFullYear().toString() + '/' +     // 年
                                               (now.getMonth() + 1).toString() + '/' +  // 月 メモ:最小値0から始まるため、｢now.getMonth() + 1｣
                                               now.getDate().toString() + ' '+          // 日
                                               now.getHours().toString() + ':' +        // 時
                                               now.getMinutes().toString() + ':' +      // 分
                                               now.getSeconds().toString() + '.'+       // 秒
                                               now.getMilliseconds().toString();        // ミニ秒

        // サーバーで一時保存するルームの参加者にて自身のプレイヤー情報を追加する
        this.roomList[objMessage.game_kind][objMessage.room_json[0].id].participant_json.push(objMessage.player_json);

        // 受信メッセージでルーム情報を更新する
        objMessage.room_json[0] = this.roomList[objMessage.game_kind][objMessage.room_json[0].id];
        // そのメッセージをソケットに送信する
        return [JSON.stringify(objMessage)];
    }

    /**
     * ルームで待機する
     * @param {Object} objMessage クライアントから受信したメッセージ
     * @returns {List} ソケットに送信するメッセージリスト
     */
    WaitRoom(objMessage)
    {
        // 指定したルームIDが存在しない(指定したルームが解散された)場合
        if((typeof this.roomList[objMessage.game_kind][objMessage.room_json[0].id] === "undefined")||
           (this.roomList[objMessage.game_kind][objMessage.room_json[0].id].id != objMessage.room_json[0].id))
        {
            // 受信メッセージで依頼IDを初期化する
            objMessage.socket_state = ClientStateAction.clientStateKind.nothing;
            // 受信メッセージからルーム情報を削除する
            delete objMessage.room_json;
            // そのメッセージをソケットに送信する
            return [JSON.stringify(objMessage)];
        }

        // 参加情報を取得する
        let participantInfo = this.roomList[objMessage.game_kind][objMessage.room_json[0].id].participant_json;        
        // 自身のプレイヤー情報 要素番号
        let myPlayerInfoNumber = -1;
        // 現在の日時
        let now = new Date();
        // サーバーで一時保存した参加者情報を確認する
        for ( let i = 0; i < participantInfo.length; i++)
        {
            // 自身の入室順に一致した場合
            if(participantInfo[i].enter_order == objMessage.player_json.enter_order)
            {
                // 自身のプレイヤー情報 要素番号を設定する
                myPlayerInfoNumber = i;

                // 自身のルーム強制退出情報のメッセージ送信時刻を更新する
                objMessage.player_json.kicked_out_room_json.send_message_datetime = 
                                               now.getFullYear().toString() + '/' +     // 年
                                               (now.getMonth() + 1).toString() + '/' +  // 月 メモ:最小値0から始まるため、｢now.getMonth() + 1｣
                                               now.getDate().toString() + ' '+          // 日
                                               now.getHours().toString() + ':' +        // 時
                                               now.getMinutes().toString() + ':' +      // 分
                                               now.getSeconds().toString() + '.'+       // 秒
                                               now.getMilliseconds().toString();        // ミニ秒
                participantInfo[i].kicked_out_room_json.send_message_datetime = objMessage.player_json.kicked_out_room_json.send_message_datetime;

            }
            // 他の参加者を確認する
            else
            {
                // ルーム強制退出最大時間を数値へ変換
                participantInfo[i].kicked_out_room_json.max_time = Number(participantInfo[i].kicked_out_room_json.max_time);
                // ルーム強制退出最大時間を数値へ変換できない場合
                if(isNaN(participantInfo[i].kicked_out_room_json.max_time))
                {
                    console.log("｢ルーム強制退出最大時間｣を数値へ変換できません");
                    return;
                }

                // 他の参加者が最終のメッセージを送信してからルーム強制退出最大時間 以上に経過した場合
                if(now - new Date(participantInfo[i].kicked_out_room_json.send_message_datetime) >= participantInfo[i].kicked_out_room_json.max_time)
                {
                    // その参加者をルームから強制退出させる
                    participantInfo.splice(i, 1);
                    // 他の参加者を確認する
                    i--;
                }
            }
        }

        // 参加者情報から自身のプレイヤー情報を見つけた場合
        if(myPlayerInfoNumber > -1)
        {
            // 自身のプレイヤー状況に沿って、メッセージリストを設定する
            return this.playerStateActionList[objMessage.player_json.state].Action(objMessage,myPlayerInfoNumber);
        }

        // 上記の条件に一致しない(自身のプレイヤー情報が参加者情報に含まれていない(自身が強制退出された))場合
        // 受信メッセージで依頼IDを初期化する
        objMessage.socket_state = ClientStateAction.clientStateKind.nothing;
        // 受信メッセージからルーム情報を削除する
        delete objMessage.room_json;
        // そのメッセージをソケットに送信する
        return [JSON.stringify(objMessage)];

    }
}