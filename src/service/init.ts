import { initManager } from "./manager/init.ts";
import { getConfig } from "./service.config.ts";
import { WebSocketClient } from "./webSocket/WebSocketClient.ts";

export async function init() {
    const config = getConfig();
    const webSocketClient = WebSocketClient.getInstance(config.webSocketConfig);
    await webSocketClient.init();

    await initManager(config, webSocketClient);
}