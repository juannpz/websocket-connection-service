import { Consumer, Kafka, EachMessagePayload } from "@kafka";
import { BrokerConfig,  } from "../service.definition.ts";

export class BrokerClient {
    private client: Kafka | null = null;
    private consumer: Consumer | null = null;
	private config: BrokerConfig;

    public constructor(config: BrokerConfig) {
		this.config = config;
	}

    public async init(onMessageCb: ((payload: EachMessagePayload) => Promise<void>), ) {
        this.client = new Kafka({
            brokers: [`${this.config.BROKER_HOST}:${this.config.BROKER_PORT}`],
            clientId: this.config.BROKER_CLIENT_ID,
			retry: {
				initialRetryTime: 300,
				retries: 10
			}
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
        console.log(`Broker consumer listening on ${this.config.BROKER_HOST}:${this.config.BROKER_PORT}`);
    }

    private async runListener(onMessageCb: ((payload: EachMessagePayload) => Promise<void>)) {
        if (!this.consumer)
            throw new Error("Broker consumer not initialized");

        console.log("Running listener...");
        
        await this.consumer.run({
            eachMessage: onMessageCb
        });
    }
}