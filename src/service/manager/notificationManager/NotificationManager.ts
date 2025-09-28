import { IServiceConfig, } from "../../service.definition.ts";
import { EachMessagePayload } from "@kafka";
import { Connection } from "../../connection/Connection.ts";
import { Notification } from "./notificationManager.definition.ts";

export class NotificationManager extends Connection {

    private constructor() {
        super();
    }

    public static async init(config: IServiceConfig) {
        await this._init(config, this.handleMessage);
    }
    
    private static async handleMessage(payload: EachMessagePayload) {
        if (payload.message.value){
            const parsedNotification = JSON.parse(payload.message.value.toString()) as Notification;
            console.log(parsedNotification);
            
            // await this.WebSocketClient.notify(parsedNotification.userId ,parsedNotification);
        }
    }
}