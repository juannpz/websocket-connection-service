import { Consumer, Kafka, EachMessagePayload } from "npm:kafkajs";
import { IBrokerConfig,  } from "../service.definition.ts";

export class BrokerClient {
    private static client: Kafka | null = null;
    private static consumer: Consumer | null = null;

    protected constructor() { }

    protected static async _init(onMessageCb: ((payload: EachMessagePayload) => Promise<void>), config: IBrokerConfig) {
        this.client = new Kafka({
            brokers: [`${config.BROKER_HOST}:${config.BROKER_PORT}`],
            clientId: config.BROKER_CLIENT_ID
        });

        this.consumer = this.client.consumer({ groupId: "test-group" });

        await this.consumer.connect();
        console.log("Broker client initialized");

        await this.consumer.subscribe({
            topics: ["user_credentials"],
            fromBeginning: true
        });
        console.log("Broker consumer subscribed");

        await this.runListener(onMessageCb);
        console.log(`Broker listening on ${config.BROKER_HOST}:${config.BROKER_PORT}`);
    }

    private static async runListener(onMessageCb: ((payload: EachMessagePayload) => Promise<void>)) {
        if (!this.consumer)
            throw new Error("Broker consumer not initialized");

        console.log("Running listener...");
        
        await this.consumer.run({
            eachMessage: onMessageCb
        });
    }
}