import { NotificationManager } from "./notificationManager/NotificationManager.ts";
import { WebSocketClient } from "../webSocket/WebSocketClient.ts";
import { IServiceConfig } from "../service.definition.ts";
import { Connection } from "../connection/Connection.ts";
import { BrokerClient } from "../broker/BrokerClient.ts";

export async function initManager(config: IServiceConfig, webSocketClient: WebSocketClient) {
	const brokerClient = new BrokerClient(config.brokerConfig);
	const connection = new Connection(webSocketClient, brokerClient);
	const notificationManager = new NotificationManager(connection);
	
    await notificationManager.init();
}