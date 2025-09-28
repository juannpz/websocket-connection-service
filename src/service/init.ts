import { WebSocketClient } from "./webSocket/WebSocketClient.ts";
import { initManager } from "./manager/init.ts";
import { getConfig } from "./service.config.ts";

export async function init() {
    const config = getConfig();
    const webSocketClient = new WebSocketClient(config.webSocketConfig);
    webSocketClient.init();

    await initManager(config, webSocketClient);
}