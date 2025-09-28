import { IServiceConfig, } from "../../service.definition.ts";
import { EachMessagePayload } from "@kafka";
import { Connection } from "../../connection/Connection.ts";
import { Notification } from "./notificationManager.definition.ts";
import { WebSocketClient } from "../../webSocket/WebSocketClient.ts";

export class NotificationManager extends Connection {
    private static webSocketClient: WebSocketClient;

    private constructor() {
        super();
    }

    public static async init(config: IServiceConfig, webSocketClient: WebSocketClient) {
        this.webSocketClient = webSocketClient;
        await this._init(config, this.handleMessage.bind(this), webSocketClient);
    }
    
    private static async handleMessage(payload: EachMessagePayload) {
        if (payload.message.value){
            const parsedNotification = JSON.parse(payload.message.value.toString()) as Notification;
            console.log(parsedNotification);
            
            await this.webSocketClient.notify(parsedNotification.user_id ,parsedNotification);
        }
    }
}