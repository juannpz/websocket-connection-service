import { WebSocketClient } from "../webSocket/WebSocketClient.ts";
import { BrokerClient } from "../broker/BrokerClient.ts";
import { EachMessagePayload } from "@kafka";

export class Connection {
    public webSocketClient: WebSocketClient;
	private brokerClient: BrokerClient;

    public constructor(webSocketClient: WebSocketClient, brokerClient: BrokerClient) { 
		this.webSocketClient = webSocketClient;
		this.brokerClient = brokerClient;
	}	

    public async init(
        onMessageCb: ((payload: EachMessagePayload) => Promise<void>),
    ) {
        await this.brokerClient.init(onMessageCb);
    }
}