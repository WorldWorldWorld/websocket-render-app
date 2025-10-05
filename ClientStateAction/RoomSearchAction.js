import { ClientStateAction } from "./ClientStateAction.js";

/**
 * クライアント送信の依頼
 * ルームを探す
 */
export class RoomSearchAction extends ClientStateAction
{
    /**
     * ルームを探す
     * @param {Object} objMessage クライアントから受信したメッセージ
     * @returns {List} ソケットに送信するメッセージリスト 
     */
    Action(objMessage)
    {
        // ルームを見つけた数
        let foundTotal = 0;

        // ルーム番号(文字列)を指定して、ルームを取得する場合
        if(objMessage.room_json[0]?.number)
        {
            // 該当するルーム番号をソケットに送信する
            for (const roomInfo of this.roomList[objMessage.game_kind])
            {
                // ルーム番号が存在して(ランダムマッチで作成されてないルーム)
                // ルーム番号が一致する場合
                if ((typeof roomInfo?.number !== "undefined") &&
                    (roomInfo.number == objMessage.room_json[0].number))
                {
                    // ルームを見つけた数を増やす
                    foundTotal++;
                    // 受信メッセージから対象のルーム情報に置き換える
                    objMessage.room_json[foundTotal - 1] = roomInfo;
                    break;
                }
            }
        }
        // 対戦･協力の主な種類(文字列)に沿って、ルームを取得する場合
        else if(objMessage.room_json[0]?.main_kind)
        {
            // 検索対象になる｢対戦･協力の主な種類(csv形式のデータ)｣を配列に格納
            const mainKindList = String(objMessage.room_json[0].main_kind).split(',');

            // 該当する対戦･協力の主な種類をソケットに送信する
            for (const roomInfo of this.roomList[objMessage.game_kind])
            {
                for (const mainKindInfo of mainKindList)
                {
                    // ルーム番号が存在している(ランダムマッチで作成されてないルーム)であり
                    // 対戦･協力の主な種類が一致する場合
                    if ((typeof roomInfo?.number !== "undefined")&&
                        (Number(roomInfo.main_kind) == Number(mainKindInfo)))
                    {
                        // ルームを見つけた数を増やす
                        foundTotal++;
                        // 受信メッセージから対象のルーム情報に置き換える
                        objMessage.room_json[foundTotal - 1] = roomInfo;
                        break; 
                    }
                }
            }
        }
        // 指定したゲームの種類(数字)に沿って、全件のルームを取得する場合
        else if (this.roomList[objMessage.game_kind].length > 0)
        {
            // その全件のルームをソケットに送信する
            for (const roomInfo of this.roomList[objMessage.game_kind])
            {
                // ルーム番号が存在する(ランダムマッチで作成されてないルーム)場合
                if(typeof roomInfo?.number !== "undefined")
                {
                    // ルームを見つけた数を増やす
                    foundTotal++;
                    // 受信メッセージから対象のルーム情報に置き換える
                    objMessage.room_json[foundTotal - 1] = roomInfo;
                }
            }
        }
        
        // 該当するルーム情報が見つからない場合
        if(foundTotal > 0)
        {
            console.log("ルーム情報を見つけた");
            // パスワードを含めずにソケットに送信する
            //this.SendMessageNoPassword(objMessage,socketmessageList);
            
            // 余分なルーム情報のリストを受信メッセージから削除する
            objMessage.room_json.splice(foundTotal, objMessage.room_json.length - foundTotal);

            // そのメッセージをソケットに送信する
            return [JSON.stringify(objMessage)];
        }
        else
        {
            console.log("ルーム情報が見つからない");
            // 依頼IDをリセット
            objMessage.socket_state = ClientStateAction.clientStateKind.nothing;
            // 受信メッセージからルーム情報を削除する
            delete objMessage.room_json;
            // そのメッセージをソケットに送信する
            return [JSON.stringify(objMessage)];
        }
    }
}