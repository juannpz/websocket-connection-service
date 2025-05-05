export interface IServiceConfig {
    brokerConfig: IBrokerConfig;
}

export interface IBrokerConfig {
    BROKER_HOST: string;
    BROKER_PORT: number;
    BROKER_CLIENT_ID: string;
}