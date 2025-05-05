import { IBrokerConfig, } from "../../service.definition.ts";
import { BrokerClient } from "../../broker/BrokerClient.ts";
import { EachMessagePayload } from "npm:kafkajs";

export class NotificationManager extends BrokerClient {

    private constructor() {
        super();
    }

    public static async init(brokerConfig: IBrokerConfig) {
        await this._init(this.handleMessage, brokerConfig);
    }
    
    private static async handleMessage(payload: EachMessagePayload) {
        if (payload.message.value)
            console.log(JSON.parse(payload.message.value.toString()));
    }
}