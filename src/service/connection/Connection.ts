import { WebSocketClient } from "../webSocket/WebSocketClient.ts";
import { IServiceConfig } from "../service.definition.ts";
import { EachMessagePayload } from "@kafka";
import { BrokerClient } from "../broker/BrokerClient.ts";

export class Connection {
    protected static WebSocketClient: WebSocketClient;

    protected constructor() { }

    protected static async _init(config: IServiceConfig, onMessageCb: ((payload: EachMessagePayload) => Promise<void>)) {
        const webSocketClient = WebSocketClient.getInstance(config.webSocketConfig, "session");
        this.WebSocketClient = webSocketClient;

        await webSocketClient.init();
        await BrokerClient.init(onMessageCb, config.brokerConfig);
    }
}