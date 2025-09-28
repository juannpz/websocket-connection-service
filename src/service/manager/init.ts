import { NotificationManager } from "./notificationManager/NotificationManager.ts";
import { IServiceConfig } from "../service.definition.ts";
import { WebSocketClient } from "../webSocket/WebSocketClient.ts";

export async function initManager(config: IServiceConfig, webSocketClient: WebSocketClient) {
    await NotificationManager.init(config, webSocketClient);
}