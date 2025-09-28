export interface IServiceConfig {
    brokerConfig: IBrokerConfig;
    webSocketConfig: IWebSocketConfig;
    serviceUrls: IServiceUrls;
}

export interface IWebSocketConfig {
    WS_PORT: number;
}

export interface IBrokerConfig {
    BROKER_HOST: string;
    BROKER_PORT: number;
    BROKER_CLIENT_ID: string;
}

export interface IServiceUrls {
    sessionServiceUrl: string;
}