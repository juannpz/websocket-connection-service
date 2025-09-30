import { ExtendedNotification } from "./notificationManager.definition.ts";
import { Connection } from "../../connection/Connection.ts";
import { EachMessagePayload } from "@kafka";

export class NotificationManager {
	private connection: Connection;

    public constructor(connection: Connection) {
		this.connection = connection;
    }

    public async init() {
        await this.connection.init(this.handleMessage.bind(this));
    }
    
    private async handleMessage(payload: EachMessagePayload) {
        if (payload.message.value){
            const parsedNotification = JSON.parse(payload.message.value.toString()) as ExtendedNotification;
            console.log(parsedNotification);
            
            this.connection.webSocketClient.notify(parsedNotification.user_id ,parsedNotification);
        }
    }
}